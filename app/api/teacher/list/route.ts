import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();
    
    // Get all teachers
    const { data: teachers, error: teacherError } = await supabase
      .from('simple_teachers')
      .select('id, name, is_active, last_login, created_at')
      .eq('is_active', true)
      .order('name');

    if (teacherError) {
      console.error('Error fetching teachers:', teacherError);
      return NextResponse.json({ teachers: [] });
    }

    // Get all assignments with child details
    const { data: assignments, error: assignError } = await supabase
      .from('teacher_children')
      .select(`
        teacher_id,
        child_id,
        children:child_id(id, name)
      `);

    if (assignError) {
      console.error('Error fetching assignments:', assignError);
    }

    // Group students by teacher
    const teacherStudents: Record<string, { id: string; name: string }[]> = {};
    if (assignments) {
      for (const a of assignments) {
        if (!teacherStudents[a.teacher_id]) {
          teacherStudents[a.teacher_id] = [];
        }
        const child = a.children as any;
        if (child) {
          teacherStudents[a.teacher_id].push({
            id: child.id,
            name: child.name
          });
        }
      }
    }

    // Build teacher list with students
    const teachersWithStudents = (teachers || []).map(t => ({
      id: t.id,
      name: t.name,
      is_active: t.is_active,
      last_login: t.last_login,
      created_at: t.created_at,
      student_count: teacherStudents[t.id]?.length || 0,
      students: teacherStudents[t.id] || []
    }));

    return NextResponse.json({ teachers: teachersWithStudents });
  } catch (error) {
    console.error('Teacher list error:', error);
    return NextResponse.json({ teachers: [], error: 'Failed to load teachers' }, { status: 500 });
  }
}
