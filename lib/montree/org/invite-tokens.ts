// lib/montree/org/invite-tokens.ts
//
// Invite-link tokens for the ORGANIZATION tier onboarding chain (migration 315).
//
// Two kinds of link, one mechanism:
//   • Tredoux mints an 'organization' link → an org leader registers a whole organisation.
//   • An org leader mints a 'school' link  → a principal registers a school INSIDE that org.
//
// Rules, all enforced here so both API routes and the smoke test exercise the same code:
//
//   1. 256 bits of crypto randomness per token (crypto.randomBytes(32), base64url) — far
//      beyond the 128-bit floor. These links travel through WhatsApp/WeChat screenshots;
//      they must be unguessable even to someone who has seen a hundred of them.
//   2. Only sha256(token) is ever stored. The plaintext is returned once, at issue time,
//      and cannot be recovered from the database. A stolen dump yields no working link.
//   3. 14-day default expiry. Long enough to survive a slow email thread, short enough that
//      a forgotten link in a chat history stops working.
//   4. Single use. Redemption stamps used_at; a second attempt is rejected, not silently
//      re-run (which would create a duplicate organisation).
//   5. Revocable while unused.
//
// This module is deliberately DEPENDENCY-FREE apart from node:crypto — no Supabase, no
// Next.js — so it can be unit-tested directly and reasoned about in isolation.

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** Which kind of thing this link creates when it is redeemed. */
export type OrgInviteType = 'organization' | 'school';

/** Default lifetime of an invite link, in days. */
export const INVITE_TTL_DAYS = 14;

/** Bytes of randomness per token. 32 bytes = 256 bits (the brief's floor is 128). */
const TOKEN_BYTES = 32;

/**
 * A freshly minted invite.
 *
 * `token` is the ONLY time the plaintext exists. Put it in the share link, show it to the
 * issuer, and let it fall out of memory. `tokenHash` is what goes in the database.
 */
export interface IssuedInvite {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Generate a URL-safe invite token: 32 random bytes, base64url, no padding.
 *
 * base64url rather than hex because the token rides in a path segment and a shorter link is
 * a link people will actually paste — 43 characters instead of 64, with no `+`, `/` or `=`
 * to be mangled by a chat client's link detector.
 */
export function generateInviteToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * sha256 hex of a token. The one-way function between what the invitee holds and what the
 * database holds. Trimmed before hashing so a token copied with a trailing space still works
 * — people select invite links by dragging, and they always catch the space.
 */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Constant-time comparison of two token hashes.
 *
 * The database lookup is by hash equality so this is belt-and-braces, but any place that
 * compares secrets in this codebase does it in constant time and this one is no exception.
 */
export function tokenHashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Mint a token + its hash + its expiry in one call. `ttlDays` exists for tests; production
 * callers take the default.
 */
export function issueInvite(ttlDays: number = INVITE_TTL_DAYS, now: Date = new Date()): IssuedInvite {
  const token = generateInviteToken();
  return {
    token,
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000),
  };
}

/**
 * The only two columns an invite's status depends on. Deliberately this narrow: a route that
 * selected three columns can still ask the question without having to invent the other six
 * just to satisfy a type.
 */
export interface InviteLifecycle {
  expires_at: string | Date;
  used_at: string | Date | null;
}

/**
 * What a link is right now, from the holder's point of view. `revoked` is not a state here —
 * a revoked invite is deleted, so the holder simply sees `not_found`.
 */
export type InviteStatus = 'valid' | 'used' | 'expired' | 'not_found';

/**
 * Classify an invite. Order matters and is deliberate: an invite that was USED and has since
 * expired reads as `used`, because "you already signed up with this link" is the honest,
 * useful thing to tell someone, and "this link expired" would send them back to the issuer
 * for a replacement they do not need.
 */
export function inviteStatus(invite: InviteLifecycle | null | undefined, now: Date = new Date()): InviteStatus {
  if (!invite) return 'not_found';
  if (invite.used_at) return 'used';
  if (new Date(invite.expires_at).getTime() <= now.getTime()) return 'expired';
  return 'valid';
}

/** True only for a link that can still be redeemed right now. */
export function isRedeemable(invite: InviteLifecycle | null | undefined, now: Date = new Date()): boolean {
  return inviteStatus(invite, now) === 'valid';
}

/**
 * The message shown to someone holding a link that will not work. Written for a school leader
 * who has no idea what a token is, and always ending with what to do next.
 */
export function inviteStatusMessage(status: InviteStatus): string {
  switch (status) {
    case 'used':
      return 'This invitation has already been used. If that was you, sign in instead — your account is waiting.';
    case 'expired':
      return 'This invitation has expired. Ask whoever sent it to you for a fresh link — it only takes them a moment.';
    case 'not_found':
      return 'We could not find this invitation. The link may have been copied incompletely, or it may have been withdrawn. Ask whoever sent it for a fresh one.';
    default:
      return '';
  }
}

/** Public origin for share links. Overridable so a staging deploy mints staging links. */
export const INVITE_LINK_ORIGIN =
  process.env.NEXT_PUBLIC_MONTREE_ORIGIN || 'https://montree.xyz';

/** The full share link for a token. This exact shape is what the join pages route on. */
export function inviteLinkFor(type: OrgInviteType, token: string, origin: string = INVITE_LINK_ORIGIN): string {
  const path = type === 'organization' ? '/montree/org/join/' : '/montree/school/join/';
  return `${origin.replace(/\/+$/, '')}${path}${encodeURIComponent(token)}`;
}

/**
 * Slugify an organisation name the same way principal/register slugifies a school name, so a
 * group and a school produce the same shape of identifier.
 */
export function orgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}
