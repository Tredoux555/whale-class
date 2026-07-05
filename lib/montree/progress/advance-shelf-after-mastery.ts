// lib/montree/progress/advance-shelf-after-mastery.ts
//
// Closes the shelf loop in REAL TIME. When a teacher marks a work mastered, the
// next work in that area (by curriculum sequence) drops onto the shelf as
// 'not_started' — instead of the child waiting for the weekly replan to refill.
// Deterministic, no AI. It NEVER re-recommends a work the child has already
// touched, and seedRecommendedWork guarantees it lands at 'not_started' without
// downgrading anything.

import type { getSupabase } from '@/lib/supabase-client';
import { seedRecommendedWork } from './seed-recommended-work';

type SupabaseClient = ReturnType<typeof getSupabase>;

export async function advanceShelfAfterMastery({
  supabase,
  childId,
  classroomId,
  area,
  masteredWorkName,
}: {
  supabase: SupabaseClient;
  childId: string;
  classroomId: string | null;
  area: string | null; // area_key, e.g. 'sensorial'
  masteredWorkName: string;
}): Promise<void> {
  if (!childId || !classroomId || !area || !masteredWorkName?.trim()) return;

  try {
    // area_key → area_id
    const { data: areas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', classroomId);
    const areaRow = (areas || []).find(
      (a: { id: string; area_key: string }) => a.area_key === area,
    );
    if (!areaRow) return;

    // All active works in this area, in curriculum sequence order.
    const { data: works } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, sequence')
      .eq('classroom_id', classroomId)
      .eq('area_id', areaRow.id)
      .eq('is_active', true)
      .order('sequence', { ascending: true });
    const areaWorks = (works || []) as Array<{ name: string; sequence: number | null }>;
    if (areaWorks.length === 0) return;

    // Everything the child has ALREADY touched (any progress row) — never re-recommend.
    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('work_name')
      .eq('child_id', childId);
    const touched = new Set(
      (progress || []).map((p: { work_name: string }) => p.work_name.toLowerCase()),
    );
    touched.add(masteredWorkName.toLowerCase());

    // Next = first work in sequence the child hasn't touched.
    const next = areaWorks.find((w) => !touched.has(w.name.toLowerCase()));
    if (!next) return; // whole area covered — leave the mastered work in the slot

    const now = new Date().toISOString();
    // Replace the area's focus slot with the next work.
    await supabase.from('montree_child_focus_works').upsert(
      {
        child_id: childId,
        classroom_id: classroomId,
        area,
        work_name: next.name,
        set_at: now,
        set_by: 'mastery_advance',
        updated_at: now,
      },
      { onConflict: 'child_id,area' },
    );

    // Seed it at 'not_started' (never downgrades — brand-new work for this child).
    await seedRecommendedWork({ supabase, childId, workName: next.name, area });

    console.log(
      `[Progress] mastery advance: child=${childId} area=${area} mastered="${masteredWorkName}" → next="${next.name}"`,
    );
  } catch (err) {
    console.error('[Progress] advanceShelfAfterMastery failed (non-fatal):', err);
  }
}
