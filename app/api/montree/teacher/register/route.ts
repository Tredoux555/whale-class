// /api/montree/teacher/register/route.ts
// Session: Personal Classroom - Creates personal classroom school + teacher account
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function generateSlug(baseName: string): string {
  // Convert to lowercase, remove special characters, replace spaces with hyphens
  const cleanName = baseName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Add random suffix for uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${cleanName}-${randomSuffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { teacherName, schoolName, email, password } = await request.json();

    // Validate
    if (!teacherName?.trim()) {
      return NextResponse.json({ error: 'Teacher name is required' }, { status: 400 });
    }
    if (!schoolName?.trim()) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if email already exists
    const { data: existingAdmin } = await supabase
      .from('montree_school_admins')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (existingAdmin) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Calculate trial end date (90 days from now)
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 1. Create school with personal_classroom account type
    const classroomName = `${teacherName.trim()}'s Classroom`;
    const classroomSlug = generateSlug(classroomName);
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .insert({
        account_type: 'personal_classroom',
        name: classroomName,
        slug: classroomSlug,
        school_name_text: schoolName.trim(),
        owner_email: email.trim().toLowerCase(),
        owner_name: teacherName.trim(),
        subscription_status: 'trialing',
        trial_status: 'active',
        trial_started_at: trialStartedAt.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        max_students: 30,
        is_active: true,
      })
      .select()
      .single();

    if (schoolError) {
      console.error('School creation error:', schoolError);
      return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
    }

    // 2. Create teacher account
    const passwordHash = hashPassword(password);
    const { data: teacher, error: adminError } = await supabase
      .from('montree_school_admins')
      .insert({
        school_id: school.id,
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        name: teacherName.trim(),
        role: 'teacher',
        is_active: true,
      })
      .select()
      .single();

    if (adminError) {
      console.error('Teacher creation error:', adminError);
      // Rollback school creation
      await supabase.from('montree_schools').delete().eq('id', school.id);
      return NextResponse.json({ error: 'Failed to create teacher account' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      school: {
        id: school.id,
        name: school.name,
        account_type: school.account_type,
        trial_ends_at: school.trial_ends_at,
        max_students: school.max_students,
      },
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
