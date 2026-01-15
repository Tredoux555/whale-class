import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// GET /api/schools - List all schools with stats
export async function GET() {
  try {
    const supabase = getSupabase();
    
    // Get all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, slug, logo_url, contact_email, is_active, settings, created_at')
      .order('name');

    if (schoolsError) {
      console.error('Schools query error:', schoolsError);
      return NextResponse.json({ error: schoolsError.message }, { status: 500 });
    }

    // Get counts for each school
    const schoolsWithStats = await Promise.all((schools || []).map(async (school) => {
      // Count classrooms
      const { count: classroomCount } = await supabase
        .from('classrooms')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school.id);

      // Count children (students)
      const { count: studentCount } = await supabase
        .from('children')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school.id);

      // Count teachers (users with teacher role in this school)
      const { count: teacherCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school.id)
        .in('role', ['teacher', 'school_admin']);

      return {
        ...school,
        classroom_count: classroomCount || 0,
        student_count: studentCount || 0,
        teacher_count: teacherCount || 0,
      };
    }));

    return NextResponse.json({ schools: schoolsWithStats });
  } catch (error: any) {
    console.error('Schools API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/schools - Create a new school
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, contact_email, settings } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('schools')
      .insert({
        name,
        slug,
        contact_email,
        settings: settings || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Create school error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ school: data });
  } catch (error: any) {
    console.error('Create school error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
