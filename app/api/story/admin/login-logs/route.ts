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
    const { data: rows, error } = await supabase
      .from('story_login_logs')
      .select('id, username, login_time, ip_address, user_agent')
      .order('login_time', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const logs = (rows || []).map(row => ({
      id: row.id,
      username: row.username,
      login_time: row.login_time,
      ip_address: row.ip_address,
      user_agent: row.user_agent
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[LoginLogs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
