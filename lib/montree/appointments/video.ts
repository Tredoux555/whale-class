// lib/montree/appointments/video.ts
//
// Pure helper that turns an appointment's ical_token into a Jitsi Meet
// room URL. No DB, no I/O, no env var dependency — just a string
// transform.
//
// CANONICAL FORMAT (architectural rule #163-#164):
//   https://meet.jit.si/montree-<first-12-chars-of-ical_token>
//
// WHY 12 CHARS:
//   - 12 chars of base64url ≈ 72 bits of entropy. Sufficient against
//     guessing (a single attacker would need ~2^72 tries to find a
//     valid room).
//   - Keep room names short enough to dictate over the phone if needed.
//   - Same prefix length as the appointment's ical token is generated
//     with (18 bytes → 24 chars base64url, we slice the first 12).
//
// WHY `montree-` PREFIX:
//   - Anti-collision posture. meet.jit.si is public — any visitor can
//     type any room name. Without a namespace, parents could accidentally
//     create a "meeting" or "test" room collision with strangers.
//   - The prefix also identifies the link as ours in logs / referrer
//     headers.
//
// REGENERATION SAFETY:
//   - The formula is deterministic, so we can regenerate URLs from
//     ical_token in code if the persisted column is ever NULL (e.g. an
//     older appointment that was booked before the migration ran). This
//     is the defense-in-depth read-time fallback.

const JITSI_BASE = 'https://meet.jit.si';
const ROOM_PREFIX = 'montree-';
const TOKEN_SLICE_LEN = 12;

/**
 * Generate the canonical Jitsi room URL for an appointment.
 *
 * Returns `null` when the input token is missing or too short, so the
 * caller can decide to surface "no video link" instead of a half-broken
 * URL. (Existing appointments booked pre-216 wouldn't have an ical_token
 * either — same null-safe path.)
 */
export function generateJitsiUrl(icalToken: string | null | undefined): string | null {
  if (!icalToken) return null;
  // Strip non-URL-safe chars defensively. base64url is already safe but
  // belt-and-braces against any future token-format change.
  const safe = icalToken.replace(/[^A-Za-z0-9_-]/g, '');
  if (safe.length < TOKEN_SLICE_LEN) return null;
  return `${JITSI_BASE}/${ROOM_PREFIX}${safe.slice(0, TOKEN_SLICE_LEN)}`;
}

/**
 * Variant URL that opens the Jitsi room with the camera muted by
 * default — same room, different first-impression. Useful for a future
 * "voice-only" appointment mode. NOT used in Phase 116.2 v1 (we only
 * surface the standard video URL) but exported so a follow-up can flip
 * one field on the appointment row and call this instead.
 */
export function generateJitsiVoiceOnlyUrl(icalToken: string | null | undefined): string | null {
  const base = generateJitsiUrl(icalToken);
  if (!base) return null;
  // Jitsi config-overwrite hash params — `#config.startWithVideoMuted=true`
  // starts the participant with camera off. They can flip it on with
  // one tap inside the room.
  return `${base}#config.startWithVideoMuted=true`;
}

/**
 * Read-time fallback. Pass either the persisted column (preferred) OR
 * the ical_token (last resort). Returns the canonical URL or null.
 *
 * Consumers should pass BOTH so a future swap to a private provider
 * (Daily.co, Whereby) can drop persisted URLs in and ignore ical_token.
 */
export function resolveVideoUrl(args: {
  videoUrlColumn: string | null | undefined;
  icalToken: string | null | undefined;
}): string | null {
  if (args.videoUrlColumn && args.videoUrlColumn.trim()) return args.videoUrlColumn;
  return generateJitsiUrl(args.icalToken);
}
