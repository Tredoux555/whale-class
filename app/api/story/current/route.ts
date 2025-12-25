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

function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
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

function getDefaultStory() {
  return {
    theme: 'Weekly Learning',
    title: 'Classroom Activities',
    content: {
      paragraphs: [
        'Today we learned about counting and colors.',
        'The children practiced their letters.',
        'Everyone had fun during circle time.',
        'We read a wonderful story together.',
        'Looking forward to more learning tomorrow.'
      ]
    }
  };
}

export async function GET(req: NextRequest) {
  try {
    const username = await verifyToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekStartDate = getCurrentWeekStart();

    const result = await dbQuery(
      `SELECT story_title, story_content, hidden_message, message_author, updated_at 
       FROM secret_stories 
       WHERE week_start_date = $1`,
      [weekStartDate]
    );

    let story;
    let updatedAt = null;

    if (result.rows.length === 0) {
      const defaultStory = getDefaultStory();
      await dbQuery(
        `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (week_start_date) DO NOTHING`,
        [weekStartDate, defaultStory.theme, defaultStory.title, JSON.stringify(defaultStory.content)]
      );

      story = {
        title: defaultStory.title,
        paragraphs: defaultStory.content.paragraphs,
        hiddenMessage: null,
        messageAuthor: null
      };
    } else {
      const row = result.rows[0];
      const content = typeof row.story_content === 'string' 
        ? JSON.parse(row.story_content)
        : row.story_content;

      let hiddenMessage = row.hidden_message;
      if (hiddenMessage) {
        try {
          hiddenMessage = decryptMessage(hiddenMessage);
        } catch (e) {
          console.error('[Story] Failed to decrypt message:', e);
          hiddenMessage = '[Message encrypted - decryption failed]';
        }
      }

      story = {
        title: row.story_title,
        paragraphs: content.paragraphs || [],
        hiddenMessage: hiddenMessage,
        messageAuthor: row.message_author
      };
      updatedAt = row.updated_at;
    }

    return NextResponse.json({
      username,
      story,
      updatedAt
    });
  } catch (error) {
    console.error('[Current Story] Error:', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
