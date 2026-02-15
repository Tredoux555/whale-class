import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserSession, hashPassword, hasPermission } from '@/lib/auth-multi';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const session = await getUserSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!['super_admin', 'school_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    let query = supabase
      .from('users')
      .select('id, email, name, role, school_id, is_active, last_login, created_at')
      .order('created_at', { ascending: false });
    
    if (session.role === 'school_admin' && session.schoolId) {
      query = query.eq('school_id', session.schoolId);
    }
    
    const { data: users, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const session = await getUserSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!hasPermission(session.role, 'canManageUsers')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { email, password, name, role, schoolId } = await request.json();
    
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Email, password, name, and role are required' }, { status: 400 });
    }
    
    if (session.role === 'school_admin') {
      if (!['teacher', 'parent'].includes(role)) {
        return NextResponse.json({ error: 'School admins can only create teacher and parent accounts' }, { status: 403 });
      }
    }
    
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();
    
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    
    const passwordHash = await hashPassword(password);
    
    let userSchoolId = schoolId;
    if (session.role === 'school_admin') {
      userSchoolId = session.schoolId;
    }
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        name: name.trim(),
        role,
        school_id: userSchoolId,
        is_active: true,
      })
      .select('id, email, name, role, school_id, is_active, created_at')
      .single();
    
    if (createError) throw createError;

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
