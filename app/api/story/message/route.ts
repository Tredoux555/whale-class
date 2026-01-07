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

    // Save to history ONLY (admin can see this)
    // Do NOT save to secret_stories - so it won't display on frontend
    await supabase.from('story_message_history').insert({
      week_start_date: weekStart,
      message_type: 'text',
      content: encryptedMessage,
      author: msgAuthor,
      expires_at: expiresAt.toISOString()
    });

    // Return error to frontend - message saved for admin but not visible to users
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
