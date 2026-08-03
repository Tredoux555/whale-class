// lib/montree/progress/seed-recommended-work.ts
//
// THE single source of truth for "a recommended work lands on the shelf."
// Every recommender path (weekly replan, gap-fill, on-demand shelf fill, the
// game-plan refresh, a teacher manually adding a work) routes through this, so
// a recommended-but-unphotographed work ALWAYS starts at 'not_started' — the
// honest front of the ladder (see advance-on-confirm.ts for the rest).
//
// 🚨 It NEVER downgrades. If the child already has a progress row for this work
// (presented / practicing / mastered), it is left COMPLETELY alone. This closes
// the replan footgun where a weekly re-plan blindly upserted the work back to a
// lower status and wiped a child's real progress. A recommendation only ever
// SEEDS the starting rung; it never overwrites an advanced one.
//
// WP1 (Aug 2026): the insert-if-absent guard is no longer written here — it falls
// out of the rank gate in lib/montree/progress/write-progress.ts for free.
// 'not_started' is rank 0, the floor of STATUS_RANK, so a not_started write can
// never out-rank ANY existing row: no row → written; any row at all → skipped.
// Identical semantics, one less query, and the write now carries the classroom /
// school / work_key stamps the institutional rollups need.

import type { getSupabase } from '@/lib/supabase-client';
import { writeProgress } from './write-progress';

type SupabaseClient = ReturnType<typeof getSupabase>;

export async function seedRecommendedWork({
  supabase,
  childId,
  workName,
  area,
  source = 'recommendation',
  classroomId = null,
  schoolId = null,
}: {
  supabase: SupabaseClient;
  childId: string;
  workName: string | null;
  area: string | null;
  /** Which recommender put it there — recorded on the progress event. */
  source?: string;
  classroomId?: string | null;
  schoolId?: string | null;
}): Promise<void> {
  if (!childId || !workName?.trim()) return;
  const name = workName.trim();

  try {
    const result = await writeProgress(supabase, {
      childId,
      workName: name,
      area,
      status: 'not_started',
      source,
      classroomId,
      schoolId,
      // Never. A recommendation is not a teacher correction.
      allowDowngrade: false,
    });

    if (result.outcome === 'written') {
      console.log(`[Progress] recommended onto shelf: child=${childId} work="${name}" → not_started`);
    } else if (result.outcome === 'failed') {
      console.error(`[Progress] seedRecommendedWork write failed: child=${childId} work="${name}" ${result.error || ''}`);
    }
    // skipped_* → the child already has this work at or above not_started. Correct.
  } catch (err) {
    // Never block a replan / shelf-fill on a progress-write hiccup.
    console.error('[Progress] seedRecommendedWork failed (non-fatal):', err);
  }
}
