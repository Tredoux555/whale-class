// app/api/montree/works/search/route.ts
// GET /api/montree/works/search - Search all works in a classroom
// Auto-detects classroom for single-classroom setups (like Whale Class)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Map database status to display status
function mapStatusFromDb(dbStatus: string | null, currentLevel: number | null): string {
  if (currentLevel !== null && currentLevel !== undefined) {
    switch (currentLevel) {
      case 0: return 'not_started';
      case 1: return 'presented';
      case 2: return 'practicing';
      case 3: return 'mastered';
    }
  }
  if (dbStatus === 'completed' || dbStatus === 'mastered') return 'mastered';
  if (dbStatus === 'in_progress' || dbStatus === 'practicing') return 'practicing';
  if (dbStatus === 'presented') return 'presented';
  return 'not_started';
}

export async function GET(request: NextRequest) {
  const debug: string[] = [];
  
  try {
    const { searchParams } = new URL(request.url);
    let classroomId = searchParams.get('classroom_id');
    const childId = searchParams.get('child_id');
    const query = searchParams.get('q')?.toLowerCase() || '';
    const areaKey = searchParams.get('area');
    const limit = parseInt(searchParams.get('limit') || '400');

    debug.push(`Params: classroomId=${classroomId}, childId=${childId}, area=${areaKey}`);

    const supabase = await createServerClient();

    // ALWAYS get the first montree_classroom as fallback (for single-classroom setups)
    if (!classroomId) {
      // First try: look up child's classroom
      if (childId) {
        const { data: montreeChild } = await supabase
          .from('montree_children')
          .select('classroom_id')
          .eq('id', childId)
          .maybeSingle();
        
        if (montreeChild?.classroom_id) {
          classroomId = montreeChild.classroom_id;
          debug.push(`Found classroom from montree_children: ${classroomId}`);
        }
      }
      
      // Second try: get first/only classroom (Whale Class setup)
      if (!classroomId) {
        const { data: allClassrooms, error: classroomError } = await supabase
          .from('montree_classrooms')
          .select('id, name')
          .order('created_at', { ascending: true })
          .limit(1);
        
        if (classroomError) {
          debug.push(`Classroom query error: ${classroomError.message}`);
        } else if (allClassrooms && allClassrooms.length > 0) {
          classroomId = allClassrooms[0].id;
          debug.push(`Using first classroom: ${allClassrooms[0].name} (${classroomId})`);
        } else {
          debug.push('No montree_classrooms found in database');
        }
      }
    }

    if (!classroomId) {
      return NextResponse.json({
        error: 'No classroom found. Please set up a Montree classroom first.',
        works: [],
        total: 0,
        debug,
      }, { status: 400 });
    }

    // Get all works for classroom with area info
    let worksQuery = supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        id,
        work_key,
        name,
        name_chinese,
        description,
        category_key,
        category_name,
        sequence,
        area_id,
        area:montree_classroom_curriculum_areas(
          id,
          area_key,
          name,
          color,
          icon
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('sequence');

    // Filter by area if specified
    if (areaKey && areaKey !== 'all') {
      const { data: areaData } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('area_key', areaKey)
        .maybeSingle();

      if (areaData) {
        worksQuery = worksQuery.eq('area_id', areaData.id);
        debug.push(`Filtering by area: ${areaKey}`);
      }
    }

    const { data: works, error: worksError } = await worksQuery.limit(limit);

    if (worksError) {
      debug.push(`Works query error: ${worksError.message}`);
      return NextResponse.json({
        error: `Database error: ${worksError.message}`,
        works: [],
        total: 0,
        debug,
      }, { status: 500 });
    }

    debug.push(`Found ${works?.length || 0} works`);

    // Filter by search query
    let filteredWorks = works || [];
    if (query) {
      filteredWorks = filteredWorks.filter(work =>
        work.name.toLowerCase().includes(query) ||
        (work.name_chinese && work.name_chinese.includes(query)) ||
        (work.category_name && work.category_name.toLowerCase().includes(query))
      );
      debug.push(`After search filter: ${filteredWorks.length} works`);
    }

    // Get progress for child if provided
    if (childId && filteredWorks.length > 0) {
      const workIds = filteredWorks.map(w => w.id);

      // Check both progress tables
      const { data: progressData } = await supabase
        .from('child_work_completion')
        .select('work_id, status, current_level')
        .eq('child_id', childId)
        .in('work_id', workIds);

      const { data: assignmentData } = await supabase
        .from('montree_child_assignments')
        .select('work_id, status, current_level')
        .eq('child_id', childId)
        .in('work_id', workIds);

      const progressMap = new Map<string, any>();
      (progressData || []).forEach(p => progressMap.set(p.work_id, p));
      (assignmentData || []).forEach(a => {
        if (a.status && a.status !== 'not_started') {
          progressMap.set(a.work_id, a);
        }
      });

      filteredWorks = filteredWorks.map(work => ({
        ...work,
        progress: progressMap.get(work.id) || null,
        status: mapStatusFromDb(
          progressMap.get(work.id)?.status,
          progressMap.get(work.id)?.current_level
        ),
      }));
    }

    return NextResponse.json({
      works: filteredWorks,
      total: filteredWorks.length,
      classroomId,
      debug,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    debug.push(`Exception: ${errorMsg}`);
    return NextResponse.json({
      error: errorMsg,
      works: [],
      total: 0,
      debug,
    }, { status: 500 });
  }
}
