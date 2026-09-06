// app/api/montree/tracking/health/route.ts
//
// RULE 10 — IT CHECKS ITSELF, for a whole school at once.
//
// GET /api/montree/tracking/health
//   → { checked_at, ok, status, error_count, warning_count, classrooms:[…], issues:[…] }
//
// The per-classroom check is agent C's GET /api/montree/tracking/invariants; it
// takes one classroom and a teacher session. This route is the SWEEP around it:
// every classroom of a school (or, for the nightly cron, every classroom there
// is), each issue tagged with a severity, and one boolean the workflow can fail
// on. It re-uses the same engine (checkInvariants) and the same loader
// (lib/montree/tracking/persistence.loadLedger) rather than a second copy of
// either — the only thing that lives here is auth, the sweep, and the severity
// map.
//
// TWO DOORS:
//   TEACHER / PRINCIPAL  — the normal session cookie (verifySchoolRequest),
//                          scoped to that school. This is what the Health panel
//                          at /montree/dashboard/tracker/health reads.
//   NIGHTLY CRON         — header `x-cron-secret` matching process.env.CRON_SECRET,
//                          exactly how app/api/montree/cron/engagement/route.ts
//                          authenticates .github/workflows/engagement-cron.yml.
//                          Fail-closed: a header that is present but wrong is
//                          401 and never falls through to the session path.
//
// SEVERITY — the workflow fails the job on 'error' only:
//   error    the data is wrong: a row with no key, a cached status the journal
//            cannot account for, a mastered letter whose work is missing from
//            the curriculum, two works sharing a name, a focus pointing outside
//            the curriculum, a surviving 1-128 English pointer.
//   warning  a teaching signal, not a corruption: a child unobserved for ten
//            days. A quiet fortnight must never turn the nightly job red, or
//            everyone learns to ignore it.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { loadLedger, normaliseStatus } from '@/lib/montree/tracking/persistence';
import { checkInvariants, type InvariantCode } from '@/lib/montree/tracking/invariants';
import type { CurrentMap } from '@/lib/montree/tracking/ledger';
import type { Status } from '@/lib/montree/tracking/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Severity = 'error' | 'warning';
type Supa = ReturnType<typeof getSupabase>;

const SEVERITY: Record<InvariantCode, Severity> = {
  'no-key': 'error',
  'status-without-event': 'error',
  'mastered-letter-missing-work': 'error',
  'focus-not-in-curriculum': 'error',
  'duplicate-work-name': 'error',
  'no-observation-10d': 'warning',
  'legacy-pointer-conflict': 'error',
};

interface Issue {
  code: string;
  classroom_id: string;
  child_id: string | null;
  work_key: string | null;
  message: string;
  fix: string | null;
  severity: Severity;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const cronSecret = process.env.CRON_SECRET;
  const header = request.headers.get('x-cron-secret');
  const isCron = !!cronSecret && !!header && header === cronSecret;

  // A wrong-but-present cron header is rejected outright: a browser session has
  // no reason to send one, so this can only be a misconfigured job.
  if (header && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let classroomQuery = supabase.from('montree_classrooms').select('id, name, school_id');

  if (!isCron) {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== 'teacher' && auth.role !== 'principal') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    classroomQuery = classroomQuery.eq('school_id', auth.schoolId);
  }

  const only = request.nextUrl.searchParams.get('classroom_id');
  if (only) classroomQuery = classroomQuery.eq('id', only);

  const { data: classrooms, error } = await classroomQuery;
  if (error) {
    console.error('[tracking/health] classroom query failed:', error.message || error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const issues: Issue[] = [];
  const perClassroom: { id: string; name: string | null; issues: number; errors: number }[] = [];

  for (const room of (classrooms || []) as Array<{ id: string; name: string | null }>) {
    try {
      const ledger = await loadLedger(supabase, { classroomId: room.id, asOf });
      const childIds = ledger.children.map((c) => c.id);
      const [currentTable, focus, legacyPointers] = await Promise.all([
        loadCurrentTable(supabase, childIds),
        loadFocus(supabase, childIds),
        loadLegacyPointers(supabase, childIds),
      ]);

      const found: Issue[] = checkInvariants(ledger, { asOf, currentTable, focus, legacyPointers }).map((v) => ({
        code: v.code,
        classroom_id: room.id,
        child_id: v.childId ?? null,
        work_key: v.workKey ?? null,
        message: v.message,
        fix: v.fix ?? null,
        severity: SEVERITY[v.code] ?? 'error',
      }));

      issues.push(...found);
      perClassroom.push({
        id: room.id,
        name: room.name,
        issues: found.length,
        errors: found.filter((i) => i.severity === 'error').length,
      });
    } catch (e) {
      // One classroom's bad data must never hide another's health.
      console.error(`[tracking/health] classroom ${room.id} failed:`, e);
      issues.push({
        code: 'health-check-failed',
        classroom_id: room.id,
        child_id: null,
        work_key: null,
        message: `The health check could not run for this classroom: ${e instanceof Error ? e.message : 'unknown error'}`,
        fix: 'Check the server logs for this classroom id.',
        severity: 'error',
      });
      perClassroom.push({ id: room.id, name: room.name, issues: 1, errors: 1 });
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.length - errorCount;

  return NextResponse.json(
    {
      checked_at: new Date().toISOString(),
      scope: isCron ? 'all-schools' : 'school',
      classrooms_checked: perClassroom.length,
      ok: errorCount === 0,
      status:
        errorCount === 0 && warningCount === 0
          ? 'all consistent'
          : `${errorCount} error(s), ${warningCount} warning(s)`,
      error_count: errorCount,
      warning_count: warningCount,
      classrooms: perClassroom,
      issues,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/* ------------------------------------------------------------------------- */
/* The three things checkInvariants() cannot get from the journal alone.      */
/* Mirrors app/api/montree/tracking/invariants/route.ts, whose copies are     */
/* module-private; if they are ever exported, delete these and import them.   */
/* ------------------------------------------------------------------------- */

/** The CACHE, exactly as stored — including rows the journal has no event for. */
async function loadCurrentTable(supabase: Supa, childIds: string[]): Promise<CurrentMap> {
  const map: CurrentMap = new Map();
  if (childIds.length === 0) return map;
  const { data, error } = await supabase
    .from('montree_child_progress')
    .select('child_id, work_key, status')
    .in('child_id', childIds);
  if (error) {
    console.error('[tracking/health] progress load failed:', error.message || error);
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
  supabase: Supa,
  childIds: string[],
): Promise<{ childId: string; workName?: string; workKey?: string }[]> {
  if (childIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('montree_child_focus_works')
      .select('child_id, work_name, work_key')
      .in('child_id', childIds);
    if (error) return [];
    return ((data || []) as Array<{ child_id: string; work_name: string | null; work_key: string | null }>).map((r) => ({
      childId: r.child_id,
      workName: r.work_name ?? undefined,
      workKey: r.work_key ?? undefined,
    }));
  } catch {
    return [];
  }
}

/** Rule 8: montree_child_english_progress is RETIRED. A surviving row is an issue. */
async function loadLegacyPointers(supabase: Supa, childIds: string[]): Promise<Record<string, number>> {
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
