import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractToken, getCurrentWeekStart } from '@/lib/story-auth';

export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Update last seen
    await db.query(
      `UPDATE story_online_sessions SET last_seen_at = NOW() WHERE session_token = $1`,
      [token]
    );

    const weekStartDate = getCurrentWeekStart();

    // First, mark expired items
    await db.query(
      `UPDATE story_message_history 
       SET is_expired = TRUE 
       WHERE expires_at < NOW() AND is_expired = FALSE`
    );

    // Get all non-expired media for this week
    const result = await db.query(
      `SELECT id, author, message_type, media_url, media_filename, 
              media_mime_type, thumbnail_url, created_at, is_from_admin
       FROM story_message_history 
       WHERE week_start_date = $1 
         AND message_type IN ('image', 'video')
         AND is_expired = FALSE
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [weekStartDate]
    );

    return NextResponse.json({
      media: result.rows.map(row => ({
        id: row.id,
        author: row.author,
        type: row.message_type,
        url: row.media_url,
        filename: row.media_filename,
        mimeType: row.media_mime_type,
        thumbnailUrl: row.thumbnail_url,
        createdAt: row.created_at,
        isFromAdmin: row.is_from_admin
      }))
    });
  } catch (error) {
    console.error('Media fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}
