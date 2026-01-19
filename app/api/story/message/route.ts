import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getCurrentWeekStart } from '@/lib/story-db';
import { encryptMessage, decryptMessage } from '@/lib/message-encryption';

// Helper to extract session token from auth header
function getSessionToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  return token.substring(0, 50); // Same format as stored in login_logs
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const username = await verifyUserToken(authHeader);
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionToken = getSessionToken(authHeader);

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

    // Get the login_log_id for this session
    let loginLogId: number | null = null;
    if (sessionToken) {
      const { data: loginLog } = await supabase
        .from('story_login_logs')
        .select('id')
        .eq('session_token', sessionToken)
        .order('login_time', { ascending: false })
        .limit(1)
        .single();
      
      if (loginLog) {
        loginLogId = loginLog.id;
      }
    }

    // Save to history for admin - now with session linking
    const { error: historyError } = await supabase.from('story_message_history').insert({
      week_start_date: weekStart,
      message_type: 'text',
      message_content: encryptedMessage,
      author: msgAuthor,
      expires_at: expiresAt.toISOString(),
      is_expired: false
    });

    if (historyError) {
      console.error('[Message] History insert error:', historyError);
      // Continue anyway - don't fail the whole request for logging issues
    }

    // Update secret_stories so message displays to users
    const { error: updateError } = await supabase
      .from('secret_stories')
      .update({
        hidden_message: encryptedMessage,
        message_author: msgAuthor,
        updated_at: new Date().toISOString()
      })
      .eq('week_start_date', weekStart);

    if (updateError) {
      console.error('[Message] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    
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
