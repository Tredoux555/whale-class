// /api/story/recent-messages/route.ts
// GET last N messages for parent view

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getSupabase } from '@/lib/supabase-client';
import { decryptMessage } from '@/lib/message-encryption';
import { effectiveMessageType } from '@/lib/story/document-detect';

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

// Phase 7: Accept token from Authorization header or HttpOnly cookie
async function verifyToken(authHeader: string | null, cookieToken?: string | null): Promise<string | null> {
  const token = authHeader ? authHeader.replace('Bearer ', '') : (cookieToken || null);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload.username as string;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const username = await verifyToken(
      req.headers.get('authorization'),
      req.cookies.get('story-admin-token')?.value
    );
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
