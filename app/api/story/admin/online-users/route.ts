import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.STORY_ADMIN_JWT_SECRET || process.env.STORY_JWT_SECRET || 'fallback-admin-secret-key-change-in-production'
);

// Consider a user "online" if they logged in within the last 10 minutes
const ONLINE_THRESHOLD_MINUTES = 10;

export async function GET(req: NextRequest) {
  // Verify admin session
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;

  if (authHeader) {
    token = authHeader.replace('Bearer ', '');
  } else {
    const cookies = req.cookies;
    const sessionCookie = cookies.get('story_admin_session');
    if (sessionCookie) {
      token = sessionCookie.value;
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query for recent logins (last 10 minutes)
    const result = await db.query(
      `SELECT 
        username,
        login_time,
        session_id,
        user_agent,
        EXTRACT(EPOCH FROM (NOW() - login_time)) as seconds_ago
      FROM story_login_logs
      WHERE login_time > NOW() - INTERVAL '${ONLINE_THRESHOLD_MINUTES} minutes'
      ORDER BY login_time DESC`,
      []
    );

    // Group by username to get unique users and their most recent login
    const onlineUsers = result.rows.reduce((acc: any[], row) => {
      const existing = acc.find(u => u.username === row.username);
      if (!existing) {
        acc.push({
          username: row.username,
          lastSeen: row.login_time,
          secondsAgo: Math.floor(row.seconds_ago),
          isOnline: true
        });
      }
      return acc;
    }, []);

    // Get total unique users who have ever logged in
    const totalUsersResult = await db.query(
      'SELECT COUNT(DISTINCT username) as total FROM story_login_logs',
      []
    );
    const totalUsers = totalUsersResult.rows[0]?.total || 0;

    return NextResponse.json({
      onlineUsers,
      onlineCount: onlineUsers.length,
      totalUsers: parseInt(totalUsers),
      thresholdMinutes: ONLINE_THRESHOLD_MINUTES,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ONLINE-USERS] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch online users',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

