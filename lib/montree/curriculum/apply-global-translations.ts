// lib/montree/curriculum/apply-global-translations.ts
//
// Thin TypeScript wrapper around the apply_global_translations() Postgres function.
//
// Called fire-and-forget after a classroom is seeded with English curriculum.
// Populates every locale column from montree_curriculum_translations (the global
// translation library) by joining on work_key.
//
// Free — no AI calls. Standard works only. Custom works (work_key starting with
// 'custom_') don't match anything in the global table and are silently skipped
// by the JOIN.
//
// Uses COALESCE inside the SQL function — never clobbers translations a teacher
// has manually edited.
//
// Always safe to call. Idempotent.

import { getSupabase } from '@/lib/supabase-client';

/**
 * Populate a classroom's locale columns from the global translation library.
 *
 * @param classroomId - The classroom UUID to backfill translations for.
 * @returns The total number of row-locale pairs updated, summed across all locales.
 *          A typical fresh classroom returns ~329 × 11 = ~3,600. A re-run on an
 *          already-translated classroom returns 0 (COALESCE skips populated cells).
 *
 * @example
 *   // After English seed:
 *   applyGlobalTranslations(classroom.id)
 *     .catch(err => console.error('[Trial] apply translations failed:', err));
 */
export async function applyGlobalTranslations(classroomId: string): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('apply_global_translations', {
    p_classroom_id: classroomId,
  });

  if (error) {
    console.error(
      `[applyGlobalTranslations] RPC failed for classroom ${classroomId}:`,
      error.message
    );
    return 0;
  }

  const updated = typeof data === 'number' ? data : 0;
  console.log(
    `[applyGlobalTranslations] classroom=${classroomId} updated=${updated} cells across all locales`
  );
  return updated;
}
