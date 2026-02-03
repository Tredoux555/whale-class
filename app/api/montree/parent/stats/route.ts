// /api/montree/parent/stats/route.ts
// Get child stats for parent dashboard
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Helper function to extract authenticated session data from cookie
async function getAuthenticatedSession(): Promise<{ childId: string; inviteId?: string } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('montree_parent_session');

    if (!sessionCookie?.value) {
      return null;
    }

    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (!session.child_id) {
      return null;
    }

    return {
      childId: session.child_id,
      inviteId: session.invite_id,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // SECURITY: Authenticate parent via session cookie
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Verify the requested child matches the authenticated session
    if (session.childId !== childId) {
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
