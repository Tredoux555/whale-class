import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.STORY_ADMIN_JWT_SECRET || process.env.STORY_JWT_SECRET || 'fallback-admin-secret-key-change-in-production'
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get filter parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const messageType = searchParams.get('type'); // 'text', 'image', 'video', or null for all
    const showExpired = searchParams.get('showExpired') === 'true';

    // Build query
    let whereClause = '';
    const params: any[] = [limit, offset];
    let paramIndex = 3;

    if (messageType) {
      whereClause += ` WHERE message_type = $${paramIndex}`;
      params.push(messageType);
      paramIndex++;
    }

    if (!showExpired) {
      whereClause += (whereClause ? ' AND' : ' WHERE') + ' is_expired = FALSE';
    }

    // Fetch message history
    const result = await db.query(
      `SELECT 
        id,
        week_start_date,
        message_type,
        message_content,
        media_url,
        media_filename,
        author,
        created_at,
        expires_at,
        is_expired
       FROM story_message_history
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM story_message_history ${whereClause}`,
      params.slice(2)
    );

    // Get statistics
    const statsResult = await db.query(`
      SELECT 
        message_type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_expired = TRUE THEN 1 END) as expired_count
      FROM story_message_history
      GROUP BY message_type
    `);

    return NextResponse.json({
      messages: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
      statistics: statsResult.rows
    });
  } catch (error) {
    console.error('Error fetching message history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message history' },
      { status: 500 }
    );
  }
}





