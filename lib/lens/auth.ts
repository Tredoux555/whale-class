// lib/lens/auth.ts
// Montree Lens session plumbing. Self-contained by design — nothing in this
// file imports from lib/montree/*, and no Montree or Potato cookie can ever
// satisfy a Lens check.
//
// One audience, one cookie, the existing signing secret (ADMIN_SECRET — already
// set in Railway, so shipping this needs no new env var):
//
//   lens_observer  { observerId, aud: 'lens-observer' }
//
// 🚨 The `aud` claim is checked on every verify. This cookie is signed with the
// same secret as Montree's and Potato's tokens, so without an audience check a
// montree-auth token pasted into `lens_observer` would verify. It would still
// fail on shape, but "fails for the wrong reason" is not a security boundary.
//
// 🚨 The cookie is host-only: no `domain` attribute. Lens is served on
// montree.xyz alongside the Montree product, and a host-only cookie keeps the
// two sessions from ever being mistaken for one another at the browser level as
// well as at the claim level.
//
// 🚨 Middleware gives /api/lens/* ZERO protection — that path prefix is not in
// the middleware matcher (the matcher excludes `api` and names only specific
// /api groups, none of them Lens). Every route handler calls verifyLensObserver
// itself. There is no ambient auth.

import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest, NextResponse } from 'next/server';

// 🚨 OPEN BETA: Lens has exactly one lens_observers row in production, and
// LENS_OPEN_BETA skips the invite-code door so anyone who opens /lens is
// signed in as that one observer automatically (see resolveBetaObserver in
// route-helpers.ts and app/api/lens/auth/auto/route.ts). Flip it to false in
// lib/lens/flags.ts to restore the door — the code path below (createObserverToken,
// verifyLensObserver, the /observer route, the code form on the door page)
// stays intact behind the flag; nothing is deleted. Sourced from flags.ts
// (not defined here) because that file has no server-only imports and can
// therefore also be imported by the door page, a client component.
export { LENS_OPEN_BETA } from './flags';

export const OBSERVER_COOKIE = 'lens_observer';
const OBSERVER_AUD = 'lens-observer';

/** ~10 years. She is one person on her own phone; silent logouts are hostile. */
const TTL_DAYS = 3650;
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

export const LENS_TOKEN_TTL_DAYS = TTL_DAYS;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secretKey(): Uint8Array {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET is not set');
  return new TextEncoder().encode(secret);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TTL_SECONDS,
  };
}

export interface LensObserverSession {
  observerId: string;
}

export async function createObserverToken(observerId: string): Promise<string> {
  return new SignJWT({ observerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(OBSERVER_AUD)
    .setIssuedAt()
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(secretKey());
}

/**
 * Verify a RAW token — the envelope-agnostic half of the check below, so that
 * there is exactly one implementation of "is this a valid lens_observer token"
 * no matter how the token arrived.
 */
export async function verifyLensObserverToken(
  token: string,
): Promise<LensObserverSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: OBSERVER_AUD });
    const observerId = payload.observerId;
    if (typeof observerId !== 'string' || !UUID_RE.test(observerId)) return null;
    return { observerId };
  } catch {
    return null;
  }
}

export async function verifyLensObserver(
  request: NextRequest,
): Promise<LensObserverSession | null> {
  const token = request.cookies.get(OBSERVER_COOKIE)?.value;
  if (!token) return null;
  return verifyLensObserverToken(token);
}

export function setObserverCookie(response: NextResponse, token: string): void {
  response.cookies.set(OBSERVER_COOKIE, token, cookieOptions());
}

export function clearObserverCookie(response: NextResponse): void {
  response.cookies.set(OBSERVER_COOKIE, '', { path: '/', maxAge: 0 });
}

// ----------------------------------------------------------- rate limiting ---

/**
 * Best-effort brute-force brake on the invite-code door.
 *
 * In-memory and therefore PER SERVER INSTANCE — a speed bump, not a guarantee,
 * and it deliberately fails OPEN so a restart can never lock her out in the
 * middle of a school visit. The real protection is the 34^8 code space.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function checkLensRateLimit(key: string, max: number = MAX_ATTEMPTS): boolean {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (attempts.size > 5000) {
      for (const [k, v] of attempts) if (v.resetAt <= now) attempts.delete(k);
    }
    return true;
  }
  record.count += 1;
  return record.count <= max;
}

export function clientKey(request: NextRequest, scope: string): string {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  return `${scope}:${ip}`;
}
