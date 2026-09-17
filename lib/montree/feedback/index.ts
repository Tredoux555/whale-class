// lib/montree/feedback/index.ts
//
// The module's front door. A host product should be able to mount a board
// knowing only this file and <FeedbackBoard board="…" />.
//
// NOTE ON IMPORT SAFETY: `types`, `statuses`, `dedup` and `strings` are pure
// and safe to import from a client component. `keys`, `identity`, `repo`,
// `data`, `board` and `notify` are SERVER ONLY — they reach for node:crypto,
// the service-role Supabase client and next/server. They are re-exported here
// for server callers; a client component must import the pure modules by path
// instead of pulling this barrel in.

export * from './types';
export * from './statuses';
export * from './dedup';
export * from './strings';
export * from './validate';

// Server-only surface.
export { db, usingFakeRepo, BoardNotReadyError } from './data';
export {
  resolveBoardContext,
  requireAdmin,
  requireIdentity,
  jsonError,
  boardNotReady,
  clientIp,
  publicViewer,
  type BoardContext,
} from './board';
export {
  resolveViewer,
  readCookie,
  authorFields,
  publicBoardAdminIds,
  isSuperAdminRequest,
  GUEST_COOKIE_OPTIONS,
} from './identity';
export {
  GUEST_COOKIE,
  LANG_COOKIE,
  guestKey,
  guestKeyFromToken,
  hashEmail,
  hashGuestToken,
  hashIp,
  newGuestToken,
  parseKey,
  userKey,
} from './keys';
export { drainOutbox, getMailer, notifySubscribers, setMailer, type Mailer } from './notify';
