import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';
import { createToken, verifyToken, extractToken } from '@/lib/story-auth';

// Admin uses SAME credentials as story_users table
// Username: T, Password: redoux

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Query the story_users table (same as regular user login)
    let result;
    try {
      result = await db.query(
        'SELECT * FROM story_users WHERE username = $1 AND is_active = TRUE',
        [username]
      );
    } catch (error) {
      // Fallback to old schema without is_active
      result = await db.query(
        'SELECT * FROM story_users WHERE username = $1',
        [username]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await compare(password, user.password_hash);

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token with admin type
    const token = await createToken({ username: user.username, type: 'admin' });

    return NextResponse.json({
      session: token,
      username: user.username,
      displayName: user.display_name || user.username
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Verify admin session
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = await verifyToken(token);

    if (!payload || payload.type !== 'admin') {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      username: payload.username
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}

// Logout
export async function DELETE(req: NextRequest) {
  // Admin logout - just return success, client handles session cleanup
  return NextResponse.json({ success: true });
}
