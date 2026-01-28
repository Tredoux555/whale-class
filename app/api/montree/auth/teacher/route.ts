// /api/montree/auth/teacher/route.ts
// Teacher login with 6-character code OR email+password
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, email, password } = body;

    let teacher: any = null;

    // Method 1: Login with code
    if (code) {
      if (code.length !== 6) {
        return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('montree_teachers')
        .select(`
          id, name, email, classroom_id, school_id, is_active,
          password_hash, password_set_at
        `)
        .eq('login_code', code.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
      }
      teacher = data;
    }
    // Method 2: Login with email+password
    else if (email && password) {
      const { data, error } = await supabase
        .from('montree_teachers')
        .select(`
          id, name, email, classroom_id, school_id, is_active,
          password_hash, password_set_at
        `)
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      // Verify password
      if (!data.password_hash) {
        return NextResponse.json({ error: 'Password not set. Use your login code instead.' }, { status: 401 });
      }

      const validPassword = await bcrypt.compare(password, data.password_hash);
      if (!validPassword) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      teacher = data;
    }
    else {
      return NextResponse.json({ error: 'Provide code OR email+password' }, { status: 400 });
    }

    // Get classroom info
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon, color')
      .eq('id', teacher.classroom_id)
      .single();

    // Get school info
    const { data: school } = await supabase
      .from('montree_schools')
      .select('id, name, slug')
      .eq('id', teacher.school_id)
      .single();

    // Update last login
    await supabase
      .from('montree_teachers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', teacher.id);

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        password_set: !!teacher.password_set_at,
      },
      classroom: classroom || null,
      school: school || null,
    });

  } catch (error) {
    console.error('Teacher auth error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
