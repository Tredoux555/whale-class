// lib/montree/feedback/data.ts
//
// The single door every route and page walks through to reach data.
//
// In production it is repo.ts, unchanged. With FEEDBACK_FAKE_REPO=1 it is the
// in-memory fake, so the UI can be built and screenshotted against a database
// that has not had migration 359 run on it. The switch is read once at module
// load, so there is no per-call cost and no way for a request to choose.
//
// Routes say `db.listPosts(board.id, …)`. That indirection is also the seam a
// host product would use to supply its own storage.

import * as realRepo from './repo';
import * as fakeRepo from './fake-repo';

const USE_FAKE = process.env.FEEDBACK_FAKE_REPO === '1' && process.env.NODE_ENV !== 'production';

if (USE_FAKE) {
  console.warn('[feedback] FEEDBACK_FAKE_REPO=1 — serving the in-memory board. Not for production.');
}

/**
 * Typed as the real repo: the fake is a structural stand-in, and anything it
 * does not implement is a compile-time-visible gap rather than a silent one.
 */
export const db: typeof realRepo = (USE_FAKE
  ? (fakeRepo as unknown as typeof realRepo)
  : realRepo);

export const usingFakeRepo = USE_FAKE;

export { BoardNotReadyError, isMissingTable } from './repo';
export type { ChangelogEntry, CreateCommentInput, CreatePostInput, PostPatch } from './repo';
