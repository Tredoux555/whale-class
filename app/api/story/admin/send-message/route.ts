import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { encryptMessage } from '@/lib/message-encryption';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
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

async function verifyAdminToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, getJWTSecret());
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

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();
    const trimmedMessage = message.trim();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const encryptedMessage = encryptMessage(trimmedMessage);

    // Save to history
    await supabase.from('story_message_history').insert({
      week_start_date: weekStartDate,
      message_type: 'text',
      content: encryptedMessage,
      author: adminUsername,
      expires_at: expiresAt.toISOString(),
      is_from_admin: true
    });

    // Check if story exists
    const { data: existing } = await supabase
      .from('secret_stories')
      .select('week_start_date')
      .eq('week_start_date', weekStartDate)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase.from('secret_stories')
        .update({
          hidden_message: encryptedMessage,
          message_author: adminUsername,
          updated_at: new Date().toISOString()
        })
        .eq('week_start_date', weekStartDate);
    } else {
      const defaultContent = {
        paragraphs: [
          'Today we learned about counting and colors in class.',
          'The children practiced their letters and sounds.',
          'Everyone had fun during circle time.',
          'We read a wonderful story together.',
          'Looking forward to more learning tomorrow!'
        ]
      };

      await supabase.from('secret_stories').insert({
        week_start_date: weekStartDate,
        theme: 'Weekly Learning',
        story_title: 'Classroom Activities',
        story_content: defaultContent,
        hidden_message: encryptedMessage,
        message_author: adminUsername
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Note sent successfully',
      sentAt: new Date().toISOString(),
      weekStartDate
    });
  } catch (error) {
    console.error('[SendMessage] Error:', error);
    return NextResponse.json({ error: 'Failed to send note' }, { status: 500 });
  }
}
