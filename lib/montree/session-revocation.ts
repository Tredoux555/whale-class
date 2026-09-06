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

interface RevocationCacheEntry {
  /** epoch SECONDS of sessions_revoked_at, or null when nothing is revoked. */
  revokedAt: number | null;
  /** epoch ms when this entry was written. */
  at: number;
}

const REVOCATION_TTL_MS = 60_000; // 60s — see contract above

const revocationCache = new Map<string, RevocationCacheEntry>();

const cacheKey = (role: RevocableRole, userId: string) =>
  `${tableForRole(role)}:${userId}`;

/**
 * Has this session been revoked?
 *
 * @param role     the token's role (picks the identity table)
 * @param userId   the token's `sub`
 * @param issuedAt the token's `iat` claim, in epoch SECONDS
 *
 * Returns true only when we positively know the account revoked its sessions at
 * an instant at or after the token was issued. FAILS OPEN on everything else.
 */
export async function isSessionRevoked(
  role: RevocableRole,
  userId: string,
  issuedAt: number | undefined,
): Promise<boolean> {
  if (!userId) return false;

  // A token with no iat cannot be compared. Rather than reject every such token
  // (which would log out anyone holding a pre-migration token — exactly the
  // mid-class lockout this product refuses), treat it as not revoked. All tokens
  // minted by createMontreeToken carry setIssuedAt(), so this is a
  // belt-and-braces branch, not a routine one.
  if (typeof issuedAt !== 'number' || !Number.isFinite(issuedAt)) return false;

  const key = cacheKey(role, userId);
  const now = Date.now();

  const cached = revocationCache.get(key);
  if (cached && now - cached.at < REVOCATION_TTL_MS) {
    return cached.revokedAt !== null && issuedAt < cached.revokedAt;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(tableForRole(role))
      .select('sessions_revoked_at')
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
      return false;
    }

    const raw = (data as { sessions_revoked_at?: string | null } | null)
      ?.sessions_revoked_at;
    const revokedAt = raw ? Math.floor(new Date(raw).getTime() / 1000) : null;

    revocationCache.set(key, {
      revokedAt: revokedAt !== null && Number.isFinite(revokedAt) ? revokedAt : null,
      at: now,
    });

    return revokedAt !== null && Number.isFinite(revokedAt) && issuedAt < revokedAt;
  } catch (e) {
    // FAIL-OPEN on any throw (network, timeout, client init).
    console.error('[session-revocation] lookup threw, failing open:', e);
    return false;
  }
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
