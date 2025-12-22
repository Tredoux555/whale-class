import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/story/db';
import { extractToken, verifyAdminToken } from '@/lib/story/auth';

interface OnlineUserRow {
  username: string;
  last_login: string;
  seconds_ago: number;
}

const ONLINE_THRESHOLD_MINUTES = 10;

export async function GET(req: NextRequest) {
  try {
    // Verify admin
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyAdminToken(token);

    // Get users who logged in within threshold (handle both login_time and login_at columns)
    const result = await query<OnlineUserRow>(
      `SELECT 
        username, 
        MAX(COALESCE(login_at, login_time)) as last_login,
        EXTRACT(EPOCH FROM (NOW() - MAX(COALESCE(login_at, login_time))))::integer as seconds_ago
       FROM story_login_logs
       WHERE COALESCE(login_at, login_time) > NOW() - INTERVAL '${ONLINE_THRESHOLD_MINUTES} minutes'
       GROUP BY username
       ORDER BY last_login DESC`
    );

    // Get total user count
    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(DISTINCT username) as count FROM story_users'
    );
    const totalUsers = parseInt(totalResult.rows[0]?.count || '0');

    return NextResponse.json({
      onlineUsers: result.rows.map(row => ({
        username: row.username,
        lastLogin: row.last_login,
        secondsAgo: row.seconds_ago
      })),
      onlineCount: result.rows.length,
      totalUsers,
      thresholdMinutes: ONLINE_THRESHOLD_MINUTES
    });
  } catch (error) {
    console.error('Online users error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
