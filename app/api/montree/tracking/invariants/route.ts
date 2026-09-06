// app/api/montree/tracking/invariants/route.ts
//
// GET /api/montree/tracking/invariants?classroom_id=
//   → { checked_at, classroom_id, ok, issues:[{code, child_id?, work_key?, message, fix?}] }
//
// RULE 10 — IT CHECKS ITSELF. Every check the constitution names lives in
// lib/montree/tracking/invariants.ts (pure); this route's only job is to supply it
// with the three things it cannot compute from the journal alone:
//
//   * the CACHED current-status table (montree_child_progress), so a status the
//     journal cannot account for is caught — that is the whole point of rule 3;
//   * the focus-shelf picks, so a focus work outside the curriculum is caught;
//   * the surviving 1-128 English pointers, which rule 8 retired and whose mere
//     presence is the "Magic e next to a Dark Phonics ribbon" bug.
//
// Read-only. The nightly job (agent F) calls this and the Health panel renders it.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { loadLedger, normaliseStatus } from '@/lib/montree/tracking/persistence';
import { checkInvariants } from '@/lib/montree/tracking/invariants';
import type { CurrentMap } from '@/lib/montree/tracking/ledger';
import type { Status } from '@/lib/montree/tracking/types';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const requested = request.nextUrl.searchParams.get('classroom_id');
  const classroomId = requested || auth.classroomId || null;
  if (!classroomId || !UUID_RE.test(classroomId)) {
    return NextResponse.json({ error: 'classroom_id required (UUID)' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (auth.classroomId !== classroomId) {
    const { data } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .maybeSingle();
    const row = data as { school_id: string } | null;
    if (!row || row.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Classroom not in your school' }, { status: 403 });
    }
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const ledger = await loadLedger(supabase, { classroomId, asOf });
  const childIds = ledger.children.map((c) => c.id);

  const [currentTable, focus, legacyPointers] = await Promise.all([
    loadCurrentTable(supabase, childIds),
    loadFocus(supabase, childIds),
    loadLegacyPointers(supabase, childIds),
  ]);

  const issues = checkInvariants(ledger, { asOf, currentTable, focus, legacyPointers }).map((v) => ({
    code: v.code,
    child_id: v.childId ?? null,
    work_key: v.workKey ?? null,
    message: v.message,
    fix: v.fix ?? null,
  }));

  return NextResponse.json(
    {
      checked_at: new Date().toISOString(),
      classroom_id: classroomId,
      // "all consistent" as a boolean, so the Health panel does not have to count.
      ok: issues.length === 0,
      issues,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/** The CACHE, exactly as stored — including rows the journal has no event for. */
async function loadCurrentTable(
  supabase: ReturnType<typeof getSupabase>,
  childIds: string[],
): Promise<CurrentMap> {
  const map: CurrentMap = new Map();
  if (childIds.length === 0) return map;
  const { data, error } = await supabase
    .from('montree_child_progress')
    .select('child_id, work_key, status')
    .in('child_id', childIds);
  if (error) {
    console.error('[tracking/invariants] progress load failed:', error.message || error);
    return map;
  }
  for (const row of (data || []) as Array<{ child_id: string; work_key: string | null; status: string | null }>) {
    if (!row.work_key) continue;
    const child = map.get(row.child_id) ?? new Map<string, Status>();
    child.set(row.work_key, normaliseStatus(row.status));
    map.set(row.child_id, child);
  }
  return map;
}

async function loadFocus(
  supabase: ReturnType<typeof getSupabase>,
  childIds: string[],
): Promise<{ childId: string; workName?: string; workKey?: string }[]> {
  if (childIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('montree_child_focus_works')
      .select('child_id, work_name, work_key')
      .in('child_id', childIds);
    if (error) return [];
    return ((data || []) as Array<{ child_id: string; work_name: string | null; work_key: string | null }>).map(
      (r) => ({
        childId: r.child_id,
        workName: r.work_name ?? undefined,
        workKey: r.work_key ?? undefined,
      }),
    );
  } catch {
    return [];
  }
}

/** Rule 8: montree_child_english_progress is RETIRED. Any surviving row is an issue. */
async function loadLegacyPointers(
  supabase: ReturnType<typeof getSupabase>,
  childIds: string[],
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (childIds.length === 0) return out;
  try {
    const { data, error } = await supabase
      .from('montree_child_english_progress')
      .select('child_id, current_lesson')
      .in('child_id', childIds);
    if (error) return out;
    for (const row of (data || []) as Array<{ child_id: string; current_lesson: number | null }>) {
      if (typeof row.current_lesson === 'number') out[row.child_id] = row.current_lesson;
    }
    return out;
  } catch {
    return out;
  }
}
