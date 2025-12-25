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

async function ensureAdminTable() {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS story_admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `);
    
    await dbQuery(`
      INSERT INTO story_admin_users (username, password_hash) VALUES
        ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO')
      ON CONFLICT (username) DO NOTHING
    `);
    
    return true;
  } catch (e) {
    console.error('[AdminAuth] ensureAdminTable error:', e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  console.log('[AdminAuth] POST admin login request');
  
  if (!process.env.DATABASE_URL) {
    console.error('[AdminAuth] DATABASE_URL missing');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  
  if (!process.env.STORY_JWT_SECRET) {
    console.error('[AdminAuth] STORY_JWT_SECRET missing');
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }
  
  try {
    const body = await req.json();
    const { username, password } = body;
    
    console.log('[AdminAuth] Login attempt for:', username);
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }
    
    await ensureAdminTable();
    
    const result = await dbQuery(
      'SELECT username, password_hash FROM story_admin_users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      console.log('[AdminAuth] Admin user not found:', username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    const admin = result.rows[0];
    const validPassword = await compare(password, admin.password_hash);
    
    if (!validPassword) {
      console.log('[AdminAuth] Invalid password for admin:', username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    console.log('[AdminAuth] Password valid, creating token...');
    
    const secret = getJWTSecret();
    const token = await new SignJWT({ username: admin.username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    
    console.log('[AdminAuth] Token created successfully');
    
    try {
      await dbQuery(
        `UPDATE story_admin_users SET last_login = NOW() WHERE username = $1`,
        [admin.username]
      );
      console.log('[AdminAuth] Last login updated for:', admin.username);
    } catch (updateError) {
      console.error('[AdminAuth] Failed to update last login (non-critical):', updateError);
    }
    
    return NextResponse.json({ session: token });
  } catch (error) {
    console.error('[AdminAuth] Error:', error);
    return NextResponse.json(
      { error: 'Login failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(token, secret);
    
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ authenticated: true, username: payload.username });
  } catch (error) {
    console.error('[AdminAuth] Verification error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
