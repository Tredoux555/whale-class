// /api/home/curriculum/route.ts
// Get family curriculum enriched with work metadata from home_master_curriculum
// POST for re-seeding empty curriculum
// Audit fixes: race-condition guard on auto-seed, standardized error shapes

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { ensureCaches, getWorkMeta, getAreaMeta, getAreaKeys, seedHomeCurriculum } from '@/lib/home/curriculum-helpers';

// Row shape returned by home_curriculum queries (Supabase client is untyped)
interface CurriculumRow {
  id: string;
  work_name: string;
  area: string;
  category: string;
  sequence: number;
  is_active: boolean;
}

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const familyId = request.nextUrl.searchParams.get('family_id');
    if (!familyId) {
      return errorResponse('family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Initialize master curriculum caches from DB
    await ensureCaches(supabase);

    const includeInactive = request.nextUrl.searchParams.get('include_inactive') === 'true';

    let query = supabase
      .from('home_curriculum')
      .select('id, work_name, area, category, sequence, is_active')
      .eq('family_id', familyId);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: curriculum, error } = await query
      .order('area')
      .order('sequence');

    if (error) {
      console.error('Failed to fetch curriculum:', error.message, error.code, error.details, error.hint);
      return errorResponse('Failed to load curriculum', {
        message: error.message, code: error.code, details: error.details, hint: error.hint,
      });
    }

    let records = (curriculum || []) as CurriculumRow[];
    let seedError: string | null = null;

    // Auto-seed if curriculum is empty for this family
    // Guard: re-check count right before seeding to prevent race conditions
    if (records.length === 0) {
      try {
        // Double-check: another request may have seeded while we were loading
        const { count: existingCount } = await supabase
          .from('home_curriculum')
          .select('id', { count: 'exact', head: true })
          .eq('family_id', familyId);

        if (existingCount && existingCount > 0) {
          console.log(`Skipped auto-seed — ${existingCount} rows already exist for family ${familyId}`);
        } else {
          const count = await seedHomeCurriculum(supabase, familyId);
          console.log(`Auto-seeded ${count} curriculum works for family ${familyId}`);
        }

        // Re-fetch after seeding (or after detecting existing rows)
        const { data: seeded, error: refetchErr } = await supabase
          .from('home_curriculum')
          .select('id, work_name, area, category, sequence, is_active')
          .eq('family_id', familyId)
          .eq('is_active', true)
          .order('area')
          .order('sequence');
        if (refetchErr) {
          seedError = `Seed succeeded but re-fetch failed: ${refetchErr.message}`;
          console.error(seedError);
        }
        records = (seeded || []) as CurriculumRow[];
      } catch (seedErr: unknown) {
        const msg = seedErr instanceof Error
          ? seedErr.message
          : (seedErr && typeof seedErr === 'object' && 'message' in seedErr)
            ? String((seedErr as { message: string }).message)
            : String(seedErr);
        seedError = `Auto-seed failed: ${msg}`;
        console.error(seedError);
      }
    }

    // Enrich with metadata from home_master_curriculum (cached)
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
        direct_aims: meta?.direct_aims || [],
        indirect_aims: meta?.indirect_aims || [],
        materials: meta?.materials || [],
        control_of_error: meta?.control_of_error || '',
        video_search_term: meta?.video_search_term || '',
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

    return NextResponse.json({
      success: true,
      curriculum: enriched,
      byArea,
      ...(seedError ? { seedError } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error
      ? err.message
      : (err && typeof err === 'object' && 'message' in err)
        ? String((err as { message: string }).message)
        : String(err);
    console.error('Curriculum GET error:', message);
    return errorResponse('Server error', { message });
  }
}

// POST: Re-seed curriculum for a family (if empty or needs refresh)
export async function POST(request: NextRequest) {
  try {
    const { family_id } = await request.json();
    if (!family_id) {
      return errorResponse('family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Check if curriculum already exists
    const { data: existing, error: checkErr } = await supabase
      .from('home_curriculum')
      .select('id')
      .eq('family_id', family_id)
      .limit(1);

    if (checkErr) {
      console.error('Curriculum check error:', checkErr.message, checkErr.code, checkErr.details);
      return errorResponse('Failed to check curriculum', {
        message: checkErr.message, code: checkErr.code, details: checkErr.details,
      });
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, message: 'Curriculum already loaded', alreadySeeded: true });
    }

    // Seed the curriculum from home_master_curriculum table
    const count = await seedHomeCurriculum(supabase, family_id);
    return NextResponse.json({ success: true, count, message: `Seeded ${count} curriculum works` });
  } catch (err: unknown) {
    const message = err instanceof Error
      ? err.message
      : (err && typeof err === 'object' && 'message' in err)
        ? String((err as { message: string }).message)
        : String(err);
    console.error('Curriculum POST (seed) error:', message);
    return errorResponse('Failed to seed curriculum', { message });
  }
}
