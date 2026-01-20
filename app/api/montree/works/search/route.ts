// app/api/montree/works/search/route.ts
// GET /api/montree/works/search - Search all works in a classroom
// Supports: text search, area filter, with progress status for a child
// Can auto-detect classroom from child_id if classroom_id not provided

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Map database status to display status
function mapStatusFromDb(dbStatus: string | null, currentLevel: number | null): string {
  if (!dbStatus && !currentLevel) return 'not_started';
  
  // Use current_level as source of truth (0=not_started, 1=presented, 2=practicing, 3=mastered)
  if (currentLevel !== null && currentLevel !== undefined) {
    switch (currentLevel) {
      case 0: return 'not_started';
      case 1: return 'presented';
      case 2: return 'practicing';
      case 3: return 'mastered';
    }
  }
  
  // Fallback to status string
  if (dbStatus === 'completed' || dbStatus === 'mastered') return 'mastered';
  if (dbStatus === 'in_progress' || dbStatus === 'practicing') return 'practicing';
  if (dbStatus === 'presented') return 'presented';
  return 'not_started';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let classroomId = searchParams.get('classroom_id');
    const childId = searchParams.get('child_id');
    const query = searchParams.get('q')?.toLowerCase() || '';
    const areaKey = searchParams.get('area');
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = await createServerClient();

    // If no classroom_id but we have child_id, look up classroom from child
    if (!classroomId && childId) {
      // Try montree_children first
      const { data: montreeChild } = await supabase
        .from('montree_children')
        .select('classroom_id')
        .eq('id', childId)
        .single();
      
      if (montreeChild?.classroom_id) {
        classroomId = montreeChild.classroom_id;
      } else {
        // Fallback: get first montree_classroom (for single-classroom setup like Whale)
        const { data: firstClassroom } = await supabase
          .from('montree_classrooms')
          .select('id')
          .limit(1)
          .single();
        
        if (firstClassroom) {
          classroomId = firstClassroom.id;
        }
      }
    }

    if (!classroomId) {
      return NextResponse.json(
        { error: 'classroom_id is required (or provide child_id to auto-detect)', works: [] },
        { status: 400 }
      );
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
    if (areaKey) {
      const { data: areaData } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('area_key', areaKey)
        .single();

      if (areaData) {
        worksQuery = worksQuery.eq('area_id', areaData.id);
      }
    }

    const { data: works, error: worksError } = await worksQuery.limit(limit);

    if (worksError) {
      console.error('Works fetch error:', worksError);
      return NextResponse.json({ error: worksError.message, works: [] }, { status: 500 });
    }

    // Filter by search query
    let filteredWorks = works || [];
    if (query) {
      filteredWorks = filteredWorks.filter(work => 
        work.name.toLowerCase().includes(query) ||
        (work.name_chinese && work.name_chinese.includes(query)) ||
        (work.category_name && work.category_name.toLowerCase().includes(query))
      );
    }

    // If child_id provided, get their progress
    if (childId && filteredWorks.length > 0) {
      const workIds = filteredWorks.map(w => w.id);
      
      // Try child_work_completion first (main progress table)
      const { data: progressData } = await supabase
        .from('child_work_completion')
        .select('work_id, status, current_level')
        .eq('child_id', childId)
        .in('work_id', workIds);

      // Also check montree_child_assignments for additional status info
      const { data: assignmentData } = await supabase
        .from('montree_child_assignments')
        .select('work_id, status, current_level')
        .eq('child_id', childId)
        .in('work_id', workIds);

      // Merge both sources (assignments take precedence)
      const progressMap = new Map<string, any>();
      
      (progressData || []).forEach(p => {
        progressMap.set(p.work_id, p);
      });
      
      (assignmentData || []).forEach(a => {
        // Only override if assignment has actual status
        if (a.status && a.status !== 'not_started') {
          progressMap.set(a.work_id, a);
        }
      });

      // Enrich works with progress data
      filteredWorks = filteredWorks.map(work => {
        const progress = progressMap.get(work.id);
        return {
          ...work,
          progress: progress || null,
          status: mapStatusFromDb(progress?.status, progress?.current_level),
        };
      });
    }

    return NextResponse.json({ 
      works: filteredWorks,
      total: filteredWorks.length,
      classroomId,
    });

  } catch (error) {
    console.error('Work search error:', error);
    return NextResponse.json(
      { error: 'Failed to search works', works: [] },
      { status: 500 }
    );
  }
}
