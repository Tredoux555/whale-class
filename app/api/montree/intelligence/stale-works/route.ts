// GET /api/montree/intelligence/stale-works — Stale works for classroom
//
// Data sources:
//   montree_stale_works_view — SQL view (migration 155) on montree_child_progress
//     Returns works in 'presented'/'practicing' status not updated in 7+ days
//     Columns: child_id, work_name, area, status, updated_at, days_stale, school_id, classroom_id
//   montree_stale_work_dismissals — Teacher dismissals (UNIQUE child_id + work_name)
//   montree_children — Child name lookup
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

interface StaleWork {
  child_id: string;
  child_name: string;
  work_name: string;
  area: string;
  status: string;
  days_stale: number;
  updated_at: string;
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    // 1. Fetch stale works for this classroom
    const { data: staleWorks, error: staleErr } = await supabase
      .from('montree_stale_works_view')
      .select('child_id, work_name, area, status, updated_at, days_stale')
      .eq('classroom_id', auth.classroomId)
      .eq('school_id', auth.schoolId)
      .order('days_stale', { ascending: false })
      .limit(200);

    if (staleErr) {
      console.error('[StaleWorks] View query error:', staleErr);
      return NextResponse.json({ error: 'Failed to load stale works' }, { status: 500 });
    }

    if (!staleWorks || staleWorks.length === 0) {
      return NextResponse.json({ works: [], total: 0 });
    }

    // 2. Fetch dismissals for this classroom's children
    const childIds = [...new Set(staleWorks.map(w => w.child_id))];
    const { data: dismissals, error: dismissalErr } = await supabase
      .from('montree_stale_work_dismissals')
      .select('child_id, work_name')
      .in('child_id', childIds);

    if (dismissalErr) {
      console.error('[StaleWorks] Dismissals query error:', dismissalErr);
    }

    const dismissedSet = new Set(
      (dismissals || []).map(d => `${d.child_id}:${d.work_name}`)
    );

    // 3. Fetch child names
    const { data: children } = await supabase
      .from('montree_children')
      .select('id, name')
      .in('id', childIds);

    const childNameMap = new Map(
      (children || []).map((c: { id: string; name: string }) => [c.id, c.name])
    );

    // 4. Filter out dismissed works and enrich with child names
    const enriched: StaleWork[] = staleWorks
      .filter(w => !dismissedSet.has(`${w.child_id}:${w.work_name}`))
      .map(w => ({
        child_id: w.child_id,
        child_name: childNameMap.get(w.child_id) || 'Unknown',
        work_name: w.work_name,
        area: w.area,
        status: w.status,
        days_stale: w.days_stale,
        updated_at: w.updated_at,
      }));

    return NextResponse.json({
      works: enriched,
      total: enriched.length,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('[StaleWorks] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
