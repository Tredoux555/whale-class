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

    // Media has a 24h TTL: it shows until `expires_at`, then disappears and is
    // hard-deleted by the expire-media sweep (lib/story/media-retention.ts).
    //
    // The earlier Session 140 fix dropped the WEEK gate (week_start_date =
    // this Monday) because that made admin photos vanish the next Monday while
    // the never-expiring hidden text note lingered — an admin↔parent mismatch.
    // We keep the week gate gone, but DO honour the 24h expiry, applied
    // symmetrically here, so media disappears at 24h for everyone at once (no
    // mismatch). Null expiry (legacy rows) still shows. Bounded to latest 100.
    const nowIso = new Date().toISOString();

    const { data: rows, error } = await supabase
      .from('story_message_history')
      .select('id, message_type, message_content, media_url, media_filename, author, created_at, expires_at')
      .in('message_type', ['image', 'video', 'audio', 'document'])
      .eq('is_expired', false)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[CurrentMedia] Query error:', error);
      return NextResponse.json({ error: 'Failed to load media' }, { status: 500 });
    }

    // 24h expiry gated in the query above; no week gating (admin↔parent align).
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
