// lib/potato/auth.ts
// Potato Snaps session plumbing. Self-contained by design — nothing in this
// file imports from lib/montree/*, and no Montree cookie or role can ever
// satisfy a Potato check.
//
// Two audiences, two cookies, one signing secret (ADMIN_SECRET — already set in
// Railway, so shipping this needs no new env var):
//
//   potato_teacher  { classId, aud: 'potato-teacher' }
//   potato_parent   { childId, classId, aud: 'potato-parent' }
//
// 🚨 The `aud` claim is checked on every verify. Both cookies are signed with
// the same secret as Montree's tokens, so without an audience check a Montree
// teacher token pasted into `potato_teacher` would verify. It would still fail
// on shape, but "fails for the wrong reason" is not a security boundary.
//
// 🚨 Cookies are host-only: no `domain` attribute. A session minted on
// www.teacherpotato.xyz is invisible on montree.xyz, which is exactly the
// isolation this product wants.
//
// 🚨 Middleware gives /api/potato/* ZERO protection (that path prefix is not in
// the middleware matcher). Every route handler calls one of these verifiers
// itself. There is no ambient auth.

import { SignJWT, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { STAFF_NAMES, normalizeStaffName, type StaffName } from './staff';

export const TEACHER_COOKIE = 'potato_teacher';
export const PARENT_COOKIE = 'potato_parent';

const TEACHER_AUD = 'potato-teacher';
const PARENT_AUD = 'potato-parent';

// ------------------------------------------------------------ v1.4 staff ---
// The fixed 4-person team now lives in lib/potato/staff.ts — pure data with
// no server-only imports, so the in-app teacher switcher (a client
// component, see app/potato/teacher/page.tsx) can import the roster directly
// instead of duplicating it. Re-exported here so every existing
// `from '@/lib/potato/auth'` import keeps working untouched.
export { STAFF_NAMES, normalizeStaffName, type StaffName };

/** ~10 years. A teacher on her own phone should never be silently logged out. */
const TTL_DAYS = 3650;
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

/**
 * The same TTL, exported so the standalone-app login can report an accurate
 * `expiresAt` instead of inventing one. Read-only — the number above is still
 * the single source of truth for what actually gets signed.
 */
export const POTATO_TOKEN_TTL_DAYS = TTL_DAYS;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// ---------------------------------------------------------------- teacher ---

export interface PotatoTeacherSession {
  classId: string;
  /**
   * v1.4 name-picker login. Absent on every token minted before this shipped,
   * and on a token minted through the old code-door fallback — the code door
   * has no notion of "who". `staffName` is an EXTRA claim on the same
   * { classId } shape the code door has always minted, so every existing
   * reader of this cookie (they all destructure `.classId` and ignore
   * everything else) keeps working untouched.
   */
  staffName?: StaffName;
}

export async function createTeacherToken(classId: string, staffName?: StaffName): Promise<string> {
  return new SignJWT({ classId, ...(staffName ? { staffName } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(TEACHER_AUD)
    .setIssuedAt()
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(secretKey());
}

/**
 * Verify a RAW teacher token — the envelope-agnostic half of the check below.
 *
 * The cookie reader and the standalone app's `Authorization: Bearer` reader
 * (lib/potato/app-auth.ts) both funnel through here, so there is exactly ONE
 * implementation of "is this a valid potato_teacher token": same secret, same
 * `aud`, same UUID shape check, same live-roster re-validation. A bearer token
 * is not a second credential type — it is the same JWT in a different envelope.
 */
export async function verifyPotatoTeacherToken(
  token: string,
): Promise<PotatoTeacherSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: TEACHER_AUD });
    const classId = payload.classId;
    if (typeof classId !== 'string' || !UUID_RE.test(classId)) return null;
    // Re-validated against the live roster, not just "was a string at mint
    // time" — if HQ ever drops a name from STAFF_NAMES, old cookies bearing it
    // quietly stop attributing rather than trusting a stale claim forever.
    const staffName = normalizeStaffName(payload.staffName);
    return staffName ? { classId, staffName } : { classId };
  } catch {
    return null;
  }
}

export async function verifyPotatoTeacher(
  request: NextRequest,
): Promise<PotatoTeacherSession | null> {
  const token = request.cookies.get(TEACHER_COOKIE)?.value;
  if (!token) return null;
  return verifyPotatoTeacherToken(token);
}

export function setTeacherCookie(response: NextResponse, token: string): void {
  response.cookies.set(TEACHER_COOKIE, token, cookieOptions());
}

// ----------------------------------------------------------------- parent ---

export interface PotatoParentSession {
  childId: string;
  classId: string;
}

export async function createParentToken(childId: string, classId: string): Promise<string> {
  return new SignJWT({ childId, classId })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(PARENT_AUD)
    .setIssuedAt()
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(secretKey());
}

export async function verifyPotatoParent(
  request: NextRequest,
): Promise<PotatoParentSession | null> {
  const token = request.cookies.get(PARENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: PARENT_AUD });
    const childId = payload.childId;
    const classId = payload.classId;
    if (typeof childId !== 'string' || !UUID_RE.test(childId)) return null;
    if (typeof classId !== 'string' || !UUID_RE.test(classId)) return null;
    return { childId, classId };
  } catch {
    return null;
  }
}

export function setParentCookie(response: NextResponse, token: string): void {
  response.cookies.set(PARENT_COOKIE, token, cookieOptions());
}

// ----------------------------------------------------------------- logout ---

export function clearPotatoCookies(response: NextResponse): void {
  const expire = { path: '/', maxAge: 0 };
  response.cookies.set(TEACHER_COOKIE, '', expire);
  response.cookies.set(PARENT_COOKIE, '', expire);
}

// --------------------------------------------------------------------- HQ ---

/**
 * HQ (Tredoux only) authenticates with the existing SUPER_ADMIN_PASSWORD via an
 * `x-admin-password` header.
 *
 * Both sides are SHA-256'd before comparison so timingSafeEqual always gets two
 * equal-length buffers — it throws on a length mismatch, and the length of the
 * thrown-vs-returned path is itself a side channel.
 */
export function verifyPotatoHq(request: NextRequest): boolean {
  const expected = process.env.SUPER_ADMIN_PASSWORD;
  if (!expected) return false;
  const supplied = request.headers.get('x-admin-password');
  if (!supplied) return false;
  const a = createHash('sha256').update(supplied).digest();
  const b = createHash('sha256').update(expected).digest();
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------- rate limiting ---

/**
 * Best-effort brute-force brake on the two code-entry doors.
 *
 * In-memory and therefore PER SERVER INSTANCE — this is a speed bump, not a
 * guarantee, and it deliberately fails OPEN so a restart can never lock a
 * classroom out mid-morning. The real protection is the 34^6 (≈1.5 billion)
 * code space.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;

export function checkPotatoRateLimit(key: string, max: number = MAX_ATTEMPTS): boolean {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic sweep so the map cannot grow without bound.
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

export { UUID_RE };
