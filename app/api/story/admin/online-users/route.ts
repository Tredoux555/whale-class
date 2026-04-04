import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminToken(req.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const now = Date.now();
    // 2 minutes window - heartbeats are sent every 30s so 2min is safe
    const twoMinutesAgo = new Date(now - 2 * 60 * 1000).toISOString();

    // Primary: check story_online_sessions (heartbeat-based)
    const { data: onlineSessions, error: sessionError } = await supabase
      .from('story_online_sessions')
      .select('username, last_seen_at')
      .eq('is_online', true)
      .gt('last_seen_at', twoMinutesAgo);

    if (sessionError) {
      console.error('[OnlineUsers] Session query error:', sessionError.message);
    }

    // Fallback: also check recent logins (for users who haven't sent heartbeats yet)
    const { data: recentLogins, error: loginError } = await supabase
      .from('story_login_logs')
      .select('username, login_at')
      .gt('login_at', twoMinutesAgo)
      .is('logout_at', null);

    if (loginError) {
      console.error('[OnlineUsers] Login query error:', loginError.message);
    }

    // Merge: deduplicate by username, prefer online_sessions data
    const userMap = new Map<string, { username: string; lastSeen: string; secondsAgo: number }>();

    // Add login-based entries first (lower priority)
    for (const row of (recentLogins || [])) {
      if (!userMap.has(row.username)) {
        userMap.set(row.username, {
          username: row.username,
          lastSeen: row.login_at,
          secondsAgo: Math.max(0, Math.floor((now - new Date(row.login_at).getTime()) / 1000)),
        });
      }
    }

    // Override with heartbeat-based entries (higher priority, more accurate)
    for (const row of (onlineSessions || [])) {
      userMap.set(row.username, {
        username: row.username,
        lastSeen: row.last_seen_at,
        secondsAgo: Math.max(0, Math.floor((now - new Date(row.last_seen_at).getTime()) / 1000)),
      });
    }

    const onlineUsers = Array.from(userMap.values());

    // Get total unique users — fetch with high limit to avoid Supabase 1000-row default
    const { data: allLogs } = await supabase
      .from('story_login_logs')
      .select('username')
      .limit(10000);

    const uniqueUsers = new Set((allLogs || []).map(r => r.username));

    // Clean up stale online sessions (no heartbeat in >2 minutes)
    const { error: cleanupError } = await supabase
      .from('story_online_sessions')
      .update({ is_online: false })
      .eq('is_online', true)
      .lt('last_seen_at', twoMinutesAgo);

    if (cleanupError) {
      console.error('[OnlineUsers] Stale session cleanup error:', cleanupError.message);
    }

    // Infer logout for login logs where user has no active heartbeat
    // Only process users NOT currently in the onlineUsers list
    const onlineUsernames = new Set(onlineUsers.map(u => u.username));
    const { data: staleLogins } = await supabase
      .from('story_login_logs')
      .select('id, username')
      .is('logout_at', null)
      .lt('login_at', twoMinutesAgo)
      .limit(100);

    if (staleLogins && staleLogins.length > 0) {
      const idsToLogout = staleLogins
        .filter(row => !onlineUsernames.has(row.username))
        .map(row => row.id);

      if (idsToLogout.length > 0) {
        const { error: logoutInferError } = await supabase
          .from('story_login_logs')
          .update({ logout_at: new Date().toISOString() })
          .in('id', idsToLogout);

        if (logoutInferError) {
          console.error('[OnlineUsers] Logout inference error:', logoutInferError.message);
        }
      }
    }

    return NextResponse.json({
      onlineUsers,
      onlineCount: onlineUsers.length,
      totalUsers: uniqueUsers.size,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('[OnlineUsers] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch online users' }, { status: 500 });
  }
}
