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

    // Fetch both user and admin login logs in parallel
    const [userLogsRes, adminLogsRes] = await Promise.all([
      supabase
        .from('story_login_logs')
        .select('id, username, login_at, logout_at, ip_address, user_agent')
        .order('login_at', { ascending: false })
        .limit(limit),
      supabase
        .from('story_admin_login_logs')
        .select('id, username, login_at, logout_at, ip_address, user_agent')
        .order('login_at', { ascending: false })
        .limit(limit),
    ]);

    if (userLogsRes.error) {
      console.error('[LoginLogs] User logs error:', userLogsRes.error.message);
    }
    if (adminLogsRes.error) {
      console.error('[LoginLogs] Admin logs error:', adminLogsRes.error.message);
    }

    interface LogRow {
      id: number;
      username: string;
      login_at: string;
      logout_at: string | null;
      ip_address: string | null;
      user_agent: string | null;
    }

    const mapRow = (row: LogRow, role: string) => ({
      id: row.id,
      username: row.username,
      role,
      login_at: row.login_at,
      logout_at: row.logout_at || null,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
    });

    const userLogs = ((userLogsRes.data || []) as LogRow[]).map(r => mapRow(r, 'user'));
    const adminLogs = ((adminLogsRes.data || []) as LogRow[]).map(r => mapRow(r, 'admin'));

    // Merge and sort by login_at descending
    const logs = [...userLogs, ...adminLogs]
      .sort((a, b) => {
        const ta = new Date(a.login_at).getTime() || 0;
        const tb = new Date(b.login_at).getTime() || 0;
        return tb - ta;
      })
      .slice(0, limit);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[LoginLogs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
