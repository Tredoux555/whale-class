// /api/montree/super-admin/schools/route.ts
// Session 105: Super Admin API - List all schools with stats
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    // Fetch all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('montree_schools')
      .select('*')
      .order('created_at', { ascending: false });

    if (schoolsError) {
      console.error('Schools fetch error:', schoolsError);
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }

    // Fetch classroom counts per school
    const { data: classroomCounts } = await supabase
      .from('montree_classrooms')
      .select('school_id');

    // Fetch teacher counts per school
    const { data: teacherCounts } = await supabase
      .from('montree_teachers')
      .select('school_id');

    // Fetch student counts per school
    const { data: studentCounts } = await supabase
      .from('montree_children')
      .select('school_id');

    // Aggregate counts
    const schoolStats = (schools || []).map(school => {
      const classrooms = (classroomCounts || []).filter(c => c.school_id === school.id).length;
      const teachers = (teacherCounts || []).filter(t => t.school_id === school.id).length;
      const students = (studentCounts || []).filter(s => s.school_id === school.id).length;

      return {
        ...school,
        classroom_count: classrooms,
        teacher_count: teachers,
        student_count: students,
      };
    });

    return NextResponse.json({ schools: schoolStats });

  } catch (error) {
    console.error('Super admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
