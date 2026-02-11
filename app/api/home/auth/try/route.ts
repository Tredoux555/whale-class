// /api/home/auth/try/route.ts
// Session 155: Zero-friction instant trial for Montree Home
// Generates a family account + 6-char join code in one shot
// Matches the Montree classroom try/instant pattern exactly

import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/montree/password';
import { getSupabase } from '@/lib/supabase-client';
import { seedHomeCurriculum } from '@/lib/home/curriculum-helpers';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

// Same charset as Montree classroom — no confusing chars (I, L, O, 0, 1)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(req.headers);
    const userAgent = getUserAgent(req.headers);

    // Rate limiting (3 attempts per IP per 15 min for registration)
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/home/auth/try', 3, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    // Parse optional name from body
    let familyName = 'My Family';
    let familyEmail = '';
    try {
      const body = await req.json();
      if (body?.name && body.name.trim()) {
        familyName = body.name.trim();
      }
      if (body?.email && body.email.trim()) { familyEmail = body.email.trim(); }
    } catch {
      // No body or invalid JSON — use default name
    }

    // Retry up to 3 times on code collision (UNIQUE constraint on join_code)
    let family = null;
    let code = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      code = generateCode();
      const codeHash = await hashPassword(code.toUpperCase());

      const { data, error: famErr } = await supabase
        .from('home_families')
        .insert({
          name: familyName,
          email: familyEmail || `home-${code.toLowerCase()}@montree.app`,
          password_hash: codeHash,
          join_code: code,
          plan: 'free',
        })
        .select('id, name, email, plan')
        .single();

      if (data) {
        family = data;
        break;
      }

      // If unique violation (23505), retry with new code; else fail
      if (famErr?.code !== '23505') {
        // Phase 8: Sanitized — omit details/hint from log
        console.error('[home/auth/try]', { message: famErr?.message, code: famErr?.code });
        const isDev = process.env.NODE_ENV === 'development';
        return NextResponse.json({
          error: 'Failed to create account',
          ...(isDev ? {
            debug: {
              message: famErr?.message,
              code: famErr?.code,
              details: famErr?.details,
              hint: famErr?.hint,
            },
          } : {}),
        }, { status: 500 });
      }
    }

    if (!family) {
      return NextResponse.json({ error: 'Failed to generate unique code. Please try again.' }, { status: 500 });
    }

    // Seed curriculum (non-blocking — family is created even if this fails)
    try {
      await seedHomeCurriculum(supabase, family.id);
    } catch (seedErr) {
      if (seedErr instanceof Error) {
        console.error('Curriculum seed warning:', seedErr.message);
      }
    }

    // Phase 8: Log account creation
    logAudit(supabase, {
      adminIdentifier: `home_family:${family.id}`,
      action: 'account_created',
      resourceType: 'home_family',
      resourceId: family.id,
      resourceDetails: { endpoint: '/api/home/auth/try' },
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      code,
      family: {
        id: family.id,
        name: family.name,
        email: family.email,
        plan: family.plan,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Home try error:', message);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json({
      error: 'Server error',
      ...(isDev ? { debug: { message } } : {}),
    }, { status: 500 });
  }
}
