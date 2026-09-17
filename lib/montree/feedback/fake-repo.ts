// lib/montree/feedback/fake-repo.ts
//
// An in-memory stand-in for repo.ts, behind FEEDBACK_FAKE_REPO=1.
//
// WHY IT EXISTS: the board's pages and components have to be looked at on a
// real screen before anyone will believe they are right, and a developer
// machine usually points at a database where migration 359 has not been run.
// Without this, the only way to see the UI is to run the migration against
// production, which is exactly the wrong order.
//
// It is NOT a test double for correctness. Route-auth and repo tests use their
// own fakes with assertions; this one exists to make pixels appear. It keeps
// its state in a module-level object, which means it resets on every reload in
// dev and is meaningless in a multi-process deployment — both fine, and both
// reasons it must never be switched on in production.

import type {
  Board,
  Comment,
  FlagReason,
  ListQuery,
  ListResult,
  Post,
  PostStatus,
  PostType,
  StatusChange,
  Tag,
} from './types';
import { POST_TYPES } from './types';
import type { DedupCandidate } from './dedup';
import type { ChangelogEntry, CreateCommentInput, CreatePostInput, PostPatch, OutboxRow } from './repo';
import { decodeCursor, encodeCursor } from './repo';

const BOARD: Board = {
  id: 'fake-public-board',
  ref: 'public',
  scope: 'public',
  schoolId: null,
  name: 'Montree product board',
  localeDefault: 'en',
};

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

let seq = 0;
function id(prefix: string): string {
  seq += 1;
  // A REAL uuid shape (hex only): the routes' isUuid() guards are part of what
  // the fake board is there to exercise, so an id they would reject is useless.
  const head = Array.from(prefix)
    .map((c) => (c.charCodeAt(0) % 16).toString(16))
    .join('')
    .padEnd(8, '0')
    .slice(0, 8);
  return `${head}-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

function post(p: Partial<Post> & Pick<Post, 'type' | 'title'>): Post {
  return {
    id: id(p.type),
    boardId: BOARD.id,
    body: '',
    template: null,
    status: 'open',
    authorKind: 'user',
    authorId: null,
    authorName: 'Lin W.',
    authorRole: 'parent',
    tags: [],
    screenshotPath: null,
    voteCount: 0,
    commentCount: 0,
    hasOfficialReply: false,
    lastActivityAt: hoursAgo(2),
    pinned: false,
    hidden: false,
    mergedInto: null,
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
    ...p,
  } as Post;
}

// The seed mirrors the design canvas exactly, so a screenshot of the running
// app can be held next to the artboard and compared line for line.
const posts: Post[] = [
  post({
    type: 'problem',
    title: 'Photos upload twice on iPhone',
    status: 'in_progress',
    body: '',
    template: {
      what: "I added four photos to J.L.'s Friday album and eight appeared, each one twice. Deleting one copy removes both.",
      expected: 'Four photos, once each, in the order I picked them.',
      where: 'Daily album',
      userAgent: 'iPhone 13, Safari 18',
      url: '/montree/album/2026-09-12',
    },
    authorName: 'Lin W.',
    authorRole: 'parent',
    voteCount: 24,
    commentCount: 4,
    hasOfficialReply: true,
    lastActivityAt: hoursAgo(1),
    createdAt: hoursAgo(2),
  }),
  post({
    type: 'idea',
    title: 'Let parents see the weekly summary in Chinese',
    status: 'planned',
    body: 'Half of our families read Chinese first. The Friday summary is the one thing they all open, and right now it only comes in English.',
    authorName: 'Mei H.',
    authorRole: 'parent',
    voteCount: 41,
    commentCount: 9,
    hasOfficialReply: true,
    lastActivityAt: hoursAgo(5),
    createdAt: hoursAgo(5),
  }),
  post({
    type: 'question',
    title: 'How do I add a second teacher to my classroom?',
    status: 'open',
    body: 'We are taking on a co-teacher next month and I cannot find where to invite her. She needs to write observation notes but should not see the fee page.',
    authorName: 'Sofia R.',
    authorRole: 'teacher',
    voteCount: 0,
    commentCount: 0,
    hasOfficialReply: false,
    lastActivityAt: hoursAgo(26),
    createdAt: hoursAgo(26),
  }),
  post({
    type: 'discussion',
    title: 'What do you use for phonics at home?',
    status: 'open',
    body: 'Curious what the other families are doing between school days. We do ten minutes of sound games before dinner and not much else.',
    authorName: 'Daniel O.',
    authorRole: 'parent',
    voteCount: 0,
    commentCount: 17,
    lastActivityAt: hoursAgo(50),
    createdAt: hoursAgo(50),
  }),
  post({
    type: 'problem',
    title: 'Attendance export misses half-days',
    status: 'fixed',
    body: '',
    template: { what: 'Morning-only children are rounded away in the CSV.', expected: 'They should export as 0.5.' },
    authorName: 'Ana T.',
    authorRole: 'teacher',
    voteCount: 12,
    commentCount: 6,
    hasOfficialReply: true,
    lastActivityAt: hoursAgo(72),
    createdAt: hoursAgo(200),
  }),
  post({
    type: 'idea',
    title: 'Batch-print the weekly work plans for a whole class',
    status: 'under_review',
    body: 'Printing twenty plans one at a time on a Friday afternoon is twenty minutes I do not have.',
    authorName: 'Ana T.',
    authorRole: 'teacher',
    voteCount: 8,
    commentCount: 3,
    lastActivityAt: hoursAgo(96),
    createdAt: hoursAgo(96),
  }),
  post({
    type: 'idea',
    title: 'Add a parent-to-parent direct message inbox',
    status: 'declined',
    body: 'It would be easier to arrange playdates inside the app.',
    authorName: 'Ravi S.',
    authorRole: 'parent',
    voteCount: 5,
    commentCount: 11,
    hasOfficialReply: true,
    lastActivityAt: hoursAgo(180),
    createdAt: hoursAgo(180),
  }),
];

const comments: Comment[] = [
  {
    id: id('cmt'),
    postId: posts[0].id,
    body: 'Confirmed — it is the retry in the iOS uploader firing before the first request finishes, so Safari sends the file twice. A fix is in this week’s build and we will move this to Fixed here when it is live.\n\nUntil then: delete both copies and re-add one photo at a time. Nothing is lost.',
    authorKind: 'user',
    authorId: null,
    authorName: 'Anya P.',
    authorRole: 'principal',
    isOfficial: true,
    isAnswer: false,
    quoteOf: null,
    hidden: false,
    createdAt: hoursAgo(1),
  },
  {
    id: id('cmt'),
    postId: posts[0].id,
    body: 'Same in our classroom, but only over the school wifi — at home on 5G it uploads once.',
    authorKind: 'user',
    authorId: null,
    authorName: 'Mei H.',
    authorRole: 'teacher',
    isOfficial: false,
    isAnswer: false,
    quoteOf: null,
    hidden: false,
    createdAt: hoursAgo(2),
  },
  {
    id: id('cmt'),
    postId: posts[0].id,
    body: 'That matches — slow connection, the retry fires. It also happened to me in the WeChat browser last term.',
    authorKind: 'user',
    authorId: null,
    authorName: 'Daniel O.',
    authorRole: 'parent',
    isOfficial: false,
    isAnswer: false,
    quoteOf: null,
    hidden: false,
    createdAt: hoursAgo(1.5),
  },
  {
    id: id('cmt'),
    postId: posts[0].id,
    body: 'Thank you for looking so fast. Happy to test the build with the same four photos.',
    authorKind: 'user',
    authorId: null,
    authorName: 'Lin W.',
    authorRole: 'parent',
    isOfficial: false,
    isAnswer: false,
    quoteOf: null,
    hidden: false,
    createdAt: hoursAgo(0.7),
  },
];
// The quote-reply on the canvas.
comments[2].quoteOf = comments[1].id;
comments[2].quoteAuthorName = comments[1].authorName;
comments[2].quoteExcerpt = 'Same in our classroom, but only over the school wifi';

const history: StatusChange[] = [
  { id: id('sh'), postId: posts[0].id, fromStatus: 'confirmed', toStatus: 'in_progress', byName: 'Anya P.', note: null, createdAt: hoursAgo(1) },
  { id: id('sh'), postId: posts[0].id, fromStatus: 'open', toStatus: 'confirmed', byName: 'Anya P.', note: null, createdAt: hoursAgo(1.2) },
  { id: id('sh'), postId: posts[0].id, fromStatus: null, toStatus: 'open', byName: null, note: null, createdAt: hoursAgo(2) },
  { id: id('sh'), postId: posts[4].id, fromStatus: 'in_progress', toStatus: 'fixed', byName: 'Anya P.', note: null, createdAt: hoursAgo(190) },
  { id: id('sh'), postId: posts[1].id, fromStatus: 'under_review', toStatus: 'planned', byName: 'Anya P.', note: null, createdAt: hoursAgo(120) },
];

const votes = new Map<string, Set<string>>();
const subs = new Map<string, Map<string, string | null>>();
const flags = new Map<string, Set<string>>();

const tags: Tag[] = [
  { boardId: BOARD.id, slug: 'photos', labelEn: 'Photos & albums', labelZh: '照片与相册', color: '#3f6b00' },
  { boardId: BOARD.id, slug: 'attendance', labelEn: 'Attendance', labelZh: '考勤', color: '#1c5385' },
  { boardId: BOARD.id, slug: 'chinese', labelEn: 'Chinese / 中文', labelZh: '中文', color: '#3f6b00' },
];

// ── The repo surface ────────────────────────────────────────────────────────

export async function getBoard(ref: string): Promise<Board | null> {
  return ref === 'public' ? BOARD : { ...BOARD, id: `fake-${ref}`, ref, scope: 'school', schoolId: null, name: 'School feedback' };
}

export async function ensureBoard(ref: string): Promise<Board | null> {
  return getBoard(ref);
}

export async function boardIsReady(): Promise<boolean> {
  return true;
}

export async function countsByType(): Promise<Record<PostType | 'all', number>> {
  const out = { all: 0, problem: 0, idea: 0, question: 0, discussion: 0 } as Record<PostType | 'all', number>;
  const live = posts.filter((p) => !p.hidden && !p.mergedInto);
  out.all = live.length;
  for (const t of POST_TYPES) out[t] = live.filter((p) => p.type === t).length;
  return out;
}

export async function listPosts(
  _boardId: string,
  query: ListQuery = {},
  viewerKey?: string | null,
): Promise<ListResult> {
  const limit = Math.min(50, query.limit ?? 20);
  const offset = decodeCursor(query.cursor);
  let rows = posts.filter((p) => !p.mergedInto);
  if (!query.includeHidden) rows = rows.filter((p) => !p.hidden);
  if (query.type) rows = rows.filter((p) => p.type === query.type);
  if (query.status) rows = rows.filter((p) => p.status === query.status);
  if (query.q) {
    const needle = query.q.toLowerCase();
    rows = rows.filter((p) => (p.title + ' ' + p.body).toLowerCase().includes(needle));
  }

  const sort = query.sort ?? 'trending';
  rows = [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === 'new') return a.createdAt < b.createdAt ? 1 : -1;
    if (sort === 'top') return b.voteCount - a.voteCount;
    if (sort === 'unanswered') {
      if (a.hasOfficialReply !== b.hasOfficialReply) return a.hasOfficialReply ? 1 : -1;
      return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
    }
    return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
  });

  const page = rows.slice(offset, offset + limit).map((p) => ({
    ...p,
    viewerHasVoted: !!viewerKey && !!votes.get(p.id)?.has(viewerKey),
  }));

  return {
    posts: page,
    nextCursor: offset + limit < rows.length ? encodeCursor(offset + limit) : null,
    counts: await countsByType(),
  };
}

export async function getPost(_boardId: string, postId: string): Promise<Post | null> {
  return posts.find((p) => p.id === postId) ?? null;
}

export async function getPostAuthorKey(): Promise<string | null> {
  return 'user:fake-author';
}

export async function listComments(
  _boardId: string,
  postId: string,
  includeHidden = false,
  markAuthorKey?: string | null,
): Promise<Comment[]> {
  const post = posts.find((p) => p.id === postId);
  return comments
    .filter((c) => c.postId === postId && (includeHidden || !c.hidden))
    .map((c) => ({ ...c, isAuthor: !!markAuthorKey && c.authorName === post?.authorName }));
}

export async function listStatusHistory(_boardId: string, postId: string): Promise<StatusChange[]> {
  return history.filter((h) => h.postId === postId);
}

export async function createPost(_boardId: string, input: CreatePostInput): Promise<Post> {
  const created = post({
    type: input.type,
    title: input.title,
    body: input.body,
    template: input.template,
    status: input.status,
    authorKind: input.authorKind,
    authorName: input.authorName,
    authorRole: input.authorRole,
    tags: input.tags ?? [],
    screenshotPath: input.screenshotPath ?? null,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  });
  posts.unshift(created);
  return created;
}

export async function updatePost(
  _boardId: string,
  postId: string,
  patch: PostPatch,
  actor: { key: string | null; name: string | null },
  previousStatus: PostStatus,
): Promise<Post> {
  const p = posts.find((x) => x.id === postId);
  if (!p) throw new Error('no such post');
  if (patch.status !== undefined) p.status = patch.status;
  if (patch.tags !== undefined) p.tags = patch.tags;
  if (patch.pinned !== undefined) p.pinned = patch.pinned;
  if (patch.hidden !== undefined) p.hidden = patch.hidden;
  if (patch.status && patch.status !== previousStatus) {
    history.unshift({
      id: id('sh'),
      postId,
      fromStatus: previousStatus,
      toStatus: patch.status,
      byName: actor.name,
      note: patch.note ?? null,
      createdAt: new Date().toISOString(),
    });
  }
  return p;
}

export async function mergePosts(_boardId: string, duplicateId: string, survivorId: string): Promise<void> {
  const dup = posts.find((p) => p.id === duplicateId);
  const sur = posts.find((p) => p.id === survivorId);
  if (!dup || !sur) throw new Error('merge: both posts must exist on this board');
  const dupVotes = votes.get(duplicateId) ?? new Set();
  const surVotes = votes.get(survivorId) ?? new Set();
  for (const v of dupVotes) surVotes.add(v);
  votes.set(survivorId, surVotes);
  sur.voteCount = Math.max(sur.voteCount, surVotes.size);
  dup.mergedInto = survivorId;
  dup.hidden = true;
}

export async function createComment(
  _boardId: string,
  postId: string,
  input: CreateCommentInput,
): Promise<Comment> {
  const c: Comment = {
    id: id('cmt'),
    postId,
    body: input.body,
    authorKind: input.authorKind,
    authorId: input.authorId,
    authorName: input.authorName,
    authorRole: input.authorRole,
    isOfficial: input.isOfficial,
    isAnswer: false,
    quoteOf: input.quoteOf,
    hidden: false,
    createdAt: new Date().toISOString(),
  };
  comments.push(c);
  const p = posts.find((x) => x.id === postId);
  if (p) {
    p.commentCount += 1;
    p.lastActivityAt = c.createdAt;
    if (input.isOfficial) p.hasOfficialReply = true;
  }
  return c;
}

export async function markAnswer(_boardId: string, postId: string, commentId: string): Promise<void> {
  for (const c of comments) if (c.postId === postId) c.isAnswer = c.id === commentId;
}

export async function setCommentHidden(_boardId: string, commentId: string, hidden: boolean): Promise<void> {
  const c = comments.find((x) => x.id === commentId);
  if (c) c.hidden = hidden;
}

export async function toggleVote(
  _boardId: string,
  postId: string,
  voterKey: string,
): Promise<{ voted: boolean; count: number }> {
  const set = votes.get(postId) ?? new Set<string>();
  const had = set.has(voterKey);
  if (had) set.delete(voterKey);
  else set.add(voterKey);
  votes.set(postId, set);
  const p = posts.find((x) => x.id === postId);
  if (p) p.voteCount = Math.max(0, p.voteCount + (had ? -1 : 1));
  return { voted: !had, count: p?.voteCount ?? set.size };
}

export async function viewerVotes(postIds: string[], voterKey: string): Promise<Set<string>> {
  return new Set(postIds.filter((pid) => votes.get(pid)?.has(voterKey)));
}

export async function subscribe(postId: string, key: string, email: string | null): Promise<void> {
  const m = subs.get(postId) ?? new Map<string, string | null>();
  m.set(key, email);
  subs.set(postId, m);
}

export async function unsubscribe(postId: string, key: string): Promise<void> {
  subs.get(postId)?.delete(key);
}

export async function isSubscribed(postId: string, key: string): Promise<boolean> {
  return !!subs.get(postId)?.has(key);
}

export async function countSubscribers(postId: string): Promise<number> {
  return subs.get(postId)?.size ?? 0;
}

export async function subscriberEmails(): Promise<Array<{ key: string; email: string }>> {
  return [];
}

export async function addFlag(
  _boardId: string,
  targetKind: 'post' | 'comment',
  targetId: string,
  flaggerKey: string,
  reason: FlagReason,
): Promise<{ count: number; hidden: boolean }> {
  const k = `${targetKind}:${targetId}:${reason ? '' : ''}`.replace(/:$/, '');
  const set = flags.get(k) ?? new Set<string>();
  set.add(flaggerKey);
  flags.set(k, set);
  const hidden = set.size >= 3;
  if (hidden && targetKind === 'post') {
    const p = posts.find((x) => x.id === targetId);
    if (p) p.hidden = true;
  }
  return { count: set.size, hidden };
}

export async function flagCounts(): Promise<Map<string, number>> {
  return new Map();
}

export async function resolveFlags(): Promise<void> {}

export async function searchCandidates(_boardId: string, query: string): Promise<DedupCandidate[]> {
  const needle = query.toLowerCase();
  return posts
    .filter((p) => !p.hidden && (p.title.toLowerCase().includes(needle) || needle.length > 3))
    .map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      type: p.type,
      status: p.status,
      voteCount: p.voteCount,
      commentCount: p.commentCount,
      createdAt: p.createdAt,
    }));
}

export async function listChangelog(): Promise<ChangelogEntry[]> {
  return history
    .filter((h) => h.toStatus === 'shipped' || h.toStatus === 'fixed')
    .map((h) => {
      const p = posts.find((x) => x.id === h.postId);
      if (!p) return null;
      return {
        postId: p.id,
        title: p.title,
        type: p.type,
        status: p.status,
        voteCount: p.voteCount,
        body: p.body || p.template?.what || '',
        shippedAt: h.createdAt,
      };
    })
    .filter(Boolean) as ChangelogEntry[];
}

export async function listTags(): Promise<Tag[]> {
  return tags;
}

export async function upsertGuestToken(): Promise<void> {}

export async function enqueueOutbox(): Promise<void> {}

export async function takeOutbox(): Promise<OutboxRow[]> {
  return [];
}

export async function markOutboxSent(): Promise<void> {}

export async function markOutboxFailed(): Promise<void> {}

export async function adminStats(): Promise<{ unanswered: number; flagged: number; autoHidden: number }> {
  return {
    unanswered: posts.filter((p) => !p.hasOfficialReply && !p.hidden).length,
    flagged: 2,
    autoHidden: posts.filter((p) => p.hidden).length,
  };
}

export { decodeCursor, encodeCursor };
export { BoardNotReadyError, isMissingTable } from './repo';
