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

    // Get login logs with pagination
    const logsResult = await db.query(
      `SELECT id, username, ip_address, user_agent, login_at, logout_at
       FROM story_login_logs 
       ORDER BY login_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM story_login_logs`
    );

    // Get login stats
    const statsResult = await db.query(
      `SELECT 
         COUNT(*) as total_logins,
         COUNT(DISTINCT username) as unique_users,
         COUNT(*) FILTER (WHERE login_at > NOW() - INTERVAL '24 hours') as last_24h,
         COUNT(*) FILTER (WHERE login_at > NOW() - INTERVAL '7 days') as last_7d
       FROM story_login_logs`
    );

    return NextResponse.json({
      logs: logsResult.rows,
      total: parseInt(countResult.rows[0].count),
      stats: statsResult.rows[0],
      pagination: {
        limit,
        offset,
        hasMore: offset + logsResult.rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Login logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch login logs' },
      { status: 500 }
    );
  }
}
