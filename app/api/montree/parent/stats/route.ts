// /api/montree/parent/stats/route.ts
// Get child stats for parent dashboard
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';


export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // 🚨 Session 113 V2 Parent audit F-1.1 — re-verify parent↔child link.
    const session = await resolveAuthorizedParent(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Multi-child safe.
    if (!session.authorizedChildIds.includes(childId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    const response = NextResponse.json({
      success: true,
      stats: {
        works_this_week: worksThisWeek,
        total_mastered: mastered,
        total_works: allProgress?.length || 0,
      },
      recent_activity: recentActivity || [],
    });
    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
    return response;

  } catch (error) {
    console.error('Parent stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
