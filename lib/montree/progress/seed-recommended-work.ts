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

import type { getSupabase } from '@/lib/supabase-client';

type SupabaseClient = ReturnType<typeof getSupabase>;

export async function seedRecommendedWork({
  supabase,
  childId,
  workName,
  area,
}: {
  supabase: SupabaseClient;
  childId: string;
  workName: string | null;
  area: string | null;
}): Promise<void> {
  if (!childId || !workName?.trim()) return;
  const name = workName.trim();

  try {
    const { data: existing } = await supabase
      .from('montree_child_progress')
      .select('id')
      .eq('child_id', childId)
      .eq('work_name', name)
      .maybeSingle();

    // Already has progress — recommending it again must NOT reset/downgrade it.
    if (existing) return;

    await supabase.from('montree_child_progress').insert({
      child_id: childId,
      work_name: name,
      area: area || null,
      status: 'not_started',
    });
    console.log(`[Progress] recommended onto shelf: child=${childId} work="${name}" → not_started`);
  } catch (err) {
    // Never block a replan / shelf-fill on a progress-write hiccup.
    console.error('[Progress] seedRecommendedWork failed (non-fatal):', err);
  }
}
