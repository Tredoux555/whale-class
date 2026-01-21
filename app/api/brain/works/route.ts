// app/api/brain/works/route.ts
// List all Montessori works from the brain with full relationship data
// UPDATED: Now joins prerequisites, unlocks, and sensitive periods

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/brain/works
 * Query params:
 *   - area: Filter by curriculum area (practical_life, sensorial, mathematics, language, cultural)
 *   - age: Filter by age (returns works where age is between age_min and age_max)
 *   - gateway_only: If "true", only return gateway works
 *   - include_relations: If "true", include prerequisites, unlocks, sensitive_periods (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');
    const age = searchParams.get('age');
    const gatewayOnly = searchParams.get('gateway_only') === 'true';
    const includeRelations = searchParams.get('include_relations') !== 'false'; // default true

    const supabase = createClient();

    // 1. Get all works
    let query = supabase
      .from('montessori_works')
      .select('*')
      .order('curriculum_area')
      .order('sequence_order');

    if (area) {
      query = query.eq('curriculum_area', area);
    }

    if (age) {
      const ageNum = parseFloat(age);
      query = query.lte('age_min', ageNum).gte('age_max', ageNum);
    }

    if (gatewayOnly) {
      query = query.eq('is_gateway', true);
    }

    const { data: works, error } = await query;

    if (error) {
      console.error('Error fetching works:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!works || works.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // If not including relations, return basic data
    if (!includeRelations) {
      return NextResponse.json({
        success: true,
        count: works.length,
        data: works,
      });
    }

    // 2. Get all prerequisites with work names
    const { data: prerequisites } = await supabase
      .from('work_prerequisites')
      .select(`
        work_id,
        prerequisite_work_id,
        is_required,
        prerequisite:montessori_works!work_prerequisites_prerequisite_work_id_fkey(id, name, slug)
      `);

    // 3. Get all unlocks with work names
    const { data: unlocks } = await supabase
      .from('work_unlocks')
      .select(`
        work_id,
        unlocks_work_id,
        unlocked:montessori_works!work_unlocks_unlocks_work_id_fkey(id, name, slug)
      `);

    // 4. Get all sensitive period mappings with period names
    const { data: workPeriods } = await supabase
      .from('work_sensitive_periods')
      .select(`
        work_id,
        relevance_score,
        period:sensitive_periods(id, name, slug)
      `);

    // 5. Build lookup maps for efficient joining
    const prerequisiteMap = new Map<string, { id: string; name: string; slug: string; is_required: boolean }[]>();
    const unlockMap = new Map<string, { id: string; name: string; slug: string }[]>();
    const periodMap = new Map<string, { id: string; name: string; slug: string; relevance_score: number }[]>();

    // Populate prerequisites map
    if (prerequisites) {
      for (const p of prerequisites) {
        if (!p.prerequisite) continue;
        const existing = prerequisiteMap.get(p.work_id) || [];
        existing.push({
          id: p.prerequisite.id,
          name: p.prerequisite.name,
          slug: p.prerequisite.slug,
          is_required: p.is_required,
        });
        prerequisiteMap.set(p.work_id, existing);
      }
    }

    // Populate unlocks map
    if (unlocks) {
      for (const u of unlocks) {
        if (!u.unlocked) continue;
        const existing = unlockMap.get(u.work_id) || [];
        existing.push({
          id: u.unlocked.id,
          name: u.unlocked.name,
          slug: u.unlocked.slug,
        });
        unlockMap.set(u.work_id, existing);
      }
    }

    // Populate sensitive periods map
    if (workPeriods) {
      for (const wp of workPeriods) {
        if (!wp.period) continue;
        const existing = periodMap.get(wp.work_id) || [];
        existing.push({
          id: wp.period.id,
          name: wp.period.name,
          slug: wp.period.slug,
          relevance_score: wp.relevance_score,
        });
        periodMap.set(wp.work_id, existing);
      }
    }

    // 6. Combine all data
    const enrichedWorks = works.map(work => ({
      ...work,
      prerequisites: prerequisiteMap.get(work.id) || [],
      unlocks: unlockMap.get(work.id) || [],
      sensitive_periods: periodMap.get(work.id) || [],
    }));

    return NextResponse.json({
      success: true,
      count: enrichedWorks.length,
      data: enrichedWorks,
    });
  } catch (error: any) {
    console.error('Error in brain/works:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch works' },
      { status: 500 }
    );
  }
}
