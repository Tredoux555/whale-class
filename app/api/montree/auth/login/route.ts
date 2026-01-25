// app/api/montree/auth/login/route.ts
// Login with name + password (returning users)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Find teacher by name (case insensitive)
    const { data: teacher, error: findError } = await supabase
      .from('simple_teachers')
      .select('id, name, password, classroom_id, school_id, password_set')
      .ilike('name', name.trim())
      .eq('is_active', true)
      .single();

    if (findError || !teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Check password
    if (teacher.password !== password) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Update last login
    await supabase
      .from('simple_teachers')
      .update({ last_login: new Date().toISOString() })
      .eq('id', teacher.id);

    // Get classroom info
    let classroomName = 'Your Classroom';
    let classroomIcon = '📚';

    if (teacher.classroom_id) {
      const { data: classroom } = await supabase
        .from('montree_classrooms')
        .select('name, icon')
        .eq('id', teacher.classroom_id)
        .single();

      if (classroom) {
        classroomName = classroom.name;
        classroomIcon = classroom.icon || '📚';
      }
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        classroom_id: teacher.classroom_id,
        school_id: teacher.school_id,
        classroom_name: classroomName,
        classroom_icon: classroomIcon,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
