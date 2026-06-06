// lib/montree/phonics/sync-phonics-works.ts
// Seeds (or deactivates) the 49 Dark Phonics lessons as REAL curriculum works.
//
// Why real rows, not a virtual merge: the whole tracking machinery — AI photo-insight
// candidate set, the `inClassroom` auto-progress gate, the child shelf, the evidence
// counter, and every work_id→name lookup — keys off `montree_classroom_curriculum_works`.
// Virtual works are invisible to all of it. Seeding real rows makes phonics ride the
// existing rails with zero special-casing: snap → identify → auto-progress just works.
//
// Reversible + non-destructive: rows are tagged `source = 'phonics_pack'`. Toggling the
// feature OFF sets is_active=false (hides them everywhere) but never deletes — progress
// is keyed by work_name, so a child's history survives an off/on cycle untouched.

import { getSupabase } from '@/lib/supabase-client';
import { phonicsWorkRows } from './phonics-works';

const LANGUAGE_AREA_KEY = 'language';
export const PHONICS_SOURCE = 'phonics_pack';
// High base so phonics sort AFTER a classroom's normal Language works, in lesson order.
const SEQUENCE_BASE = 10000;

export interface SyncResult {
  ok: boolean;
  classrooms: number;     // classrooms processed
  inserted: number;       // new rows created
  reactivated: number;    // rows flipped back to active
  deactivated: number;    // rows hidden (on disable)
  skipped: string[];      // classroom ids with no Language area
  error?: string;
}

/**
 * Make the phonics works pack present (enable) or hidden (disable) for every classroom
 * in a school. Idempotent — safe to call repeatedly.
 */
export async function syncPhonicsWorks(schoolId: string, enable: boolean): Promise<SyncResult> {
  const supabase = getSupabase();
  const res: SyncResult = { ok: true, classrooms: 0, inserted: 0, reactivated: 0, deactivated: 0, skipped: [] };

  const { data: classrooms, error: cErr } = await supabase
    .from('montree_classrooms')
    .select('id')
    .eq('school_id', schoolId);

  if (cErr) return { ...res, ok: false, error: `classroom lookup: ${cErr.message}` };
  if (!classrooms?.length) return res;

  const rows = phonicsWorkRows();

  for (const c of classrooms) {
    const classroomId = (c as { id: string }).id;
    res.classrooms++;

    if (!enable) {
      // Hide, don't delete (preserve child history; progress is keyed by work_name).
      const { data: deact, error } = await supabase
        .from('montree_classroom_curriculum_works')
        .update({ is_active: false })
        .eq('classroom_id', classroomId)
        .eq('source', PHONICS_SOURCE)
        .eq('is_active', true)
        .select('id');
      if (error) return { ...res, ok: false, error: `deactivate (${classroomId}): ${error.message}` };
      res.deactivated += deact?.length || 0;
      continue;
    }

    // ENABLE — resolve the classroom's Language area (FK target).
    const { data: area } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('area_key', LANGUAGE_AREA_KEY)
      .maybeSingle();

    if (!area?.id) { res.skipped.push(classroomId); continue; }
    const areaId = (area as { id: string }).id;

    // Reactivate any previously-seeded (hidden) phonics rows.
    const { data: react, error: rErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .update({ is_active: true })
      .eq('classroom_id', classroomId)
      .eq('source', PHONICS_SOURCE)
      .eq('is_active', false)
      .select('id');
    if (rErr) return { ...res, ok: false, error: `reactivate (${classroomId}): ${rErr.message}` };
    res.reactivated += react?.length || 0;

    // Find which phonics work_keys already exist (idempotency — only insert the missing).
    const { data: existing, error: eErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('work_key')
      .eq('classroom_id', classroomId)
      .eq('source', PHONICS_SOURCE);
    if (eErr) return { ...res, ok: false, error: `existing lookup (${classroomId}): ${eErr.message}` };
    const have = new Set((existing || []).map((r) => (r as { work_key: string }).work_key));

    const toInsert = rows
      .filter((r) => !have.has(r.work_key))
      .map((r) => ({
        classroom_id: classroomId,
        name: r.name,
        work_key: r.work_key,
        area_id: areaId,
        sequence: SEQUENCE_BASE + r.sequence, // lesson order, after normal works
        description: r.description.slice(0, 500),
        parent_description: r.description.slice(0, 1000),
        is_custom: false,
        is_active: true,
        source: PHONICS_SOURCE,
      }));

    if (toInsert.length) {
      const { data: ins, error: iErr } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(toInsert)
        .select('id');
      if (iErr) return { ...res, ok: false, error: `insert (${classroomId}): ${iErr.message}` };
      res.inserted += ins?.length || 0;
    }
  }

  return res;
}
