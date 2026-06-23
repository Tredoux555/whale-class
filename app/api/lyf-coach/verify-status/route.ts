// app/api/lyf-coach/verify-status/route.ts
//
// GET  -> { email_verified, email } for the current session (drives the banner).
// POST -> regenerate the token + resend the confirmation email (rate-limited).
//
// Fail-open: if the verification columns don't exist yet (migration 270 not run)
// or a lookup errors, GET reports verified=true so the banner never nags.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getSupabase, getJWTSecret } from '@/lib/story-db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { generateVerifyToken, sendCoachVerificationEmail } from '@/lib/story/coach/email-verification';

export const dynamic = 'force-dynamic';

async function resolveSession(req: NextRequest): Promise<{ space: string; username: string } | null> {
  const authHeader = req.headers.get('authorization');
  let token = authHeader ? authHeader.replace('Bearer ', '') : null;
  if (!token) token = req.cookies.get('story-admin-token')?.value || null;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    if (payload.role !== 'admin') return null;
    const space = typeof payload.space === 'string' ? payload.space : '';
    const username = typeof payload.username === 'string' ? payload.username : '';
    if (!space) return null;
    return { space, username };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  const who = await resolveSession(req);
  if (!who) return NextResponse.json({ error: 'No session' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_admin_users')
    .select('email_verified, username')
    .eq('space', who.space)
    .limit(1)
    .maybeSingle();

  if (error) {
    // Columns absent (42703 / 42P01) or any read error -> never nag.
    if (error.code !== '42703' && error.code !== '42P01') {
      console.error('[lyf-coach/verify-status] lookup error:', error);
    }
    return NextResponse.json({ email_verified: true });
  }
  const verified = data ? data.email_verified !== false : true;
  const email = data && typeof data.username === 'string' ? data.username : who.username;
  return NextResponse.json({ email_verified: verified, email });
}

export async function POST(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  const who = await resolveSession(req);
  if (!who) return NextResponse.json({ error: 'No session' }, { status: 401 });

  const supabase = getSupabase();
  const ip = getClientIP(req.headers);
  const { allowed, retryAfterSeconds } = await checkRateLimit(supabase, ip, '/api/lyf-coach/verify-status', 3, 15);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Please wait a moment before requesting another email.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  const { data, error } = await supabase
    .from('story_admin_users')
    .select('email_verified, username')
    .eq('space', who.space)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === '42703' || error.code === '42P01') return NextResponse.json({ ok: true }); // feature inert
    console.error('[lyf-coach/verify-status] resend lookup error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'No account.' }, { status: 404 });
  if (data.email_verified !== false) return NextResponse.json({ ok: true, already_verified: true });

  const email = typeof data.username === 'string' ? data.username : who.username;
  const verifyToken = generateVerifyToken();
  const { error: upErr } = await supabase
    .from('story_admin_users')
    .update({ email_verify_token: verifyToken, email_verify_sent_at: new Date().toISOString() })
    .eq('space', who.space);
  if (upErr) {
    console.error('[lyf-coach/verify-status] token update error:', upErr);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
  await sendCoachVerificationEmail(email, verifyToken);
  return NextResponse.json({ ok: true });
}
