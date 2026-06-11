// /api/montree/super-admin/auth/route.ts
// Phase 5: Server-side super-admin authentication
// Replaces client-side password comparison in page.tsx

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { SignJWT } from 'jose';
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { checkRateLimit } from '@/lib/rate-limiter';
// audit-fix (Jun 2026): session tokens are now signed with a dedicated
// SUPER_ADMIN_JWT_SECRET (falls back to the old password-derived key until
// the env var is set in Railway). Shared with lib/verify-super-admin.ts so
// mint + verify always use the same key.
import { getSuperAdminTokenSecret } from '@/lib/verify-super-admin';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req.headers);
    const userAgent = getUserAgent(req.headers);

    // Rate limiting — audit-fix (Jun 2026): fails CLOSED. This route guards
    // god-mode with a static password; if the rate-limit infrastructure is
    // down we refuse logins rather than letting brute-force run unmetered.
    try {
      const supabase = getSupabase();
      const { allowed, retryAfterSeconds } = await checkRateLimit(
        supabase, ip, '/api/montree/super-admin/auth', 5, 15, 'closed'
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
        );
      }
    } catch (e) {
      console.error('[SuperAdminAuth] Rate limit infrastructure unavailable — refusing login (fail-closed):', e);
      return NextResponse.json(
        { error: 'Temporarily unavailable. Please try again shortly.' },
        { status: 503, headers: { 'Retry-After': '60' } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!expectedPassword) {
      console.error('[SuperAdminAuth] SUPER_ADMIN_PASSWORD not configured');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Phase 7: Timing-safe comparison to prevent timing attacks
    // Use Buffer.alloc with fixed byte size to handle unicode correctly
    const passwordMatch = (() => {
      try {
        const aBuf = Buffer.alloc(256, 0);
        const bBuf = Buffer.alloc(256, 0);
        aBuf.write(password, 'utf8');
        bBuf.write(expectedPassword, 'utf8');
        return timingSafeEqual(aBuf, bBuf);
      } catch {
        return false;
      }
    })();
    if (!passwordMatch) {
      // Log failed attempt (non-blocking)
      try {
        const supabase = getSupabase();
        await logAudit(supabase, {
          adminIdentifier: ip,
          action: 'login_failed',
          resourceType: 'system',
          resourceDetails: { endpoint: 'super-admin' },
          ipAddress: ip,
          userAgent,
          isSensitive: true,
        });
      } catch (e) {
        console.error('[SuperAdminAuth] Audit log failed:', e);
      }
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Log successful login (non-blocking)
    try {
      const supabase = getSupabase();
      await logAudit(supabase, {
        adminIdentifier: 'super_admin',
        action: 'login_success',
        resourceType: 'system',
        resourceDetails: { endpoint: 'super-admin' },
        ipAddress: ip,
        userAgent,
      });
    } catch (e) {
      console.error('[SuperAdminAuth] Audit log failed:', e);
    }

    // Issue JWT session token (1 hour). Client-side 15-min inactivity timeout
    // is the real session control — JWT just needs to outlast an active session.
    const token = await new SignJWT({ role: 'super_admin', ip })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(getSuperAdminTokenSecret());

    return NextResponse.json({ authenticated: true, token });
  } catch (e) {
    console.error('[SuperAdminAuth] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
