import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { compare } from 'bcryptjs';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function dbQuery(text: string, params?: unknown[]) {
  const client = getPool();
  return client.query(text, params);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

async function ensureUsersTable() {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS story_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert default users: T / redoux and Z / oe
    await dbQuery(`
      INSERT INTO story_users (username, password_hash) VALUES
        ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'),
        ('Z', '$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK')
      ON CONFLICT (username) DO NOTHING
    `);
    
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS story_login_logs (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        login_at TIMESTAMP DEFAULT NOW(),
        session_token TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        user_id VARCHAR(50),
        logout_at TIMESTAMP
      )
    `);
    
    return true;
  } catch (e) {
    console.error('[Auth] ensureUsersTable error:', e);
    return false;
  }
}

// POST - User Login
export async function POST(req: NextRequest) {
  console.log('[Auth] POST login request');
  
  if (!process.env.DATABASE_URL) {
    console.error('[Auth] DATABASE_URL missing');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  
  if (!process.env.STORY_JWT_SECRET) {
    console.error('[Auth] STORY_JWT_SECRET missing');
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { username, password } = body;
    
    console.log('[Auth] Login attempt for:', username);

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Ensure tables exist
    await ensureUsersTable();

    // Find user
    const result = await dbQuery(
      'SELECT username, password_hash FROM story_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log('[Auth] User not found:', username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await compare(password, user.password_hash);
    
    if (!validPassword) {
      console.log('[Auth] Invalid password');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    console.log('[Auth] Password valid, creating token...');

    // Create JWT
    const secret = getJWTSecret();
    const token = await new SignJWT({ username: user.username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    console.log('[Auth] Token created successfully');

    // Log the login - THIS IS THE IMPORTANT PART
    try {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      await dbQuery(
        `INSERT INTO story_login_logs (username, login_at, session_token, ip_address, user_agent, user_id) 
         VALUES ($1, NOW(), $2, $3, $4, $5)`,
        [user.username, token.substring(0, 50), ip, userAgent, user.username]
      );
      console.log('[Auth] Login logged successfully for:', user.username);
    } catch (logError) {
      console.error('[Auth] Failed to log login (non-critical):', logError);
      // Don't fail the login if logging fails
    }

    return NextResponse.json({ session: token });
    
  } catch (error) {
    console.error('[Auth] Error:', error);
    return NextResponse.json(
      { error: 'Login failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// DELETE - Logout
export async function DELETE() {
  return NextResponse.json({ success: true });
}
