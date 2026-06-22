import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { selectAdminUserForAuth } from '@/lib/sanctuary-e2e/server-auth';
import { normaliseEmail, mintCoachPublicToken, coachSessionCookie } from '@/lib/story/coach/public-account';

// POST /api/lyf-coach/login — PUBLIC Lyf Coach sign-in (email + password).
//
// Plain bcrypt path only: public accounts are server-side bcrypt rows keyed by
// email==username. e2e (native device-key) accounts and not-yet-claimed
// owner-provisioned rows are refused here with the same generic message (no
// path disclosure). Mints the same coach_public session the signup does.

const UNCLAIMED_SENTINEL = 'SET_ON_FIRST_LOGIN';

export async function POST(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) {
    return NextResponse.json({ error: 'Sign-in is not configured.' }, { status: 500 });
  }

  const supabase = getSupabase();
  const ip = getClientIP(req.headers);
  const userAgent = getUserAgent(req.headers);

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    supabase, ip, '/api/lyf-coach/login', 10, 15,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = normaliseEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  try {
    const user = await selectAdminUserForAuth(supabase, email);
    // One generic failure for every "can't sign in" case — never disclose
    // whether the email exists, is e2e, or is unclaimed.
    if (user && !user.e2e && user.password_hash !== UNCLAIMED_SENTINEL) {
      const bcrypt = await import('bcryptjs');
      if (await bcrypt.compare(password, user.password_hash)) {
        const token = await mintCoachPublicToken(email, user.space);
        const response = NextResponse.json({ session: token });
        response.cookies.set(coachSessionCookie(token));
        return response;
      }
    }
  } catch (e) {
    console.error('[lyf-coach/login] DB check failed:', e);
  }

  await logAudit(supabase, {
    adminIdentifier: email || ip,
    action: 'login_failed',
    resourceType: 'lyf_coach',
    ipAddress: ip,
    userAgent,
  });
  return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
}
