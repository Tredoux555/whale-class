import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';
import { decryptMessage } from '@/lib/message-encryption';

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

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const showExpired = url.searchParams.get('showExpired') === 'true';

    let query = `SELECT id, week_start_date, message_type, content, media_url, media_filename, author, created_at, is_expired 
                 FROM story_message_history 
                 WHERE 1=1`;
    const params: unknown[] = [];

    if (!showExpired) {
      query += ` AND is_expired = FALSE`;
    }

    query += ` ORDER BY created_at DESC LIMIT $1`;
    params.push(limit);

    const result = await dbQuery(query, params);

    const messages = result.rows.map(row => {
      let content = row.content;
      if (row.message_type === 'text' && content) {
        try {
          content = decryptMessage(content);
        } catch (e) {
          console.error('[MessageHistory] Failed to decrypt message:', e);
          content = '[Encrypted - decryption failed]';
        }
      }

      return {
        id: row.id,
        week_start_date: row.week_start_date,
        message_type: row.message_type,
        message_content: content,
        media_url: row.media_url,
        media_filename: row.media_filename,
        author: row.author,
        created_at: row.created_at,
        is_expired: row.is_expired
      };
    });

    const statsResult = await dbQuery(
      `SELECT message_type, COUNT(*) as count FROM story_message_history 
       WHERE is_expired = FALSE GROUP BY message_type`
    );

    const statistics = statsResult.rows.map(row => ({
      message_type: row.message_type,
      count: row.count
    }));

    return NextResponse.json({ messages, statistics });
  } catch (error) {
    console.error('[MessageHistory] Error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}
