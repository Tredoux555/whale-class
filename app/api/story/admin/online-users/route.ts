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

    // First, mark stale sessions as offline (no activity in 5 minutes)
    await db.query(
      `UPDATE story_online_sessions 
       SET is_online = FALSE 
       WHERE last_seen_at < NOW() - INTERVAL '5 minutes' AND is_online = TRUE`
    );

    // Get online users
    const onlineResult = await db.query(
      `SELECT username, last_seen_at, created_at as session_started
       FROM story_online_sessions 
       WHERE is_online = TRUE
       ORDER BY last_seen_at DESC`
    );

    // Get total registered users
    const totalResult = await db.query(
      `SELECT COUNT(*) as count FROM story_users WHERE is_active = TRUE`
    );

    return NextResponse.json({
      onlineUsers: onlineResult.rows,
      onlineCount: onlineResult.rows.length,
      totalUsers: parseInt(totalResult.rows[0].count)
    });
  } catch (error) {
    console.error('Online users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch online users' },
      { status: 500 }
    );
  }
}
