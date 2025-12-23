import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { compare } from 'bcryptjs';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    console.log('[AdminAuth] DATABASE_URL exists:', !!connectionString);
    
    if (!connectionString) {
      throw new Error('DATABASE_URL not set');
    }
    
    pool = new Pool({
      connectionString,
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
  console.log('[AdminAuth] STORY_JWT_SECRET exists:', !!secret);
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
      INSERT INTO story_admin_users (username, password_hash)
      VALUES ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO')
      ON CONFLICT (username) DO NOTHING
    `);
    
    return true;
  } catch (e) {
    console.error('[AdminAuth] ensureAdminTable error:', e);
    return false;
  }
}

// POST - Admin Login
export async function POST(req: NextRequest) {
  console.log('[AdminAuth] ========== POST login request ==========');
  
  // Check env vars
  console.log('[AdminAuth] Checking environment variables...');
  console.log('[AdminAuth] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'MISSING');
  console.log('[AdminAuth] STORY_JWT_SECRET:', process.env.STORY_JWT_SECRET ? 'SET' : 'MISSING');
  
  if (!process.env.DATABASE_URL) {
    console.error('[AdminAuth] DATABASE_URL is missing!');
    return NextResponse.json({ error: 'Database not configured', details: 'DATABASE_URL missing' }, { status: 500 });
  }
  
  if (!process.env.STORY_JWT_SECRET) {
    console.error('[AdminAuth] STORY_JWT_SECRET is missing!');
    return NextResponse.json({ error: 'Auth not configured', details: 'STORY_JWT_SECRET missing' }, { status: 500 });
  }

  try {
    // Parse body
    console.log('[AdminAuth] Parsing request body...');
    let body;
    try {
      body = await req.json();
      console.log('[AdminAuth] Body parsed:', { username: body?.username, hasPassword: !!body?.password });
    } catch (parseError) {
      console.error('[AdminAuth] Body parse error:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { username, password } = body;

    if (!username || !password) {
      console.log('[AdminAuth] Missing credentials - username:', !!username, 'password:', !!password);
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Ensure table exists
    console.log('[AdminAuth] Ensuring admin table exists...');
    await ensureAdminTable();
    console.log('[AdminAuth] Admin table ready');

    // Find admin
    console.log('[AdminAuth] Looking up user:', username);
    const result = await dbQuery(
      'SELECT id, username, password_hash FROM story_admin_users WHERE username = $1',
      [username]
    );
    console.log('[AdminAuth] Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('[AdminAuth] User not found:', username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const admin = result.rows[0];
    console.log('[AdminAuth] Found user:', admin.username);
    console.log('[AdminAuth] Password hash exists:', !!admin.password_hash);
    console.log('[AdminAuth] Password hash length:', admin.password_hash?.length);

    // Verify password
    console.log('[AdminAuth] Comparing password...');
    let validPassword = false;
    try {
      validPassword = await compare(password, admin.password_hash);
      console.log('[AdminAuth] Password valid:', validPassword);
    } catch (compareError) {
      console.error('[AdminAuth] Password compare error:', compareError);
      return NextResponse.json({ error: 'Password verification failed', details: String(compareError) }, { status: 500 });
    }
    
    if (!validPassword) {
      console.log('[AdminAuth] Invalid password for user:', username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last login
    console.log('[AdminAuth] Updating last login...');
    await dbQuery('UPDATE story_admin_users SET last_login = NOW() WHERE id = $1', [admin.id]);

    // Create JWT
    console.log('[AdminAuth] Creating JWT token...');
    const secret = getJWTSecret();
    const token = await new SignJWT({ 
      username: admin.username, 
      role: 'admin' 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secret);

    console.log('[AdminAuth] Token created successfully, length:', token.length);
    return NextResponse.json({ session: token });
    
  } catch (error) {
    console.error('[AdminAuth] ========== CAUGHT ERROR ==========');
    console.error('[AdminAuth] Error type:', typeof error);
    console.error('[AdminAuth] Error name:', error instanceof Error ? error.name : 'unknown');
    console.error('[AdminAuth] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[AdminAuth] Error stack:', error instanceof Error ? error.stack : 'no stack');
    return NextResponse.json({ 
      error: 'Login failed', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// GET - Verify Admin Session
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ 
      valid: true, 
      username: payload.username,
      role: 'admin'
    });
  } catch (error) {
    console.error('[AdminAuth] Verify error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
