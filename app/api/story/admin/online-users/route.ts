import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
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

async function verifyAdminToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await verifyAdminToken(req.headers.get('authorization'));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get users who logged in within the last 10 minutes (considered "online")
    // Using login_at column (correct column name)
    const result = await dbQuery(`
      SELECT DISTINCT ON (username) 
        username,
        login_at as "lastLogin",
        EXTRACT(EPOCH FROM (NOW() - login_at))::integer as "secondsAgo"
      FROM story_login_logs
      WHERE login_at > NOW() - INTERVAL '10 minutes'
        AND logout_at IS NULL
      ORDER BY username, login_at DESC
    `);

    // Get total unique users
    const totalResult = await dbQuery(`
      SELECT COUNT(DISTINCT username) as count FROM story_login_logs
    `);

    const onlineUsers = result.rows.map(row => ({
      username: row.username,
      lastLogin: row.lastLogin,
      secondsAgo: row.secondsAgo
    }));

    return NextResponse.json({
      onlineUsers,
      onlineCount: onlineUsers.length,
      totalUsers: parseInt(totalResult.rows[0]?.count || '0')
    });
  } catch (error) {
    console.error('[OnlineUsers] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch online users' }, { status: 500 });
  }
}
