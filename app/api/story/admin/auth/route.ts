import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.STORY_ADMIN_JWT_SECRET || process.env.STORY_JWT_SECRET || 'fallback-admin-secret-key-change-in-production'
);

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Query database for admin user
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

    // Update last login
    await db.query(
      'UPDATE story_admin_users SET last_login = NOW() WHERE username = $1',
      [username]
    );

    // Create JWT token for admin
    const token = await new SignJWT({ username: admin.username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(ADMIN_JWT_SECRET);

    return NextResponse.json({ session: token });
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

