import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.STORY_JWT_SECRET || 'change-this-secret-in-production'
);

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Query database for user
    const result = await db.query(
      'SELECT * FROM story_users WHERE username = $1',
      [username]
    );

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

    // Create JWT token
    const token = await new SignJWT({ username: user.username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return NextResponse.json({ session: token });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Logout endpoint (for cleanup)
export async function DELETE() {
  return NextResponse.json({ success: true });
}

// Helper function to verify tokens (used by other routes)
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}



