import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// GET /api/mission/status - Get current mission protocol status
export async function GET() {
  try {
    const supabase = createClient();
    
    // Get streaks data
    const { data: streaks, error: streaksError } = await supabase
      .from('mission_streaks')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (streaksError) {
      console.error('Error fetching streaks:', streaksError);
      // Return defaults if table doesn't exist yet
      return NextResponse.json({
        streaks: {
          current_session_streak: 0,
          longest_session_streak: 0,
          total_sessions: 0,
          total_wins: 0,
          high_energy_count: 0,
          medium_energy_count: 0,
          low_energy_count: 0,
          project_counts: { whale: 0, jeffy: 0, sentinel: 0, guardian: 0 },
          current_season_name: 'Whale Launch Sprint',
          current_season_project: 'whale',
          consecutive_low_energy: 0,
        },
        recent_sessions: [],
        recent_wins: [],
        today_session: null,
      });
    }
    
    // Get recent sessions (last 7)
    const { data: recentSessions } = await supabase
      .from('mission_sessions')
      .select('*')
      .order('session_date', { ascending: false })
      .limit(7);
    
    // Get recent wins (last 10)
    const { data: recentWins } = await supabase
      .from('mission_wins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Check if there's a session for today
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySession } = await supabase
      .from('mission_sessions')
      .select('*')
      .eq('session_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return NextResponse.json({
      streaks: streaks || {},
      recent_sessions: recentSessions || [],
      recent_wins: recentWins || [],
      today_session: todaySession || null,
    });
    
  } catch (error) {
    console.error('Error in mission status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mission status' },
      { status: 500 }
    );
  }
}
