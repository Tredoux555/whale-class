import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';
import { encryptMessage } from '@/lib/message-encryption';

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

async function verifyAdminToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) {
    console.error('[SendMessage] No auth header provided');
    return null;
  }
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    
    console.log('[SendMessage] Token payload:', payload);
    
    if (payload.role !== 'admin') {
      console.error('[SendMessage] User is not admin. Role:', payload.role);
      return null;
    }
    
    return payload.username as string;
  } catch (error) {
    console.error('[SendMessage] Token verification failed:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    
    if (!adminUsername) {
      console.log('[SendMessage] Authorization failed');
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' }, 
        { status: 401 }
      );
    }

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' }, 
        { status: 400 }
      );
    }

    const weekStartDate = getCurrentWeekStart();
    const trimmedMessage = message.trim();
    const expiresAt = getExpirationDate();

    console.log('[SendMessage] Sending message for week:', weekStartDate);
    console.log('[SendMessage] Author:', adminUsername);

    const encryptedMessage = encryptMessage(trimmedMessage);

    const historyResult = await dbQuery(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, content, author, expires_at, is_from_admin)
       VALUES ($1, 'text', $2, $3, $4, TRUE)
       RETURNING id`,
      [weekStartDate, encryptedMessage, adminUsername, expiresAt]
    );
    console.log('[SendMessage] Message history entry created:', historyResult.rows[0]?.id);

    const storyExists = await dbQuery(
      'SELECT id FROM secret_stories WHERE week_start_date = $1',
      [weekStartDate]
    );
    console.log('[SendMessage] Story exists:', storyExists.rows.length > 0);

    if (storyExists.rows.length > 0) {
      const updateResult = await dbQuery(
        `UPDATE secret_stories 
         SET hidden_message = $1, message_author = $2, updated_at = NOW()
         WHERE week_start_date = $3
         RETURNING hidden_message, message_author, updated_at`,
        [encryptedMessage, adminUsername, weekStartDate]
      );
      console.log('[SendMessage] Updated existing story:', updateResult.rows[0]);
    } else {
      const defaultContent = JSON.stringify({
        paragraphs: [
          'Today we learned about counting and colors in class.',
          'The children practiced their letters and sounds with great enthusiasm.',
          'Everyone had fun during our interactive circle time activities.',
          'We read a wonderful story about friendship and collaboration.',
          'Looking forward to more exciting learning adventures tomorrow!'
        ]
      });

      const insertResult = await dbQuery(
        `INSERT INTO secret_stories 
         (week_start_date, theme, story_title, story_content, hidden_message, message_author)
         VALUES ($1, 'Weekly Learning', 'Classroom Activities', $2, $3, $4)
         RETURNING id, hidden_message`,
        [weekStartDate, defaultContent, encryptedMessage, adminUsername]
      );
      console.log('[SendMessage] Created new story:', insertResult.rows[0]);
    }

    const verify = await dbQuery(
      'SELECT hidden_message, message_author, updated_at FROM secret_stories WHERE week_start_date = $1',
      [weekStartDate]
    );
    console.log('[SendMessage] Verification - Story data saved');

    return NextResponse.json({
      success: true,
      message: 'Note sent successfully',
      sentAt: new Date().toISOString(),
      weekStartDate,
      messageId: historyResult.rows[0]?.id
    });
  } catch (error) {
    console.error('[SendMessage] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to send note', details: message },
      { status: 500 }
    );
  }
}
