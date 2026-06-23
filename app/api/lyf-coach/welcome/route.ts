// app/api/lyf-coach/welcome/route.ts
//
// First-login welcome banner backend.
//   GET  -> { show, variant } : whether to show the one-time welcome to THIS
//           verified user, and which copy variant ('founder' | 'standard').
//           Read-only — does NOT stamp.
//   POST -> atomically stamp first_login_shown=true "the moment it renders",
//           so the banner never shows again. Idempotent + race-safe: the update
//           is conditional on first_login_shown=false, so concurrent tabs no-op.
//
// Auth mirrors verify-status: Bearer token OR the httpOnly story-admin-token
// cookie. Fail-quiet: no session -> 401; migration 272 not run (42703/42P01) ->
// show:false (feature inert until the column exists — never shows on every load).
// Founder = welcome_bonus_period set (migration 271, stamped for the first 100
// at email verification).

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getSupabase, getJWTSecret } from '@/lib/story-db';

export const dynamic = 'force-dynamic';

async function resolveSpace(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  let token = authHeader ? authHeader.replace('Bearer ', '') : null;
  if (!token) token = req.cookies.get('story-admin-token')?.value || null;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    if (payload.role !== 'admin') return null;
    return typeof payload.space === 'string' && payload.space ? payload.space : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  const space = await resolveSpace(req);
  if (!space) return NextResponse.json({ error: 'No session' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_admin_users')
    .select('email_verified, welcome_bonus_period, first_login_shown')
    .eq('space', space)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === '42703' || error.code === '42P01') {
      console.warn('[lyf-coach/welcome] first_login_shown column missing — run migration 272; banner inert');
    } else {
      console.error('[lyf-coach/welcome] lookup error:', error);
    }
    return NextResponse.json({ show: false });
  }
  if (!data) return NextResponse.json({ show: false });

  const verified = data.email_verified !== false;
  const alreadyShown = data.first_login_shown === true;
  if (!verified || alreadyShown) return NextResponse.json({ show: false });

  const variant = data.welcome_bonus_period ? 'founder' : 'standard';
  return NextResponse.json({ show: true, variant });
}

export async function POST(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  const space = await resolveSpace(req);
  if (!space) return NextResponse.json({ error: 'No session' }, { status: 401 });

  const supabase = getSupabase();
  // Conditional update => only the first call flips it; concurrent tabs no-op.
  const { error } = await supabase
    .from('story_admin_users')
    .update({ first_login_shown: true })
    .eq('space', space)
    .eq('first_login_shown', false);
  if (error) {
    if (error.code === '42703' || error.code === '42P01') return NextResponse.json({ ok: true }); // inert
    console.error('[lyf-coach/welcome] stamp error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
