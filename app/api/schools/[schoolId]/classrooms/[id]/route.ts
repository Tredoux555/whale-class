// API: Get classroom with students from database
// Multi-tenant: Works for any school, any classroom
// Accepts schoolId as UUID or slug

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
  { params }: { params: Promise<{ schoolId: string; id: string }> }
) {
  try {
    const { schoolId, id } = await params;
    const supabase = getSupabase();

    // 1. Get school by ID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId);
    
    let school;
    if (isUUID) {
      const { data } = await supabase
        .from('schools')
        .select('id, name, slug')
        .eq('id', schoolId)
        .single();
      school = data;
    } else {
      const { data } = await supabase
        .from('schools')
        .select('id, name, slug')
        .eq('slug', schoolId)
        .single();
      school = data;
    }

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // 2. Get classroom by id or slug
    const classroomIsUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let classroom;
    if (classroomIsUUID) {
      const { data } = await supabase
        .from('classrooms')
        .select('id, name, school_id, age_group')
        .eq('id', id)
        .eq('school_id', school.id)
        .single();
      classroom = data;
    } else {
      // Try by slug or name pattern
      const { data } = await supabase
        .from('classrooms')
        .select('id, name, school_id, age_group')
        .eq('school_id', school.id)
        .ilike('name', `%${id}%`)
        .single();
      classroom = data;
    }

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // 3. Get students from children table
    const { data: students, error: studentsError } = await supabase
      .from('children')
      .select('id, name, date_of_birth')
      .eq('school_id', school.id)
      .order('name', { ascending: true });

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
