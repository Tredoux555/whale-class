// POST /api/montree/curriculum/batch-translate
// Batch-translates all works missing translations for a target locale.
// Uses Haiku for speed/cost. Processes in batches of 5 with delays.
// Accepts `target_locale` in body (defaults to 'zh' for backward compat).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { autoTranslateWork, type TranslateInput } from '@/lib/montree/auto-translate';
import { isValidLocale, type Locale } from '@/lib/montree/i18n/locales';

export const maxDuration = 300; // 5 min — batch job

/**
 * Get the DB column that holds the translated work name for a locale.
 * Chinese uses name_zh (the primary translate column); others use name_{locale}.
 */
function getNameColumn(locale: Locale): string {
  return locale === 'zh' ? 'name_zh' : `name_${locale}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const classroomId = body.classroom_id || auth.classroomId;
    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    // Target locale — defaults to 'zh' for backward compatibility
    const targetLocale = (body.target_locale || 'zh') as Locale;
    if (!isValidLocale(targetLocale) || targetLocale === 'en') {
      return NextResponse.json({ error: 'Invalid target_locale (must be non-English supported locale)' }, { status: 400 });
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'No Anthropic API key configured' }, { status: 500 });
    }

    const supabase = getSupabase();
    const nameCol = getNameColumn(targetLocale);

    // Load all works for this classroom
    // Select the name column for the target locale to check which need translation
    const { data: works, error: worksErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`id, name, ${nameCol}, parent_description, why_it_matters`)
      .eq('classroom_id', classroomId)
      .order('name');

    if (worksErr) {
      return NextResponse.json({ error: worksErr.message }, { status: 500 });
    }

    if (!works || works.length === 0) {
      return NextResponse.json({ message: 'No works found', translated: 0 });
    }

    // Filter to works missing the translated name column
    const needsTranslation = works.filter((w: Record<string, unknown>) => !w[nameCol]);
    const alreadyDone = works.length - needsTranslation.length;

    if (needsTranslation.length === 0) {
      return NextResponse.json({
        message: `All works already translated to ${targetLocale}`,
        total: works.length,
        alreadyDone,
      });
    }

    // Process in batches of 5 using the generalized autoTranslateWork
    const BATCH_SIZE = 5;
    const results: Array<{ name: string; translated_name: string | null; status: string }> = [];
    let translated = 0;
    let failed = 0;

    for (let i = 0; i < needsTranslation.length; i += BATCH_SIZE) {
      const batch = needsTranslation.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (work: Record<string, unknown>) => {
        const workName = String(work.name);
        try {
          const input: TranslateInput = {
            classroomId,
            workName,
            parentDescription: String(work.parent_description || ''),
            whyItMatters: String(work.why_it_matters || ''),
          };

          // autoTranslateWork handles glossary lookup, Haiku call, and DB write
          await autoTranslateWork(input, targetLocale);

          // Read back the translated name to confirm it was saved
          const { data: updated } = await supabase
            .from('montree_classroom_curriculum_works')
            .select(nameCol)
            .eq('id', work.id as string)
            .maybeSingle();

          const translatedName = updated?.[nameCol] as string | null;
          return {
            name: workName,
            translated_name: translatedName || null,
            status: translatedName ? 'translated' : 'empty',
          };
        } catch (err) {
          console.error(`[BatchTranslate] Failed for "${workName}" → ${targetLocale}:`, err instanceof Error ? err.message : err);
          return { name: workName, translated_name: null, status: 'error' };
        }
      });

      const batchResults = await Promise.all(promises);
      for (const r of batchResults) {
        results.push(r);
        if (r.translated_name) translated++;
        else failed++;
      }

      // Brief delay between batches to avoid rate limits
      if (i + BATCH_SIZE < needsTranslation.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[BatchTranslate] Done (${targetLocale}): ${translated} translated, ${failed} failed, ${alreadyDone} already done`);

    return NextResponse.json({
      target_locale: targetLocale,
      total: works.length,
      alreadyDone,
      translated,
      failed,
      results,
    });
  } catch (err) {
    console.error('[BatchTranslate] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
