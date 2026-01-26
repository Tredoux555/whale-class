// /api/montree/principal/register/route.ts
// Session 105: Principal registration - creates school + principal account
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    const { schoolName, principalName, email, password } = await request.json();

    // Validate
    if (!schoolName?.trim()) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }
    if (!principalName?.trim()) {
      return NextResponse.json({ error: 'Principal name is required' }, { status: 400 });
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

    // Check if slug already exists
    const slug = generateSlug(schoolName);
    const { data: existingSchool } = await supabase
      .from('montree_schools')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSchool) {
      return NextResponse.json({ error: 'A school with this name already exists' }, { status: 400 });
    }

    // 1. Create school
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .insert({
        name: schoolName.trim(),
        slug,
        owner_email: email.trim().toLowerCase(),
        owner_name: principalName.trim(),
        subscription_status: 'trialing',
        plan_type: 'school',
        subscription_tier: 'free',
        is_active: true,
      })
      .select()
      .single();

    if (schoolError) {
      console.error('School creation error:', schoolError);
      return NextResponse.json({ error: 'Failed to create school' }, { status: 500 });
    }

    // 2. Create principal account
    const passwordHash = hashPassword(password);
    const { data: principal, error: adminError } = await supabase
      .from('montree_school_admins')
      .insert({
        school_id: school.id,
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        name: principalName.trim(),
        role: 'principal',
        is_active: true,
      })
      .select()
      .single();

    if (adminError) {
      console.error('Principal creation error:', adminError);
      // Rollback school creation
      await supabase.from('montree_schools').delete().eq('id', school.id);
      return NextResponse.json({ error: 'Failed to create principal account' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
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
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
