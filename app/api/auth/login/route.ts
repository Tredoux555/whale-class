import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createUserToken } from '@/lib/auth-multi';
import { createAdminToken } from '@/lib/auth';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const { email, password, username } = body;
    
    // Use email or username field
    const loginId = email || username;

    if (!loginId || !password) {
      return NextResponse.json(
        { error: 'Username/email and password are required' },
        { status: 400 }
      );
    }

    // Simple admin login fallback (Tredoux / 870602)
    if ((loginId.toLowerCase() === 'tredoux' || loginId.toLowerCase() === 'tredoux@admin.local') && password === '870602') {
      const userToken = await createUserToken({
        userId: 'admin-tredoux-001',
        email: 'tredoux@admin.local',
        name: 'Tredoux',
        role: 'super_admin',
        schoolId: null,
      });

      // Also create admin-token for legacy auth system
      const adminToken = await createAdminToken();

      const response = NextResponse.json({
        success: true,
        user: {
          id: 'admin-tredoux-001',
          email: 'tredoux@admin.local',
          role: 'super_admin',
        },
        redirect: '/admin',
      });

      response.cookies.set('user-token', userToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      // Set admin-token for legacy auth (videos API, etc)
      response.cookies.set('admin-token', adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });

      return response;
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginId.toLowerCase().trim(),
      password,
    });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get user role from user_roles table
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role_name')
      .eq('user_id', authData.user.id)
      .single();

    const role = roleData?.role_name || 'teacher';

    // Create user-token for our auth system
    const userToken = await createUserToken({
      userId: authData.user.id,
      email: authData.user.email!,
      name: authData.user.email!.split('@')[0],
      role: role as any,
      schoolId: null,
    });

    // Create response with redirect
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
      },
      redirect: getRedirectUrl(role),
    });

    // Set user-token cookie (for our auth system)
    response.cookies.set('user-token', userToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Also set Supabase tokens
    if (authData.session) {
      response.cookies.set('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    }

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
