// lib/montree/insert-curriculum-work.ts
// Shared helpers for curriculum translation — used by all 5 write paths.
// Centralising here means adding a new locale to ENABLED_LOCALES is the
// only code change needed; these functions pick up the new locale automatically.

import { getSupabase } from '@/lib/supabase-client';
import { autoTranslateWork, type TranslateInput } from '@/lib/montree/auto-translate';
import { ENABLED_LOCALES, getNameColumn } from '@/lib/montree/locales-config';

/**
 * Background batch-translate all works missing translations in a classroom.
 * Loops over ENABLED_LOCALES — adding a locale to that list is all that's needed.
 * Fire-and-forget — caller should NOT await this (use .catch() at call site).
 *
 * Processes batches of 5 with 500 ms delays to respect Anthropic rate limits.
 */
export async function batchTranslateAllLocales(classroomId: string): Promise<void> {
  const supabase = getSupabase();
  const BATCH = 5;

  for (const locale of ENABLED_LOCALES) {
    const nameCol = getNameColumn(locale);

    // Cast required: Supabase infers 'never' for dynamic select strings
    type WorkRow = { name: string; parent_description: string | null; why_it_matters: string | null };
    const { data: rawWorks, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`name, parent_description, why_it_matters, ${nameCol}`)
      .eq('classroom_id', classroomId)
      .is(nameCol, null);
    const works = rawWorks as WorkRow[] | null;

    if (error) {
      console.error(`[BatchTranslate] Query error for ${locale}:`, error.message);
      continue;
    }

    if (!works?.length) {
      console.log(`[BatchTranslate] All ${locale} translations already present for classroom ${classroomId}`);
      continue;
    }

    console.log(`[BatchTranslate] Translating ${works.length} works → ${locale} for classroom ${classroomId}`);
    let translated = 0;

    for (let i = 0; i < works.length; i += BATCH) {
      const batch = works.slice(i, i + BATCH);
      await Promise.all(
        batch.map(w =>
          autoTranslateWork(
            {
              classroomId,
              workName: w.name,
              parentDescription: w.parent_description || '',
              whyItMatters: w.why_it_matters || '',
            },
            locale
          )
            .then(() => { translated++; })
            .catch(err => {
              console.error(
                `[BatchTranslate] ${locale} failed for "${w.name}":`,
                err instanceof Error ? err.message : err
              );
            })
        )
      );
      if (i + BATCH < works.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`[BatchTranslate] ${locale} done: ${translated}/${works.length}`);
  }
}

/**
 * Fire-and-forget: translate a single work into all ENABLED_LOCALES.
 * Used in add-custom-work after a new work is inserted.
 * Caller should NOT await this (use .catch() at call site).
 *
 * Runs locales sequentially (not parallel) to avoid Haiku rate-limit spikes.
 */
export async function translateAllLocales(input: TranslateInput): Promise<void> {
  for (const locale of ENABLED_LOCALES) {
    await autoTranslateWork(input, locale).catch(err => {
      console.error(
        `[TranslateAllLocales] ${locale} failed for "${input.workName}":`,
        err instanceof Error ? err.message : err
      );
    });
  }
}
