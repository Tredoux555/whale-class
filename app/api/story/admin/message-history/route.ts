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

export async function GET(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const showExpired = url.searchParams.get('showExpired') === 'true';

    // Query - use * to get all columns and handle column name variations
    let query = supabase
      .from('story_message_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!showExpired) {
      query = query.eq('is_expired', false);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[MessageHistory] Query error:', error);
      throw error;
    }

    const messages = (rows || []).map(row => {
      // Handle both column names: content OR message_content
      let content = row.content || row.message_content || null;
      
      // Decrypt ALL message content — text messages AND media captions are encrypted
      if (content) {
        try {
          content = decryptMessage(content);
        } catch (e) {
          console.error('[MessageHistory] Decrypt failed for', row.message_type, ':', e);
          // Return raw content if decryption fails (might be plaintext from before encryption)
          content = row.content || row.message_content || '';
        }
      }

      return {
        id: row.id,
        week_start_date: row.week_start_date,
        message_type: effectiveMessageType(row.message_type, row.media_filename),
        message_content: content,
        media_url: row.media_url,
        media_filename: row.media_filename,
        author: row.author,
        created_at: row.created_at,
        is_expired: row.is_expired,
        is_from_admin: !!row.is_from_admin,
      };
    });

    // Read receipts — for admin messages, collect which Story users have
    // opened them (and when). Non-admin messages get an empty list.
    const adminIds = messages.filter(m => m.is_from_admin).map(m => m.id);
    const readByMessage = new Map<number, Array<{ username: string; read_at: string }>>();
    if (adminIds.length > 0) {
      const { data: readRows } = await supabase
        .from('story_message_reads')
        .select('message_id, username, read_at')
        .in('message_id', adminIds);
      for (const r of ((readRows || []) as Array<{ message_id: number; username: string; read_at: string }>)) {
        const list = readByMessage.get(r.message_id) || [];
        list.push({ username: r.username, read_at: r.read_at });
        readByMessage.set(r.message_id, list);
      }
    }
    const messagesWithReads = messages.map(m => ({
      ...m,
      read_by: m.is_from_admin ? (readByMessage.get(m.id) || []) : [],
    }));

    // Get stats
    const { data: statsRows } = await supabase
      .from('story_message_history')
      .select('message_type')
      .eq('is_expired', false);

    const statsCounts: Record<string, number> = {};
    (statsRows || []).forEach(r => {
      statsCounts[r.message_type] = (statsCounts[r.message_type] || 0) + 1;
    });

    const statistics = Object.entries(statsCounts).map(([message_type, count]) => ({
      message_type,
      count
    }));

    return NextResponse.json({
      messages: messagesWithReads,
      statistics
    });
  } catch (error) {
    console.error('[MessageHistory] Error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}
