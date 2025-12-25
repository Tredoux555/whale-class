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

async function verifyAdminToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== 'admin') return null;
    return payload.username as string;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await dbQuery(
      `SELECT id, filename, file_size, file_url, uploaded_by, uploaded_at 
       FROM vault_files 
       WHERE deleted_at IS NULL
       ORDER BY uploaded_at DESC`
    );

    const files = result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      file_size: row.file_size,
      file_url: row.file_url,
      uploaded_by: row.uploaded_by,
      uploaded_at: row.uploaded_at
    }));

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await dbQuery(
      `INSERT INTO vault_audit_log (action, admin_username, ip_address, success)
       VALUES ($1, $2, $3, TRUE)`,
      ['list_files', adminUsername, ipAddress]
    );

    return NextResponse.json({ files });

  } catch (error) {
    console.error('[Vault List] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

