// /api/home/auth/login/route.ts
// Session 155: Code-based login for home families
// Accepts a 6-char join code, SHA256-hashes it, looks up the family

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifyPassword, isLegacyHash, hashPassword, legacySha256 } from '@/lib/montree/password';

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

    // Try legacy SHA-256 lookup first (old accounts)
    const codeHash = legacySha256(cleaned);
    let { data: family, error } = await supabase
      .from('home_families')
      .select('id, name, email, plan, password_hash')
      .eq('password_hash', codeHash)
      .single();

    if (!family) {
      // Try join_code lookup (new accounts with bcrypt hashes)
      const { data: newFamily } = await supabase
        .from('home_families')
        .select('id, name, email, plan, password_hash')
        .eq('join_code', cleaned)
        .single();

      if (newFamily) {
        const valid = await verifyPassword(cleaned, newFamily.password_hash);
        if (valid) {
          family = newFamily;
        }
      }
    }

    if (!family) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    // Re-hash if legacy
    if (isLegacyHash(family.password_hash)) {
      const bcryptHash = await hashPassword(cleaned);
      await supabase.from('home_families').update({ password_hash: bcryptHash }).eq('id', family.id);
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
