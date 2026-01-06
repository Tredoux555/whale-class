import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/schools/[id] - Get school with classrooms and teachers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get school
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Get classrooms with student counts and teachers
    const { data: classrooms } = await supabase
      .from('classrooms')
      .select('*')
      .eq('school_id', id)
      .order('name');

    // For each classroom, get student count and teachers
    const classroomsWithDetails = await Promise.all(
      (classrooms || []).map(async (classroom) => {
        // Count students
        const { count: studentsCount } = await supabase
          .from('classroom_children')
          .select('*', { count: 'exact', head: true })
          .eq('classroom_id', classroom.id)
          .eq('status', 'active');

        // Get teachers assigned to this classroom
        const { data: teacherAssignments } = await supabase
          .from('teacher_classrooms')
          .select(`
            role,
            teacher:users(id, name)
          `)
          .eq('classroom_id', classroom.id);

        const teachers = (teacherAssignments || []).map((ta: any) => ({
          id: ta.teacher.id,
          name: ta.teacher.name,
          role: ta.role,
        }));

        return {
          ...classroom,
          students_count: studentsCount || 0,
          teachers,
        };
      })
    );

    // Get all teachers in this school
    const { data: teachers } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('school_id', id)
      .in('role', ['teacher', 'school_admin'])
      .order('name');

    // For each teacher, get their classrooms
    const teachersWithClassrooms = await Promise.all(
      (teachers || []).map(async (teacher) => {
        const { data: assignments } = await supabase
          .from('teacher_classrooms')
          .select(`
            classroom:classrooms(name)
          `)
          .eq('teacher_id', teacher.id);

        const classroomNames = (assignments || []).map((a: any) => a.classroom.name);

        return {
          ...teacher,
          classrooms: classroomNames,
        };
      })
    );

    return NextResponse.json({
      school,
      classrooms: classroomsWithDetails,
      teachers: teachersWithClassrooms,
    });
  } catch (error) {
    console.error('Error fetching school:', error);
    return NextResponse.json(
      { error: 'Failed to fetch school' },
      { status: 500 }
    );
  }
}
