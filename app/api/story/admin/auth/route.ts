import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';
import { createToken, verifyToken, extractToken } from '@/lib/story-auth';

// POST: Admin login
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Query admin users table
    const result = await db.query(
      'SELECT * FROM story_admin_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const admin = result.rows[0];

    // Verify password
    const validPassword = await compare(password, admin.password_hash);
    
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create admin JWT token
    const token = await createToken({ username: admin.username, type: 'admin' });

    return NextResponse.json({ 
      session: token,
      username: admin.username
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// GET: Verify admin session
export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    
    if (!payload || payload.type !== 'admin') {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    return NextResponse.json({ 
      valid: true,
      username: payload.username
    });
  } catch (error) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
