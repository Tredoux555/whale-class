// /api/montree/works/guide/route.ts
// GET quick guide for a work by name
// Checks classroom curriculum first, then falls back to master Brain

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workName = searchParams.get('name');
    const classroomId = searchParams.get('classroom_id');

    if (!workName) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const supabase = getSupabase();
    let guideData: any = null;

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

    // 3. Return data or fallback
    if (!guideData) {
      return NextResponse.json({
        name: workName,
        quick_guide: null,
        video_search_term: `${workName} Montessori presentation`,
        message: 'Guide not found - check curriculum page'
      });
    }

    return NextResponse.json({
      name: guideData.name,
      quick_guide: guideData.quick_guide,
      video_search_term: guideData.video_search_terms || `${workName} Montessori presentation`,
      parent_description: guideData.parent_description,
      direct_aims: guideData.direct_aims,
      materials: guideData.materials,
      presentation_steps: guideData.presentation_steps,
      control_of_error: guideData.control_of_error,
      why_it_matters: guideData.why_it_matters,
    });

  } catch (error) {
    console.error('Guide API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
