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

// Log admin login to database
async function logAdminLogin(
  supabase: ReturnType<typeof getSupabase>,
  username: string,
  token: string,
  req: NextRequest
): Promise<void> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabase.from('story_admin_login_logs').insert({
      username,
      login_at: new Date().toISOString(),
      session_token: token.substring(0, 50),
      ip_address: ip,
      user_agent: userAgent
    });
  } catch (e) {
    console.error('[AdminAuth] Login log failed:', e);
  }
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
      .select('username, password_hash')
      .eq('username', username)
      .limit(1);

    if (!error && users && users.length > 0) {
      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, users[0].password_hash);

      if (valid) {
        const token = await new SignJWT({ username, role: 'admin' })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(getJWTSecret());

        // Log the login
        await logAdminLogin(supabase, username, token, req);

        // Phase 7: Set HttpOnly cookie alongside JSON (dual mode for backward compat)
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
  response.cookies.delete('story-admin-token');
  return response;
}
