import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.STORY_ADMIN_JWT_SECRET || process.env.STORY_JWT_SECRET || 'fallback-admin-secret-key-change-in-production'
);

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Query database for admin user
    let result;
    try {
      result = await db.query(
        'SELECT * FROM story_admin_users WHERE username = $1',
        [username]
      );
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      
      // Check if table doesn't exist
      if (dbErrorMessage.includes('does not exist') || dbErrorMessage.includes('relation') || dbErrorMessage.includes('story_admin_users')) {
        return NextResponse.json(
          { 
            error: 'Database table not found',
            details: 'The story_admin_users table does not exist. Please run the migration: migrations/009_story_admin_system.sql',
            hint: 'Run this SQL in Supabase SQL Editor'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Database error',
          details: process.env.NODE_ENV === 'development' ? dbErrorMessage : 'Database connection failed'
        },
        { status: 500 }
      );
    }

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

    // Update last login
    try {
      await db.query(
        'UPDATE story_admin_users SET last_login = NOW() WHERE username = $1',
        [username]
      );
    } catch (updateError) {
      console.error('Failed to update last login:', updateError);
      // Don't fail the login if update fails
    }

    // Create JWT token for admin
    const token = await new SignJWT({ username: admin.username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(ADMIN_JWT_SECRET);

    return NextResponse.json({ session: token });
  } catch (error) {
    console.error('Admin auth error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// Verify admin session
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ 
      valid: true, 
      username: payload.username 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// Helper endpoint to hash the admin password (run once to get the hash)
export async function PUT(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { password } = await req.json();
    const passwordHash = await hash(password, 10);
    
    return NextResponse.json({ 
      hash: passwordHash,
      message: 'Use this hash in the migration file'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to hash' }, { status: 500 });
  }
}

