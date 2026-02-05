// /api/auth/login/route.ts
// Admin login endpoint for Whale Class admin dashboard
import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/auth';

// Valid admin credentials
const ADMIN_CREDENTIALS = [
  { username: 'Tredoux', password: '870602' },
  { username: 'Teacher', password: 'Potato' },
];

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Check against all valid credentials
    const isValid = ADMIN_CREDENTIALS.some(
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
      maxAge: 60 * 60 * 24 * 30, // 30 days
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
