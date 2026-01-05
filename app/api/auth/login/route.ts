import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPassword, createUserToken, setUserCookie, UserSession, User } from '@/lib/auth-multi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get classroom if teacher
    let classroomId: string | null = null;
    if (user.role === 'teacher') {
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('id')
        .eq('teacher_id', user.id)
        .single();
      classroomId = classroom?.id || null;
    }

    // Create session
    const session: UserSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.school_id,
      classroomId,
    };

    // Create token
    const token = await createUserToken(session);

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.school_id,
      },
      redirect: getRedirectUrl(user.role),
    });

    // Set cookie
    response.cookies.set('user-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

function getRedirectUrl(role: string): string {
  switch (role) {
    case 'super_admin':
    case 'school_admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    case 'parent':
      return '/parent';
    default:
      return '/';
  }
}
