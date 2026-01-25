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
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();

    // Get recent logins (within 10 min, not logged out)
    const { data: rows, error } = await supabase
      .from('story_login_logs')
      .select('username, login_time')
      .gt('login_time', tenMinutesAgo)
      .is('logout_at', null)
      .order('login_time', { ascending: false });

    if (error) throw error;

    // Deduplicate by username (keep most recent)
    const userMap = new Map<string, { username: string; lastLogin: string; secondsAgo: number }>();
    (rows || []).forEach(row => {
      if (!userMap.has(row.username)) {
        // Parse timestamp - with TIMESTAMPTZ, Supabase returns ISO format
        const loginTimestamp = new Date(row.login_time).getTime();
        const secondsAgo = Math.max(0, Math.floor((now - loginTimestamp) / 1000));
        
        userMap.set(row.username, {
          username: row.username,
          lastLogin: row.login_time,
          secondsAgo
        });
      }
    });

    const onlineUsers = Array.from(userMap.values());

    // Get total unique users
    const { data: allLogs } = await supabase
      .from('story_login_logs')
      .select('username');
    
    const uniqueUsers = new Set((allLogs || []).map(r => r.username));

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
