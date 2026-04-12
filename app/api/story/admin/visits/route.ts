// app/api/story/admin/visits/route.ts
// Returns recent visits (every time a user checked the Story page)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

type VisitRow = {
  id: number;
  username: string;
  visited_at: string;
  last_active_at: string;
  ip_address: string | null;
  user_agent: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminToken(req.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('story_visits')
      .select('id, username, visited_at, last_active_at, ip_address, user_agent')
      .order('visited_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Visits] Query error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 });
    }

    const visits = ((data || []) as VisitRow[]).map(row => {
      const visitedAt = new Date(row.visited_at);
      const lastActive = new Date(row.last_active_at);
      const durationMs = lastActive.getTime() - visitedAt.getTime();
      const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));

      return {
        id: row.id,
        username: row.username,
        visited_at: row.visited_at,
        last_active_at: row.last_active_at,
        duration_seconds: durationSeconds,
        ip_address: row.ip_address,
      };
    });

    return NextResponse.json({ visits });
  } catch (error) {
    console.error('[Visits] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 });
  }
}
