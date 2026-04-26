// /api/montree/works/guide/route.ts
// GET quick guide for a work by name
// Checks classroom curriculum first, then master Brain DB, then static JSON
// Supports locale=zh for Chinese translation of guide content

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { findCurriculumWorkByName } from '@/lib/montree/curriculum-loader';

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
    if (classroomId) {
      const { data, error: classroomError } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name, quick_guide, video_search_terms, parent_description, direct_aims, materials, presentation_steps, control_of_error, why_it_matters, guide_content_zh, guide_content_es, guide_content_fr, guide_content_pt, guide_content_nl, guide_content_it, guide_content_ja, guide_content_ko, guide_content_de')
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
    const SUPPORTED_GUIDE_LOCALES: Record<string, { col: string; fn?: (r: typeof result) => Promise<Record<string, unknown>> }> = {
      zh: { col: 'guide_content_zh', fn: translateGuideToZh },
      es: { col: 'guide_content_es', fn: translateGuideToEs },
      fr: { col: 'guide_content_fr' },
      pt: { col: 'guide_content_pt' },
      nl: { col: 'guide_content_nl' },
      it: { col: 'guide_content_it' },
      ja: { col: 'guide_content_ja' },
      ko: { col: 'guide_content_ko' },
      de: { col: 'guide_content_de' },
    };
    const localeConfig = SUPPORTED_GUIDE_LOCALES[locale];
    if (localeConfig && (result.quick_guide || result.presentation_steps)) {
      const cacheColumn = localeConfig.col;
      const translateFn = localeConfig.fn || (locale === 'zh' ? translateGuideToZh : translateGuideToEs);
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
          const translated = await translateFn(result);
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
    if (classroomId && anthropic && (result.quick_guide || result.presentation_steps)) {
      // Pre-generate both Chinese and Spanish caches
      const bgJobs: Array<{ column: string; fn: (g: Record<string, unknown>) => Promise<Record<string, unknown>>; label: string }> = [
        { column: 'guide_content_zh', fn: translateGuideToZh, label: 'zh' },
        { column: 'guide_content_es', fn: translateGuideToEs, label: 'es' },
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

// Translate guide content to Spanish using Sonnet
async function translateGuideToEs(guide: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!anthropic) return guide;

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

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Translate the following Montessori work guide content from English to natural Argentine Spanish / Latin American Spanish.
Use warm, accessible language appropriate for parents and teachers in a Montessori school.
Keep the EXACT same JSON structure. Translate all text values naturally and accurately.
For presentation_steps, translate the "title", "description", and "tip" fields.
For arrays like direct_aims and materials, translate each string element.
Return ONLY valid JSON, no markdown fences, no explanation.

${JSON.stringify(toTranslate)}`
    }],
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const translated = JSON.parse(cleaned);
    return { ...guide, ...translated };
  } catch {
    console.error('[Guide API] Failed to parse Spanish translation JSON');
    return guide;
  }
}

// Translate guide content to Chinese using Sonnet
async function translateGuideToZh(guide: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!anthropic) return guide;

  // Build a JSON payload of translatable fields
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

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Translate the following Montessori work guide content from English to simplified Chinese (中文).
Keep the EXACT same JSON structure. Translate all text values naturally and accurately.
For presentation_steps, translate the "title", "description", and "tip" fields.
For arrays like direct_aims and materials, translate each string element.
Return ONLY valid JSON, no markdown fences, no explanation.

${JSON.stringify(toTranslate)}`
    }],
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Clean any markdown fences
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const translated = JSON.parse(cleaned);

    // Merge translated fields back, keeping untranslated fields as-is
    return {
      ...guide,
      ...translated,
    };
  } catch {
    console.error('Failed to parse translation JSON');
    return guide;
  }
}
