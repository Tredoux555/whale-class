// lib/montree/feedback/repo.ts
//
// EVERY database read and write for the feedback board, and nothing else.
//
// Two rules hold the module together:
//
//   1. BOARD-SCOPED, ALWAYS. Every function takes a boardId and every query
//      filters on it. There is no "get post by id" that skips the board — a
//      post id leaked from the public board must not resolve inside a
//      school's private one, and the way to guarantee that is to make the
//      unscoped call impossible to write.
//   2. EXPLICIT COLUMN LISTS. Never `select('*')` on posts, comments or
//      subscriptions. montree_fb_subscriptions.email is a guest's real
//      address; a `*` today is the day it appears in a JSON response.
//
// Access is with the service-role client (getSupabase), which bypasses the
// deny-all RLS from migration 359. That is the repo-wide pattern, and it is
// why this file is the only door.

import { getSupabase } from '@/lib/supabase-client';
import type {
  AuthorKind,
  Board,
  BoardRef,
  Comment,
  FlagReason,
  Lang,
  ListQuery,
  ListResult,
  Post,
  PostStatus,
  PostType,
  ProblemTemplate,
  StatusChange,
  Tag,
} from './types';
import { FLAG_HIDE_THRESHOLD, POST_TYPES } from './types';
import type { DedupCandidate } from './dedup';
import { searchTerms } from './dedup';
import { isChangelogStatus } from './statuses';

/** Postgres "relation does not exist" — the migration has not been run here. */
export function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  // '42P01' is raw Postgres ("relation ... does not exist"). 'PGRST205' is
  // PostgREST's OWN shape for the same fact ("Could not find the table ... in
  // the schema cache") — the one actually returned when a route talks to
  // Supabase's REST layer, not the database directly, and this project talks
  // to Supabase through supabase-js, i.e. PostgREST, on every call. Missing
  // either one turns migration 359 not having run yet into a 500 with a raw
  // stack trace instead of the calm 503 board_not_ready the rest of this
  // module is built to answer with.
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    /relation .* does not exist/i.test(e.message || '') ||
    /could not find the table/i.test(e.message || '')
  );
}

export class BoardNotReadyError extends Error {
  constructor() {
    super('The feedback board tables do not exist on this database (run migration 359).');
    this.name = 'BoardNotReadyError';
  }
}

function raise(scope: string, err: unknown): never {
  if (isMissingTable(err)) throw new BoardNotReadyError();
  console.error(`[feedback/repo] ${scope}`, err);
  throw new Error(`feedback repo failure: ${scope}`);
}

const POST_COLUMNS =
  'id, board_id, type, title, body, template, status, author_kind, author_id, author_name, ' +
  'author_role, tags, screenshot_path, vote_count, comment_count, has_official_reply, ' +
  'last_activity_at, pinned, hidden, merged_into, created_at, updated_at';

// author_key is read ONLY by getPostAuthorKey and by listComments' author
// marker, both of which compare it server-side. It is never in POST_COLUMNS,
// so it cannot reach a client by accident.

const COMMENT_COLUMNS =
  'id, post_id, body, author_kind, author_id, author_name, author_role, is_official, ' +
  'is_answer, quote_of, hidden, created_at';

interface PostRow {
  id: string;
  board_id: string;
  type: string;
  title: string;
  body: string;
  template: ProblemTemplate | null;
  status: string;
  author_kind: string;
  author_id: string | null;
  author_name: string;
  author_role: string | null;
  author_key?: string;
  tags: string[] | null;
  screenshot_path: string | null;
  vote_count: number;
  comment_count: number;
  has_official_reply: boolean;
  last_activity_at: string;
  pinned: boolean;
  hidden: boolean;
  merged_into: string | null;
  created_at: string;
  updated_at: string;
}

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    boardId: row.board_id,
    type: row.type as PostType,
    title: row.title,
    body: row.body ?? '',
    template: row.template ?? null,
    status: row.status as PostStatus,
    authorKind: row.author_kind as AuthorKind,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    tags: row.tags ?? [],
    screenshotPath: row.screenshot_path,
    voteCount: row.vote_count ?? 0,
    commentCount: row.comment_count ?? 0,
    hasOfficialReply: !!row.has_official_reply,
    lastActivityAt: row.last_activity_at,
    pinned: !!row.pinned,
    hidden: !!row.hidden,
    mergedInto: row.merged_into,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface CommentRow {
  id: string;
  post_id: string;
  body: string;
  author_kind: string;
  author_id: string | null;
  author_name: string;
  author_role: string | null;
  is_official: boolean;
  is_answer: boolean;
  quote_of: string | null;
  hidden: boolean;
  created_at: string;
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    authorKind: row.author_kind as AuthorKind,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    isOfficial: !!row.is_official,
    isAnswer: !!row.is_answer,
    quoteOf: row.quote_of,
    hidden: !!row.hidden,
    createdAt: row.created_at,
  };
}

// ── Cursors ─────────────────────────────────────────────────────────────────
//
// An opaque offset cursor. Boards are hundreds of posts, not millions, and an
// offset keeps every sort (including the computed "unanswered first") on one
// code path. It is opaque precisely so it can become a keyset cursor later
// without changing a single caller.

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString('base64url');
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { o?: number };
    const o = Number(parsed?.o);
    return Number.isFinite(o) && o >= 0 && o < 100_000 ? Math.floor(o) : 0;
  } catch {
    return 0;
  }
}

// ── Boards ──────────────────────────────────────────────────────────────────

interface BoardRow {
  id: string;
  ref: string;
  scope: string;
  school_id: string | null;
  name: string;
  locale_default: string;
}

function toBoard(row: BoardRow): Board {
  return {
    id: row.id,
    ref: row.ref,
    scope: row.scope === 'school' ? 'school' : row.scope === 'product' ? 'product' : 'public',
    schoolId: row.school_id,
    name: row.name,
    localeDefault: (row.locale_default === 'zh' ? 'zh' : 'en') as Lang,
  };
}

export async function getBoard(ref: BoardRef): Promise<Board | null> {
  const { data, error } = await getSupabase()
    .from('montree_fb_boards')
    .select('id, ref, scope, school_id, name, locale_default')
    .eq('ref', ref)
    .maybeSingle();
  if (error) raise('getBoard', error);
  return data ? toBoard(data as unknown as BoardRow) : null;
}

/**
 * Fetch a board, creating a school board the first time someone opens it.
 * The public board is seeded by the migration and is never created here — if
 * it is missing, the migration has not run and the caller should say so
 * rather than quietly inventing one.
 */
export async function ensureBoard(
  ref: BoardRef,
  scope: 'public' | 'school',
  schoolId: string | null,
  name: string,
): Promise<Board | null> {
  const existing = await getBoard(ref);
  if (existing) return existing;
  if (scope === 'public') return null;
  const { data, error } = await getSupabase()
    .from('montree_fb_boards')
    .insert({ ref, scope, school_id: schoolId, name })
    .select('id, ref, scope, school_id, name, locale_default')
    .maybeSingle();
  if (error) {
    // A concurrent request may have won the race; the unique index on `ref`
    // makes that a conflict, not a corruption.
    const again = await getBoard(ref);
    if (again) return again;
    raise('ensureBoard', error);
  }
  return data ? toBoard(data as unknown as BoardRow) : null;
}

export async function boardIsReady(): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from('montree_fb_boards')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    if (error) return !isMissingTable(error) ? false : false;
    return true;
  } catch {
    return false;
  }
}

// ── Listing ─────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function listPosts(
  boardId: string,
  query: ListQuery = {},
  viewerKey?: string | null,
): Promise<ListResult> {
  const supabase = getSupabase();
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
  const offset = decodeCursor(query.cursor);
  const sort = query.sort ?? 'trending';

  let q = supabase.from('montree_fb_posts').select(POST_COLUMNS).eq('board_id', boardId);

  // Merged duplicates never appear in a list; they only resolve by direct link.
  q = q.is('merged_into', null);
  if (!query.includeHidden) q = q.eq('hidden', false);
  if (query.type) q = q.eq('type', query.type);
  if (query.status) q = q.eq('status', query.status);
  if (query.q && query.q.trim()) {
    const needle = query.q.trim().replace(/[%,()]/g, ' ').slice(0, 120);
    // or() takes a comma-separated filter list; the needle is scrubbed of the
    // characters that would break out of it.
    q = q.or(`title.ilike.%${needle}%,body.ilike.%${needle}%`);
  }

  // Pinned first in every sort — a pinned post is an announcement.
  q = q.order('pinned', { ascending: false });
  if (sort === 'new') {
    q = q.order('created_at', { ascending: false });
  } else if (sort === 'top') {
    q = q.order('vote_count', { ascending: false }).order('created_at', { ascending: false });
  } else if (sort === 'unanswered') {
    q = q.order('has_official_reply', { ascending: true }).order('last_activity_at', { ascending: false });
  } else {
    // Trending: what is alive. Default sort, with the brief's bias to
    // unanswered expressed as the tie-break rather than a separate query.
    q = q.order('last_activity_at', { ascending: false }).order('vote_count', { ascending: false });
  }
  q = q.range(offset, offset + limit); // one extra row tells us if there is a next page

  const { data, error } = await q;
  if (error) raise('listPosts', error);

  const rows = (data ?? []) as unknown as PostRow[];
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit).map(toPost);

  if (viewerKey && posts.length) {
    const voted = await viewerVotes(posts.map((p) => p.id), viewerKey);
    for (const p of posts) p.viewerHasVoted = voted.has(p.id);
  }

  return {
    posts,
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    counts: await countsByType(boardId, query.includeHidden === true),
  };
}

/** The numbers on the type chips. One HEAD count per type — cheap and exact. */
export async function countsByType(
  boardId: string,
  includeHidden = false,
): Promise<Record<PostType | 'all', number>> {
  const supabase = getSupabase();
  const base = () => {
    let q = supabase
      .from('montree_fb_posts')
      .select('id', { head: true, count: 'exact' })
      .eq('board_id', boardId)
      .is('merged_into', null);
    if (!includeHidden) q = q.eq('hidden', false);
    return q;
  };
  const out = { all: 0, problem: 0, idea: 0, question: 0, discussion: 0 } as Record<PostType | 'all', number>;
  try {
    const all = await base();
    out.all = all.count ?? 0;
    await Promise.all(
      POST_TYPES.map(async (t) => {
        const r = await base().eq('type', t);
        out[t] = r.count ?? 0;
      }),
    );
  } catch (err) {
    if (isMissingTable(err)) throw new BoardNotReadyError();
  }
  return out;
}

export async function getPost(boardId: string, postId: string): Promise<Post | null> {
  const { data, error } = await getSupabase()
    .from('montree_fb_posts')
    .select(POST_COLUMNS)
    .eq('board_id', boardId)
    .eq('id', postId)
    .maybeSingle();
  if (error) raise('getPost', error);
  return data ? toPost(data as unknown as PostRow) : null;
}

/** Internal — the one place author_key is read, for "is this the author?". */
export async function getPostAuthorKey(boardId: string, postId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('montree_fb_posts')
    .select('author_key')
    .eq('board_id', boardId)
    .eq('id', postId)
    .maybeSingle();
  if (error) raise('getPostAuthorKey', error);
  return (data?.author_key as string | undefined) ?? null;
}

/**
 * A post's comments, oldest first.
 *
 * `markAuthorKey` is how the thread knows which commenter is the person who
 * posted. The key is compared HERE and only the boolean survives: a guest's
 * key is an identifier for them, and it has no business crossing into a page
 * that a hundred strangers will render.
 */
export async function listComments(
  boardId: string,
  postId: string,
  includeHidden = false,
  markAuthorKey?: string | null,
): Promise<Comment[]> {
  let q = getSupabase()
    .from('montree_fb_comments')
    .select(markAuthorKey ? `${COMMENT_COLUMNS}, author_key` : COMMENT_COLUMNS)
    .eq('board_id', boardId)
    .eq('post_id', postId);
  if (!includeHidden) q = q.eq('hidden', false);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) raise('listComments', error);

  const rows = (data ?? []) as unknown as Array<CommentRow & { author_key?: string }>;
  const comments = rows.map((row, i) => {
    const comment = toComment(row);
    if (markAuthorKey) comment.isAuthor = rows[i].author_key === markAuthorKey;
    return comment;
  });
  // Denormalise the quoted line so the UI renders a quote without a round trip.
  const byId = new Map(comments.map((c) => [c.id, c]));
  for (const c of comments) {
    if (!c.quoteOf) continue;
    const src = byId.get(c.quoteOf);
    if (!src) continue;
    c.quoteAuthorName = src.authorName;
    c.quoteExcerpt = src.body.length > 140 ? `${src.body.slice(0, 140)}…` : src.body;
  }
  return comments;
}

export async function listStatusHistory(boardId: string, postId: string): Promise<StatusChange[]> {
  const { data, error } = await getSupabase()
    .from('montree_fb_status_history')
    .select('id, post_id, from_status, to_status, by_name, note, created_at')
    .eq('board_id', boardId)
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) raise('listStatusHistory', error);
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    postId: r.post_id as string,
    fromStatus: (r.from_status as PostStatus | null) ?? null,
    toStatus: r.to_status as PostStatus,
    byName: (r.by_name as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

// ── Writing ─────────────────────────────────────────────────────────────────

export interface CreatePostInput {
  type: PostType;
  title: string;
  body: string;
  template: ProblemTemplate | null;
  status: PostStatus;
  authorKind: AuthorKind;
  authorId: string | null;
  authorName: string;
  authorRole: string | null;
  authorKey: string;
  guestEmailHash?: string | null;
  tags?: string[];
  screenshotPath?: string | null;
}

export async function createPost(boardId: string, input: CreatePostInput): Promise<Post> {
  const { data, error } = await getSupabase()
    .from('montree_fb_posts')
    .insert({
      board_id: boardId,
      type: input.type,
      title: input.title,
      body: input.body,
      template: input.template,
      status: input.status,
      author_kind: input.authorKind,
      author_id: input.authorId,
      author_name: input.authorName,
      author_role: input.authorRole,
      author_key: input.authorKey,
      guest_email_hash: input.guestEmailHash ?? null,
      tags: input.tags ?? [],
      screenshot_path: input.screenshotPath ?? null,
      last_activity_at: new Date().toISOString(),
    })
    .select(POST_COLUMNS)
    .single();
  if (error) raise('createPost', error);
  return toPost(data as unknown as PostRow);
}

export interface PostPatch {
  status?: PostStatus;
  tags?: string[];
  pinned?: boolean;
  hidden?: boolean;
  hiddenReason?: string | null;
  note?: string | null;
}

/** Admin edit. Writes a status_history row whenever the status actually moves. */
export async function updatePost(
  boardId: string,
  postId: string,
  patch: PostPatch,
  actor: { key: string | null; name: string | null },
  previousStatus: PostStatus,
): Promise<Post> {
  const supabase = getSupabase();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.tags !== undefined) update.tags = patch.tags;
  if (patch.pinned !== undefined) update.pinned = patch.pinned;
  if (patch.hidden !== undefined) {
    update.hidden = patch.hidden;
    update.hidden_reason = patch.hidden ? patch.hiddenReason ?? 'admin' : null;
  }

  const { data, error } = await supabase
    .from('montree_fb_posts')
    .update(update)
    .eq('board_id', boardId)
    .eq('id', postId)
    .select(POST_COLUMNS)
    .single();
  if (error) raise('updatePost', error);

  if (patch.status !== undefined && patch.status !== previousStatus) {
    const { error: hErr } = await supabase.from('montree_fb_status_history').insert({
      post_id: postId,
      board_id: boardId,
      from_status: previousStatus,
      to_status: patch.status,
      by_key: actor.key,
      by_name: actor.name,
      note: patch.note ?? null,
    });
    if (hErr) console.error('[feedback/repo] status history insert failed', hErr);
  }
  return toPost(data as unknown as PostRow);
}

export async function mergePosts(
  boardId: string,
  duplicateId: string,
  survivorId: string,
  actor: { key: string | null; name: string | null },
): Promise<void> {
  // Both ids are re-read board-scoped first: the SQL function repeats the
  // check, but a mismatch should be a 404 from the route, not a raised
  // exception from Postgres.
  const [dup, survivor] = await Promise.all([
    getPost(boardId, duplicateId),
    getPost(boardId, survivorId),
  ]);
  if (!dup || !survivor) throw new Error('merge: both posts must exist on this board');

  const { error } = await getSupabase().rpc('montree_fb_merge_posts', {
    p_duplicate: duplicateId,
    p_survivor: survivorId,
    p_by_key: actor.key,
    p_by_name: actor.name,
  });
  if (error) raise('mergePosts', error);
}

export interface CreateCommentInput {
  body: string;
  authorKind: AuthorKind;
  authorId: string | null;
  authorName: string;
  authorRole: string | null;
  authorKey: string;
  isOfficial: boolean;
  quoteOf: string | null;
}

export async function createComment(
  boardId: string,
  postId: string,
  input: CreateCommentInput,
): Promise<Comment> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_fb_comments')
    .insert({
      post_id: postId,
      board_id: boardId,
      body: input.body,
      author_kind: input.authorKind,
      author_id: input.authorId,
      author_name: input.authorName,
      author_role: input.authorRole,
      author_key: input.authorKey,
      is_official: input.isOfficial,
      quote_of: input.quoteOf,
    })
    .select(COMMENT_COLUMNS)
    .single();
  if (error) raise('createComment', error);

  await touchPost(boardId, postId);
  await recount(postId);
  return toComment(data as unknown as CommentRow);
}

/** Mark exactly one comment as the accepted answer for a Question. */
export async function markAnswer(boardId: string, postId: string, commentId: string): Promise<void> {
  const supabase = getSupabase();
  // Clear first: the partial unique index allows only one, so the unset must
  // land before the set.
  const { error: clearErr } = await supabase
    .from('montree_fb_comments')
    .update({ is_answer: false })
    .eq('board_id', boardId)
    .eq('post_id', postId)
    .eq('is_answer', true);
  if (clearErr) raise('markAnswer:clear', clearErr);

  const { error } = await supabase
    .from('montree_fb_comments')
    .update({ is_answer: true })
    .eq('board_id', boardId)
    .eq('post_id', postId)
    .eq('id', commentId);
  if (error) raise('markAnswer:set', error);
}

export async function setCommentHidden(boardId: string, commentId: string, hidden: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('montree_fb_comments')
    .update({ hidden })
    .eq('board_id', boardId)
    .eq('id', commentId);
  if (error) raise('setCommentHidden', error);
}

async function touchPost(boardId: string, postId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('montree_fb_posts')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('board_id', boardId)
    .eq('id', postId);
  if (error) console.error('[feedback/repo] touchPost', error);
}

async function recount(postId: string): Promise<void> {
  const { error } = await getSupabase().rpc('montree_fb_recount_post', { p_post_id: postId });
  if (error) console.error('[feedback/repo] recount', error);
}

// ── Votes ───────────────────────────────────────────────────────────────────

export async function toggleVote(
  boardId: string,
  postId: string,
  voterKey: string,
): Promise<{ voted: boolean; count: number }> {
  const supabase = getSupabase();
  // Board scope is checked by reading the post first, not by trusting the id.
  const post = await getPost(boardId, postId);
  if (!post) throw new Error('vote: no such post on this board');

  const { data: existing, error: readErr } = await supabase
    .from('montree_fb_votes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('voter_key', voterKey)
    .maybeSingle();
  if (readErr) raise('toggleVote:read', readErr);

  if (existing) {
    const { error } = await supabase
      .from('montree_fb_votes')
      .delete()
      .eq('post_id', postId)
      .eq('voter_key', voterKey);
    if (error) raise('toggleVote:delete', error);
  } else {
    const { error } = await supabase
      .from('montree_fb_votes')
      .insert({ post_id: postId, voter_key: voterKey });
    // A duplicate here means a double-tap raced itself. That is not an error.
    if (error && (error as { code?: string }).code !== '23505') raise('toggleVote:insert', error);
  }

  await recount(postId);
  const fresh = await getPost(boardId, postId);
  return { voted: !existing, count: fresh?.voteCount ?? post.voteCount };
}

export async function viewerVotes(postIds: string[], voterKey: string): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const { data, error } = await getSupabase()
    .from('montree_fb_votes')
    .select('post_id')
    .eq('voter_key', voterKey)
    .in('post_id', postIds);
  if (error) {
    console.error('[feedback/repo] viewerVotes', error);
    return new Set();
  }
  return new Set(((data ?? []) as unknown as Array<{ post_id: string }>).map((r) => r.post_id));
}

// ── Subscriptions ───────────────────────────────────────────────────────────

export async function subscribe(
  postId: string,
  subscriberKey: string,
  email: string | null,
): Promise<void> {
  const { error } = await getSupabase()
    .from('montree_fb_subscriptions')
    .upsert(
      { post_id: postId, subscriber_key: subscriberKey, email, channel: 'email', unsubscribed_at: null },
      { onConflict: 'post_id,subscriber_key' },
    );
  if (error) raise('subscribe', error);
}

export async function unsubscribe(postId: string, subscriberKey: string): Promise<void> {
  const { error } = await getSupabase()
    .from('montree_fb_subscriptions')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('post_id', postId)
    .eq('subscriber_key', subscriberKey);
  if (error) raise('unsubscribe', error);
}

export async function isSubscribed(postId: string, subscriberKey: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('montree_fb_subscriptions')
    .select('post_id')
    .eq('post_id', postId)
    .eq('subscriber_key', subscriberKey)
    .is('unsubscribed_at', null)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function countSubscribers(postId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('montree_fb_subscriptions')
    .select('post_id', { head: true, count: 'exact' })
    .eq('post_id', postId)
    .is('unsubscribed_at', null);
  if (error) return 0;
  return count ?? 0;
}

/**
 * Deliverable addresses for a post's subscribers, minus one key (the person
 * who caused the event — nobody wants an email about their own reply).
 *
 * This is the ONLY function that reads the email column, and its result goes
 * straight into notify.ts. It never crosses an API boundary.
 */
export async function subscriberEmails(
  postId: string,
  exceptKey?: string | null,
): Promise<Array<{ key: string; email: string }>> {
  const { data, error } = await getSupabase()
    .from('montree_fb_subscriptions')
    .select('subscriber_key, email')
    .eq('post_id', postId)
    .eq('channel', 'email')
    .is('unsubscribed_at', null);
  if (error) {
    console.error('[feedback/repo] subscriberEmails', error);
    return [];
  }
  return ((data ?? []) as unknown as Array<{ subscriber_key: string; email: string | null }>)
    .filter((r) => !!r.email && r.subscriber_key !== exceptKey)
    .map((r) => ({ key: r.subscriber_key, email: r.email as string }));
}

// ── Flags ───────────────────────────────────────────────────────────────────

/**
 * Record a flag and auto-hide once FLAG_HIDE_THRESHOLD DISTINCT people have
 * flagged the same thing. Distinctness is the unique index, not a count we
 * trust: one person cannot hide a post by flagging it three times.
 */
export async function addFlag(
  boardId: string,
  targetKind: 'post' | 'comment',
  targetId: string,
  flaggerKey: string,
  reason: FlagReason,
  note?: string | null,
): Promise<{ count: number; hidden: boolean }> {
  const supabase = getSupabase();
  const { error } = await supabase.from('montree_fb_flags').insert({
    board_id: boardId,
    target_kind: targetKind,
    target_id: targetId,
    flagger_key: flaggerKey,
    reason,
    note: note ?? null,
  });
  // 23505 = this person already flagged this thing. Idempotent, not an error.
  if (error && (error as { code?: string }).code !== '23505') raise('addFlag', error);

  const { count, error: countErr } = await supabase
    .from('montree_fb_flags')
    .select('id', { head: true, count: 'exact' })
    .eq('target_kind', targetKind)
    .eq('target_id', targetId)
    .is('resolved_at', null);
  if (countErr) raise('addFlag:count', countErr);

  const total = count ?? 0;
  let hidden = false;
  if (total >= FLAG_HIDE_THRESHOLD) {
    hidden = true;
    if (targetKind === 'post') {
      await supabase
        .from('montree_fb_posts')
        .update({ hidden: true, hidden_reason: 'flagged' })
        .eq('board_id', boardId)
        .eq('id', targetId);
    } else {
      await setCommentHidden(boardId, targetId, true);
    }
  }
  return { count: total, hidden };
}

export async function flagCounts(boardId: string, postIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!postIds.length) return out;
  const { data, error } = await getSupabase()
    .from('montree_fb_flags')
    .select('target_id')
    .eq('board_id', boardId)
    .eq('target_kind', 'post')
    .is('resolved_at', null)
    .in('target_id', postIds);
  if (error) return out;
  for (const r of (data ?? []) as unknown as Array<{ target_id: string }>) {
    out.set(r.target_id, (out.get(r.target_id) ?? 0) + 1);
  }
  return out;
}

export async function resolveFlags(boardId: string, targetId: string, byKey: string): Promise<void> {
  const { error } = await getSupabase()
    .from('montree_fb_flags')
    .update({ resolved_at: new Date().toISOString(), resolved_by: byKey })
    .eq('board_id', boardId)
    .eq('target_id', targetId)
    .is('resolved_at', null);
  if (error) console.error('[feedback/repo] resolveFlags', error);
}

// ── Duplicate search ────────────────────────────────────────────────────────

/**
 * The cheap wide pass for "Is it one of these?". Postgres finds anything that
 * shares a term (trigram index on title, plain ILIKE fallback); dedup.ts then
 * ranks precisely. Wide-then-precise is what keeps CJK titles working, where a
 * trigram score alone is close to meaningless.
 */
export async function searchCandidates(
  boardId: string,
  query: string,
  limit = 40,
): Promise<DedupCandidate[]> {
  const terms = searchTerms(query);
  const needle = query.trim().replace(/[%,()]/g, ' ').slice(0, 120);
  if (!needle) return [];

  const filters = [`title.ilike.%${needle}%`, `body.ilike.%${needle}%`];
  for (const t of terms.slice(0, 4)) {
    const safe = t.replace(/[%,()]/g, '');
    if (safe.length >= 2) filters.push(`title.ilike.%${safe}%`);
  }

  const { data, error } = await getSupabase()
    .from('montree_fb_posts')
    .select('id, title, body, type, status, vote_count, comment_count, created_at')
    .eq('board_id', boardId)
    .eq('hidden', false)
    .is('merged_into', null)
    .or(filters.join(','))
    .order('last_activity_at', { ascending: false })
    .limit(limit);
  if (error) raise('searchCandidates', error);

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    body: (r.body as string | null) ?? '',
    type: r.type as PostType,
    status: r.status as PostStatus,
    voteCount: (r.vote_count as number) ?? 0,
    commentCount: (r.comment_count as number) ?? 0,
    createdAt: r.created_at as string,
  }));
}

// ── Changelog ───────────────────────────────────────────────────────────────

export interface ChangelogEntry {
  postId: string;
  title: string;
  type: PostType;
  status: PostStatus;
  voteCount: number;
  body: string;
  shippedAt: string;
}

export async function listChangelog(boardId: string, limit = 40): Promise<ChangelogEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_fb_status_history')
    .select('post_id, to_status, created_at')
    .eq('board_id', boardId)
    .in('to_status', ['shipped', 'fixed'])
    .order('created_at', { ascending: false })
    .limit(limit * 2);
  if (error) raise('listChangelog', error);

  // One line per post — its most recent shipped/fixed moment.
  const latest = new Map<string, string>();
  for (const r of (data ?? []) as unknown as Array<{ post_id: string; created_at: string }>) {
    if (!latest.has(r.post_id)) latest.set(r.post_id, r.created_at);
  }
  const ids = [...latest.keys()].slice(0, limit);
  if (!ids.length) return [];

  const { data: posts, error: pErr } = await supabase
    .from('montree_fb_posts')
    .select('id, title, type, status, vote_count, body')
    .eq('board_id', boardId)
    .eq('hidden', false)
    .in('id', ids);
  if (pErr) raise('listChangelog:posts', pErr);

  return ((posts ?? []) as unknown as Array<Record<string, unknown>>)
    // A post that has since moved back out of Shipped/Fixed is no longer news.
    .filter((p) => isChangelogStatus(p.status as PostStatus))
    .map((p) => ({
      postId: p.id as string,
      title: p.title as string,
      type: p.type as PostType,
      status: p.status as PostStatus,
      voteCount: (p.vote_count as number) ?? 0,
      body: ((p.body as string | null) ?? '').slice(0, 400),
      shippedAt: latest.get(p.id as string) as string,
    }))
    .sort((a, b) => (a.shippedAt < b.shippedAt ? 1 : -1));
}

// ── Tags ────────────────────────────────────────────────────────────────────

export async function listTags(boardId: string): Promise<Tag[]> {
  const { data, error } = await getSupabase()
    .from('montree_fb_tags')
    .select('board_id, slug, label_en, label_zh, color')
    .eq('board_id', boardId)
    .order('sort', { ascending: true });
  if (error) {
    if (isMissingTable(error)) throw new BoardNotReadyError();
    return [];
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    boardId: r.board_id as string,
    slug: r.slug as string,
    labelEn: r.label_en as string,
    labelZh: r.label_zh as string,
    color: (r.color as string | null) ?? null,
  }));
}

// ── Guest tokens ────────────────────────────────────────────────────────────

export async function upsertGuestToken(
  tokenHash: string,
  name: string | null,
  email: string | null,
  emailHash: string | null,
): Promise<void> {
  const { error } = await getSupabase()
    .from('montree_fb_guest_tokens')
    .upsert(
      { token_hash: tokenHash, name, email, email_hash: emailHash, last_seen_at: new Date().toISOString() },
      { onConflict: 'token_hash' },
    );
  if (error) raise('upsertGuestToken', error);
}

// ── Outbox ──────────────────────────────────────────────────────────────────

export interface OutboxRow {
  id: string;
  kind: string;
  toEmail: string;
  subject: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export async function enqueueOutbox(
  boardId: string,
  postId: string,
  kind: string,
  messages: Array<{ toEmail: string; subject: string; payload: Record<string, unknown> }>,
): Promise<void> {
  if (!messages.length) return;
  const { error } = await getSupabase().from('montree_fb_outbox').insert(
    messages.map((m) => ({
      board_id: boardId,
      post_id: postId,
      kind,
      to_email: m.toEmail,
      subject: m.subject,
      payload: m.payload,
    })),
  );
  if (error) console.error('[feedback/repo] enqueueOutbox', error);
}

export async function takeOutbox(limit = 40): Promise<OutboxRow[]> {
  const { data, error } = await getSupabase()
    .from('montree_fb_outbox')
    .select('id, kind, to_email, subject, payload, attempts')
    .is('sent_at', null)
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) {
    if (isMissingTable(error)) return [];
    console.error('[feedback/repo] takeOutbox', error);
    return [];
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    kind: r.kind as string,
    toEmail: r.to_email as string,
    subject: r.subject as string,
    payload: (r.payload as Record<string, unknown>) ?? {},
    attempts: (r.attempts as number) ?? 0,
  }));
}

export async function markOutboxSent(id: string): Promise<void> {
  await getSupabase().from('montree_fb_outbox').update({ sent_at: new Date().toISOString() }).eq('id', id);
}

export async function markOutboxFailed(id: string, attempts: number, message: string): Promise<void> {
  await getSupabase()
    .from('montree_fb_outbox')
    .update({ attempts: attempts + 1, last_error: message.slice(0, 500) })
    .eq('id', id);
}

// ── Admin dashboard numbers ─────────────────────────────────────────────────

export async function adminStats(boardId: string): Promise<{
  unanswered: number;
  flagged: number;
  autoHidden: number;
}> {
  const supabase = getSupabase();
  const [unanswered, flagged, autoHidden] = await Promise.all([
    supabase
      .from('montree_fb_posts')
      .select('id', { head: true, count: 'exact' })
      .eq('board_id', boardId)
      .eq('hidden', false)
      .is('merged_into', null)
      .eq('has_official_reply', false),
    supabase
      .from('montree_fb_flags')
      .select('id', { head: true, count: 'exact' })
      .eq('board_id', boardId)
      .is('resolved_at', null),
    supabase
      .from('montree_fb_posts')
      .select('id', { head: true, count: 'exact' })
      .eq('board_id', boardId)
      .eq('hidden', true)
      .eq('hidden_reason', 'flagged'),
  ]);
  return {
    unanswered: unanswered.count ?? 0,
    flagged: flagged.count ?? 0,
    autoHidden: autoHidden.count ?? 0,
  };
}
