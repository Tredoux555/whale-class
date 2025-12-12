import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    
    // Return more specific error for debugging (remove in production)
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// Logout endpoint (for cleanup)
export async function DELETE() {
  return NextResponse.json({ success: true });
}



