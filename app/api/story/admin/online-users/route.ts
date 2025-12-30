import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminToken(req.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Get recent logins (within 10 min, not logged out)
    const { data: rows, error } = await supabase
      .from('story_login_logs')
      .select('username, login_at')
      .gt('login_at', tenMinutesAgo)
      .is('logout_at', null)
      .order('login_at', { ascending: false });

    if (error) throw error;

    // Deduplicate by username (keep most recent)
    const userMap = new Map<string, { username: string; lastLogin: string; secondsAgo: number }>();
    (rows || []).forEach(row => {
      if (!userMap.has(row.username)) {
        const secondsAgo = Math.floor((Date.now() - new Date(row.login_at).getTime()) / 1000);
        userMap.set(row.username, {
          username: row.username,
          lastLogin: row.login_at,
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
      totalUsers: uniqueUsers.size
    });
  } catch (error) {
    console.error('[OnlineUsers] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch online users' }, { status: 500 });
  }
}
