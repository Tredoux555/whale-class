import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

// First-login password claim.
//
// A story_admin_users row created with password_hash = 'SET_ON_FIRST_LOGIN' has
// no password yet. The FIRST person to log in sets it here — so no one else
// (not even whoever created the account) ever chose or knows it. Once set, this
// route refuses to touch it again, so it can never be used to reset a real
// password (that would be an account-takeover hole).

const UNCLAIMED_SENTINEL = 'SET_ON_FIRST_LOGIN';
const MIN_PASSWORD_LEN = 6;

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

export async function POST(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const supabase = getSupabase();
  const ip = getClientIP(req.headers);
  const userAgent = getUserAgent(req.headers);

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    supabase, ip, '/api/story/admin/auth/claim', 5, 15,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing details' }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return NextResponse.json(
      { error: `Choose a password of at least ${MIN_PASSWORD_LEN} characters.` },
      { status: 400 },
    );
  }

  try {
    const { data: users, error } = await supabase
      .from('story_admin_users')
      .select('username, password_hash, space')
      .eq('username', username)
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const user = users[0] as { username: string; password_hash: string; space?: string };
    if (user.password_hash !== UNCLAIMED_SENTINEL) {
      return NextResponse.json(
        { error: 'This account already has a password. Sign in instead.' },
        { status: 409 },
      );
    }

    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(password, 10);

    // Conditional update — only sets the password while it is STILL unclaimed.
    // If a second request raced in first, 0 rows update and we refuse.
    const { data: updated, error: upErr } = await supabase
      .from('story_admin_users')
      .update({ password_hash: hash })
      .eq('username', username)
      .eq('password_hash', UNCLAIMED_SENTINEL)
      .select('username');

    if (upErr || !updated || updated.length === 0) {
      return NextResponse.json(
        { error: 'Could not set the password. Please try again.' },
        { status: 409 },
      );
    }

    // Log them straight in.
    const space = user.space || 'tredoux';
    const token = await new SignJWT({ username, role: 'admin', space })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJWTSecret());

    const response = NextResponse.json({ session: token });
    response.cookies.set('story-admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return response;
  } catch (e) {
    console.error('[AdminClaim] failed:', e);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
