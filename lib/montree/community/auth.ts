// lib/montree/community/auth.ts
// Server-side auth for the Teachers' Room (public SATPIN library community).
//
// 🚨 DELIBERATELY SEPARATE FROM THE TEACHER/PRINCIPAL SESSION.
// A Teachers'-Room account is tenant-less: no school, no classroom, no access
// to any school's data. It exists to sign a public message and attach a public
// file. Two hard separations keep it that way and must not be softened:
//
//   1. Its own cookie (montree_community) — never the montree-auth cookie.
//   2. Its own audience claim (aud = montree-community) on a token that also
//      carries NO schoolId/role. Even though it is signed with the same secret
//      as the app token (one secret to rotate), verifyMontreeToken() rejects it
//      (no schoolId/role) and verifyCommunityToken() rejects an app token
//      (wrong audience). The two families can never be swapped.
//
// Every helper here fails CLOSED and never throws at the caller: a missing
// migration (42P01), an unreachable DB or a tampered cookie all resolve to
// "not signed in", which is exactly the state the public page renders anyway.

import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';
import { compare as bcryptCompare, hash as bcryptHash } from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { isMissingTable, migrationPending } from './http';

/** Cookie holding the community session. Distinct from MONTREE_AUTH_COOKIE. */
export const COMMUNITY_COOKIE = 'montree_community';

/** Audience claim — the wall between community tokens and app tokens. */
const COMMUNITY_AUDIENCE = 'montree-community';

/** A year. These are public-board accounts on a teacher's own device. */
const COMMUNITY_TTL_DAYS = 365;

/** bcrypt cost. Matches the app's posture for password hashing. */
const BCRYPT_ROUNDS = 12;

/**
 * A bcrypt hash of a value nobody knows, used to burn the same CPU time on a
 * miss as on a hit so login timing can't be used to enumerate addresses.
 * (Cost 12 to match BCRYPT_ROUNDS; the value itself is irrelevant.)
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO3S1i1eZDS8Q8SLZ2XwFn5wZ.LmxYfRq';

// Lazy secret — evaluated on first use, never at import time, so a build
// without env vars can't fail. Same source as lib/montree/server-auth.ts.
let _secretKey: Uint8Array | null = null;
function getSecretKey(): Uint8Array {
  if (!_secretKey) {
    const secret = process.env.MONTREE_JWT_SECRET || process.env.ADMIN_SECRET;
    if (!secret) {
      throw new Error('MONTREE_JWT_SECRET or ADMIN_SECRET environment variable is required');
    }
    _secretKey = new TextEncoder().encode(secret);
  }
  return _secretKey;
}

export interface CommunityUser {
  id: string;
  email: string;
  displayName: string;
  /** Email confirmed — the gate on posting and uploading. */
  confirmed: boolean;
  isBanned: boolean;
}

// ============================================
// TOKENS + COOKIE
// ============================================

export async function createCommunityToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience(COMMUNITY_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${COMMUNITY_TTL_DAYS}d`)
    .sign(getSecretKey());
}

/** Returns the user id, or null for anything invalid/expired/wrong-audience. */
export async function verifyCommunityToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      audience: COMMUNITY_AUDIENCE,
    });
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

export function setCommunityCookie(response: NextResponse, token: string): void {
  response.cookies.set(COMMUNITY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COMMUNITY_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearCommunityCookie(response: NextResponse): void {
  response.cookies.set(COMMUNITY_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// ============================================
// PASSWORDS + TOKENS
// ============================================

export async function hashCommunityPassword(password: string): Promise<string> {
  return bcryptHash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password. `hash` may be null/empty (row missing or malformed) — we
 * still burn a bcrypt round against a dummy hash so the timing is flat.
 */
export async function verifyCommunityPassword(
  password: string,
  hash: string | null | undefined
): Promise<boolean> {
  try {
    if (!hash) {
      await bcryptCompare(password, DUMMY_HASH);
      return false;
    }
    return await bcryptCompare(password, hash);
  } catch (err) {
    console.error('[community/auth] bcrypt compare failed:', err);
    return false;
  }
}

/** Burn one comparison so a nonexistent account costs the same as a real one. */
export async function burnPasswordTiming(password: string): Promise<void> {
  try {
    await bcryptCompare(password, DUMMY_HASH);
  } catch {
    /* timing equalisation only — never fails the request */
  }
}

/** 64 hex chars. Used for both confirm and reset links. */
export function makeToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * 🚨 A token is only ever matched against the DB after passing this. The
 * columns are NULLABLE, and `.eq(col, '')`/`.eq(col, undefined)` on a
 * nullable column is exactly how a "match any dormant account" bug gets
 * written. Nothing that isn't 64 hex characters ever reaches a query.
 */
export function isValidToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

// ============================================
// SESSION
// ============================================

/**
 * Resolve the community session from the request cookie.
 * Returns null for: no cookie, bad/expired token, missing tables (42P01),
 * DB error, or a deleted account. Banned/unconfirmed users are RETURNED with
 * their flags set — callers decide what that means.
 *
 * `migrationRef`, if passed, is stamped `true` when the null resulted from
 * 42P01/PGRST205 specifically (as opposed to no cookie / bad token / a
 * genuinely deleted account) — see `requireConfirmedUser`, which needs to
 * tell "not signed in" apart from "not set up yet" so it can answer 503
 * instead of 401. `/me` and the two list GETs ignore it; their contract
 * ("never errors, `{user:null}` covers every off state") is unchanged.
 */
export async function getCommunityUser(
  request: NextRequest,
  migrationRef?: { pending: boolean }
): Promise<CommunityUser | null> {
  try {
    const token = request.cookies.get(COMMUNITY_COOKIE)?.value;
    if (!token) return null;

    const userId = await verifyCommunityToken(token);
    if (!userId) return null;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_community_users')
      .select('id, email, display_name, email_confirmed_at, is_banned')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // 42P01 (migration not run) is an expected state, not an incident.
      if (isMissingTable(error)) {
        if (migrationRef) migrationRef.pending = true;
      } else {
        console.error('[community/auth] session lookup failed:', error);
      }
      return null;
    }
    if (!data) return null;

    return {
      id: data.id as string,
      email: data.email as string,
      displayName: data.display_name as string,
      confirmed: !!data.email_confirmed_at,
      isBanned: !!data.is_banned,
    };
  } catch (err) {
    console.error('[community/auth] getCommunityUser error:', err);
    return null;
  }
}

/**
 * Gate for every write route. Resolves to either the user or the exact
 * NextResponse the caller should return.
 *
 * Discriminated on `user` so callers read as:
 *   const gate = await requireConfirmedUser(request);
 *   if ('error' in gate) return gate.error;
 *   const user = gate.user;
 *
 * 🚨 Pre-migration, the session lookup 42P01s and `getCommunityUser` folds
 * that into a plain `null` (its own contract — see above). Without the
 * migrationRef round-trip this method would answer 401 "please sign in" for
 * every write attempt before migration 309 runs, instead of the 503
 * `migration_pending` every other route in this feature promises. The write
 * UI never renders pre-migration (the page never reaches a confirmed `me`),
 * so this was unreachable from the app itself — but it's still the contract
 * this route family is documented to hold for any direct API caller.
 */
export async function requireConfirmedUser(
  request: NextRequest
): Promise<{ user: CommunityUser } | { error: NextResponse }> {
  const migrationRef = { pending: false };
  let user: CommunityUser | null;
  try {
    user = await getCommunityUser(request, migrationRef);
  } catch {
    user = null;
  }

  if (!user) {
    if (migrationRef.pending) {
      return { error: migrationPending() };
    }
    return {
      error: NextResponse.json(
        { error: 'Please sign in first.', code: 'unauthenticated' },
        { status: 401 }
      ),
    };
  }
  if (user.isBanned) {
    // Deliberately generic — a banned account learns nothing about why.
    return {
      error: NextResponse.json(
        { error: 'This account is not available.', code: 'unavailable' },
        { status: 403 }
      ),
    };
  }
  if (!user.confirmed) {
    return {
      error: NextResponse.json(
        { error: 'Please confirm your email first.', code: 'unconfirmed' },
        { status: 403 }
      ),
    };
  }
  return { user };
}

// Re-exported so route files import their whole toolkit from one place.
export { isMissingTable, migrationPending };
