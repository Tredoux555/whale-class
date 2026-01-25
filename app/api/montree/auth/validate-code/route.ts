// app/api/montree/auth/validate-code/route.ts
// Validates teacher login code and returns teacher info

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Find teacher by login code
    const { data: teacher, error } = await supabase
      .from('simple_teachers')
      .select(`
        id,
        name,
        password_set,
        classroom_id,
        school_id
      `)
      .eq('login_code', code.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error || !teacher) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
    }

    // If password already set, tell them to login normally
    if (teacher.password_set) {
      return NextResponse.json({ 
        error: 'This code has already been used. Please login with your name and password.' 
      }, { status: 400 });
    }

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
      valid: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        classroom_name: classroomName,
        classroom_icon: classroomIcon,
      },
    });

  } catch (error) {
    console.error('Code validation error:', error);
    return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 });
  }
}
