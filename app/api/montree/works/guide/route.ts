// /api/montree/works/guide/route.ts
// GET quick guide for a work by name
// Checks classroom curriculum first, then master Brain DB, then static JSON
// Supports any non-English locale for translation of guide content (via LOCALE_AI_CONFIG)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { findCurriculumWorkByName } from '@/lib/montree/curriculum-loader';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/montree/i18n/locales';
import { LOCALE_AI_CONFIG, getLanguageName } from '@/lib/montree/i18n/locale-config';
import { buildLocalizedColumnList, getLocalizedColumn } from '@/lib/montree/i18n/db-helpers';

// Escape special SQL wildcard characters for safe ILIKE usage
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const workName = searchParams.get('name');
    const classroomId = searchParams.get('classroom_id');
    const locale = searchParams.get('locale') || 'en';

    if (!workName) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const supabase = getSupabase();
    let guideData: Record<string, unknown> | null = null;

    // 1. Try classroom curriculum first (if classroom_id provided)
    // guide_content_<locale> columns are auto-derived from SUPPORTED_LOCALES —
    // adding a new locale to locales.ts extends this SELECT automatically.
    // (There is no English `guide_content` column — only locale-suffixed ones.)
    if (classroomId) {
      const { data, error: classroomError } = await supabase
        .from('montree_classroom_curriculum_works')
        .select(`name, quick_guide, video_search_terms, parent_description, direct_aims, materials, presentation_steps, control_of_error, why_it_matters, ${buildLocalizedColumnList('guide_content')}`)
        .eq('classroom_id', classroomId)
        .ilike('name', `%${escapeIlike(workName)}%`)
        .limit(1)
        .maybeSingle();
      if (classroomError) console.error('[Guide API] Classroom curriculum query error:', classroomError);

      if (data?.quick_guide || data?.presentation_steps) {
        guideData = data;
      }
    }

    // 2. Fall back to master Brain table if no data in classroom
    if (!guideData) {
      const { data, error: masterError } = await supabase
        .from('montessori_works')
        .select('name, quick_guide, video_search_term, parent_explanation_detailed, direct_aims, materials_needed, presentation_steps, control_of_error, parent_why_it_matters')
        .ilike('name', `%${escapeIlike(workName)}%`)
        .limit(1)
        .maybeSingle();
      if (masterError) console.error('[Guide API] Master works query error:', masterError);

      if (data) {
        guideData = {
          name: data.name,
          quick_guide: data.quick_guide,
          video_search_terms: data.video_search_term,
          parent_description: data.parent_explanation_detailed,
          direct_aims: data.direct_aims,
          materials: data.materials_needed,
          presentation_steps: data.presentation_steps,
          control_of_error: data.control_of_error,
          why_it_matters: data.parent_why_it_matters,
        };
      }
    }

    // 3. Fall back to static curriculum JSON (comprehensive guides with fuzzy matching)
    if (!guideData) {
      try {
        const staticWork = findCurriculumWorkByName(workName);
        if (staticWork && (staticWork.quick_guide || (staticWork.presentation_steps && staticWork.presentation_steps.length > 0))) {
          guideData = {
            name: staticWork.name,
            quick_guide: staticWork.quick_guide || null,
            video_search_terms: null,
            parent_description: staticWork.parent_description || null,
            direct_aims: staticWork.direct_aims || [],
            materials: staticWork.materials || [],
            presentation_steps: staticWork.presentation_steps || [],
            control_of_error: staticWork.control_of_error || null,
            why_it_matters: staticWork.why_it_matters || null,
          };
        }
      } catch (err) {
        console.error('[Guide API] Static curriculum fallback failed:', err);
      }
    }

    // 4. Return data or fallback
    if (!guideData) {
      return NextResponse.json({
        name: workName,
        quick_guide: null,
        video_search_term: `${workName} Montessori presentation`,
        message: 'Guide not found - check curriculum page'
      });
    }

    const result = {
      name: guideData.name,
      quick_guide: guideData.quick_guide,
      video_search_term: (guideData.video_search_terms && String(guideData.video_search_terms).trim()) || `${workName} Montessori presentation`,
      parent_description: guideData.parent_description,
      direct_aims: guideData.direct_aims,
      materials: guideData.materials,
      presentation_steps: guideData.presentation_steps,
      control_of_error: guideData.control_of_error,
      why_it_matters: guideData.why_it_matters,
    };

    // 5. Translate if locale is non-English and we have content
    // SUPPORTED_GUIDE_LOCALES is auto-derived: every non-English locale gets a
    // `guide_content_<locale>` cache column and uses the unified translator.
    const isSupportedNonEnglish =
      locale !== DEFAULT_LOCALE && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
    if (isSupportedNonEnglish && (result.quick_guide || result.presentation_steps)) {
      const cacheColumn = getLocalizedColumn('guide_content', locale);
      const langLabel = locale;

      // 5a. Check DB cache first
      if (classroomId) {
        try {
          const { data: cached } = await supabase
            .from('montree_classroom_curriculum_works')
            .select(cacheColumn)
            .eq('classroom_id', classroomId)
            .ilike('name', `%${escapeIlike(workName)}%`)
            .limit(1)
            .maybeSingle();

          const cachedData = cached?.[cacheColumn as keyof typeof cached];
          if (cachedData && typeof cachedData === 'object') {
            // Serve from cache — instant
            return NextResponse.json({ ...result, ...(cachedData as Record<string, unknown>) }, {
              headers: { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=7200' }
            });
          }
        } catch (err) {
          console.error(`[Guide API] ${langLabel} cache read failed:`, err);
        }
      }

      // 5b. No cache — translate via Sonnet and cache the result
      if (anthropic) {
        try {
          const translated = await translateGuide(result, locale as Locale);
          // Fire-and-forget: cache translation to DB
          if (classroomId) {
            supabase
              .from('montree_classroom_curriculum_works')
              .update({ [cacheColumn]: translated })
              .eq('classroom_id', classroomId)
              .ilike('name', `%${escapeIlike(workName)}%`)
              .then(({ error }) => {
                if (error) console.error(`[Guide API] ${langLabel} cache write failed:`, error.message);
                else console.log(`[Guide API] Cached ${langLabel} guide for "${workName}"`);
              });
          }
          return NextResponse.json(translated, {
            headers: { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=7200' }
          });
        } catch (err) {
          console.error(`[Guide API] ${langLabel} translation failed, returning English:`, err);
        }
      }
    }

    // 6. Pre-generate translations in the background (fire-and-forget)
    //    So the NEXT zh/es request is instant from cache, even for custom works.
    //    We only pre-cache the two highest-traffic locales; other languages translate
    //    on-demand and cache their result on the first hit.
    if (classroomId && anthropic && (result.quick_guide || result.presentation_steps)) {
      const bgJobs: Array<{ column: string; fn: (g: Record<string, unknown>) => Promise<Record<string, unknown>>; label: string }> = [
        { column: 'guide_content_zh', fn: (g) => translateGuide(g as typeof result, 'zh'), label: 'zh' },
        { column: 'guide_content_es', fn: (g) => translateGuide(g as typeof result, 'es'), label: 'es' },
      ];

      for (const job of bgJobs) {
        supabase
          .from('montree_classroom_curriculum_works')
          .select(job.column)
          .eq('classroom_id', classroomId)
          .ilike('name', `%${escapeIlike(workName)}%`)
          .limit(1)
          .maybeSingle()
          .then(async ({ data: row }) => {
            const existing = row?.[job.column as keyof typeof row];
            if (existing && typeof existing === 'object') return; // already cached
            try {
              const translated = await job.fn(result);
              const { error } = await supabase
                .from('montree_classroom_curriculum_works')
                .update({ [job.column]: translated })
                .eq('classroom_id', classroomId)
                .ilike('name', `%${escapeIlike(workName)}%`);
              if (error) console.error(`[Guide API] Background ${job.label} cache write failed:`, error.message);
              else console.log(`[Guide API] Background pre-cached ${job.label} guide for "${workName}"`);
            } catch (err) {
              console.error(`[Guide API] Background ${job.label} translation failed:`, err);
            }
          })
          .catch((err: unknown) => console.error(`[Guide API] Background ${job.label} check failed:`, err));
      }
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=7200' }
    });

  } catch (error) {
    console.error('Guide API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Locale-agnostic guide translator. Pulls language name + AMI Montessori
// terminology guidance from LOCALE_AI_CONFIG. Adding a new locale to
// SUPPORTED_LOCALES + LOCALE_AI_CONFIG automatically enables guide translation.
async function translateGuide(
  guide: Record<string, unknown>,
  locale: Locale,
): Promise<Record<string, unknown>> {
  if (!anthropic) return guide;
  if (locale === DEFAULT_LOCALE) return guide;

  const toTranslate: Record<string, unknown> = {};
  if (guide.quick_guide) toTranslate.quick_guide = guide.quick_guide;
  if (guide.parent_description) toTranslate.parent_description = guide.parent_description;
  if (guide.control_of_error) toTranslate.control_of_error = guide.control_of_error;
  if (guide.why_it_matters) toTranslate.why_it_matters = guide.why_it_matters;
  if (Array.isArray(guide.direct_aims) && guide.direct_aims.length > 0) toTranslate.direct_aims = guide.direct_aims;
  if (Array.isArray(guide.materials) && guide.materials.length > 0) toTranslate.materials = guide.materials;
  if (Array.isArray(guide.presentation_steps) && (guide.presentation_steps as Array<unknown>).length > 0) {
    toTranslate.presentation_steps = guide.presentation_steps;
  }

  if (Object.keys(toTranslate).length === 0) return guide;

  const aiConfig = LOCALE_AI_CONFIG[locale];
  const languageName = getLanguageName(locale);
  // Strip the leading "\n\nLANGUAGE REQUIREMENT: " prefix and the "Every word"
  // boilerplate — what remains is the locale-specific terminology guidance,
  // which is the part that matters for guide translation.
  const terminologyGuidance = aiConfig?.aiLanguageInstruction
    ?.replace(/\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in [^.]+\.\s*/g, '')
    ?.replace(/Every word of your response must be in [^.]+\.\s*/g, '')
    ?.replace(/Do not use any English except for proper nouns \(like Montessori work names\)\.\s*/g, '')
    ?.trim() || '';

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Translate the following Montessori work guide content from English to ${languageName}.
Use warm, accessible language appropriate for parents and teachers in a Montessori school.
Keep the EXACT same JSON structure. Translate all text values naturally and accurately.
For presentation_steps, translate the "title", "description", and "tip" fields.
For arrays like direct_aims and materials, translate each string element.
Return ONLY valid JSON, no markdown fences, no explanation.
${terminologyGuidance ? `\n${terminologyGuidance}\n` : ''}
${JSON.stringify(toTranslate)}`,
    }],
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const translated = JSON.parse(cleaned);
    return { ...guide, ...translated };
  } catch {
    console.error(`[Guide API] Failed to parse ${locale} translation JSON`);
    return guide;
  }
}
