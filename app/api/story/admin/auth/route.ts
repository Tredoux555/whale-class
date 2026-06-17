import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

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

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  // Database bcrypt authentication (only path — hardcoded fallback removed in Phase 5)
  try {
    const { data: users, error } = await supabase
      .from('story_admin_users')
      .select('username, password_hash, space')
      .eq('username', username)
      .limit(1);

    if (!error && users && users.length > 0) {
      // First login: account exists but has no password yet → ask them to set one.
      if (users[0].password_hash === UNCLAIMED_SENTINEL) {
        return NextResponse.json({ needsPasswordSetup: true });
      }

      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, users[0].password_hash);

      if (valid) {
        // Carry the user's space into the token so every personal route can
        // scope data to it. Default 'tredoux' for the existing single user.
        const space = (users[0] as { space?: string }).space || 'tredoux';
        const token = await new SignJWT({ username, role: 'admin', space })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(getJWTSecret());

        // Log the login
        await logAdminLogin(supabase, username, token, ip, userAgent);

        // Phase 7: Set HttpOnly cookie alongside JSON (dual mode for backward compat)
        //
        // ⚠️ AUDIT FINDING M1 (docs/STORY_SECURITY_AUDIT_2026-06.md) — DELIBERATELY
        // NOT FIXED in the Jun 13 overnight pass. Returning the token in the JSON
        // body (and replaying it as a Bearer header from sessionStorage) defeats
        // the httpOnly cookie's XSS protection. The fix was assessed and is NOT
        // small: an unattended token-handling refactor risks bricking the admin
        // session flow, which is worse than the finding (M1 is Medium; it only
        // matters if XSS already exists in the admin dashboard).
        //
        // Blast radius measured (Jun 13, 2026):
        //   • 24 API route files (~50 call sites) verify via
        //     verifyAdminToken(req.headers.get('Authorization')) — header-ONLY;
        //     none read the 'story-admin-token' cookie except GET in this file.
        //   • 9 client files (~21 call sites) attach `Bearer ${getSession()}`
        //     from sessionStorage('story_admin_session'): useAuthSession,
        //     useVault, useMessages, useAdminMessage, useSharedFiles,
        //     useLoginLogs, useOnlineUsers, useSystemControls, OnlineUsersTab,
        //     plus app/story/admin/page.tsx which stores data.session.
        //
        // EXACT MIGRATION PLAN (do in ONE attended session, in this order):
        //   1. lib/story-db.ts: add verifyAdminRequest(req: NextRequest) that
        //      checks the Authorization header FIRST, then falls back to the
        //      'story-admin-token' httpOnly cookie (mirror the montree-auth
        //      pattern in lib/montree/server-auth.ts). Switch all 24 admin
        //      routes from verifyAdminToken(header) to verifyAdminRequest(req).
        //      Deploy. Nothing breaks: header path still works.
        //   2. Client: change all fetches to `credentials: 'same-origin'` (the
        //      cookie already flows on same-origin fetches by default) and make
        //      useAuthSession.verifySession() call GET /api/story/admin/auth
        //      (the /me equivalent below, which already accepts the cookie)
        //      instead of reading sessionStorage. Drop the Bearer headers and
        //      the sessionStorage read/write/remove (3 sites in useAuthSession,
        //      1 in admin/page.tsx). DELETE on logout already clears the cookie.
        //   3. Server: stop returning the token here — `NextResponse.json({
        //      success: true })` — and rotate STORY_JWT_SECRET afterwards so any
        //      body-issued tokens still cached in sessionStorage die.
        //   4. CSRF: the cookie is SameSite=Lax and all mutating admin routes
        //      are POST/DELETE JSON — verify an Origin/Content-Type check or
        //      keep requiring a custom header before relying on the cookie alone.
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

    return NextResponse.json({ authenticated: true, username: payload.username });
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
