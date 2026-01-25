// app/api/montree/auth/set-password/route.ts
// Sets password for teacher after code validation (first time setup)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code, password } = await request.json();

    if (!code || !password) {
      return NextResponse.json({ error: 'Code and password required' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Find teacher by login code
    const { data: teacher, error: findError } = await supabase
      .from('simple_teachers')
      .select('id, name, classroom_id, school_id, password_set')
      .eq('login_code', code.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (findError || !teacher) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
    }

    if (teacher.password_set) {
      return NextResponse.json({ error: 'Password already set' }, { status: 400 });
    }

    // Update password and mark as set
    const { error: updateError } = await supabase
      .from('simple_teachers')
      .update({ 
        password,
        password_set: true,
        last_login: new Date().toISOString(),
      })
      .eq('id', teacher.id);

    if (updateError) {
      throw updateError;
    }

    // Get classroom info for response
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
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}
