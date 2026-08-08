// lib/potato/captured-at.ts
// How much to believe the device about when a photo was taken.
//
// v1.2 made capture offline-first: a photo is written to the device and
// uploaded whenever the network allows, which may be days later. The server
// therefore cannot stamp `tp_photos.captured_at` with its own clock — a Friday
// shot arriving Monday would land in the wrong week, disappear from the board
// the teacher curated against, and silently change what a film contains.
//
// So the client's shutter time is trusted, but only inside a window it cannot
// abuse. Pure and dependency-free so the harness can hammer the edges.

/** A device clock may run this far ahead before we stop believing it. */
export const CLOCK_SKEW_MS = 5 * 60 * 1000;
/** Older than this and the queue should long since have given up. */
export const MAX_CAPTURE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Why a client-supplied timestamp was refused. Null means it was accepted. */
export type CapturedAtNote = 'unparseable' | 'in_the_future' | 'too_old' | 'clamped_skew' | null;

export interface CapturedAtDecision {
  /** what to write to tp_photos.captured_at */
  capturedAt: Date;
  /** null when the client's value was used as-is */
  note: CapturedAtNote;
  /** true when the client's value survived (possibly clamped) */
  usedClientValue: boolean;
}

/**
 * Decide the capture instant.
 *
 * A bad value NEVER fails the upload — a photo with a wrong timestamp is still
 * a photo worth keeping. It falls back to `now` and the caller reports the
 * anomaly in the response so it is visible rather than swallowed.
 */
export function resolveCapturedAt(raw: unknown, now: Date = new Date()): CapturedAtDecision {
  if (typeof raw !== 'string' || raw.trim() === '') {
    // No value at all is the ordinary online path, not an anomaly.
    return { capturedAt: now, note: null, usedClientValue: false };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { capturedAt: now, note: 'unparseable', usedClientValue: false };
  }

  const drift = parsed.getTime() - now.getTime();

  if (drift > CLOCK_SKEW_MS) {
    // A device set to next month must not park photos in a future week where
    // no teacher will ever look for them.
    return { capturedAt: now, note: 'in_the_future', usedClientValue: false };
  }

  if (-drift > MAX_CAPTURE_AGE_MS) {
    return { capturedAt: now, note: 'too_old', usedClientValue: false };
  }

  if (drift > 0) {
    // A few seconds ahead is ordinary clock skew, not a lie. Clamp to now so it
    // still files under today rather than being thrown away.
    return { capturedAt: now, note: 'clamped_skew', usedClientValue: true };
  }

  return { capturedAt: parsed, note: null, usedClientValue: true };
}
