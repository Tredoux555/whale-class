// /api/montree/admin/reseed-curriculum/route.ts
// Re-seed curriculum for an existing classroom with CORRECT static data
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks, loadCurriculumAreas } from '@/lib/montree/curriculum-loader';

// GET version for easy browser access
export async function GET(request: NextRequest) {
  // SECURITY: Require authentication
  const schoolId = request.headers.get('x-school-id');
  if (!schoolId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const classroomId = searchParams.get('classroom_id');
  return handleReseed(classroomId, schoolId);
}

export async function POST(request: NextRequest) {
  // SECURITY: Require authentication
  const schoolId = request.headers.get('x-school-id');
  if (!schoolId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const { classroomId } = await request.json();
  return handleReseed(classroomId, schoolId);
}

async function handleReseed(classroomId: string | null, schoolId: string) {
  try {
    const supabase = getSupabase();

    if (!classroomId) {
      return NextResponse.json({ error: 'classroomId required' }, { status: 400 });
    }

    // SECURITY: Verify classroom exists AND belongs to authenticated school
    const { data: classroom, error: classroomErr } = await supabase
      .from('montree_classrooms')
      .select('id, name, school_id')
      .eq('id', classroomId)
      .single();

    if (classroomErr || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }
    
    // SECURITY: Verify classroom belongs to authenticated school
    if (classroom.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log(`[Reseed] Starting for classroom: ${classroom.name} (${classroomId})`);

    // Step 1: Delete existing curriculum works and areas
    const { error: deleteWorksErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .delete()
      .eq('classroom_id', classroomId);

    if (deleteWorksErr) {
      console.error('[Reseed] Failed to delete works:', deleteWorksErr);
    }

    const { error: deleteAreasErr } = await supabase
      .from('montree_classroom_curriculum_areas')
      .delete()
      .eq('classroom_id', classroomId);

    if (deleteAreasErr) {
      console.error('[Reseed] Failed to delete areas:', deleteAreasErr);
    }

    // Step 2: Create curriculum areas from static data (English only)
    const areas = loadCurriculumAreas();
    const areasToInsert = areas.map(area => ({
      classroom_id: classroomId,
      area_key: area.area_key,
      name: area.name,
      icon: area.icon,
      color: area.color,
      sequence: area.sequence,
      is_active: true,
    }));

    const { data: insertedAreas, error: areaError } = await supabase
      .from('montree_classroom_curriculum_areas')
      .insert(areasToInsert)
      .select();

    if (areaError) {
      console.error('[Reseed] Failed to create areas:', areaError);
      return NextResponse.json({ error: `Failed to create areas: ${areaError.message}` }, { status: 500 });
    }

    // Build area_key -> UUID map
    const areaMap: Record<string, string> = {};
    for (const area of insertedAreas || []) {
      areaMap[area.area_key] = area.id;
    }

    // Step 3: Load ALL works from static curriculum
    const allWorks = loadAllCurriculumWorks();
    console.log(`[Reseed] Loading ${allWorks.length} works from static curriculum`);

    // Step 4: Transform to database format
    const worksToInsert = allWorks.map(work => {
      const areaUuid = areaMap[work.area_key];
      if (!areaUuid) {
        console.warn(`[Reseed] No area UUID for ${work.area_key}`);
        return null;
      }

      return {
        classroom_id: classroomId,
        area_id: areaUuid,
        work_key: work.work_key,
        name: work.name,
        description: work.description || null,
        age_range: work.age_range || '3-6',
        sequence: work.sequence, // CORRECT global sequence
        is_active: true,
        materials: work.materials || [],
        direct_aims: work.direct_aims || [],
        indirect_aims: work.indirect_aims || [],
        control_of_error: work.control_of_error || null,
        prerequisites: work.prerequisites || [],
        // Parent-facing descriptions (from comprehensive-guides)
        quick_guide: work.quick_guide || null,
        presentation_steps: work.presentation_steps || [],
        parent_description: work.parent_description || null,
        why_it_matters: work.why_it_matters || null,
      };
    }).filter(Boolean);

    // Step 5: Insert works in batches
    const BATCH_SIZE = 50;
    let insertedCount = 0;

    for (let i = 0; i < worksToInsert.length; i += BATCH_SIZE) {
      const batch = worksToInsert.slice(i, i + BATCH_SIZE);
      const { error: batchError } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(batch);

      if (!batchError) {
        insertedCount += batch.length;
      } else {
        console.error(`[Reseed] Batch error:`, batchError);
      }
    }

    console.log(`[Reseed] Complete! Seeded ${insertedCount} works for ${classroom.name}`);

    // Verify by getting a sample
    const { data: sampleWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, sequence')
      .eq('classroom_id', classroomId)
      .eq('area_id', areaMap['mathematics'])
      .order('sequence')
      .limit(5);

    return NextResponse.json({
      success: true,
      classroom: classroom.name,
      areasCreated: insertedAreas?.length || 0,
      worksCreated: insertedCount,
      sampleMathWorks: sampleWorks, // Should show Number Rods first!
    });

  } catch (error) {
    console.error('[Reseed] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
