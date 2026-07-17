// lib/montree/school-lock.ts
// Abuse-lock enforcement for the auth hot path (migration 286).
//
// A super-admin can lock a school (`montree_schools.locked_at = NOW()`) to kill
// AI spend and refuse access. `verifySchoolRequest` calls `isSchoolLocked` after
// a token verifies, so a locked school's API requests 403 with code
// 'school_locked'.
//
// 🚨 DESIGN CONTRACT (PLAN_HOT_PATHS_JUL17 §A1 — do not weaken):
//   - FAIL-OPEN. Any DB error / timeout → return false. An outage must NEVER
//     lock out the world. Locking is a rare admin action; availability wins.
//   - In-process Map cache, TTL 60s. At most ONE cheap indexed SELECT per school
//     per 60s per process. No other request-path cost.
//   - Cache the NEGATIVE result too — unlocked schools are the 99.9% case, and
//     caching them is the entire point (keeps the SELECT off the hot path).
//   - Cache is per-process (each Railway container has its own). The 60s TTL
//     bounds staleness; the super-admin PATCH also calls invalidateSchoolLock()
//     for an immediate refresh on the container that served the write.

import { getSupabase } from '@/lib/supabase-client';

interface LockCacheEntry {
  locked: boolean; // resolved lock state (true = locked)
  at: number;      // epoch ms when this entry was written
}

const LOCK_TTL_MS = 60_000; // 60s — see contract §A1

// Module-level cache. Persists for the life of the server process.
const lockCache = new Map<string, LockCacheEntry>();

/**
 * Returns true iff the school is currently locked (abuse lock, migration 286).
 *
 * FAIL-OPEN: on any error the function returns false (treated as unlocked) so a
 * DB outage can never lock out every school at once.
 *
 * Reads are cached in-process for 60s (positive AND negative results).
 */
export async function isSchoolLocked(schoolId: string): Promise<boolean> {
  if (!schoolId) return false;

  const now = Date.now();
  const cached = lockCache.get(schoolId);
  if (cached && now - cached.at < LOCK_TTL_MS) {
    return cached.locked;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_schools')
      .select('locked_at')
      .eq('id', schoolId)
      .maybeSingle();

    if (error) {
      // FAIL-OPEN: do not cache errors, do not lock. Next request retries.
      console.error('[school-lock] lookup failed, failing open:', error.message);
      return false;
    }

    const locked = !!(data && data.locked_at);
    lockCache.set(schoolId, { locked, at: now });
    return locked;
  } catch (e) {
    // FAIL-OPEN on any throw (network, timeout, client init).
    console.error('[school-lock] lookup threw, failing open:', e);
    return false;
  }
}

/**
 * Invalidate the cached lock state so the next isSchoolLocked() refetches.
 * Called fire-and-forget by the super-admin lock/unlock PATCH so the change is
 * visible immediately on the container that served the write (other containers
 * pick it up within the 60s TTL).
 *
 * With no argument, clears the entire cache (e.g. for tests).
 */
export function invalidateSchoolLock(schoolId?: string): void {
  if (schoolId) {
    lockCache.delete(schoolId);
  } else {
    lockCache.clear();
  }
}
