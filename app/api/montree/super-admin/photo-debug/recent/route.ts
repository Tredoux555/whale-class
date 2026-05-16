// app/api/montree/super-admin/photo-debug/recent/route.ts
//
// Session 113 V2 — photo-debug observability surface.
// Returns the last N (default 50, max 200) rows from
// montree_pipeline_telemetry with school + classroom names hydrated.
//
// Optional filters: ?outcome=, ?decision=, ?school_id=
//
// Graceful 42P01 fallback (migration 211 not yet run): returns
// telemetry_missing_table=true + empty rows.
//
// Super-admin gated. Read-only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request.headers);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const outcomeFilter = searchParams.get('outcome');
  const decisionFilter = searchParams.get('decision');
  const schoolFilter = searchParams.get('school_id');
  const limitParam = parseInt(searchParams.get('limit') || '', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, MAX_LIMIT)
    : DEFAULT_LIMIT;

  const supabase = getSupabase();

  // 1. Fetch telemetry rows. Graceful 42P01 (table missing).
  let rows: Array<Record<string, unknown>> = [];
  let telemetryMissingTable = false;
  try {
    let query = supabase
      .from('montree_pipeline_telemetry')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (outcomeFilter) query = query.eq('outcome', outcomeFilter);
    if (decisionFilter) query = query.eq('decision', decisionFilter);
    if (schoolFilter) query = query.eq('school_id', schoolFilter);

    const { data, error } = await query;
    if (error) {
      if ((error as { code?: string }).code === '42P01') {
        telemetryMissingTable = true;
      } else {
        console.error('[PhotoDebugRecent] telemetry fetch failed:', error);
        return NextResponse.json({ error: 'DB error', detail: error.message }, { status: 500 });
      }
    } else if (data) {
      rows = data as Array<Record<string, unknown>>;
    }
  } catch (e) {
    console.error('[PhotoDebugRecent] telemetry fetch threw:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  // 2. Hydrate unique school + classroom + media identities for display.
  // Batched: one query each for schools + classrooms.
  const schoolIds = Array.from(new Set(rows.map(r => r.school_id).filter(Boolean) as string[]));
  const classroomIds = Array.from(new Set(rows.map(r => r.classroom_id).filter(Boolean) as string[]));

  const [schoolRes, classroomRes, summaryRes] = await Promise.all([
    schoolIds.length > 0
      ? supabase.from('montree_schools').select('id, name').in('id', schoolIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    classroomIds.length > 0
      ? supabase.from('montree_classrooms').select('id, name').in('id', classroomIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    // Per-outcome summary across the entire (filtered) recent window —
    // gives the user a one-glance "how many haiku_drafted vs haiku_matched"
    // count without scrolling the table.
    telemetryMissingTable
      ? Promise.resolve({ data: null })
      : supabase
          .from('montree_pipeline_telemetry')
          .select('outcome')
          .order('created_at', { ascending: false })
          .limit(500), // wider window than the table for stable counts
  ]);

  const schoolMap = new Map<string, string>();
  for (const s of (schoolRes.data || [])) schoolMap.set(s.id, s.name);
  const classroomMap = new Map<string, string>();
  for (const c of (classroomRes.data || [])) classroomMap.set(c.id, c.name);

  // Build outcome summary (last 500 rows aggregate)
  const outcomeSummary: Record<string, number> = {};
  if (summaryRes.data) {
    for (const r of summaryRes.data as Array<{ outcome: string }>) {
      const key = r.outcome || 'unknown';
      outcomeSummary[key] = (outcomeSummary[key] || 0) + 1;
    }
  }

  // 3. Enrich each row with school/classroom names for the table.
  const enriched = rows.map(r => ({
    ...r,
    school_name: r.school_id ? schoolMap.get(r.school_id as string) || null : null,
    classroom_name: r.classroom_id ? classroomMap.get(r.classroom_id as string) || null : null,
  }));

  return NextResponse.json({
    rows: enriched,
    telemetry_missing_table: telemetryMissingTable,
    total_returned: enriched.length,
    limit,
    outcome_summary: outcomeSummary,
    summary_window: summaryRes.data ? (summaryRes.data as unknown[]).length : 0,
    filters: {
      outcome: outcomeFilter,
      decision: decisionFilter,
      school_id: schoolFilter,
    },
    fetched_at: new Date().toISOString(),
  });
}
