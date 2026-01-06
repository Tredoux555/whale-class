import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { schoolId: string } }
) {
  try {
    const { schoolId } = params;

    // Get school
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, slug, logo_url')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get classrooms with student counts and teachers
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('id, name, age_group')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('name');

    if (classroomsError) throw classroomsError;

    // Enrich classrooms with counts and teachers
    const enrichedClassrooms = await Promise.all(
      (classrooms || []).map(async (classroom) => {
        // Student count
        const { count: studentCount } = await supabase
          .from('classroom_children')
          .select('*', { count: 'exact', head: true })
          .eq('classroom_id', classroom.id)
          .eq('status', 'active');

        // Teachers assigned to this classroom
        const { data: teacherAssignments } = await supabase
          .from('teacher_classrooms')
          .select('teacher_id, role')
          .eq('classroom_id', classroom.id);

        const teachers = [];
        for (const ta of teacherAssignments || []) {
          const { data: teacher } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', ta.teacher_id)
            .single();
          if (teacher) {
            teachers.push({ ...teacher, role: ta.role });
          }
        }

        return {
          ...classroom,
          student_count: studentCount || 0,
          teachers,
        };
      })
    );

    // Get all teachers in this school
    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('school_id', schoolId)
      .in('role', ['teacher', 'school_admin'])
      .eq('is_active', true)
      .order('name');

    if (teachersError) throw teachersError;

    // Get classroom names for each teacher
    const enrichedTeachers = await Promise.all(
      (teachers || []).map(async (teacher) => {
        const { data: assignments } = await supabase
          .from('teacher_classrooms')
          .select('classroom_id')
          .eq('teacher_id', teacher.id);

        const classroomNames = [];
        for (const a of assignments || []) {
          const c = classrooms?.find((c) => c.id === a.classroom_id);
          if (c) classroomNames.push(c.name);
        }

        return {
          ...teacher,
          classrooms: classroomNames,
        };
      })
    );

    return NextResponse.json({
      school,
      classrooms: enrichedClassrooms,
      teachers: enrichedTeachers,
    });
  } catch (error) {
    console.error('Failed to fetch school:', error);
    return NextResponse.json({ error: 'Failed to fetch school' }, { status: 500 });
  }
}
