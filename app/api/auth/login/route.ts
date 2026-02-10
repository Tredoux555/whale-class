// /api/auth/login/route.ts
// Admin login endpoint for Whale Class admin dashboard
import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/auth';

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
    const { username, password } = await request.json();

    // Reject empty passwords outright
    if (!password) {
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
