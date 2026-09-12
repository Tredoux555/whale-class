// lib/montree/session-revocation.ts
// Session revocation for the auth hot path (migration 351).
//
// ── Why this exists ──────────────────────────────────────────────────────────
// Montree sessions are stateless JWTs with a 3650-day lifetime — a deliberate
// product decision (see MONTREE_JWT_TTL_DAYS in server-auth.ts): a teacher on
// their own classroom device must never be silently logged out mid-class. The
// price of that decision is that a minted token is good for ten years and
// nothing could stop it. "Log out" only cleared the cookie on the one device;
// a token copied anywhere else kept working. The only remedy for a stolen phone
// or a departed staff member was rotating MONTREE_JWT_SECRET, which signs
// EVERY user out of EVERY school at once.
//
// This module adds the missing verb. Each identity row carries a nullable
// `sessions_revoked_at`; a token whose `iat` predates it is refused. Setting
// that column to NOW() invalidates every token that account has ever been
// issued, on every device, while leaving everyone else alone.
//
// 🚨 DESIGN CONTRACT — deliberately identical to lib/montree/school-lock.ts,
//    because this sits on the same hot path and the same reasoning applies:
//   - FAIL-OPEN. Any DB error / timeout / missing column → not revoked. A
//     database wobble must never log out every teacher mid-class. Revocation is
//     a rare, deliberate act; availability wins. The window is bounded by the
//     fact that an attacker cannot cause the outage on demand.
//   - In-process Map cache, TTL 60s, caching the NEGATIVE result too — an
//     un-revoked account is the 99.99% case and keeping that SELECT off the hot
//     path is the entire point. At most one cheap indexed SELECT per account
//     per 60s per process.
//   - Cache is per-process. The sign-out-everywhere route calls
//     invalidateSessionRevocation() so the effect is instant on the container
//     that served it; other containers pick it up within the TTL.

import { getSupabase } from '@/lib/supabase-client';

/** Which table holds the identity a token's `sub` points at. */
export type RevocableRole =
  | 'teacher'
  | 'principal'
  | 'homeschool_parent'
  | 'agent'
  | 'org_admin';

/**
 * role → identity table. Confirmed against every createMontreeToken() call
 * site: teacher/agent/homeschool_parent all live in montree_teachers,
 * principals in montree_school_admins, org admins in
 * montree_organization_admins.
 */
export function tableForRole(role: RevocableRole): string {
  switch (role) {
    case 'principal':
      return 'montree_school_admins';
    case 'org_admin':
      return 'montree_organization_admins';
    case 'teacher':
    case 'agent':
    case 'homeschool_parent':
    default:
      return 'montree_teachers';
  }
}

/**
 * Which identity tables carry an `is_active` flag.
 *
 * montree_organization_admins (migration 315) does NOT have one — an org admin
 * is deleted, not deactivated. Selecting a column that does not exist makes
 * PostgREST error out, which under the fail-open contract below would silently
 * disable revocation for that role too, so the column list is per-role.
 */
function columnsForRole(role: RevocableRole): string {
  return role === 'org_admin'
    ? 'sessions_revoked_at'
    : 'sessions_revoked_at, is_active';
}

/**
 * A server-internal token (the photo-sweep cron, lib/montree/media/identify-trigger)
 * is minted with a synthetic `sub` of the form `cron:photo-sweep` /
 * `server:media-identify` that intentionally matches no row. Those are never
 * revocable, and looking them up would error on every request (the id columns
 * are uuid) — so the colon is treated as "not a database identity" and skipped.
 * No real id contains one.
 */
function isSyntheticSubject(userId: string): boolean {
  return userId.includes(':');
}

/** What one cached lookup of an identity row tells us. */
export interface SessionIdentityState {
  /**
   * false when the lookup did not succeed (DB error, missing column, synthetic
   * server-internal `sub`). Callers MUST treat `known: false` as "no opinion"
   * and let the request through — see the fail-open contract above.
   */
  known: boolean;
  /** true when the query succeeded and returned NO row: the account is gone. */
  missing: boolean;
  /** false only when the row exists and says is_active === false. */
  active: boolean;
  /** epoch SECONDS of sessions_revoked_at, or null when nothing is revoked. */
  revokedAt: number | null;
}

const UNKNOWN: SessionIdentityState = {
  known: false,
  missing: false,
  active: true,
  revokedAt: null,
};

interface RevocationCacheEntry {
  state: SessionIdentityState;
  /** epoch ms when this entry was written. */
  at: number;
}

const REVOCATION_TTL_MS = 60_000; // 60s — see contract above

const revocationCache = new Map<string, RevocationCacheEntry>();

const cacheKey = (role: RevocableRole, userId: string) =>
  `${tableForRole(role)}:${userId}`;

/**
 * Read (and cache for 60s) the identity row a token's `sub` points at.
 *
 * ONE indexed SELECT per account per 60 seconds per process, shared by all
 * three checks the auth hot path needs:
 *
 *   1. the account still EXISTS      — self-service account deletion removes
 *      the montree_teachers row outright, and a stateless JWT has no idea.
 *      Before this, a deleted teacher's cookie kept working for the token's
 *      whole remaining life.
 *   2. the account is still ACTIVE   — a principal deactivating a teacher sets
 *      is_active = false, which likewise meant nothing to an already-minted
 *      token.
 *   3. sessions have not been REVOKED — migration 351's sessions_revoked_at.
 *
 * FAILS OPEN: any error, any missing column, any synthetic server-internal
 * `sub` returns `known: false`, and callers let the request through. A database
 * wobble must never log out every teacher mid-class.
 */
export async function getSessionIdentityState(
  role: RevocableRole,
  userId: string,
): Promise<SessionIdentityState> {
  if (!userId || isSyntheticSubject(userId)) return UNKNOWN;

  const key = cacheKey(role, userId);
  const now = Date.now();

  const cached = revocationCache.get(key);
  if (cached && now - cached.at < REVOCATION_TTL_MS) return cached.state;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(tableForRole(role))
      .select(columnsForRole(role))
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // FAIL-OPEN. Do not cache errors; the next request retries. This also
      // covers the window where the code has deployed but migration 351 has
      // not been run yet — the column is missing, PostgREST errors, and every
      // session keeps working exactly as it did before.
      console.error(
        '[session-revocation] lookup failed, failing open:',
        error.message,
      );
      return UNKNOWN;
    }

    const row = data as
      | { sessions_revoked_at?: string | null; is_active?: boolean | null }
      | null;

    let state: SessionIdentityState;
    if (!row) {
      // A successful query that returned no row is a definitive negative, not a
      // wobble: this account has been deleted. Safe to trust, and safe to cache.
      state = { known: true, missing: true, active: false, revokedAt: null };
    } else {
      const raw = row.sessions_revoked_at;
      const revokedAt = raw ? Math.floor(new Date(raw).getTime() / 1000) : null;
      state = {
        known: true,
        missing: false,
        // Only an explicit false deactivates. A table without the column (or a
        // NULL default) reads as active — never lock someone out on absence.
        active: row.is_active !== false,
        revokedAt:
          revokedAt !== null && Number.isFinite(revokedAt) ? revokedAt : null,
      };
    }

    revocationCache.set(key, { state, at: now });
    return state;
  } catch (e) {
    // FAIL-OPEN on any throw (network, timeout, client init).
    console.error('[session-revocation] lookup threw, failing open:', e);
    return UNKNOWN;
  }
}

/**
 * Has this session been revoked?
 *
 * @param role     the token's role (picks the identity table)
 * @param userId   the token's `sub`
 * @param issuedAt the token's `iat` claim, in epoch SECONDS
 *
 * Returns true only when we positively know the account revoked its sessions at
 * an instant at or after the token was issued. FAILS OPEN on everything else.
 *
 * Kept as its own export because it is the narrow question several callers ask.
 * verifySchoolRequest uses getSessionIdentityState() directly so that the
 * existence and is_active checks ride along on the same cached read.
 */
export async function isSessionRevoked(
  role: RevocableRole,
  userId: string,
  issuedAt: number | undefined,
): Promise<boolean> {
  // A token with no iat cannot be compared. Rather than reject every such token
  // (which would log out anyone holding a pre-migration token — exactly the
  // mid-class lockout this product refuses), treat it as not revoked. All tokens
  // minted by createMontreeToken carry setIssuedAt(), so this is a
  // belt-and-braces branch, not a routine one.
  if (typeof issuedAt !== 'number' || !Number.isFinite(issuedAt)) return false;

  const state = await getSessionIdentityState(role, userId);
  return state.known && state.revokedAt !== null && issuedAt < state.revokedAt;
}

/**
 * Drop the cached revocation state so the next check refetches.
 *
 * Called by POST /api/montree/auth/sign-out-everywhere so the revocation takes
 * effect instantly on the container that served the request; every other
 * container observes it within REVOCATION_TTL_MS.
 *
 * With no arguments, clears the whole cache (used by tests).
 */
export function invalidateSessionRevocation(
  role?: RevocableRole,
  userId?: string,
): void {
  if (role && userId) {
    revocationCache.delete(cacheKey(role, userId));
  } else {
    revocationCache.clear();
  }
}
