// /api/montree/progress/summary/route.ts
// Returns progress summary per area for bar chart display

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const AREA_KEYS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    
    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // First get the child's classroom_id
    const { data: childData } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .single();

    const classroomId = childData?.classroom_id;
    if (!classroomId) {
      return NextResponse.json({ error: 'Child not in a classroom' }, { status: 400 });
    }

    // Get all works for this classroom with area info
    const { data: allWorks, error: worksError } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        id, name, sequence,
        area:montree_classroom_curriculum_areas!area_id (
          area_key
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('sequence');

    if (worksError) {
      console.error('Works fetch error:', worksError);
      return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 });
    }

    // Get child's progress - uses work_name not work_id
    const { data: progress, error: progressError } = await supabase
      .from('montree_child_progress')
      .select('work_name, status, area')
      .eq('child_id', childId);

    if (progressError) {
      console.error('Progress fetch error:', progressError);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    // Create progress lookup by work_name (normalized to lowercase)
    const progressMap = new Map();
    for (const p of progress || []) {
      progressMap.set(p.work_name?.toLowerCase(), p.status);
    }

    // Calculate per-area stats
    const areaSummary = AREA_KEYS.map(areaKey => {
      const areaWorks = (allWorks || []).filter(w => w.area?.area_key === areaKey);
      const totalWorks = areaWorks.length;
      
      let completed = 0;
      let inProgress = 0;
      let currentWork = null;
      let currentWorkIndex = 0;

      for (let i = 0; i < areaWorks.length; i++) {
        const work = areaWorks[i];
        const status = progressMap.get(work.name?.toLowerCase());
        
        if (status === 3 || status === 'mastered' || status === 'completed') {
          completed++;
        } else if (status === 1 || status === 2 || status === 'presented' || status === 'practicing') {
          inProgress++;
          if (!currentWork || (work.sequence || 0) > (currentWork.sequence || 0)) {
            currentWork = work;
            currentWorkIndex = i;
          }
        }
      }

      // If no work in progress, current = first non-completed work
      if (!currentWork && areaWorks.length > 0) {
        for (let i = 0; i < areaWorks.length; i++) {
          const work = areaWorks[i];
          const status = progressMap.get(work.name?.toLowerCase());
          if (status !== 3 && status !== 'mastered' && status !== 'completed') {
            currentWork = work;
            currentWorkIndex = i;
            break;
          }
        }
      }

      const progressPercent = totalWorks > 0 
        ? Math.round((completed / totalWorks) * 100) 
        : 0;

      return {
        area: areaKey,
        totalWorks,
        completed,
        inProgress,
        progressPercent,
        currentWork: currentWork ? {
          id: currentWork.id,
          name: currentWork.name,
          index: currentWorkIndex + 1,
        } : null,
      };
    });

    const totalCompleted = areaSummary.reduce((sum, a) => sum + a.completed, 0);
    const totalWorks = areaSummary.reduce((sum, a) => sum + a.totalWorks, 0);
    const overallPercent = totalWorks > 0 ? Math.round((totalCompleted / totalWorks) * 100) : 0;

    // Also return detailed progress list with dates
    const { data: detailedProgress } = await supabase
      .from('montree_child_progress')
      .select('id, work_name, area, status, presented_at, mastered_at')
      .eq('child_id', childId)
      .order('updated_at', { ascending: false });

    return NextResponse.json({
      success: true,
      areas: areaSummary,
      overall: {
        completed: totalCompleted,
        total: totalWorks,
        percent: overallPercent,
      },
      progress: detailedProgress || [],
    });

  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
