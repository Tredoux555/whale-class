// /api/montree/curriculum/seed/route.ts
// Seeds a classroom with its own editable copy of the curriculum
// POST: Creates curriculum for a classroom from master JSON files
// Uses montree_classroom_curriculum_areas and montree_classroom_curriculum_works

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRICULUM } from '@/lib/montree/curriculum-data';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { classroomId } = await request.json();

    if (!classroomId) {
      return NextResponse.json({ error: 'classroomId is required' }, { status: 400 });
    }

    // Check if curriculum already exists for this classroom
    const { data: existing } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', classroomId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        error: 'Curriculum already exists for this classroom',
        message: 'Use DELETE first to reset'
      }, { status: 409 });
    }

    // Insert areas
    const areaInserts = CURRICULUM.map((area, index) => ({
      classroom_id: classroomId,
      area_key: area.id,
      name: area.name,
      icon: area.icon,
      color: area.color,
      sequence: index,
      is_active: true,
    }));

    const { data: insertedAreas, error: areaError } = await supabase
      .from('montree_classroom_curriculum_areas')
      .insert(areaInserts)
      .select();

    if (areaError) {
      console.error('Failed to insert areas:', areaError);
      return NextResponse.json({ error: `Failed to create curriculum areas: ${areaError.message}` }, { status: 500 });
    }

    // Create area ID lookup
    const areaIdMap: Record<string, string> = {};
    insertedAreas.forEach(area => {
      areaIdMap[area.area_key] = area.id;
    });

    // Insert works for each area
    const workInserts: any[] = [];
    let sequenceCounter = 0;

    CURRICULUM.forEach(area => {
      const areaId = areaIdMap[area.id];
      
      area.categories.forEach(category => {
        category.works.forEach(work => {
          workInserts.push({
            area_id: areaId,
            classroom_id: classroomId,
            work_key: work.id,
            name: work.name,
            name_chinese: work.chineseName,
            description: work.description,
            age_range: work.ageRange,
            materials: work.materials || [],
            direct_aims: work.directAims || [],
            indirect_aims: work.indirectAims || [],
            control_of_error: work.controlOfError,
            prerequisites: work.prerequisites || [],
            video_search_terms: work.videoSearchTerms || [],
            category_key: category.id,
            category_name: category.name,
            sequence: sequenceCounter++,
            is_active: true,
          });
        });
      });
    });

    // Insert in batches of 100
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < workInserts.length; i += batchSize) {
      const batch = workInserts.slice(i, i + batchSize);
      const { error: workError } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(batch);

      if (workError) {
        console.error('Failed to insert works batch:', workError);
        return NextResponse.json({ 
          error: `Failed to insert works: ${workError.message}`,
          areasCreated: insertedAreas.length 
        }, { status: 500 });
      } else {
        totalInserted += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Curriculum seeded successfully',
      classroomId,
      areasCreated: insertedAreas.length,
      worksCreated: totalInserted,
    });

  } catch (error) {
    console.error('Curriculum seed error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to seed curriculum' }, { status: 500 });
  }
}

// GET: Check if curriculum exists for a classroom
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroomId is required' }, { status: 400 });
    }

    const { data: areas, error: areaError } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key, name')
      .eq('classroom_id', classroomId);

    if (areaError) {
      return NextResponse.json({ error: `Failed to check areas: ${areaError.message}` }, { status: 500 });
    }

    const { count, error: workError } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id', { count: 'exact', head: true })
      .eq('classroom_id', classroomId);

    if (workError) {
      return NextResponse.json({ error: `Failed to check works: ${workError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      exists: areas && areas.length > 0,
      classroomId,
      areaCount: areas?.length || 0,
      workCount: count || 0,
    });

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to check curriculum' }, { status: 500 });
  }
}

// DELETE: Remove curriculum for a classroom (to re-seed)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroomId is required' }, { status: 400 });
    }

    // Delete works first (foreign key)
    await supabase
      .from('montree_classroom_curriculum_works')
      .delete()
      .eq('classroom_id', classroomId);

    // Delete areas
    await supabase
      .from('montree_classroom_curriculum_areas')
      .delete()
      .eq('classroom_id', classroomId);

    return NextResponse.json({
      success: true,
      message: 'Curriculum deleted for classroom',
      classroomId,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete curriculum' }, { status: 500 });
  }
}
