// /api/home/progress/route.ts
// Session 155: Get child progress enriched with work metadata

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { getWorkMeta, getAreaMeta, getAreaKeys } from '@/lib/home/curriculum-helpers';

export async function GET(request: NextRequest) {
  try {
    const childId = request.nextUrl.searchParams.get('child_id');
    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch all progress for this child
    const { data: progress, error } = await supabase
      .from('home_progress')
      .select('id, child_id, work_name, area, status, presented_at, mastered_at, updated_at')
      .eq('child_id', childId)
      .order('area')
      .order('work_name');

    if (error) {
      console.error('Failed to fetch progress:', error.message);
      return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
    }

    const records = progress || [];

    // Enrich each record with work metadata
    const enriched = records.map((p) => {
      const meta = getWorkMeta(p.work_name);
      return {
        ...p,
        description: meta?.description || '',
        home_tip: meta?.home_tip || '',
        home_priority: meta?.home_priority || 'recommended',
        home_sequence: meta?.home_sequence || 0,
      };
    });

    // Group by area
    const byArea: Record<string, typeof enriched> = {};
    for (const areaKey of getAreaKeys()) {
      const areaMeta = getAreaMeta(areaKey);
      const areaWorks = enriched
        .filter((p) => p.area === areaKey)
        .sort((a, b) => a.home_sequence - b.home_sequence);
      if (areaWorks.length > 0) {
        byArea[areaKey] = areaWorks;
      }
      // Attach area display info
      if (areaMeta && byArea[areaKey]) {
        (byArea[areaKey] as unknown as Record<string, unknown>)._meta = areaMeta;
      }
    }

    // Calculate stats
    const stats = {
      not_started: records.filter((p) => p.status === 'not_started').length,
      presented: records.filter((p) => p.status === 'presented').length,
      practicing: records.filter((p) => p.status === 'practicing').length,
      mastered: records.filter((p) => p.status === 'mastered').length,
    };

    return NextResponse.json({
      progress: enriched,
      byArea,
      stats,
      total: records.length,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Progress GET error:', err.message);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
