// /api/montree/students/[id]/route.ts
// Get single student with full progress details
// Uses montree_children and montree_child_assignments (standalone)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { id: studentId } = await params;

  try {
    // 1. Get student from montree_children
    const { data: student, error: studentError } = await supabase
      .from('montree_children')
      .select('id, name, age, settings, classroom_id, created_at')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      console.error('Student not found:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Extract name_chinese from settings
    const name_chinese = student.settings?.name_chinese || null;

    // 2. Get assignments for this student from montree_child_assignments
    const { data: assignments, error: assignError } = await supabase
      .from('montree_child_assignments')
      .select(`
        id, 
        status, 
        current_level,
        assigned_at,
        presented_at,
        mastered_at,
        notes,
        work:montree_classroom_curriculum_works(
          id, 
          work_key, 
          name, 
          name_chinese,
          category_key,
          area_id
        )
      `)
      .eq('child_id', studentId);

    if (assignError) {
      console.error('Assignments query error:', assignError);
    }

    // 3. Get area info for progress calculation
    const { data: areas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key, name')
      .eq('classroom_id', student.classroom_id);

    // Create area lookup
    const areaMap = new Map((areas || []).map(a => [a.id, a]));

    // 4. Calculate progress by area
    const progressByArea: Record<string, { 
      name: string;
      completed: number; 
      in_progress: number; 
      total: number;
      percentage: number;
    }> = {};

    // Initialize areas
    (areas || []).forEach(area => {
      progressByArea[area.area_key] = {
        name: area.name,
        completed: 0,
        in_progress: 0,
        total: 0,
        percentage: 0,
      };
    });

    // Count by area
    (assignments || []).forEach(a => {
      if (a.work?.area_id) {
        const area = areaMap.get(a.work.area_id);
        if (area && progressByArea[area.area_key]) {
          progressByArea[area.area_key].total++;
          if (a.status === 'mastered') {
            progressByArea[area.area_key].completed++;
          } else if (a.status === 'practicing' || a.status === 'presented') {
            progressByArea[area.area_key].in_progress++;
          }
        }
      }
    });

    // Calculate percentages
    Object.keys(progressByArea).forEach(key => {
      const area = progressByArea[key];
      if (area.total > 0) {
        area.percentage = Math.round((area.completed / area.total) * 100);
      }
    });

    // 5. Calculate totals
    const totalCompleted = (assignments || []).filter(a => a.status === 'mastered').length;
    const totalInProgress = (assignments || []).filter(a => 
      a.status === 'practicing' || a.status === 'presented'
    ).length;
    const totalAssignments = (assignments || []).length;

    return NextResponse.json({
      student: {
        ...student,
        name_chinese,
      },
      progress: progressByArea,
      assignments: assignments || [],
      totalCompleted,
      totalInProgress,
      totalAssignments,
      overallPercentage: totalAssignments > 0 
        ? Math.round((totalCompleted / totalAssignments) * 100) 
        : 0,
    });

  } catch (error: any) {
    console.error('Montree student detail API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
