// app/api/story/admin/users/route.ts
//
// Admin-only. Lists every Story user (from story_users — the canonical
// "who can log in" table). Used by the dashboard's Students tab so the
// admin can start a call with anyone, not just whoever happens to have a
// live heartbeat. Online/offline is shown as an indicator, not a gate.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_users')
    .select('username')
    .order('username', { ascending: true });

  if (error) {
    console.error('[story-users] list failed:', error.message);
    return NextResponse.json({ users: [] });
  }

  return NextResponse.json({
    users: (data || []).map((r) => r.username as string),
  });
}
