// app/api/cms/auth/login/route.ts
// CMS sign-in. Email + password, bcrypt, jose JWT in an httpOnly cookie — the
// same mechanism as every Montree login (lib/montree/password.ts is imported
// verbatim; only the token module differs, see lib/cms/auth/session.ts).
//
// Shape follows the house pattern in app/api/montree/parent/login/route.ts:
// rate-limit first, one indistinguishable error for every credential failure,
// cookie set server-side, never a token in the response body.

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifyPassword } from '@/lib/montree/password';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { homePathForRole, mintCmsSession } from '@/lib/cms/auth/session';
import { setCmsSessionCookie } from '@/lib/cms/auth/server';
import { findCmsUserByEmail, loadMemberships } from '@/lib/cms/db/queries';

export const dynamic = 'force-dynamic';

/** One message for "no such user", "wrong password" and "disabled". Which of
 *  the three it was is exactly what an attacker is trying to learn. */
const INVALID = { error: 'invalid_credentials' };

export async function POST(request: NextRequest) {
  if (!isCmsLive()) {
    // Demo mode has no accounts to sign in to, and says so honestly rather
    // than failing with a database error.
    return NextResponse.json({ error: 'demo_mode' }, { status: 503 });
  }

  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    // fail-CLOSED: if the counter is unreachable we deny rather than let
    // brute force run unmetered. Same posture as Montree's unified login.
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/cms/auth/login', 5, 15, 'closed', 'cms_rate_limit_logs'
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds ?? 900) } }
      );
    }

    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    if (!email || !password) {
      return NextResponse.json(INVALID, { status: 401 });
    }

    const user = await findCmsUserByEmail(email);
    if (!user || !user.is_active) return NextResponse.json(INVALID, { status: 401 });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return NextResponse.json(INVALID, { status: 401 });

    const memberships = await loadMemberships(user.id);
    const membership = memberships[0];
    if (!membership) {
      // A real account with no school attached. Distinct from bad credentials
      // because it is an administrative state, not an attack surface: the
      // person exists and authenticated, they just have nothing to open.
      return NextResponse.json({ error: 'no_membership' }, { status: 403 });
    }

    const token = await mintCmsSession({
      userId: user.id,
      membershipId: membership.id,
      email: user.email,
      displayName: membership.display_name || user.display_name || user.email,
      role: membership.role,
      organisationId: membership.organisation_id,
      schoolId: membership.school_id,
      guardianId: membership.guardian_id,
    });
    await setCmsSessionCookie(token);

    // Best-effort; a failed stamp must never fail a login.
    await supabase
      .from('cms_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(({ error }: { error: unknown }) => {
        if (error) safeErrorLog('api/cms/auth/login:last_login', error);
      });

    return NextResponse.json({
      ok: true,
      role: membership.role,
      redirectTo: homePathForRole(membership.role),
    });
  } catch (error) {
    safeErrorLog('api/cms/auth/login', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
