import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables with detailed logging
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const hasJwtSecret = !!process.env.STORY_JWT_SECRET;
    
    console.log('Environment check:', {
      hasDATABASE_URL: hasDatabaseUrl,
      hasSTORY_JWT_SECRET: hasJwtSecret,
      DATABASE_URL_length: process.env.DATABASE_URL?.length || 0,
      STORY_JWT_SECRET_length: process.env.STORY_JWT_SECRET?.length || 0,
      NODE_ENV: process.env.NODE_ENV
    });

    if (!hasDatabaseUrl) {
      console.error('DATABASE_URL environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'DATABASE_URL environment variable is missing',
          debug: {
            hasDATABASE_URL: false,
            NODE_ENV: process.env.NODE_ENV
          }
        },
        { status: 500 }
      );
    }

    if (!hasJwtSecret) {
      console.error('STORY_JWT_SECRET environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'STORY_JWT_SECRET environment variable is missing',
          debug: {
            hasSTORY_JWT_SECRET: false,
            NODE_ENV: process.env.NODE_ENV
          }
        },
        { status: 500 }
      );
    }

    const { username, password } = await req.json();

    // Query database for user
    let result;
    try {
      console.log('Attempting database query for username:', username);
      result = await db.query(
        'SELECT * FROM story_users WHERE username = $1',
        [username]
      );
      console.log('Database query successful, rows found:', result.rows.length);
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      console.error('Database error details:', {
        message: dbErrorMessage,
        name: dbError instanceof Error ? dbError.name : 'Unknown',
        hasDATABASE_URL: !!process.env.DATABASE_URL
      });
      throw dbError;
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
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    
    // Check for specific error types
    let errorType = 'Unknown error';
    if (errorMessage.includes('DATABASE_URL') && errorMessage.includes('not set')) {
      errorType = 'Database configuration error: DATABASE_URL not set';
    } else if (errorMessage.includes('connection') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
      errorType = 'Database connection failed';
    } else if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
      errorType = 'Database table missing: story_users table may not exist';
    } else if (errorMessage.includes('JWT_SECRET') || errorMessage.includes('STORY_JWT_SECRET')) {
      errorType = 'JWT secret configuration error';
    } else if (errorMessage.includes('DATABASE_URL')) {
      // DATABASE_URL mentioned but not "not set" - might be a different error
      errorType = `Database error: ${errorMessage}`;
    }
    
    // Return more specific error - show actual error in production for debugging
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        details: errorMessage, // Show actual error message
        type: errorType,
        debug: process.env.NODE_ENV === 'development' ? { stack: errorStack } : undefined
      },
      { status: 500 }
    );
  }
}

// Logout endpoint (for cleanup)
export async function DELETE() {
  return NextResponse.json({ success: true });
}



