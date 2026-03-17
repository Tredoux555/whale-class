// /api/montree/admin/overview/route.ts
// Principal dashboard overview - school, classrooms, teachers, stats
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    const schoolId = auth.schoolId;
    const principalId = request.headers.get('x-principal-id');

    // Get school details
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('*')
      .eq('id', schoolId)
      .maybeSingle();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get classrooms + teachers in parallel (both only need schoolId)
    const [classroomsResult, teachersResult] = await Promise.all([
      supabase
        .from('montree_classrooms')
        .select('id, name, icon, color, is_active, created_at')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      supabase
        .from('montree_teachers')
        .select('id, name, email, classroom_id, role, is_active, last_login_at, login_code')
        .eq('school_id', schoolId)
        .eq('is_active', true),
    ]);

    const classrooms = classroomsResult.data;
    const teachers = teachersResult.data;
    const classroomIds = (classrooms || []).map(c => c.id);

    // Get students for school classrooms (depends on classroomIds)
    let students: Record<string, unknown>[] = [];
    if (classroomIds.length > 0) {
      const { data: studentData } = await supabase
        .from('montree_children')
        .select('id, classroom_id')
        .in('classroom_id', classroomIds)
        .eq('is_active', true);
      students = studentData || [];
    }

    // Pre-index teachers and students by classroom_id (O(N) instead of O(N×M))
    const teachersByClassroom = new Map<string, typeof teachers>();
    for (const t of teachers || []) {
      if (!t.classroom_id) continue;
      const arr = teachersByClassroom.get(t.classroom_id) || [];
      arr.push(t);
      teachersByClassroom.set(t.classroom_id, arr);
    }
    const studentCountByClassroom = new Map<string, number>();
    for (const s of students || []) {
      if (!s.classroom_id) continue;
      studentCountByClassroom.set(s.classroom_id, (studentCountByClassroom.get(s.classroom_id) || 0) + 1);
    }

    // Build classroom data with teachers and student counts
    const classroomsWithData = (classrooms || []).map(classroom => {
      const classroomTeachers = teachersByClassroom.get(classroom.id) || [];
      const studentCount = studentCountByClassroom.get(classroom.id) || 0;

      // Sort: lead_teacher first, then assistant_teacher, then teacher
      const sortedTeachers = classroomTeachers.sort((a, b) => {
        const order: Record<string, number> = { lead_teacher: 0, teacher: 1, assistant_teacher: 2 };
        return (order[a.role || 'teacher'] ?? 1) - (order[b.role || 'teacher'] ?? 1);
      });

      const leadTeacher = sortedTeachers[0] || null;

      return {
        ...classroom,
        // Legacy single-teacher fields (backward compat)
        teacher_id: leadTeacher?.id || null,
        teacher_name: leadTeacher?.name || null,
        teacher_email: leadTeacher?.email || null,
        teacher_last_login: leadTeacher?.last_login_at || null,
        // New: full teachers array
        teachers: sortedTeachers.map(t => ({
          id: t.id,
          name: t.name,
          email: t.email,
          role: t.role || 'teacher',
          last_login: t.last_login_at,
          login_code: t.login_code,
        })),
        teacher_count: classroomTeachers.length,
        student_count: studentCount,
      };
    });

    // Filter out empty placeholder classrooms (auto-created "My Classroom" with no teachers/students)
    const activeClassrooms = classroomsWithData.filter(c =>
      !(c.name === 'My Classroom' && c.teacher_count === 0 && c.student_count === 0)
    );

    // Get principal info
    const { data: principal } = await supabase
      .from('montree_school_admins')
      .select('id, name, email, role, last_login')
      .eq('school_id', schoolId)
      .eq('role', 'principal')
      .maybeSingle();

    // Calculate stats (use filtered classrooms)
    const stats = {
      total_classrooms: activeClassrooms.length,
      total_teachers: teachers?.length || 0,
      total_students: students?.length || 0,
      classrooms_without_teacher: activeClassrooms.filter(c => c.teacher_count === 0).length,
    };

    const response = NextResponse.json({
      school,
      principal,
      classrooms: activeClassrooms,
      stats,
    });
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Admin overview error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
