import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getSupabase } from '@/lib/supabase-client';
import { encryptMessage } from '@/lib/message-encryption';

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

function getSessionToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  return token.substring(0, 50);
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

async function getAdminLoginLogId(supabase: any, sessionToken: string | null): Promise<number | null> {
  if (!sessionToken) return null;
  try {
    const { data } = await supabase
      .from('story_admin_login_logs')
      .select('id')
      .eq('session_token', sessionToken)
      .order('login_time', { ascending: false })
      .limit(1)
      .single();
    return data?.id || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const adminUsername = await verifyAdminToken(authHeader);
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionToken = getSessionToken(authHeader);

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

    // Get admin login log ID for session linking
    const loginLogId = await getAdminLoginLogId(supabase, sessionToken);

    // Save to history with session linking
    await supabase.from('story_message_history').insert({
      week_start_date: weekStartDate,
      message_type: 'text',
      message_content: encryptedMessage,
      author: adminUsername,
      expires_at: expiresAt.toISOString(),
      is_expired: false
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
