// /api/montree/children/route.ts
// Returns children for a classroom + Add new children
// Fixed: Inline client creation to avoid any import issues

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase env vars');
  }
  return createClient(supabaseUrl, supabaseKey);
}

// Add a new child to classroom
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { classroomId, name, age, progress } = await request.json();

    if (!classroomId || !name?.trim()) {
      return NextResponse.json({ error: 'Classroom ID and name required' }, { status: 400 });
    }

    // Create the child
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .insert({
        classroom_id: classroomId,
        name: name.trim(),
        age: age || 3.5,
      })
      .select()
      .single();

    if (childError) {
      console.error('Failed to create child:', childError);
      return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
    }

    // If progress is provided, create progress records
    if (progress && Object.keys(progress).length > 0) {
      // Get curriculum works for this classroom
      const { data: curriculumWorks } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id, work_key, name, name_chinese, area_id, sequence')
        .eq('classroom_id', classroomId);

      const { data: curriculumAreas } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key')
        .eq('classroom_id', classroomId);

      const areaKeyToId = new Map<string, string>();
      if (curriculumAreas) {
        for (const area of curriculumAreas) {
          areaKeyToId.set(area.area_key, area.id);
        }
      }

      const workMap = new Map<string, any>();
      if (curriculumWorks) {
        for (const work of curriculumWorks) {
          workMap.set(work.id, work);
          workMap.set(work.work_key, work);
        }
      }

      // Create progress records
      for (const [areaKey, workId] of Object.entries(progress)) {
        if (!workId) continue;

        const work = workMap.get(workId as string);
        if (!work) continue;

        const areaUuid = areaKeyToId.get(areaKey);
        if (!areaUuid) continue;

        // Get all works in this area up to and including the selected work
        const areaWorks = curriculumWorks?.filter(w => w.area_id === areaUuid) || [];
        areaWorks.sort((a, b) => a.sequence - b.sequence);

        const selectedIndex = areaWorks.findIndex(w => w.id === workId || w.work_key === workId);

        if (selectedIndex >= 0) {
          const worksToMark = areaWorks.slice(0, selectedIndex + 1);
          for (const w of worksToMark) {
            await supabase.from('montree_child_progress').insert({
              child_id: child.id,
              work_name: w.name,
              work_name_chinese: w.name_chinese || null,
              area: areaKey,
              status: 'presented',
              presented_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, child });
  } catch (error) {
    console.error('Create child error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    
    // Create client inline to guarantee fresh connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase env vars');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let query = supabase
      .from('montree_children')
      .select('id, name, age, photo_url, notes, classroom_id')
      .order('name');
    
    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }
    
    return NextResponse.json({ children: data || [] });
    
  } catch (error) {
    console.error('Children API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
