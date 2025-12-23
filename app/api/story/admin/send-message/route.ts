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

function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

// 24-hour expiration
function getExpirationDate(): Date {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  return expires;
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

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const weekStartDate = getCurrentWeekStart();
    const trimmedMessage = message.trim();
    const expiresAt = getExpirationDate();

    console.log('[AdminSendMessage] Sending message for week:', weekStartDate);
    console.log('[AdminSendMessage] Message:', trimmedMessage);

    // Save to message history
    await dbQuery(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, content, author, expires_at, is_from_admin)
       VALUES ($1, 'text', $2, $3, $4, TRUE)`,
      [weekStartDate, trimmedMessage, adminUsername, expiresAt]
    );

    // Check if story exists for this week
    const storyExists = await dbQuery(
      'SELECT id FROM secret_stories WHERE week_start_date = $1',
      [weekStartDate]
    );

    console.log('[AdminSendMessage] Story exists:', storyExists.rows.length > 0);

    if (storyExists.rows.length > 0) {
      // Update existing story with hidden message
      await dbQuery(
        `UPDATE secret_stories 
         SET hidden_message = $1, message_author = $2, updated_at = NOW()
         WHERE week_start_date = $3`,
        [trimmedMessage, adminUsername, weekStartDate]
      );
      console.log('[AdminSendMessage] Updated existing story');
    } else {
      // Create new story with the message
      const defaultContent = JSON.stringify({
        paragraphs: [
          'Today we learned about counting and colors.',
          'The children practiced their letters and sounds.',
          'Everyone had fun during circle time activities.',
          'We read a wonderful story about friendship.',
          'Looking forward to more learning tomorrow.'
        ]
      });

      await dbQuery(
        `INSERT INTO secret_stories 
         (week_start_date, theme, story_title, story_content, hidden_message, message_author)
         VALUES ($1, 'Weekly Learning', 'Classroom Activities', $2, $3, $4)`,
        [weekStartDate, defaultContent, trimmedMessage, adminUsername]
      );
      console.log('[AdminSendMessage] Created new story with message');
    }

    // Verify the message was saved
    const verify = await dbQuery(
      'SELECT hidden_message, message_author FROM secret_stories WHERE week_start_date = $1',
      [weekStartDate]
    );
    console.log('[AdminSendMessage] Verification:', verify.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Note sent successfully',
      sentAt: new Date().toISOString(),
      weekStartDate
    });
  } catch (error) {
    console.error('[AdminSendMessage] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to send note', details: message },
      { status: 500 }
    );
  }
}
