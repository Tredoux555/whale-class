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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Query with correct column name: login_at (not login_time)
    const result = await dbQuery(
      `SELECT id, username, login_at, ip_address, user_agent
       FROM story_login_logs
       ORDER BY login_at DESC
       LIMIT $1`,
      [limit]
    );

    // Map to expected format for frontend
    const logs = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      login_time: row.login_at, // Frontend expects login_time
      ip_address: row.ip_address,
      user_agent: row.user_agent
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[LoginLogs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
