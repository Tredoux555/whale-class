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

    // Get pagination parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch login logs
    const result = await db.query(
      `SELECT 
        id,
        username,
        login_time,
        session_id,
        ip_address,
        user_agent
       FROM story_login_logs
       ORDER BY login_time DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM story_login_logs'
    );

    return NextResponse.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching login logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}




