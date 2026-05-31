import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserTokenFromRequest } from '@/lib/story-db';
import { decryptMessage } from '@/lib/message-encryption';
import { effectiveMessageType } from '@/lib/story/document-detect';

export async function GET(req: NextRequest) {
  try {
    // 🚨 Session 113 V2 F-1.2 — header first, story-auth cookie fallback.
    const username = await verifyUserTokenFromRequest(req);
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Session 140 — admin↔parent alignment fix (D-1, D-2). Previously this
    // hard-filtered to the CURRENT week (week_start_date = this Monday) AND
    // dropped anything past its 24h expiry. That made admin-sent photos/videos
    // vanish from the parent the next Monday or after a day, while the admin
    // (and the never-expiring hidden text note) still showed them — i.e. "the
    // story admin isn't reflecting on the story page." Now show recent media
    // regardless of week/expiry, bounded to the latest 100 within 60 days so it
    // can't grow unbounded.
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabase
      .from('story_message_history')
      .select('id, message_type, message_content, media_url, media_filename, author, created_at, expires_at')
      .in('message_type', ['image', 'video', 'audio', 'document'])
      .gte('created_at', sixtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[CurrentMedia] Query error:', error);
      return NextResponse.json({ error: 'Failed to load media' }, { status: 500 });
    }

    // No expiry/week gating — see note above (admin↔parent alignment).
    const media = (rows || [])
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
          type: effectiveMessageType(row.message_type, row.media_filename),
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
