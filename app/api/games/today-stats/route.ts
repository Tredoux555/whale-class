// /app/api/games/today-stats/route.ts
// Returns today's game activity stats for principal dashboard

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();

  // Get start of today (UTC)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  try {
    // Get all sessions from today
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('child_id, duration_seconds')
      .gte('started_at', todayISO);

    if (error) throw error;

    // Calculate stats
    const todaySessions = sessions?.length || 0;
    const uniqueStudents = new Set(sessions?.map(s => s.child_id) || []);
    const activeStudents = uniqueStudents.size;
    const totalSeconds = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;
    const totalMinutes = Math.round(totalSeconds / 60);

    return NextResponse.json({
      todaySessions,
      activeStudents,
      totalMinutes,
      date: todayISO
    });
  } catch (error) {
    console.error('Error fetching today stats:', error);
    // Return zeros if table doesn't exist yet
    return NextResponse.json({
      todaySessions: 0,
      activeStudents: 0,
      totalMinutes: 0,
      date: todayISO
    });
  }
}
