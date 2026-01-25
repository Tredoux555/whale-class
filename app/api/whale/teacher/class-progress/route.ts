// app/api/whale/teacher/class-progress/route.ts
// Get aggregated class progress data

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher's students
    const { data: teacherStudents } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', user.id)
      .eq('is_active', true);

    const studentIds = teacherStudents?.map(ts => ts.student_id) || [];

    if (studentIds.length === 0) {
      return NextResponse.json({
        totalStudents: 0,
        areaProgress: [],
        recentActivity: [],
        needsAttention: [],
      });
    }

    // Get areas
    const { data: areas } = await supabase
      .from('curriculum_areas')
      .select('id, name, color, icon, sequence')
      .order('sequence');

    // Get all works count per area
    const { data: workCounts } = await supabase
      .from('curriculum_roadmap')
      .select('area_id');

    const worksPerArea: Record<string, number> = {};
    workCounts?.forEach(w => {
      worksPerArea[w.area_id] = (worksPerArea[w.area_id] || 0) + 1;
    });

    // Get completions per area for all students (use separate query)
    const { data: completions } = await supabase
      .from('child_work_completion')
      .select('child_id, work_id, status')
      .in('child_id', studentIds)
      .eq('status', 'completed');

    // Get work details to map to areas
    const workIds = [...new Set(completions?.map(c => c.work_id) || [])];
    const { data: works } = await supabase
      .from('curriculum_roadmap')
      .select('id, area_id')
      .in('id', workIds);

    const workAreaMap: Record<string, string> = {};
    works?.forEach(w => { workAreaMap[w.id] = w.area_id; });

    // Calculate class average per area
    const completionsPerArea: Record<string, number> = {};
    completions?.forEach(c => {
      const areaId = workAreaMap[c.work_id];
      if (areaId) {
        completionsPerArea[areaId] = (completionsPerArea[areaId] || 0) + 1;
      }
    });

    const areaProgress = areas?.map(area => {
      const totalWorksInArea = worksPerArea[area.id] || 0;
      const totalPossible = totalWorksInArea * studentIds.length;
      const completed = completionsPerArea[area.id] || 0;
      const avgPercentage = totalPossible > 0 
        ? Math.round((completed / totalPossible) * 100)
        : 0;

      return {
        ...area,
        totalWorks: totalWorksInArea,
        classCompleted: completed,
        avgPercentage,
      };
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentActivity } = await supabase
      .from('child_work_completion')
      .select('child_id, work_id, status, completed_at, started_at')
      .in('child_id', studentIds)
      .or(`completed_at.gte.${sevenDaysAgo.toISOString()},started_at.gte.${sevenDaysAgo.toISOString()}`)
      .order('completed_at', { ascending: false })
      .limit(20);

    // Get student names for recent activity
    const { data: studentNames } = await supabase
      .from('children')
      .select('id, name')
      .in('id', studentIds);

    const nameMap: Record<string, string> = {};
    studentNames?.forEach(s => { nameMap[s.id] = s.name; });

    // Get work names
    const recentWorkIds = [...new Set(recentActivity?.map(a => a.work_id) || [])];
    const { data: workNames } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, area_id')
      .in('id', recentWorkIds);

    const workMap: Record<string, { name: string; area_id: string }> = {};
    workNames?.forEach(w => { workMap[w.id] = { name: w.name, area_id: w.area_id }; });

    const enrichedActivity = recentActivity?.map(a => ({
      ...a,
      studentName: nameMap[a.child_id] || 'Unknown',
      workName: workMap[a.work_id]?.name || 'Unknown',
      areaId: workMap[a.work_id]?.area_id,
    }));

    // Find students needing attention (no activity in 7+ days)
    const activeStudentIds = new Set(recentActivity?.map(a => a.child_id) || []);
    const inactiveStudents = studentIds.filter(id => !activeStudentIds.has(id));

    const { data: inactiveStudentDetails } = await supabase
      .from('children')
      .select('id, name')
      .in('id', inactiveStudents);

    return NextResponse.json({
      totalStudents: studentIds.length,
      areaProgress: areaProgress || [],
      recentActivity: enrichedActivity || [],
      needsAttention: inactiveStudentDetails || [],
    });

  } catch (error) {
    console.error('Error fetching class progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class progress' },
      { status: 500 }
    );
  }
}


