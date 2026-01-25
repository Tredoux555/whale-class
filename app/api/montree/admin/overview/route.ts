// app/api/montree/admin/overview/route.ts
// Returns school overview with classrooms, teachers, and student counts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get the default school (for now - later will be based on logged-in principal)
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('id, name, slug')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (schoolError) {
      console.error('School fetch error:', schoolError);
    }

    // Get classrooms for this school
    const { data: classrooms, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon, color, teacher_id, school_id')
      .eq('school_id', school?.id || '00000000-0000-0000-0000-000000000001')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (classroomError) {
      console.error('Classrooms fetch error:', classroomError);
    }

    // Enrich classrooms with teacher info and student counts
    const enrichedClassrooms = await Promise.all(
      (classrooms || []).map(async (classroom) => {
        // Get teacher info
        let teacherName = null;
        let loginCode = null;

        if (classroom.teacher_id) {
          const { data: teacher } = await supabase
            .from('simple_teachers')
            .select('name, login_code')
            .eq('id', classroom.teacher_id)
            .single();

          if (teacher) {
            teacherName = teacher.name;
            loginCode = teacher.login_code;
          }
        }

        // Get student count
        const { count: studentCount } = await supabase
          .from('children')
          .select('*', { count: 'exact', head: true })
          .eq('classroom_id', classroom.id);

        return {
          id: classroom.id,
          name: classroom.name,
          icon: classroom.icon || '📚',
          color: classroom.color || '#10b981',
          teacher_id: classroom.teacher_id,
          teacher_name: teacherName,
          login_code: loginCode,
          student_count: studentCount || 0,
        };
      })
    );

    return NextResponse.json({
      school: school || { id: null, name: 'My School', slug: 'my-school' },
      classrooms: enrichedClassrooms,
    });

  } catch (error) {
    console.error('Admin overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin overview' },
      { status: 500 }
    );
  }
}
