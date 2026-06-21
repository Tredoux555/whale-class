import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { selectAdminUserForAuth, verifyE2eLogin } from '@/lib/sanctuary-e2e/server-auth';

// Phase 5: Hardcoded ADMIN_USERS ('T': 'redoux', 'Z': 'oe') removed.
// All admin users must authenticate via bcrypt hashes in story_admin_users table.
// User Z's bcrypt hash was added in migration 122_phase5_security.sql.

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

// A story_admin_users row created with this sentinel as its password_hash has
// NO password yet — the person sets their own on first login (via /auth/claim).
// Lets us add someone (e.g. a new sanctuary) without anyone else knowing or
// choosing their password.
const UNCLAIMED_SENTINEL = 'SET_ON_FIRST_LOGIN';

// Log admin login to database (with retry, matching user auth pattern)
async function logAdminLogin(
  supabase: ReturnType<typeof getSupabase>,
  username: string,
  token: string,
  ip: string,
  userAgent: string
): Promise<boolean> {
  const payload = {
    username,
    login_at: new Date().toISOString(),
    session_token: token.substring(0, 50),
    ip_address: ip,
    user_agent: userAgent
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await supabase
        .from('story_admin_login_logs')
        .insert(payload)
        .select('id')
        .maybeSingle();

      if (!error && data) {
        console.log(`[AdminAuth] Login logged: user=${username} ip=${ip} log_id=${data.id} attempt=${attempt}`);
        return true;
      }

      if (error?.code === '23505') {
        console.log(`[AdminAuth] Login log already exists (attempt ${attempt})`);
        return true;
      }

      console.error(`[AdminAuth] Login log attempt ${attempt}/3 FAILED:`, error?.code, error?.message);
    } catch (e) {
      console.error(`[AdminAuth] Login log attempt ${attempt}/3 exception:`, e);
    }

    if (attempt < 3) await new Promise(r => setTimeout(r, 200));
  }

  console.error(`[AdminAuth] LOGIN LOG FAILED ALL 3 ATTEMPTS: user=${username} ip=${ip}`);
  return false;
}

// Mint the story-admin JWT + set the httpOnly cookie + log the login. Shared by
// the legacy bcrypt path and the e2e (device-key) path so the two can never
// diverge on token shape, expiry, or cookie flags.
async function buildAdminSessionResponse(
  supabase: ReturnType<typeof getSupabase>,
  username: string,
  space: string,
  ip: string,
  userAgent: string,
): Promise<NextResponse> {
  const token = await new SignJWT({ username, role: 'admin', space })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJWTSecret());

  await logAdminLogin(supabase, username, token, ip, userAgent);

  // Phase 7: Set HttpOnly cookie alongside JSON (dual mode for backward compat).
  // ⚠️ AUDIT FINDING M1 (docs/STORY_SECURITY_AUDIT_2026-06.md) — DELIBERATELY
  // NOT FIXED. Returning the token in the JSON body (and replaying it as a
  // Bearer header from sessionStorage) defeats the httpOnly cookie's XSS
  // protection. The fix is an attended token-handling refactor across 24 routes
  // + 9 client files; see the original note in git history. M1 is Medium and
  // only matters if XSS already exists in the admin dashboard.
  const response = NextResponse.json({ session: token });
  response.cookies.set('story-admin-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24h matches JWT expiry
    path: '/',
  });
  return response;
}

export async function POST(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const supabase = getSupabase();
  const ip = getClientIP(req.headers);
  const userAgent = getUserAgent(req.headers);

  // Rate limiting
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    supabase, ip, '/api/story/admin/auth', 5, 15
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { username, password } = body;

  if (!username) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  try {
    // ONE lookup, tolerant of migration 265 not yet being applied: if the e2e
    // columns are absent the user is reported non-e2e → the legacy bcrypt path
    // runs exactly as before. e2e columns are referenced ONLY inside the e2e
    // branch below.
    const user = await selectAdminUserForAuth(supabase, username);

    if (user && user.e2e) {
      // ── e2e (native, device-encrypted) path ─────────────────────────────
      // The server verifies crypto_generichash(authSecret) == auth_verifier.
      // It NEVER sees the password or the content key, and authSecret is never
      // logged. The legacy bcrypt path (else) is untouched.
      const authSecret = typeof body.authSecret === 'string' ? body.authSecret : null;

      if (!authSecret) {
        // Fresh-device salt fetch: explicit { username, e2eBegin: true }. The
        // salt is NOT secret (§3) — it lets the device re-derive the master key.
        if (body.e2eBegin === true && user.kdf_salt) {
          return NextResponse.json({ e2e: true, kdf_salt: user.kdf_salt });
        }
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
      }

      if (await verifyE2eLogin(authSecret, user.auth_verifier)) {
        return buildAdminSessionResponse(supabase, username, user.space, ip, userAgent);
      }
      // wrong authSecret → fall through to the shared 401 below.
    } else {
      // ── legacy bcrypt path (behaviour unchanged) ────────────────────────
      if (!password) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
      }
      if (user) {
        // First login: account exists but has no password yet → ask to set one.
        if (user.password_hash === UNCLAIMED_SENTINEL) {
          return NextResponse.json({ needsPasswordSetup: true });
        }
        const bcrypt = await import('bcryptjs');
        const valid = await bcrypt.compare(password, user.password_hash);
        if (valid) {
          return buildAdminSessionResponse(supabase, username, user.space, ip, userAgent);
        }
      }
    }
  } catch (e) {
    console.error('[AdminAuth] DB check failed:', e);
  }

  await logAudit(supabase, {
    adminIdentifier: username || ip,
    action: 'login_failed',
    resourceType: 'story_admin',
    ipAddress: ip,
    userAgent,
  });
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  try {
    // Phase 7: Accept token from Authorization header or HttpOnly cookie
    const authHeader = req.headers.get('authorization');
    let token = authHeader ? authHeader.replace('Bearer ', '') : null;
    if (!token) {
      token = req.cookies.get('story-admin-token')?.value || null;
    }
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(token, getJWTSecret());

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Family role (parent/child/adult) so the personal shell can gate the
    // Family nav entry. Tolerant: missing column / row → 'adult' (no Family nav).
    const space = typeof payload.space === 'string' && payload.space ? payload.space : 'tredoux';
    let familyRole: 'adult' | 'parent' | 'child' = 'adult';
    try {
      const { getFamilyRole } = await import('@/lib/story/coach');
      familyRole = await getFamilyRole(getSupabase(), space);
    } catch {
      /* default 'adult' */
    }

    return NextResponse.json({ authenticated: true, username: payload.username, space, family_role: familyRole });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = getSupabase();

      // Mark the session as logged out
      await supabase
        .from('story_admin_login_logs')
        .update({ logout_at: new Date().toISOString() })
        .eq('session_token', token.substring(0, 50))
        .is('logout_at', null);
    }
  } catch (e) {
    console.error('[AdminAuth] Logout tracking failed:', e);
  }
  // Phase 7: Clear HttpOnly cookie on logout
  const response = NextResponse.json({ success: true });
  response.cookies.delete({ name: 'story-admin-token', path: '/' });
  return response;
}
