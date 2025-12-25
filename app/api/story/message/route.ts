import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';
import { encryptMessage, decryptMessage } from '@/lib/message-encryption';

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

function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

function getExpirationDate(): Date {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  return expires;
}

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload.username as string;
  } catch {
    return null;
  }
}

async function ensureTables() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS secret_stories (
      id SERIAL PRIMARY KEY,
      week_start_date DATE NOT NULL UNIQUE,
      theme VARCHAR(255) NOT NULL,
      story_title VARCHAR(255) NOT NULL,
      story_content JSONB NOT NULL,
      hidden_message TEXT,
      message_author VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS story_message_history (
      id SERIAL PRIMARY KEY,
      week_start_date DATE NOT NULL,
      message_type VARCHAR(20) NOT NULL,
      content TEXT,
      media_url TEXT,
      media_filename TEXT,
      author VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP,
      is_expired BOOLEAN DEFAULT FALSE
    )
  `);
}

export async function POST(req: NextRequest) {
  try {
    const username = await verifyToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, author } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const weekStart = getCurrentWeekStart();
    const msgAuthor = author || username;
    const trimmedMsg = message.trim();
    const expiresAt = getExpirationDate();

    const encryptedMessage = encryptMessage(trimmedMsg);

    await ensureTables();

    await dbQuery(
      `INSERT INTO story_message_history (week_start_date, message_type, content, author, expires_at)
       VALUES ($1, 'text', $2, $3, $4)`,
      [weekStart, encryptedMessage, msgAuthor, expiresAt]
    );

    const storyCheck = await dbQuery(
      'SELECT week_start_date FROM secret_stories WHERE week_start_date = $1',
      [weekStart]
    );

    if (storyCheck.rows.length > 0) {
      await dbQuery(
        `UPDATE secret_stories SET hidden_message = $1, message_author = $2, updated_at = NOW() WHERE week_start_date = $3`,
        [encryptedMessage, msgAuthor, weekStart]
      );
    } else {
      const content = JSON.stringify({
        paragraphs: [
          'Today we learned about counting and colors.',
          'The children practiced their letters.',
          'Everyone had fun during circle time.',
          'We read a wonderful story together.',
          'Looking forward to more learning tomorrow.'
        ]
      });
      await dbQuery(
        `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content, hidden_message, message_author)
         VALUES ($1, 'Weekly Learning', 'Classroom Activities', $2, $3, $4)`,
        [weekStart, content, encryptedMessage, msgAuthor]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Message] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const username = await verifyToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekStart = getCurrentWeekStart();

    const result = await dbQuery(
      'SELECT hidden_message, message_author, updated_at FROM secret_stories WHERE week_start_date = $1',
      [weekStart]
    );

    if (result.rows.length === 0 || !result.rows[0].hidden_message) {
      return NextResponse.json({ hasMessage: false });
    }

    let hiddenMessage = result.rows[0].hidden_message;
    try {
      hiddenMessage = decryptMessage(hiddenMessage);
    } catch (e) {
      console.error('[Message GET] Failed to decrypt:', e);
      hiddenMessage = '[Message encrypted - decryption failed]';
    }

    return NextResponse.json({
      hasMessage: true,
      author: result.rows[0].message_author,
      message: hiddenMessage,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('[Message GET] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
