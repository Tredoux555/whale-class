// /api/home/progress/summary/route.ts
// Session 155: Progress bars per area for a child

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { getAreaMeta, getAreaKeys } from '@/lib/home/curriculum-helpers';

interface AreaSummary {
  area: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  started: number;
  mastered: number;
  percentComplete: number;
}

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
      .select('area, status')
      .eq('child_id', childId);

    if (error) {
      console.error('Failed to fetch progress summary:', error.message);
      return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
    }

    const records = progress || [];

    // Calculate per-area stats
    const areas: AreaSummary[] = [];
    let totalAll = 0;
    let masteredAll = 0;

    for (const areaKey of getAreaKeys()) {
      const meta = getAreaMeta(areaKey);
      const areaRecords = records.filter((p) => p.area === areaKey);
      const total = areaRecords.length;
      const started = areaRecords.filter((p) => p.status !== 'not_started').length;
      const mastered = areaRecords.filter((p) => p.status === 'mastered').length;

      totalAll += total;
      masteredAll += mastered;

      areas.push({
        area: areaKey,
        areaName: meta?.name || areaKey,
        icon: meta?.icon || '📚',
        color: meta?.color || '#888',
        totalWorks: total,
        started,
        mastered,
        percentComplete: total > 0 ? Math.round((mastered / total) * 100) : 0,
      });
    }

    const overall = totalAll > 0 ? Math.round((masteredAll / totalAll) * 100) : 0;

    return NextResponse.json({ areas, overall });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Progress summary error:', err.message);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
