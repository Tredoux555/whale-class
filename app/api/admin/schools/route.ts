import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = createSupabaseAdmin();
  
  try {
    // Get all schools with counts
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, slug, logo_url, is_active')
      .eq('is_active', true)
      .order('name');

    if (schoolsError) throw schoolsError;

    // Enrich with counts
    const enrichedSchools = await Promise.all(
      (schools || []).map(async (school) => {
        // Classroom count
        const { count: classroomCount } = await supabase
          .from('classrooms')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('is_active', true);

        // Teacher count
        const { count: teacherCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('role', 'teacher')
          .eq('is_active', true);

        // Student count (children in school)
        const { count: studentCount } = await supabase
          .from('children')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id);

        return {
          ...school,
          classroom_count: classroomCount || 0,
          teacher_count: teacherCount || 0,
          student_count: studentCount || 0,
        };
      })
    );

    return NextResponse.json({ schools: enrichedSchools });
  } catch (error) {
    console.error('Failed to fetch schools:', error);
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
  }
}
