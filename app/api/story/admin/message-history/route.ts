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

    console.log('[MessageHistory] Found', rows?.length || 0, 'messages');

    const messages = (rows || []).map(row => {
      // Handle both column names: content OR message_content
      let content = row.content || row.message_content || null;
      
      if (row.message_type === 'text' && content) {
        try {
          content = decryptMessage(content);
        } catch (e) {
          console.error('[MessageHistory] Decrypt failed:', e);
          // Return raw content if decryption fails (might not be encrypted)
          content = row.content || row.message_content || '[Content unavailable]';
        }
      }

      return {
        id: row.id,
        week_start_date: row.week_start_date,
        message_type: row.message_type,
        message_content: content,
        media_url: row.media_url,
        media_filename: row.media_filename,
        author: row.author,
        created_at: row.created_at,
        is_expired: row.is_expired
      };
    });

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
      messages, 
      statistics
    });
  } catch (error) {
    console.error('[MessageHistory] Error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}
