// /api/montree/parent/stats/route.ts
// Get child stats for parent dashboard
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get this week's date range
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Get all progress for this child
    const { data: allProgress } = await supabase
      .from('montree_child_progress')
      .select('id, status, updated_at')
      .eq('child_id', childId);

    // Count mastered works
    const mastered = (allProgress || []).filter(p => 
      p.status === 'completed' || p.status === 'mastered'
    ).length;

    // Count works this week
    const worksThisWeek = (allProgress || []).filter(p => {
      const updated = new Date(p.updated_at);
      return updated >= weekStart;
    }).length;

    // Get recent activity (last 7 days)
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const { data: recentActivity } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', childId)
      .gte('updated_at', weekAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      stats: {
        works_this_week: worksThisWeek,
        total_mastered: mastered,
        total_works: allProgress?.length || 0,
      },
      recent_activity: recentActivity || [],
    });

  } catch (error) {
    console.error('Parent stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
