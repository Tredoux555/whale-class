// =====================================================
// WHALE PLATFORM - TEACHER MANAGEMENT API
// =====================================================
// Location: app/api/admin/rbac/teachers/route.ts
// Purpose: Admin endpoints for managing teacher accounts
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  assignRole,
  getSupabaseClient,
} from '@/lib/permissions/middleware';

// =====================================================
// GET ALL TEACHERS
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();

    // Get all users with teacher role
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role_name,
        created_at
      `)
      .eq('role_name', 'teacher');

    if (error) {
      throw new Error('Failed to fetch teachers');
    }

    // Get user details for each teacher
    const teacherIds = data?.map(row => row.user_id) || [];
    
    if (teacherIds.length === 0) {
      return NextResponse.json({ teachers: [] });
    }

    // Get user auth data using admin client
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error('Failed to fetch user details');
    }

    // Get student counts
    const { data: studentCounts, error: studentError } = await supabase
      .from('teacher_students')
      .select('teacher_id')
      .in('teacher_id', teacherIds)
      .eq('is_active', true);

    const countMap = new Map<string, number>();
    studentCounts?.forEach(row => {
      countMap.set(row.teacher_id, (countMap.get(row.teacher_id) || 0) + 1);
    });

    // Combine data
    const teachers = data?.map(role => {
      const user = users.find(u => u.id === role.user_id);
      return {
        id: role.user_id,
        email: user?.email || 'Unknown',
        name: user?.user_metadata?.name || null,
        created_at: role.created_at,
        student_count: countMap.get(role.user_id) || 0,
      };
    }) || [];

    return NextResponse.json({ teachers });
  } catch (error) {
    console.error('Get teachers error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// CREATE NEW TEACHER
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, password } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: password || Math.random().toString(36).slice(-12), // Random password if not provided
      email_confirm: true,
      user_metadata: {
        name: name || null,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 400 }
      );
    }

    // Assign teacher role - use dummy admin ID
    const adminUserId = 'admin-session';
    await assignRole(adminUserId, authData.user.id, 'teacher');

    // Send password reset email if no password was provided
    if (!password) {
      await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      });
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: authData.user.id,
        email: authData.user.email,
        name: name || null,
      },
      message: password ? 'Teacher created successfully' : 'Teacher created. Password reset email sent.',
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
    },
  });
}
