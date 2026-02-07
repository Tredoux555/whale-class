// /api/home/auth/register/route.ts
// Session 155: Register a new home family
// Creates family, hashes password, seeds 68-work curriculum

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import bcrypt from 'bcryptjs';
import { seedHomeCurriculum } from '@/lib/home/curriculum-helpers';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validate inputs
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email?.trim() || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create family
    const { data: family, error: insertError } = await supabase
      .from('home_families')
      .insert({
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        name: name.trim(),
      })
      .select('id, name, email, plan')
      .single();

    if (insertError) {
      // Duplicate email (Postgres unique violation)
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      console.error('Failed to create family:', insertError.message);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    // Seed curriculum (68 works)
    try {
      await seedHomeCurriculum(supabase, family.id);
    } catch (err: unknown) {
      // Non-fatal: family created but curriculum seed failed
      if (err instanceof Error) {
        console.error('Curriculum seed failed:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      family: {
        id: family.id,
        name: family.name,
        email: family.email,
        plan: family.plan,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Register error:', err.message);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
