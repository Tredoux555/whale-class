// API: Get classroom with students from database
// Multi-tenant: Works for any school, any classroom

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const supabase = getSupabase();

    // 1. Get school by slug
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // 2. Get classroom by id or slug
    let classroom;
    const { data: classroomById } = await supabase
      .from('classrooms')
      .select('id, name, school_id, age_group')
      .eq('school_id', school.id)
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    if (classroomById) {
      classroom = classroomById;
    } else {
      // Fallback: look for classroom by name pattern
      const { data: classroomByName } = await supabase
        .from('classrooms')
        .select('id, name, school_id, age_group')
        .eq('school_id', school.id)
        .ilike('name', `%${id}%`)
        .single();
      
      classroom = classroomByName;
    }

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // 3. Get students from children table, ordered by display_order
    const { data: students, error: studentsError } = await supabase
      .from('children')
      .select('id, name, display_order, date_of_birth')
      .eq('school_id', school.id)
      .order('display_order', { ascending: true });

    if (studentsError) {
      console.error('Students query error:', studentsError);
    }

    return NextResponse.json({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        school_id: classroom.school_id
      },
      students: (students || []).map(s => ({
        id: s.id,
        name: s.name,
        display_order: s.display_order || 0
      })),
      school
    });

  } catch (error: any) {
    console.error('Classroom fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
