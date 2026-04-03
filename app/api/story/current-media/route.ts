import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getCurrentWeekStart } from '@/lib/story-db';
import { decryptMessage } from '@/lib/message-encryption';

export async function GET(req: NextRequest) {
  try {
    const username = await verifyUserToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();

    const { data: rows, error } = await supabase
      .from('story_message_history')
      .select('id, message_type, message_content, media_url, media_filename, author, created_at, expires_at')
      .eq('week_start_date', weekStartDate)
      .in('message_type', ['image', 'video', 'audio'])
      .eq('is_expired', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CurrentMedia] Query error:', error);
      return NextResponse.json({ error: 'Failed to load media' }, { status: 500 });
    }

    // Filter out expired items
    const now = new Date();
    const media = (rows || [])
      .filter(row => !row.expires_at || new Date(row.expires_at) > now)
      .map(row => {
        // Decrypt caption if present
        let caption = row.message_content || null;
        if (caption) {
          try {
            caption = decryptMessage(caption);
          } catch {
            // Fallback to raw content if decryption fails
            caption = row.message_content || '';
          }
        }

        return {
          id: row.id,
          type: row.message_type,
          url: row.media_url,
          filename: row.media_filename,
          caption,
          author: row.author,
          created_at: row.created_at,
          expires_at: row.expires_at
        };
      });

    return NextResponse.json({ media });
  } catch (error) {
    console.error('[CurrentMedia] Error:', error);
    return NextResponse.json({ error: 'Failed to load media' }, { status: 500 });
  }
}
