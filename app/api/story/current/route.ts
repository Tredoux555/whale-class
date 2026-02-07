import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getSupabase } from '@/lib/supabase-client';
import { decryptMessage } from '@/lib/message-encryption';

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
    const { payload } = await jwtVerify(token, getJWTSecret());
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

    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();

    const { data: rows, error } = await supabase
      .from('secret_stories')
      .select('story_title, story_content, hidden_message, message_author, updated_at')
      .eq('week_start_date', weekStartDate)
      .limit(1);

    if (error) throw error;

    let story;
    let updatedAt = null;

    if (!rows || rows.length === 0) {
      const defaultStory = getDefaultStory();
      
      await supabase.from('secret_stories').upsert({
        week_start_date: weekStartDate,
        theme: defaultStory.theme,
        story_title: defaultStory.title,
        story_content: defaultStory.content
      }, { onConflict: 'week_start_date' });

      story = {
        title: defaultStory.title,
        paragraphs: defaultStory.content.paragraphs,
        hiddenMessage: null,
        messageAuthor: null
      };
    } else {
      const row = rows[0];
      const content = typeof row.story_content === 'string' 
        ? JSON.parse(row.story_content)
        : row.story_content;

      let hiddenMessage = row.hidden_message;
      if (hiddenMessage) {
        try {
          hiddenMessage = decryptMessage(hiddenMessage);
        } catch (e) {
          console.error('[Story] Decrypt failed:', e);
          hiddenMessage = '[Message encrypted - decryption failed]';
        }
      }

      story = {
        title: row.story_title,
        paragraphs: content?.paragraphs || [],
        hiddenMessage: hiddenMessage,
        messageAuthor: row.message_author
      };
      updatedAt = row.updated_at;
    }

    return NextResponse.json({ username, story, updatedAt });
  } catch (error) {
    console.error('[Current Story] Error:', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
