// /api/home/auth/login/route.ts
// Session 155: Code-based login for home families
// Accepts a 6-char join code, SHA256-hashes it, looks up the family

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import crypto from 'crypto';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code?.trim()) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length !== 6) {
      return NextResponse.json({ error: 'Code must be 6 characters' }, { status: 400 });
    }

    // Validate against exact charset (no I, L, O, 0, 1 — they're excluded from generation)
    const VALID_CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
    if (!VALID_CODE.test(cleaned)) {
      return NextResponse.json({ error: 'Code contains invalid characters' }, { status: 400 });
    }

    const supabase = getSupabase();
    const codeHash = hashCode(cleaned);

    // Look up family by password_hash (SHA256 of code)
    // No salt — code IS the secret, matches Montree classroom pattern
    const { data: family, error } = await supabase
      .from('home_families')
      .select('id, name, email, plan')
      .eq('password_hash', codeHash)
      .single();

    if (error) {
      console.error('Login lookup error:', error.code, error.message);
    }

    if (error || !family) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
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
      console.error('Login error:', err.message);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
