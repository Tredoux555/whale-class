// /api/montree/admin/backfill-guides/route.ts
// Backfill existing classroom with AMI presentation guides
// Usage: GET /api/montree/admin/backfill-guides?classroom_id=xxx
// Or: GET /api/montree/admin/backfill-guides?all=true (all classrooms)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const updateAll = searchParams.get('all') === 'true';

    if (!classroomId && !updateAll) {
      return NextResponse.json({
        error: 'Provide classroom_id or all=true',
        usage: '/api/montree/admin/backfill-guides?classroom_id=xxx'
      }, { status: 400 });
    }

    const supabase = getSupabase();
    
    // SECURITY: Verify classroom belongs to authenticated school
    if (classroomId) {
      const { data: classroom } = await supabase
        .from('montree_classrooms')
        .select('school_id')
        .eq('id', classroomId)
        .single();
      
      if (!classroom || classroom.school_id !== schoolId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Load curriculum with guides - NO filter on quick_guide
    // Any work with parent_description OR quick_guide should be in the map
    const allWorks = loadAllCurriculumWorks();
    const guideMapByName = new Map<string, any>();
    const guideMapByKey = new Map<string, any>();

    for (const work of allWorks) {
      // Include ALL works that have any guide data (not just quick_guide)
      if (work.quick_guide || work.parent_description || work.why_it_matters) {
        guideMapByName.set(work.name.toLowerCase().trim(), work);
        if (work.work_key) {
          guideMapByKey.set(work.work_key.toLowerCase().trim(), work);
        }
      }
    }

    // Get existing works to update
    let query = supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, work_key, classroom_id');

    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }

    const { data: existingWorks, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingWorks?.length) {
      return NextResponse.json({
        message: 'No works found to update',
        classroom_id: classroomId
      });
    }

    // Update each work with guide data
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const work of existingWorks) {
      // Try name match first, then work_key match as fallback
      const guide = guideMapByName.get(work.name.toLowerCase().trim())
        || (work.work_key ? guideMapByKey.get(work.work_key.toLowerCase().trim()) : null);

      if (!guide) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('montree_classroom_curriculum_works')
        .update({
          quick_guide: guide.quick_guide,
          presentation_steps: guide.presentation_steps || [],
          control_of_error: guide.control_of_error,
          direct_aims: guide.direct_aims || [],
          materials: guide.materials || [],
          parent_description: guide.parent_description,
          why_it_matters: guide.why_it_matters,
        })
        .eq('id', work.id);

      if (updateError) {
        errors.push(`${work.name}: ${updateError.message}`);
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${updated} works with AMI presentation guides`,
      updated,
      skipped,
      total: existingWorks.length,
      errors: errors.length > 0 ? errors : undefined,
      classroom_id: classroomId || 'all'
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
