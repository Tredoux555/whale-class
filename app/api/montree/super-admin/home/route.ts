// /api/montree/super-admin/home/route.ts
// Session 155: Super-admin API for Montree Home families
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

const ADMIN_PASSWORD = '870602';

function checkAuth(request: NextRequest): boolean {
  const password =
    request.headers.get('x-super-admin-password') ||
    request.nextUrl.searchParams.get('password');
  return password === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const familyId = request.nextUrl.searchParams.get('family_id');

    // Detail view: single family with children + progress
    if (familyId) {
      const { data: family, error: famErr } = await supabase
        .from('home_families')
        .select('id, name, email, plan, created_at')
        .eq('id', familyId)
        .single();

      if (famErr || !family) {
        return NextResponse.json({ error: 'Family not found' }, { status: 404 });
      }

      const { data: children } = await supabase
        .from('home_children')
        .select('id, name, age, created_at')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });

      // Get progress stats per child
      const childIds = (children || []).map((c) => c.id);
      const { data: progress } = await supabase
        .from('home_progress')
        .select('child_id, area, status')
        .in('child_id', childIds.length > 0 ? childIds : ['__none__']);

      const childrenWithProgress = (children || []).map((child) => {
        const cp = (progress || []).filter((p) => p.child_id === child.id);
        const total = cp.length;
        const mastered = cp.filter((p) => p.status === 'mastered').length;
        const practicing = cp.filter((p) => p.status === 'practicing').length;
        const presented = cp.filter((p) => p.status === 'presented').length;

        // Per-area breakdown
        const areas: Record<string, { total: number; mastered: number }> = {};
        for (const p of cp) {
          if (!areas[p.area]) areas[p.area] = { total: 0, mastered: 0 };
          areas[p.area].total++;
          if (p.status === 'mastered') areas[p.area].mastered++;
        }

        return {
          ...child,
          progress: {
            total,
            mastered,
            practicing,
            presented,
            not_started: total - mastered - practicing - presented,
            percent: total > 0 ? Math.round((mastered / total) * 100) : 0,
            areas,
          },
        };
      });

      return NextResponse.json({ family, children: childrenWithProgress });
    }

    // List view: all families with counts
    const { data: families, error: famsErr } = await supabase
      .from('home_families')
      .select('id, name, email, plan, created_at')
      .order('created_at', { ascending: false });

    if (famsErr) {
      console.error('Failed to fetch families:', famsErr.message);
      return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
    }

    const { data: allChildren } = await supabase
      .from('home_children')
      .select('id, family_id');

    const { data: allProgress } = await supabase
      .from('home_progress')
      .select('child_id, status');

    // Build child-to-family lookup for progress aggregation
    const childToFamily: Record<string, string> = {};
    for (const c of allChildren || []) {
      childToFamily[c.id] = c.family_id;
    }

    const familyStats = (families || []).map((family) => {
      const familyChildren = (allChildren || []).filter((c) => c.family_id === family.id);
      const familyChildIds = new Set(familyChildren.map((c) => c.id));
      const familyProgress = (allProgress || []).filter((p) => familyChildIds.has(p.child_id));
      const totalWorks = familyProgress.length;
      const masteredWorks = familyProgress.filter((p) => p.status === 'mastered').length;

      return {
        ...family,
        children_count: familyChildren.length,
        total_works: totalWorks,
        mastered_works: masteredWorks,
        avg_progress: totalWorks > 0 ? Math.round((masteredWorks / totalWorks) * 100) : 0,
      };
    });

    // Compute global stats
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSignups = (families || []).filter(
      (f) => new Date(f.created_at) >= weekAgo
    ).length;

    const totalChildren = (allChildren || []).length;
    const totalMastered = (allProgress || []).filter((p) => p.status === 'mastered').length;
    const totalProgressRecords = (allProgress || []).length;
    const overallAvgProgress =
      totalProgressRecords > 0
        ? Math.round((totalMastered / totalProgressRecords) * 100)
        : 0;

    return NextResponse.json({
      families: familyStats,
      stats: {
        total_families: (families || []).length,
        total_children: totalChildren,
        avg_progress: overallAvgProgress,
        signups_this_week: recentSignups,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Super admin home GET error:', err.message);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = request.nextUrl.searchParams.get('family_id');
    if (!familyId) {
      return NextResponse.json({ error: 'family_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get children for this family
    const { data: children } = await supabase
      .from('home_children')
      .select('id')
      .eq('family_id', familyId);

    const childIds = (children || []).map((c) => c.id);

    // Cascade delete in order
    if (childIds.length > 0) {
      await supabase.from('home_progress').delete().in('child_id', childIds);
    }
    await supabase.from('home_children').delete().eq('family_id', familyId);
    await supabase.from('home_curriculum').delete().eq('family_id', familyId);

    const { error: famErr } = await supabase
      .from('home_families')
      .delete()
      .eq('id', familyId);

    if (famErr) {
      console.error('Failed to delete family:', famErr.message);
      return NextResponse.json({ error: 'Failed to delete family' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Super admin home DELETE error:', err.message);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
