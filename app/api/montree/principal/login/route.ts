// /api/montree/principal/login/route.ts
// Session 105: Principal login - email + password
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { email, password } = await request.json();

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    // Find principal by email and password
    const { data: principal, error: principalError } = await supabase
      .from('montree_school_admins')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password_hash', passwordHash)
      .eq('is_active', true)
      .single();

    if (principalError || !principal) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Get school
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('*')
      .eq('id', principal.school_id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Check if school has classrooms (needs setup?)
    const { data: classrooms } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('school_id', school.id);

    const needsSetup = !classrooms || classrooms.length === 0;

    // Update last login
    await supabase
      .from('montree_school_admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', principal.id);

    return NextResponse.json({
      success: true,
      needsSetup,
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
      },
      principal: {
        id: principal.id,
        name: principal.name,
        email: principal.email,
        role: principal.role,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
