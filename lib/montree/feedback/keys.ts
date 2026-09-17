// lib/montree/feedback/keys.ts
//
// Identity keys and the hashing behind them. Server-only (node:crypto).
//
// Three separate things, deliberately not one:
//   · the GUEST TOKEN — a random secret in an httpOnly cookie. The browser
//     holds it; the database never does.
//   · the TOKEN HASH — HMAC-SHA256 of that token. This is what the database
//     stores and what a voter/subscriber key is built from. A dump of every
//     montree_fb_* table therefore contains nothing that can be replayed as a
//     guest's identity.
//   · the EMAIL HASH — HMAC of the normalised address, so we can tell "this
//     guest again" apart from "a new guest" without a second plaintext copy of
//     an address the board must never render.
//
// Guest emails ARE stored in plaintext in montree_fb_subscriptions, because a
// notification has to be delivered to something. They are never selected into
// any API response — see repo.ts, which lists its columns explicitly for
// exactly this reason.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * The HMAC key. Its own variable so a leak of the JWT secret does not also let
 * an attacker recompute every guest key — but it falls back to MONTREE_JWT_SECRET
 * so the module works on day one with no new Railway variable.
 *
 * Throws when neither is set. Failing closed is right: a silent fallback to a
 * constant would make every guest on every deployment share a key space.
 */
export function getFeedbackSecret(): string {
  const secret = process.env.FEEDBACK_TOKEN_SECRET || process.env.MONTREE_JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'FEEDBACK_TOKEN_SECRET (or MONTREE_JWT_SECRET) is required for the feedback board: ' +
        'set 32+ random bytes. Guest identity hashing fails closed without it.',
    );
  }
  return secret;
}

function hmacHex(input: string, label: string): string {
  return createHmac('sha256', getFeedbackSecret()).update(`${label}:${input}`).digest('hex');
}

/** A fresh guest secret for the httpOnly `fb_guest` cookie. 256 bits. */
export function newGuestToken(): string {
  return randomBytes(32).toString('hex');
}

/** What the DB stores for a guest. Same token always gives the same hash. */
export function hashGuestToken(token: string): string {
  return hmacHex(token, 'guest-token');
}

/** Lower-cased, trimmed. Not a validator — see validate.ts for that. */
export function normaliseEmail(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

/** Stable pseudonym for an address, for dedup and abuse counting. */
export function hashEmail(raw: string): string {
  return hmacHex(normaliseEmail(raw), 'email');
}

/** Rate-limit bucket for an IP. The IP itself is never written to our tables. */
export function hashIp(ip: string): string {
  return hmacHex(String(ip || 'unknown').trim(), 'ip').slice(0, 32);
}

// ── Voter / subscriber keys ─────────────────────────────────────────────────
//
// One namespaced string is the whole identity model for votes and
// subscriptions. A unique index on (post_id, voter_key) is then the entire
// "one vote per person" rule — no application-side counting to get wrong.

export function userKey(userId: string): string {
  return `user:${userId}`;
}

export function communityKey(accountId: string): string {
  return `community:${accountId}`;
}

export function guestKey(tokenHash: string): string {
  return `guest:${tokenHash}`;
}

export function guestKeyFromToken(token: string): string {
  return guestKey(hashGuestToken(token));
}

export type ParsedKey =
  | { kind: 'user'; id: string }
  | { kind: 'community'; id: string }
  | { kind: 'guest'; tokenHash: string };

export function parseKey(key: string): ParsedKey | null {
  if (typeof key !== 'string') return null;
  const i = key.indexOf(':');
  if (i <= 0) return null;
  const prefix = key.slice(0, i);
  const rest = key.slice(i + 1);
  if (!rest) return null;
  if (prefix === 'user') return { kind: 'user', id: rest };
  if (prefix === 'community') return { kind: 'community', id: rest };
  if (prefix === 'guest') return { kind: 'guest', tokenHash: rest };
  return null;
}

/** Constant-time compare for two keys, used where a mismatch is a decision. */
export function keysEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Cookie names. Exported so routes and tests never spell them twice. */
export const GUEST_COOKIE = 'fb_guest';
export const LANG_COOKIE = 'fb_lang';
