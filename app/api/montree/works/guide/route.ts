// /api/montree/works/guide/route.ts
// GET quick guide for a work by name
// Checks classroom curriculum first, then master Brain DB, then static JSON
// Supports locale=zh for Chinese translation of guide content

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { findCurriculumWorkByName } from '@/lib/montree/curriculum-loader';

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
      const { data } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name, quick_guide, video_search_terms, parent_description, direct_aims, materials, presentation_steps, control_of_error, why_it_matters')
        .eq('classroom_id', classroomId)
        .ilike('name', workName)
        .limit(1)
        .single();

      if (data?.quick_guide || data?.presentation_steps) {
        guideData = data;
      }
    }

    // 2. Fall back to master Brain table if no data in classroom
    if (!guideData) {
      const { data } = await supabase
        .from('montessori_works')
        .select('name, quick_guide, video_search_term, parent_explanation_detailed, direct_aims, materials_needed, presentation_steps, control_of_error, parent_why_it_matters')
        .ilike('name', workName)
        .limit(1)
        .single();

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

    // 5. Translate to Chinese if locale is zh and we have content
    if (locale === 'zh' && anthropic && (result.quick_guide || result.presentation_steps)) {
      try {
        const translated = await translateGuideToZh(result);
        return NextResponse.json(translated);
      } catch (err) {
        console.error('Translation failed, returning English:', err);
        // Fall through to return English version
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Guide API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
