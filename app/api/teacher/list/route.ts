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
    
    const { data: teachers, error: teacherError } = await supabase
      .from('simple_teachers')
      .select('id, name, is_active, last_login, created_at')
      .eq('is_active', true)
      .order('name');

    if (teacherError) {
      console.error('Error fetching teachers:', teacherError);
      return NextResponse.json({ teachers: [] });
    }

    const { data: assignments, error: assignError } = await supabase
      .from('teacher_children')
      .select('teacher_id');

    if (assignError) {
      console.error('Error fetching assignments:', assignError);
    }

    const studentCounts: Record<string, number> = {};
    if (assignments) {
      for (const a of assignments) {
        studentCounts[a.teacher_id] = (studentCounts[a.teacher_id] || 0) + 1;
      }
    }

    const teachersWithCounts = (teachers || []).map(t => ({
      id: t.id,
      name: t.name,
      is_active: t.is_active,
      last_login: t.last_login,
      created_at: t.created_at,
      student_count: studentCounts[t.id] || 0
    }));

    return NextResponse.json({ teachers: teachersWithCounts });
  } catch (error) {
    console.error('Teacher list error:', error);
    return NextResponse.json({ teachers: [], error: 'Failed to load teachers' }, { status: 500 });
  }
}
