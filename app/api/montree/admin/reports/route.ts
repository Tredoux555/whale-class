// /api/montree/admin/reports/route.ts
// School-wide analytics and reports
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/montree/supabase';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Use header-based authentication instead of query parameter
    const headerSchoolId = request.headers.get('x-school-id');
    if (!headerSchoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const querySchoolId = searchParams.get('school_id');
    const range = searchParams.get('range') || 'week';
    
    // SECURITY: Prevent accessing other schools' data via query parameter
    const schoolId = headerSchoolId;
    if (querySchoolId && querySchoolId !== headerSchoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getSupabase();
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    if (range === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date('2020-01-01');
    }

    // Get classrooms for this school
    const { data: classrooms } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon')
      .eq('school_id', schoolId);

    if (!classrooms || classrooms.length === 0) {
      return NextResponse.json({
        success: true,
        school_stats: {
          total_students: 0,
          total_teachers: 0,
          total_classrooms: 0,
          total_works_completed: 0,
          avg_progress: 0,
          active_this_week: 0
        },
        classroom_stats: []
      });
    }

    const classroomIds = classrooms.map(c => c.id);

    // Get students per classroom
    const { data: students } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .in('classroom_id', classroomIds);

    // Get teachers count
    const { count: teacherCount } = await supabase
      .from('montree_teachers')
      .select('id', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('is_active', true);

    // Get work completions in date range
    const { data: completions } = await supabase
      .from('child_work_completion')
      .select('child_id, status, created_at')
      .in('child_id', (students || []).map(s => s.id))
      .gte('created_at', startDate.toISOString());

    // Calculate stats per classroom
    const classroomStats = classrooms.map(classroom => {
      const classStudents = (students || []).filter(s => s.classroom_id === classroom.id);
      const classStudentIds = classStudents.map(s => s.id);
      const classCompletions = (completions || []).filter(c => classStudentIds.includes(c.child_id));
      
      const completedCount = classCompletions.filter(c => c.status === 'completed').length;

      return {
        id: classroom.id,
        name: classroom.name,
        icon: classroom.icon,
        student_count: classStudents.length,
        avg_progress: classStudents.length > 0 ? Math.round((completedCount / Math.max(classStudents.length, 1)) * 10) : 0,
        works_completed_this_week: completedCount
      };
    });

    // School totals
    const totalStudents = (students || []).length;
    const totalWorks = (completions || []).filter(c => c.status === 'completed').length;
    const activeStudents = new Set((completions || []).map(c => c.child_id)).size;

    return NextResponse.json({
      success: true,
      school_stats: {
        total_students: totalStudents,
        total_teachers: teacherCount || 0,
        total_classrooms: classrooms.length,
        total_works_completed: totalWorks,
        avg_progress: totalStudents > 0 ? Math.round((totalWorks / totalStudents) * 10) : 0,
        active_this_week: activeStudents
      },
      classroom_stats: classroomStats
    });

  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
