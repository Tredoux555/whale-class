// app/api/brain/work/[id]/handbook/route.ts
// Get full handbook/training data for a specific work

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/brain/work/[id]/handbook
 * Returns comprehensive handbook data for teacher training
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workId = params.id;

    if (!workId) {
      return NextResponse.json(
        { success: false, error: 'Work ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get the work with all handbook fields
    const { data: work, error } = await supabase
      .from('montessori_works')
      .select(`
        id,
        name,
        slug,
        curriculum_area,
        sub_area,
        age_min,
        age_max,
        age_typical,
        direct_aims,
        indirect_aims,
        readiness_indicators,
        materials_needed,
        presentation_notes,
        presentation_steps,
        points_of_interest,
        control_of_error,
        variations,
        common_challenges,
        mastery_indicators,
        repres_triggers,
        extension_work_ids,
        video_url,
        image_url,
        parent_explanation_simple,
        parent_explanation_detailed,
        parent_why_it_matters,
        is_gateway,
        difficulty_level
      `)
      .eq('id', workId)
      .single();

    if (error) {
      console.error('Error fetching work handbook:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }

    // Get extension works details if any
    let extensions = [];
    if (work.extension_work_ids && work.extension_work_ids.length > 0) {
      const { data: extWorks } = await supabase
        .from('montessori_works')
        .select('id, name, slug, curriculum_area')
        .in('id', work.extension_work_ids);
      extensions = extWorks || [];
    }

    // Get prerequisites
    const { data: prereqs } = await supabase
      .from('work_prerequisites')
      .select(`
        prerequisite_work_id,
        is_required,
        prerequisite:montessori_works!work_prerequisites_prerequisite_work_id_fkey(
          id, name, slug, curriculum_area
        )
      `)
      .eq('work_id', workId);

    // Get what this work unlocks
    const { data: unlocks } = await supabase
      .from('work_prerequisites')
      .select(`
        work_id,
        work:montessori_works!work_prerequisites_work_id_fkey(
          id, name, slug, curriculum_area
        )
      `)
      .eq('prerequisite_work_id', workId);

    // Format response as handbook structure
    const handbook = {
      // Basic Info
      id: work.id,
      name: work.name,
      slug: work.slug,
      curriculum_area: work.curriculum_area,
      sub_area: work.sub_area,
      difficulty_level: work.difficulty_level,
      is_gateway: work.is_gateway,
      
      // Age Range
      ages: {
        min: work.age_min,
        max: work.age_max,
        typical: work.age_typical,
      },

      // 1. PREPARATION
      preparation: {
        materials: work.materials_needed || [],
        readiness_indicators: work.readiness_indicators || [],
        control_of_error: work.control_of_error,
      },

      // 2. PRESENTATION
      presentation: {
        video_url: work.video_url,
        steps: work.presentation_steps || [],
        notes: work.presentation_notes,
      },

      // 3. POINTS OF INTEREST
      points_of_interest: work.points_of_interest || [],

      // 4. AIMS
      aims: {
        direct: work.direct_aims || [],
        indirect: work.indirect_aims || [],
      },

      // 5. EXTENSIONS & VARIATIONS
      extensions: {
        variations: work.variations || [],
        extension_works: extensions,
        unlocks: unlocks?.map(u => u.work) || [],
      },

      // 6. OBSERVATION NOTES
      observation: {
        mastery_indicators: work.mastery_indicators || [],
        common_challenges: work.common_challenges || [],
        repres_triggers: work.repres_triggers || [],
      },

      // 7. PREREQUISITES
      prerequisites: prereqs?.map(p => ({
        ...p.prerequisite,
        is_required: p.is_required,
      })) || [],

      // 8. PARENT INFO
      parent_info: {
        simple: work.parent_explanation_simple,
        detailed: work.parent_explanation_detailed,
        why_it_matters: work.parent_why_it_matters,
      },

      // Media
      media: {
        image_url: work.image_url,
        video_url: work.video_url,
      },
    };

    return NextResponse.json({
      success: true,
      handbook,
    });
  } catch (error: any) {
    console.error('Error in brain/work/handbook:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch handbook' },
      { status: 500 }
    );
  }
}
