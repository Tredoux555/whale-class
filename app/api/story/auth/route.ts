import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/story/db';
import { createUserToken, verifyPassword } from '@/lib/story/auth';
import { StoryUser } from '@/lib/story/types';

export async function POST(req: NextRequest) {
  try {
    // Validate environment
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Database not configured' },
        { status: 500 }
      );
    }

    if (!process.env.STORY_JWT_SECRET) {
      return NextResponse.json(
        { error: 'Server configuration error', details: 'JWT secret not configured' },
        { status: 500 }
      );
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 400 }
      );
    }

    // Find user
    const user = await queryOne<StoryUser>(
      'SELECT * FROM story_users WHERE username = $1',
      [username]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const validPassword = await verifyPassword(password, user.password_hash);
    
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session token
    const token = await createUserToken(user.username);

    // Log the login
    try {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      await query(
        `INSERT INTO story_login_logs (username, session_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [user.username, token.substring(0, 50), ip, userAgent]
      );
    } catch {
      // Login logging is non-critical, continue
    }

    return NextResponse.json({ session: token });
  } catch (error) {
    console.error('Auth error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Categorize error for user-friendly message
    let userMessage = 'Authentication failed';
    if (message.includes('DATABASE_URL') || message.includes('connection')) {
      userMessage = 'Database connection error';
    } else if (message.includes('does not exist')) {
      userMessage = 'Database not initialized';
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      { status: 500 }
    );
  }
}

// Logout endpoint (cleanup)
export async function DELETE() {
  return NextResponse.json({ success: true });
}
