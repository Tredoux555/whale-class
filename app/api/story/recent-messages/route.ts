// /api/story/recent-messages/route.ts
// GET last N messages for parent view

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { decryptMessage } from '@/lib/message-encryption';
import { effectiveMessageType } from '@/lib/story/document-detect';
import { verifyUserTokenFromRequest } from '@/lib/story-db';

export async function GET(req: NextRequest) {
  try {
    // 🚨 Session 113 V2 F-1.2 — canonical role-gated user-token verifier.
    // Replaces a local verifyToken that wasn't role-gated and read the
    // wrong cookie. verifyUserTokenFromRequest reads the Authorization
    // header first, then the new story-auth cookie; rejects admin tokens.
    const username = await verifyUserTokenFromRequest(req);
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5', 10), 20);

    const supabase = getSupabase();

    // Get recent non-expired messages from admins/teachers.
    //
    // 🚨 Session 113 V2 Story audit F-3.3 — defense in depth with an
    // expires_at check on top of the is_expired flag. is_expired is set
    // by a separate cron path; if the cron is lagging, expired messages
    // could appear in this endpoint. Belt-and-braces.
    const nowIso = new Date().toISOString();
    const { data: rows, error } = await supabase
      .from('story_message_history')
      .select('*')
      .eq('is_expired', false)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[RecentMessages] Query error:', error);
      throw error;
    }

    const messages = (rows || []).map(row => {
      let content = row.content || row.message_content || null;

      // Decrypt message content (text messages AND media captions are encrypted)
      if (content) {
        try {
          content = decryptMessage(content);
        } catch {
          // If decryption fails, use raw content (may be plaintext)
          content = row.content || row.message_content || '';
        }
      }

      return {
        id: row.id,
        type: effectiveMessageType(row.message_type, row.media_filename),
        content,
        mediaUrl: row.media_url,
        mediaFilename: row.media_filename,
        author: row.author,
        createdAt: row.created_at
      };
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[RecentMessages] Error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}
