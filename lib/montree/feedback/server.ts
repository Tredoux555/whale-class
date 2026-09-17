// lib/montree/feedback/server.ts
//
// The page-side twin of board.ts.
//
// Route handlers get a NextRequest and use resolveBoardContext(). Server
// COMPONENTS have no request object — they have next/headers — so this file
// does the same job from cookies(), and returns a plain result instead of a
// NextResponse, because a page renders a friendly state where an API returns a
// status code.
//
// A page that cannot reach its board renders "board not ready" and stays
// readable. That matters more than it sounds: a developer machine pointed at a
// database without migration 359 is the normal case while this is being built,
// and a stack trace there would say the module is broken when it is not.

import { cookies, headers } from 'next/headers';
import { BoardNotReadyError, db, usingFakeRepo } from './data';
import { resolveViewer, type ReadableRequest } from './identity';
import { LANG_COOKIE } from './keys';
import { ANON_VIEWER, parseBoardRef, type Board, type Lang, type Viewer } from './types';

export interface PageContext {
  board: Board | null;
  viewer: Viewer;
  lang: Lang;
  /** True when the tables are missing — the page shows the friendly state. */
  notReady: boolean;
}

/** Build the minimal request shape identity.ts needs out of next/headers. */
async function requestLike(): Promise<ReadableRequest> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  return {
    headers: h as unknown as Headers,
    cookies: { get: (name: string) => c.get(name) ?? undefined },
  };
}

/**
 * The board's language: `?lang=` first, then the fb_lang cookie, then English.
 *
 * The query parameter exists so a link can carry the language — the way this
 * board actually travels is pasted into a WeChat group, and the person sharing
 * it knows which language that group reads.
 */
export async function readLang(override?: unknown): Promise<Lang> {
  if (override === 'zh' || override === 'en') return override;
  try {
    const c = await cookies();
    return c.get(LANG_COOKIE)?.value === 'zh' ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Resolve board + viewer + language for a server component.
 *
 * `boardRef` comes from the page, not from a query string, because a PAGE's
 * board is a property of its route. The school dashboard mounts this with
 * `school:<id>` and the public library mounts it with 'public'; neither reads
 * it off the URL, so there is nothing for a visitor to tamper with. Tenancy
 * for a school board is enforced by the API routes the client then calls, and
 * by the dashboard layout that renders the page at all.
 */
export async function getPageContext(boardRef = 'public', langOverride?: unknown): Promise<PageContext> {
  const lang = await readLang(langOverride);
  const parsed = parseBoardRef(boardRef);
  if (!parsed) {
    return { board: null, viewer: { ...ANON_VIEWER }, lang, notReady: true };
  }

  let board: Board | null = null;
  try {
    board =
      parsed.scope === 'public'
        ? await db.getBoard('public')
        : await db.ensureBoard(parsed.ref, 'school', parsed.schoolId, 'School feedback');
  } catch (err) {
    if (err instanceof BoardNotReadyError) {
      return { board: null, viewer: { ...ANON_VIEWER }, lang, notReady: true };
    }
    console.error('[feedback/server] board lookup failed', err);
    return { board: null, viewer: { ...ANON_VIEWER }, lang, notReady: true };
  }

  if (!board) return { board: null, viewer: { ...ANON_VIEWER }, lang, notReady: true };

  let viewer: Viewer = { ...ANON_VIEWER };
  try {
    viewer = await resolveViewer(await requestLike(), board);
  } catch (err) {
    console.error('[feedback/server] viewer resolution failed; rendering as anon', err);
  }

  // The in-memory board has no sessions, so the admin queue would be
  // unreachable while the UI is being built. This hands it a pretend admin —
  // and it is gated on BOTH switches plus a non-production build, because the
  // one thing this must never do is grant admin on a real database.
  if (
    usingFakeRepo &&
    process.env.FEEDBACK_FAKE_ADMIN === '1' &&
    process.env.NODE_ENV !== 'production'
  ) {
    viewer = {
      kind: 'user',
      key: 'user:fake-admin',
      displayName: 'Anya P.',
      role: 'principal',
      isAdmin: true,
      userId: 'fake-admin',
    };
  }

  return { board, viewer, lang, notReady: false };
}

/** The viewer shape a client island is allowed to receive. */
export function clientViewer(viewer: Viewer) {
  return {
    kind: viewer.kind,
    displayName: viewer.displayName,
    role: viewer.role,
    isAdmin: viewer.isAdmin,
  };
}
