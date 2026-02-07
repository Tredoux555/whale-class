// /api/home/curriculum/route.ts
// Session 155: Get family curriculum enriched with work metadata

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { getWorkMeta, getAreaMeta, getAreaKeys } from '@/lib/home/curriculum-helpers';

export async function GET(request: NextRequest) {
  try {
    const familyId = request.nextUrl.searchParams.get('family_id');
    if (!familyId) {
      return NextResponse.json({ error: 'family_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: curriculum, error } = await supabase
      .from('home_curriculum')
      .select('id, work_name, area, category, sequence, is_active')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('area')
      .order('sequence');

    if (error) {
      console.error('Failed to fetch curriculum:', error.message);
      return NextResponse.json({ error: 'Failed to load curriculum' }, { status: 500 });
    }

    const records = curriculum || [];

    // Enrich with JSON metadata
    const enriched = records.map((c) => {
      const meta = getWorkMeta(c.work_name);
      return {
        ...c,
        description: meta?.description || '',
        home_tip: meta?.home_tip || '',
        buy_or_make: meta?.buy_or_make || '',
        estimated_cost: meta?.estimated_cost || '',
        home_age_start: meta?.home_age_start || '',
        home_priority: meta?.home_priority || 'recommended',
      };
    });

    // Group by area with area metadata
    const byArea: Record<string, { meta: { name: string; icon: string; color: string }; works: typeof enriched }> = {};
    for (const areaKey of getAreaKeys()) {
      const areaMeta = getAreaMeta(areaKey);
      const areaWorks = enriched.filter((c) => c.area === areaKey);
      if (areaWorks.length > 0 && areaMeta) {
        byArea[areaKey] = {
          meta: areaMeta,
          works: areaWorks,
        };
      }
    }

    return NextResponse.json({ curriculum: enriched, byArea });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Curriculum GET error:', err.message);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
