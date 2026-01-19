// app/api/montree/works/search/route.ts
// GET /api/montree/works/search - Search all works in a classroom
// Supports: text search, area filter, with assignment status for a child

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const childId = searchParams.get('child_id');
    const query = searchParams.get('q')?.toLowerCase() || '';
    const areaKey = searchParams.get('area');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!classroomId) {
      return NextResponse.json(
        { error: 'classroom_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

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
      // Need to join and filter
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
      return NextResponse.json({ error: worksError.message }, { status: 500 });
    }

    // Filter by search query (client-side for flexibility)
    let filteredWorks = works || [];
    if (query) {
      filteredWorks = filteredWorks.filter(work => 
        work.name.toLowerCase().includes(query) ||
        (work.name_chinese && work.name_chinese.includes(query)) ||
        (work.category_name && work.category_name.toLowerCase().includes(query))
      );
    }

    // If child_id provided, get their assignment status for each work
    if (childId && filteredWorks.length > 0) {
      const workIds = filteredWorks.map(w => w.id);
      
      const { data: assignments } = await supabase
        .from('montree_child_assignments')
        .select('work_id, status, current_level, presented_at, mastered_at')
        .eq('child_id', childId)
        .in('work_id', workIds);

      // Create a map for quick lookup
      const assignmentMap = new Map(
        (assignments || []).map(a => [a.work_id, a])
      );

      // Enrich works with assignment data
      filteredWorks = filteredWorks.map(work => ({
        ...work,
        assignment: assignmentMap.get(work.id) || null,
        status: assignmentMap.get(work.id)?.status || 'not_started',
      }));
    }

    return NextResponse.json({ 
      works: filteredWorks,
      total: filteredWorks.length,
    });

  } catch (error) {
    console.error('Work search error:', error);
    return NextResponse.json(
      { error: 'Failed to search works' },
      { status: 500 }
    );
  }
}
