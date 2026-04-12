import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminToken(req.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getSupabase();

    // Fetch only user login logs (admin logins excluded — not useful for monitoring Z)
    const userLogsRes = await supabase
      .from('story_login_logs')
      .select('id, username, login_at, logout_at, ip_address, user_agent')
      .order('login_at', { ascending: false })
      .limit(limit);

    if (userLogsRes.error) {
      console.error('[LoginLogs] User logs error:', userLogsRes.error.message);
    }

    interface LogRow {
      id: number;
      username: string;
      login_at: string;
      logout_at: string | null;
      ip_address: string | null;
      user_agent: string | null;
    }

    const logs = ((userLogsRes.data || []) as LogRow[]).map(row => ({
      id: row.id,
      username: row.username,
      role: 'user',
      login_at: row.login_at,
      logout_at: row.logout_at || null,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[LoginLogs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
