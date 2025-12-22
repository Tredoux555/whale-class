import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/story/db';
import { extractToken, verifyAdminToken } from '@/lib/story/auth';
import { MessageHistory } from '@/lib/story/types';

interface Statistics {
  message_type: string;
  count: string;
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyAdminToken(token);

    // Get query params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // text, image, video
    const showExpired = searchParams.get('showExpired') === 'true';

    // Build query
    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (type) {
      whereClause += ` AND message_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (!showExpired) {
      whereClause += ` AND is_expired = FALSE`;
    }

    // Get messages
    const result = await query<MessageHistory>(
      `SELECT id, week_start_date, message_type, content as message_content, media_url, 
              media_filename, author, created_at, expires_at, is_expired
       FROM story_message_history
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM story_message_history ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get statistics
    const statsResult = await query<Statistics>(
      `SELECT message_type, COUNT(*) as count 
       FROM story_message_history 
       GROUP BY message_type`
    );

    return NextResponse.json({
      messages: result.rows,
      total,
      limit,
      offset,
      statistics: statsResult.rows
    });
  } catch (error) {
    console.error('Message history error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
