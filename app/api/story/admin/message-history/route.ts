import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/story-auth';

export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    
    if (!payload || payload.type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // 'text', 'image', 'video', or null for all
    const week = searchParams.get('week'); // specific week or null for all

    // Build query
    let query = `
      SELECT id, week_start_date, author, message_type, content, 
             media_url, media_filename, media_mime_type, thumbnail_url,
             is_from_admin, is_expired, expires_at, created_at
      FROM story_message_history 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND message_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (week) {
      query += ` AND week_start_date = $${paramIndex}`;
      params.push(week);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const messagesResult = await db.query(query, params);

    // Get total count with same filters
    let countQuery = `SELECT COUNT(*) as count FROM story_message_history WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (type) {
      countQuery += ` AND message_type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (week) {
      countQuery += ` AND week_start_date = $${countParamIndex}`;
      countParams.push(week);
    }

    const countResult = await db.query(countQuery, countParams);

    // Get stats
    const statsResult = await db.query(
      `SELECT 
         COUNT(*) as total_messages,
         COUNT(*) FILTER (WHERE message_type = 'text') as text_count,
         COUNT(*) FILTER (WHERE message_type = 'image') as image_count,
         COUNT(*) FILTER (WHERE message_type = 'video') as video_count,
         COUNT(DISTINCT author) as unique_authors,
         COUNT(DISTINCT week_start_date) as weeks_with_messages
       FROM story_message_history`
    );

    // Get available weeks
    const weeksResult = await db.query(
      `SELECT DISTINCT week_start_date 
       FROM story_message_history 
       ORDER BY week_start_date DESC`
    );

    return NextResponse.json({
      messages: messagesResult.rows.map(row => ({
        id: row.id,
        weekStartDate: row.week_start_date,
        author: row.author,
        type: row.message_type,
        content: row.content,
        mediaUrl: row.media_url,
        mediaFilename: row.media_filename,
        mediaMimeType: row.media_mime_type,
        thumbnailUrl: row.thumbnail_url,
        isFromAdmin: row.is_from_admin,
        isExpired: row.is_expired,
        expiresAt: row.expires_at,
        createdAt: row.created_at
      })),
      total: parseInt(countResult.rows[0].count),
      stats: statsResult.rows[0],
      availableWeeks: weeksResult.rows.map(r => r.week_start_date),
      pagination: {
        limit,
        offset,
        hasMore: offset + messagesResult.rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Message history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message history' },
      { status: 500 }
    );
  }
}
