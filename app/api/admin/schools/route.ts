import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = createSupabaseAdmin();
  
  try {
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, slug, logo_url, is_active')
      .eq('is_active', true)
      .order('name');

    if (schoolsError) throw schoolsError;

    const enrichedSchools = await Promise.all(
      (schools || []).map(async (school) => {
        const { count: classroomCount } = await supabase
          .from('classrooms')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('is_active', true);

        const { count: teacherCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('role', 'teacher')
          .eq('is_active', true);

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

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdmin();
  
  try {
    const { name, slug } = await request.json();
    
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('schools')
      .insert({ name, slug, is_active: true })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ school: data });
  } catch (error: any) {
    console.error('Failed to create school:', error);
    return NextResponse.json({ error: error.message || 'Failed to create school' }, { status: 500 });
  }
}
