// lib/montree/feedback/types.ts
//
// The feedback board's vocabulary. Pure types + the board-reference parser.
// Nothing here touches the database, the network or `process.env`, so every
// line is unit-testable and the module is safe to import from a client
// component.
//
// The module is deliberately board-agnostic: a board is named by a BoardRef
// string ('public' or 'school:<uuid>'), and EVERY repo call takes a boardId.
// Mounting a second board in another product is a routing question, never a
// schema question.

/** The four walls. A post is exactly one of these for its whole life. */
export type PostType = 'problem' | 'idea' | 'question' | 'discussion';

export const POST_TYPES: readonly PostType[] = [
  'problem',
  'idea',
  'question',
  'discussion',
] as const;

export function isPostType(v: unknown): v is PostType {
  return typeof v === 'string' && (POST_TYPES as readonly string[]).includes(v);
}

/**
 * Every status any type can hold. The per-type subsets live in statuses.ts —
 * this union is the storage vocabulary, not the UI one. `open` is shared by
 * all four types so a row always has a status column worth reading, including
 * Discussion, which never shows one.
 */
export type PostStatus =
  | 'open'
  | 'confirmed'
  | 'in_progress'
  | 'fixed'
  | 'wont_fix'
  | 'under_review'
  | 'planned'
  | 'shipped'
  | 'declined'
  | 'answered';

export const POST_STATUSES: readonly PostStatus[] = [
  'open',
  'confirmed',
  'in_progress',
  'fixed',
  'wont_fix',
  'under_review',
  'planned',
  'shipped',
  'declined',
  'answered',
] as const;

export function isPostStatus(v: unknown): v is PostStatus {
  return typeof v === 'string' && (POST_STATUSES as readonly string[]).includes(v);
}

/** Board list ordering. `unanswered` is a sort, not a filter — it ranks posts
 *  with no team reply first and then falls back to trending. */
export type SortKey = 'trending' | 'new' | 'top' | 'unanswered';
export const SORT_KEYS: readonly SortKey[] = ['trending', 'new', 'top', 'unanswered'] as const;
export function isSortKey(v: unknown): v is SortKey {
  return typeof v === 'string' && (SORT_KEYS as readonly string[]).includes(v);
}

export type Lang = 'en' | 'zh';
export function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'zh';
}

// ── Boards ──────────────────────────────────────────────────────────────────

/**
 * The three kinds of board.
 *
 *   public            one board, the Montree product board, anyone may read.
 *   school:<uuid>     private to one school; tenancy enforced in board.ts.
 *   product:<slug>    public-readable, one per product surface (the Dark
 *                     Phonics hub is the first). Added 2026-09-17. It is a
 *                     PUBLIC board in every respect that matters — same admin
 *                     rule, same identity, same write gate — and exists only so
 *                     that two products do not have to share one wall.
 */
export type BoardScope = 'public' | 'school' | 'product';

/** How a board is named in a URL or a component prop:
 *  'public' | 'school:<id>' | 'product:<slug>'. */
export type BoardRef = string;

export interface ParsedBoardRef {
  scope: BoardScope;
  /** null for the public board; the school's uuid for a school board. */
  schoolId: string | null;
  /** The product slug for a product board; null otherwise. */
  slug: string | null;
  /** The canonical spelling, so 'SCHOOL:abc' and ' school:abc ' both normalise. */
  ref: BoardRef;
}

/** A product slug: lower-case letters, digits and single hyphens, 2–48 chars.
 *  Narrow on purpose — the slug ends up in a board ref, a URL and a table. */
export const PRODUCT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Parse a board reference. Returns null for anything that is not exactly
 * 'public' or 'school:<id>' — callers turn that into a 400, never a default,
 * because silently falling back to the PUBLIC board when a school ref is
 * malformed would publish a private board's post to the world.
 */
export function parseBoardRef(raw: unknown): ParsedBoardRef | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  if (s === '' || s === 'public') {
    return { scope: 'public', schoolId: null, slug: null, ref: 'public' };
  }

  if (s.startsWith('product:')) {
    const slug = s.slice('product:'.length).trim();
    // Same posture as the school branch: a shape that is not a slug is a 400,
    // never a quiet fallback to the public board.
    if (!PRODUCT_SLUG_RE.test(slug) || slug.length < 2 || slug.length > 48) return null;
    return { scope: 'product', schoolId: null, slug, ref: `product:${slug}` };
  }

  if (!s.startsWith('school:')) return null;
  const id = s.slice('school:'.length).trim();
  // School ids in this codebase are uuids. Accept the uuid shape only: an
  // arbitrary string here would become a board row keyed on nonsense.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return null;
  return { scope: 'school', schoolId: id, slug: null, ref: `school:${id}` };
}

export interface Board {
  id: string;
  ref: BoardRef;
  scope: BoardScope;
  schoolId: string | null;
  name: string;
  localeDefault: Lang;
}

// ── Identity ────────────────────────────────────────────────────────────────

export type ViewerKind = 'user' | 'guest' | 'anon';

/**
 * Who is looking. Produced by identity.ts from cookies only — never from a
 * request body, so a caller cannot name themselves an admin.
 *
 * `key` is the vote/subscription identity ('user:<id>' | 'guest:<hash>') and is
 * null for anon, which is exactly why anon cannot vote or subscribe.
 */
export interface Viewer {
  kind: ViewerKind;
  key: string | null;
  displayName: string | null;
  /** 'teacher' | 'principal' | 'homeschool_parent' | 'community' | 'guest' … */
  role: string | null;
  isAdmin: boolean;
  userId?: string;
  guestTokenHash?: string;
  /** Guest email, for notifications only. NEVER rendered or returned to a client. */
  email?: string | null;
}

export const ANON_VIEWER: Viewer = {
  kind: 'anon',
  key: null,
  displayName: null,
  role: null,
  isAdmin: false,
};

// ── Posts, comments, the rest ───────────────────────────────────────────────

export type AuthorKind = 'user' | 'guest';

/** The Problem template, stored in posts.template as jsonb. */
export interface ProblemTemplate {
  what?: string;
  expected?: string;
  where?: string;
  /** Auto-captured, editable by the author before posting. */
  userAgent?: string;
  url?: string;
}

export interface Post {
  id: string;
  boardId: string;
  type: PostType;
  title: string;
  body: string;
  template: ProblemTemplate | null;
  status: PostStatus;
  authorKind: AuthorKind;
  authorId: string | null;
  authorName: string;
  authorRole: string | null;
  tags: string[];
  screenshotPath: string | null;
  voteCount: number;
  commentCount: number;
  lastActivityAt: string;
  pinned: boolean;
  hidden: boolean;
  mergedInto: string | null;
  hasOfficialReply: boolean;
  createdAt: string;
  updatedAt: string;
  /** Set per-request from the viewer's key; not a column. */
  viewerHasVoted?: boolean;
  viewerSubscribed?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  body: string;
  authorKind: AuthorKind;
  authorId: string | null;
  authorName: string;
  authorRole: string | null;
  isOfficial: boolean;
  isAnswer: boolean;
  quoteOf: string | null;
  /** Denormalised at read time so the UI can render the quote without a join. */
  quoteAuthorName?: string | null;
  quoteExcerpt?: string | null;
  hidden: boolean;
  createdAt: string;
  /** Set at read time by repo.listComments when it is told the post's author
   *  key. NOT a column, and the key itself never leaves the server. */
  isAuthor?: boolean;
}

export interface StatusChange {
  id: string;
  postId: string;
  fromStatus: PostStatus | null;
  toStatus: PostStatus;
  byName: string | null;
  note: string | null;
  createdAt: string;
}

export interface Tag {
  boardId: string;
  slug: string;
  labelEn: string;
  labelZh: string;
  color: string | null;
}

export type FlagReason = 'spam' | 'rude' | 'private_info' | 'other';
export const FLAG_REASONS: readonly FlagReason[] = ['spam', 'rude', 'private_info', 'other'] as const;
export function isFlagReason(v: unknown): v is FlagReason {
  return typeof v === 'string' && (FLAG_REASONS as readonly string[]).includes(v);
}

/** Distinct flaggers needed before a post or comment auto-hides. */
export const FLAG_HIDE_THRESHOLD = 3;

export interface ListQuery {
  q?: string;
  type?: PostType;
  status?: PostStatus;
  sort?: SortKey;
  cursor?: string | null;
  limit?: number;
  /** Admin queue only. */
  includeHidden?: boolean;
  flaggedOnly?: boolean;
}

export interface ListResult {
  posts: Post[];
  nextCursor: string | null;
  counts: Record<PostType | 'all', number>;
}
