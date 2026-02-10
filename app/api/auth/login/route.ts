// /api/auth/login/route.ts
// Admin login endpoint for Whale Class admin dashboard
import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { getSupabase } from '@/lib/supabase-client';

// Build admin credentials from environment (skip accounts with missing passwords)
function getAdminCredentials() {
  const creds: { username: string; password: string }[] = [];
  if (process.env.SUPER_ADMIN_PASSWORD) {
    creds.push({ username: 'Tredoux', password: process.env.SUPER_ADMIN_PASSWORD });
  }
  if (process.env.TEACHER_ADMIN_PASSWORD) {
    creds.push({ username: 'Teacher', password: process.env.TEACHER_ADMIN_PASSWORD });
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

    // Check against configured credentials (accounts with unset env vars are disabled)
    const isValid = getAdminCredentials().some(
      cred => cred.username === username && cred.password === password
    );

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

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
