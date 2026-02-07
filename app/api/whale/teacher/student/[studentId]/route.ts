// app/api/whale/teacher/student/[studentId]/route.ts
// Get detailed progress for a specific student

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const supabase = getSupabase();
  const { studentId } = await params;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify teacher has access to this student
    const { data: access } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get student details
    const { data: student } = await supabase
      .from('children')
      .select('*')
      .eq('id', studentId)
      .single();

    // Get areas
    const { data: areas } = await supabase
      .from('curriculum_areas')
      .select('id, name, color, icon, sequence')
      .order('sequence');

    // Get work counts per area
    const { data: allWorks } = await supabase
      .from('curriculum_roadmap')
      .select('id, area_id');

    const worksPerArea: Record<string, number> = {};
    allWorks?.forEach(w => {
      worksPerArea[w.area_id] = (worksPerArea[w.area_id] || 0) + 1;
    });

    // Get student's completions
    const { data: completions } = await supabase
      .from('child_work_completion')
      .select('work_id, status, current_level, max_level, started_at, completed_at')
      .eq('child_id', studentId);

    // Get work details for completions
    const completedWorkIds = completions?.map(c => c.work_id) || [];
    const { data: completedWorks } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, area_id, category_id')
      .in('id', completedWorkIds);

    const workAreaMap: Record<string, string> = {};
    completedWorks?.forEach(w => { workAreaMap[w.id] = w.area_id; });

    // Calculate per-area stats
    const completedPerArea: Record<string, number> = {};
    const inProgressPerArea: Record<string, number> = {};
    
    completions?.forEach(c => {
      const areaId = workAreaMap[c.work_id];
      if (areaId) {
        if (c.status === 'completed') {
          completedPerArea[areaId] = (completedPerArea[areaId] || 0) + 1;
        } else if (c.status === 'in_progress') {
          inProgressPerArea[areaId] = (inProgressPerArea[areaId] || 0) + 1;
        }
      }
    });

    const areaProgress = areas?.map(area => ({
      ...area,
      totalWorks: worksPerArea[area.id] || 0,
      completed: completedPerArea[area.id] || 0,
      inProgress: inProgressPerArea[area.id] || 0,
      percentage: worksPerArea[area.id] 
        ? Math.round(((completedPerArea[area.id] || 0) / worksPerArea[area.id]) * 100)
        : 0,
    }));

    // Get recent completions
    const recentCompletions = completions
      ?.filter(c => c.status === 'completed' && c.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
      .slice(0, 10)
      .map(c => {
        const work = completedWorks?.find(w => w.id === c.work_id);
        const area = areas?.find(a => a.id === work?.area_id);
        return {
          ...c,
          workName: work?.name || 'Unknown',
          areaName: area?.name,
          areaColor: area?.color,
          areaIcon: area?.icon,
        };
      });

    // Get in-progress works
    const inProgressWorks = completions
      ?.filter(c => c.status === 'in_progress')
      .map(c => {
        const work = completedWorks?.find(w => w.id === c.work_id);
        const area = areas?.find(a => a.id === work?.area_id);
        return {
          ...c,
          workName: work?.name || 'Unknown',
          areaName: area?.name,
          areaColor: area?.color,
          areaIcon: area?.icon,
        };
      });

    // Calculate stats
    const totalCompleted = completions?.filter(c => c.status === 'completed').length || 0;
    const totalInProgress = completions?.filter(c => c.status === 'in_progress').length || 0;
    const totalWorks = allWorks?.length || 0;

    return NextResponse.json({
      student: {
        ...student,
        avatar_url: (student as any)?.photo_url, // Map photo_url to avatar_url
        age: (student as any)?.date_of_birth
          ? Math.floor((Date.now() - new Date((student as any).date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
      },
      areaProgress: areaProgress || [],
      recentCompletions: recentCompletions || [],
      inProgressWorks: inProgressWorks || [],
      stats: {
        totalCompleted,
        totalInProgress,
        totalWorks,
        overallPercentage: totalWorks > 0 ? Math.round((totalCompleted / totalWorks) * 100) : 0,
      },
    });

  } catch (error) {
    console.error('Error fetching student details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student details' },
      { status: 500 }
    );
  }
}


