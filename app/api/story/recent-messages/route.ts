// /api/story/recent-messages/route.ts
// GET last N messages for parent view

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { decryptMessage } from '@/lib/message-encryption';

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

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload.username as string;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const username = await verifyToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5', 10), 20);

    const supabase = getSupabase();

    // Get recent non-expired messages from admins/teachers
    const { data: rows, error } = await supabase
      .from('story_message_history')
      .select('*')
      .eq('is_expired', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[RecentMessages] Query error:', error);
      throw error;
    }

    const messages = (rows || []).map(row => {
      let content = row.content || row.message_content || null;
      
      // Decrypt text messages
      if (row.message_type === 'text' && content) {
        try {
          content = decryptMessage(content);
        } catch {
          content = row.content || row.message_content || '';
        }
      }

      return {
        id: row.id,
        type: row.message_type,
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
