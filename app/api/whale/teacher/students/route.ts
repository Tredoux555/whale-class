// app/api/whale/teacher/students/route.ts
// Get all students for the authenticated teacher

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a teacher
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role_name !== 'teacher' && userRole?.role_name !== 'admin' && userRole?.role_name !== 'super_admin') {
      return NextResponse.json({ error: 'Not authorized as teacher' }, { status: 403 });
    }

    // Get students linked to this teacher
    const { data: teacherStudents, error } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', user.id)
      .eq('is_active', true);

    if (error) throw error;

    const studentIds = teacherStudents?.map(ts => ts.student_id) || [];

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [], total: 0 });
    }

    // Get student details
    const { data: students } = await supabase
      .from('children')
      .select('id, name, date_of_birth, photo_url, created_at')
      .in('id', studentIds)
      .order('name');

    // Get progress summary for each student
    const { data: progressData } = await supabase
      .from('child_work_completion')
      .select('child_id, status')
      .in('child_id', studentIds);

    // Calculate stats per student
    const studentStats: Record<string, { completed: number; inProgress: number }> = {};
    progressData?.forEach(p => {
      if (!studentStats[p.child_id]) {
        studentStats[p.child_id] = { completed: 0, inProgress: 0 };
      }
      if (p.status === 'completed') studentStats[p.child_id].completed++;
      else if (p.status === 'in_progress') studentStats[p.child_id].inProgress++;
    });

    // Get last activity date per student
    const { data: lastActivity } = await supabase
      .from('child_work_completion')
      .select('child_id, completed_at, started_at')
      .in('child_id', studentIds)
      .order('completed_at', { ascending: false });

    const lastActivityMap: Record<string, string> = {};
    lastActivity?.forEach(a => {
      if (!lastActivityMap[a.child_id]) {
        lastActivityMap[a.child_id] = a.completed_at || a.started_at || '';
      }
    });

    // Combine data
    const studentsWithStats = (students || []).map((student: any) => {
      const age = student.date_of_birth
        ? Math.floor((Date.now() - new Date(student.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      return {
        ...student,
        avatar_url: student.photo_url, // Map photo_url to avatar_url for component compatibility
        age,
        stats: studentStats[student.id] || { completed: 0, inProgress: 0 },
        lastActivity: lastActivityMap[student.id] || null,
      };
    });

    return NextResponse.json({
      students: studentsWithStats || [],
      total: studentsWithStats?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}


