import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/story/db';
import { extractToken, verifyUserToken } from '@/lib/story/auth';
import { getCurrentWeekStart } from '@/lib/story/week';
import { MediaItem } from '@/lib/story/types';

interface MediaRow {
  id: number;
  message_type: 'image' | 'video' | 'audio';
  media_url: string;
  media_filename: string | null;
  author: string;
  created_at: string;
  expires_at: string | null;
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyUserToken(token);
    const weekStartDate = getCurrentWeekStart();

    // Get non-expired media for current week (images, videos, AND audio)
    const result = await query<MediaRow>(
      `SELECT id, message_type, media_url, media_filename, author, created_at, expires_at
       FROM story_message_history
       WHERE week_start_date = $1
         AND message_type IN ('image', 'video', 'audio')
         AND is_expired = FALSE
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [weekStartDate]
    );

    const media: MediaItem[] = result.rows.map(row => ({
      id: row.id,
      type: row.message_type,
      url: row.media_url,
      filename: row.media_filename,
      author: row.author,
      created_at: row.created_at,
      expires_at: row.expires_at
    }));

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Media fetch error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
