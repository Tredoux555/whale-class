// /api/montree/community/auth/login
// Email + password sign-in for the Teachers' Room.
//
// Rate limit is FAIL-CLOSED (house posture for credential endpoints — if the
// rate-limit table is unreachable we deny rather than let brute force run
// unmetered). Wrong-credentials answers are uniform and a miss still burns a
// bcrypt comparison, so neither the body nor the timing leaks whether an
// address is registered.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import {
  burnPasswordTiming,
  createCommunityToken,
  setCommunityCookie,
  verifyCommunityPassword,
} from '@/lib/montree/community/auth';
import {
  REQUIRE_EMAIL_CONFIRMATION,
  badRequest,
  isMissingTable,
  isValidEmail,
  migrationPending,
  normalizeEmail,
  rateLimited,
  readJson,
  serverError,
} from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

/** One answer for every credential failure — no enumeration, no hints. */
function invalidCredentials(): NextResponse {
  return NextResponse.json(
    { error: 'Wrong email or password.', code: 'invalid_credentials' },
    { status: 401 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/community/auth/login',
      8,
      15,
      'closed'
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const body = await readJson(request);
    if (!body) return badRequest('Malformed request.');

    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';

    if (!isValidEmail(email) || !password) {
      // Still generic: a malformed address is not worth a distinct answer.
      return invalidCredentials();
    }

    const { data: user, error } = await supabase
      .from('montree_community_users')
      .select('id, email, display_name, password_hash, email_confirmed_at, is_banned')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('login', error);
    }

    if (!user) {
      // Burn the same CPU a real comparison would, then answer identically.
      await burnPasswordTiming(password);
      return invalidCredentials();
    }

    const valid = await verifyCommunityPassword(password, user.password_hash as string | null);
    if (!valid) {
      return invalidCredentials();
    }

    // Credentials are correct from here on, so these two answers reveal
    // nothing a signed-in person doesn't already know.
    if (user.is_banned) {
      return NextResponse.json(
        { error: 'This account is not available.', code: 'unavailable' },
        { status: 403 }
      );
    }
    // Open mode (default): an unconfirmed row can still sign in — rows made
    // in open mode are confirmed at creation anyway, and any strict-mode
    // leftover shouldn't be locked out of a gate we turned off.
    if (REQUIRE_EMAIL_CONFIRMATION && !user.email_confirmed_at) {
      return NextResponse.json(
        {
          error: 'Please confirm your email first — check your inbox.',
          code: 'unconfirmed',
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Stamp the login. Awaited (a stray promise can be killed when the
    // response returns) but never allowed to fail the sign-in.
    const { error: stampError } = await supabase
      .from('montree_community_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);
    if (stampError) {
      console.error('[community/login] last_login_at stamp failed:', stampError);
    }

    const token = await createCommunityToken(user.id as string);
    const response = NextResponse.json({
      ok: true,
      user: {
        displayName: user.display_name as string,
        email: user.email as string,
        confirmed: true,
      },
    });
    setCommunityCookie(response, token);
    return response;
  } catch (err) {
    return serverError('login', err);
  }
}
