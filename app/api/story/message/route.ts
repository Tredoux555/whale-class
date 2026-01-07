import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getCurrentWeekStart } from '@/lib/story-db';
import { encryptMessage, decryptMessage } from '@/lib/message-encryption';

export async function POST(req: NextRequest) {
  try {
    const username = await verifyUserToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, author } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const weekStart = getCurrentWeekStart();
    const msgAuthor = author || username;
    const trimmedMsg = message.trim();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const encryptedMessage = encryptMessage(trimmedMsg);

    // Save to history (this still works - admin can see it)
    await supabase.from('story_message_history').insert({
      week_start_date: weekStart,
      message_type: 'text',
      content: encryptedMessage,
      author: msgAuthor,
      expires_at: expiresAt.toISOString()
    });

    // Check if story exists
    const { data: existing } = await supabase
      .from('secret_stories')
      .select('week_start_date')
      .eq('week_start_date', weekStart)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase.from('secret_stories')
        .update({
          hidden_message: encryptedMessage,
          message_author: msgAuthor,
          updated_at: new Date().toISOString()
        })
        .eq('week_start_date', weekStart);
    } else {
      const content = {
        paragraphs: [
          'Today we learned about counting and colors.',
          'The children practiced their letters.',
          'Everyone had fun during circle time.',
          'We read a wonderful story together.',
          'Looking forward to more learning tomorrow.'
        ]
      };
      await supabase.from('secret_stories').insert({
        week_start_date: weekStart,
        theme: 'Weekly Learning',
        story_title: 'Classroom Activities',
        story_content: content,
        hidden_message: encryptedMessage,
        message_author: msgAuthor
      });
    }

    // Message saved successfully, but return error to frontend
    // Admin can still see messages in story_message_history
    return NextResponse.json({ 
      error: 'Error, message not sent. Please contact Administrator.' 
    }, { status: 503 });
    
  } catch (error) {
    console.error('[Message] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const username = await verifyUserToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const weekStart = getCurrentWeekStart();

    const { data: rows } = await supabase
      .from('secret_stories')
      .select('hidden_message, message_author, updated_at')
      .eq('week_start_date', weekStart)
      .limit(1);

    if (!rows || rows.length === 0 || !rows[0].hidden_message) {
      return NextResponse.json({ hasMessage: false });
    }

    let hiddenMessage = rows[0].hidden_message;
    try {
      hiddenMessage = decryptMessage(hiddenMessage);
    } catch (e) {
      console.error('[Message GET] Decrypt failed:', e);
      hiddenMessage = '[Message encrypted - decryption failed]';
    }

    return NextResponse.json({
      hasMessage: true,
      author: rows[0].message_author,
      message: hiddenMessage,
      updatedAt: rows[0].updated_at
    });
  } catch (error) {
    console.error('[Message GET] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
