// /api/auth/login/route.ts
// Admin login endpoint for Whale Class admin dashboard
import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { getSupabase } from '@/lib/supabase-client';
import { timingSafeEqual } from 'crypto';

// 🚨 Session 113 V2 Whale-Class admin audit HIGH — timing-safe password
// compare. The legacy `cred.password === password` short-circuits on the
// first byte mismatch, which leaks the correct password's length and
// gives an attacker a tiny but measurable side-channel. timingSafeEqual
// runs in constant time relative to the longer of the two buffers.
//
// Note: this only matters for the offline-style attack where someone
// can fire thousands of requests to time them; the rate limiter caps
// at 5/15min already, so the practical risk is low. Defense in depth.
function constantTimePasswordEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // timingSafeEqual requires same-length buffers — if they differ in
  // length, compare against a same-length zero buffer to keep the
  // timing predictable, then return false.
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Build admin credentials from environment (skip accounts with missing passwords).
//
// 🚨 Session 113 V2 Whale-Class admin audit CRITICAL #2 — ADMIN_USERNAME +
// ADMIN_PASSWORD env vars are documented in CLAUDE.md but were previously
// not wired. Either the docs lie or the third login is needed. Wired now:
// if both env vars are set AND the username is not already a reserved one
// ('Tredoux' / 'Teacher'), the admin can log in with this custom pair.
// Useful for a backup admin account without touching code.
function getAdminCredentials() {
  const creds: { username: string; password: string }[] = [];
  if (process.env.SUPER_ADMIN_PASSWORD) {
    creds.push({ username: 'Tredoux', password: process.env.SUPER_ADMIN_PASSWORD });
  }
  if (process.env.TEACHER_ADMIN_PASSWORD) {
    creds.push({ username: 'Teacher', password: process.env.TEACHER_ADMIN_PASSWORD });
  }
  if (
    process.env.ADMIN_USERNAME &&
    process.env.ADMIN_PASSWORD &&
    process.env.ADMIN_USERNAME !== 'Tredoux' &&
    process.env.ADMIN_USERNAME !== 'Teacher'
  ) {
    creds.push({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  }
  return creds;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // Rate limiting
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/auth/login', 5, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const { username, password } = await request.json();

    // Reject empty passwords outright
    if (!password) {
      await logAudit(supabase, {
        adminIdentifier: username || ip,
        action: 'login_failed',
        resourceType: 'admin',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check against configured credentials (accounts with unset env vars are disabled).
    // 🚨 Session 113 V2 Whale-Class admin audit HIGH — timing-safe compare.
    const creds = getAdminCredentials();
    let isValid = false;
    for (const cred of creds) {
      if (
        cred.username === username &&
        constantTimePasswordEqual(cred.password, password)
      ) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      await logAudit(supabase, {
        adminIdentifier: username || ip,
        action: 'login_failed',
        resourceType: 'admin',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await createAdminToken();

    // Create response with cookie
    const response = NextResponse.json({ success: true });

    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days (matches token TTL)
      path: '/',
    });

    // Phase 8: Log successful admin login
    logAudit(supabase, {
      adminIdentifier: username,
      action: 'login_success',
      resourceType: 'admin',
      resourceDetails: { endpoint: '/api/auth/login' },
      ipAddress: ip,
      userAgent,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
