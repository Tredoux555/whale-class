// lib/montree/plans/photo-cap.ts
//
// WP-B — the Basic photo cap (500). Plan §5 + WP-A note A1.
//
// 🚨 THREE RULES, in order of how easy they are to break:
//
// 1. NEVER block an upload. A teacher mid-work-cycle must never see a 402 on a
//    photo. The upload succeeds; the OLDEST post-plan-change photos are
//    soft-archived down to the cap instead.
// 2. GRANDFATHERED. Only montree_media rows created at/after the school's
//    plan_changed_at count. A school that drops to Basic keeps the library it
//    already had; only its NEW photos burn the 500. When plan_changed_at is
//    null (pre-migration) the whole library counts — the safe direction, since
//    at that point nothing has been archived yet anyway.
// 3. REVERSIBLE. archived_at is a soft flag. Storage objects are never
//    touched, and applyPlan() clears archived_at for the whole school the
//    moment the plan becomes uncapped.

import { loadResolvedPlan } from './resolve-plan';

/** Rows archived per UPDATE — keeps a big overshoot off one statement. */
const ARCHIVE_BATCH = 200;

export interface PhotoCapResult {
  /** Did anything need doing? False for Lite/Full (cap === null) and errors. */
  applied: boolean;
  cap: number | null;
  /** Un-archived, post-plan-change photos BEFORE archiving. */
  counted: number;
  archived: number;
}

function isUndefinedColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === '42703') return true;
  return (e.message || '').toLowerCase().includes('does not exist');
}

/**
 * Count the school's photos that count toward the cap: un-archived, and
 * created at/after the grandfather line.
 */
export async function countCappedPhotos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client
  supabase: any,
  schoolId: string,
  planChangedAt: string | null
): Promise<number | null> {
  try {
    let q = supabase
      .from('montree_media')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .is('archived_at', null);
    if (planChangedAt) q = q.gte('created_at', planChangedAt);
    const { count, error } = await q;
    if (error) {
      if (!isUndefinedColumn(error)) {
        console.warn('[photoCap] count failed for', schoolId, error.message);
      }
      return null;
    }
    return typeof count === 'number' ? count : 0;
  } catch (err) {
    console.warn('[photoCap] count threw for', schoolId, err);
    return null;
  }
}

/**
 * Enforce the cap after an upload. Fire-and-forget: every failure is logged
 * and swallowed, and an uncapped plan returns immediately without a query.
 */
export async function enforcePhotoCap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client
  supabase: any,
  schoolId: string
): Promise<PhotoCapResult> {
  const none: PhotoCapResult = { applied: false, cap: null, counted: 0, archived: 0 };
  if (!schoolId) return none;

  let resolved;
  try {
    resolved = await loadResolvedPlan(supabase, schoolId);
  } catch (err) {
    console.warn('[photoCap] plan load failed for', schoolId, err);
    return none;
  }

  const cap = resolved.photoCap;
  if (cap === null) return none; // Lite / Full — fail open, no query.

  const counted = await countCappedPhotos(supabase, schoolId, resolved.planChangedAt);
  if (counted === null) return { ...none, cap };
  if (counted <= cap) return { applied: true, cap, counted, archived: 0 };

  const overshoot = counted - cap;
  let archived = 0;

  try {
    for (let done = 0; done < overshoot; done += ARCHIVE_BATCH) {
      const take = Math.min(ARCHIVE_BATCH, overshoot - done);
      let sel = supabase
        .from('montree_media')
        .select('id')
        .eq('school_id', schoolId)
        .is('archived_at', null);
      if (resolved.planChangedAt) sel = sel.gte('created_at', resolved.planChangedAt);
      const { data: rows, error: selErr } = await sel
        .order('captured_at', { ascending: true })
        .limit(take);
      if (selErr) {
        console.warn('[photoCap] oldest-photo select failed:', selErr.message);
        break;
      }
      const ids = (rows || []).map((r: { id: string }) => r.id);
      if (ids.length === 0) break;

      const { error: updErr } = await supabase
        .from('montree_media')
        .update({ archived_at: new Date().toISOString() })
        .in('id', ids);
      if (updErr) {
        console.warn('[photoCap] archive update failed:', updErr.message);
        break;
      }
      archived += ids.length;
    }
  } catch (err) {
    console.warn('[photoCap] archive threw for', schoolId, err);
  }

  if (archived > 0) {
    // First time only — a stamp, not a counter.
    try {
      const { error } = await supabase
        .from('montree_schools')
        .update({ photo_cap_reached_at: new Date().toISOString() })
        .eq('id', schoolId)
        .is('photo_cap_reached_at', null);
      if (error && !isUndefinedColumn(error)) {
        console.warn('[photoCap] photo_cap_reached_at stamp failed:', error.message);
      }
    } catch {
      /* stamp is cosmetic — never let it matter */
    }
    console.log(`[photoCap] school ${schoolId}: ${counted}/${cap} → archived ${archived} oldest`);
  }

  return { applied: true, cap, counted, archived };
}
