// /api/montree/super-admin/auth/route.ts
// Phase 5: Server-side super-admin authentication
// Replaces client-side password comparison in page.tsx

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req.headers);
    const userAgent = getUserAgent(req.headers);

    // Rate limiting (non-blocking — if table doesn't exist yet, allow through)
    try {
      const supabase = getSupabase();
      const { allowed, retryAfterSeconds } = await checkRateLimit(
        supabase, ip, '/api/montree/super-admin/auth', 5, 15
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
        );
      }
    } catch (e) {
      console.error('[SuperAdminAuth] Rate limit check failed (non-blocking):', e);
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
    const passwordMatch = (() => {
      try {
        const a = Buffer.from(password.padEnd(64, '\0'));
        const b = Buffer.from(expectedPassword.padEnd(64, '\0'));
        return timingSafeEqual(a, b);
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

    return NextResponse.json({ authenticated: true });
  } catch (e) {
    console.error('[SuperAdminAuth] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
