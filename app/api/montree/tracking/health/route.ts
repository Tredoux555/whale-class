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

import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { fetchAllRows, loadLedger, normaliseStatus } from '@/lib/montree/tracking/persistence';
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
  'cache-journal-drift': 'error',
  'cache-row-missing': 'error',
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
  const isCron = !!cronSecret && !!header && secretsMatch(header, cronSecret);

  // A wrong-but-present cron header is rejected outright: a browser session has
  // no reason to send one, so this can only be a misconfigured job.
  if (header && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let schoolId: string | null = null;

  if (!isCron) {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== 'teacher' && auth.role !== 'principal') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    schoolId = auth.schoolId;
  }

  const only = request.nextUrl.searchParams.get('classroom_id');

  // A FRESH builder per page: a supabase-js builder is single-use and .order()
  // mutates it, so paging one builder would re-issue page 1 with the order
  // clause piling up.
  const classroomQuery = (from: number, to: number) => {
    let q = supabase.from('montree_classrooms').select('id, name, school_id');
    if (schoolId) q = q.eq('school_id', schoolId);
    if (only) q = q.eq('id', only);
    return q.order('id').range(from, to);
  };

  // The cron sweep is scoped to NO school, so this lists every classroom on the
  // instance — the one query here that grows past 1000 rows on its own.
  const { rows: classrooms, error } = await fetchAllRows<{ id: string; name: string | null }>(
    classroomQuery,
  );
  if (error) {
    console.error('[tracking/health] classroom query failed:', error.message || error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const issues: Issue[] = [];
  const perClassroom: { id: string; name: string | null; issues: number; errors: number }[] = [];

  for (const room of classrooms) {
    try {
      const ledger = await loadLedger(supabase, { classroomId: room.id, asOf });
      const childIds = ledger.children.map((c) => c.id);
      const [current, focus, legacyPointers] = await Promise.all([
        loadCurrentTable(supabase, childIds),
        loadFocus(supabase, childIds),
        loadLegacyPointers(supabase, childIds),
      ]);
      const currentTable = current.table;

      // RULE 1, for the CACHE (audit 08-verify-tracking §8a). loadCurrentTable used
      // to `continue` past every work_key IS NULL row, so the one table rule 1 is
      // actually about had no keyless-row check at all: a row no rollup, sequence or
      // ribbon can ever find was invisible to rule 10. They are counted here, and the
      // LIST is capped — a legacy classroom can hold thousands and the point of this
      // endpoint is a signal, not a dump.
      const keylessIssues: Issue[] = current.keyless.slice(0, KEYLESS_LIST_CAP).map((r) => ({
        code: 'no-key',
        classroom_id: room.id,
        child_id: r.childId,
        work_key: null,
        message: `Cached progress row "${r.workName}" (${r.status}) has no work_key.`,
        fix: 'Resolve the name to a curriculum work_key (migrations/347 §1 repairs the unambiguous ones); if it is unknown, it should never have been written (rule 5).',
        severity: 'error' as Severity,
      }));
      if (current.keyless.length > KEYLESS_LIST_CAP) {
        keylessIssues.push({
          code: 'no-key',
          classroom_id: room.id,
          child_id: null,
          work_key: null,
          message: `${current.keyless.length} cached progress rows in this classroom have no work_key; the first ${KEYLESS_LIST_CAP} are listed above.`,
          fix: 'Run migrations/347_progress_journal_backfill.sql §1, then review what it could not resolve.',
          severity: 'error',
        });
      }

      const found: Issue[] = [...keylessIssues, ...checkInvariants(ledger, { asOf, currentTable, focus, legacyPointers }).map((v) => ({
        code: v.code,
        classroom_id: room.id,
        child_id: v.childId ?? null,
        work_key: v.workKey ?? null,
        message: v.message,
        fix: v.fix ?? null,
        severity: SEVERITY[v.code] ?? 'error',
      }))];

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

/** At most this many keyless cache rows are listed individually; the rest are a count. */
const KEYLESS_LIST_CAP = 50;

interface KeylessRow {
  childId: string;
  workName: string;
  status: string;
}

/**
 * The CACHE, exactly as stored — including rows the journal has no event for, and
 * (unlike before) including the rows with NO WORK_KEY. Those cannot go into the
 * CurrentMap, which is keyed by work_key, so they come back alongside it as rule 1
 * violations for the caller to report.
 */
async function loadCurrentTable(
  supabase: Supa,
  childIds: string[],
): Promise<{ table: CurrentMap; keyless: KeylessRow[] }> {
  const map: CurrentMap = new Map();
  const keyless: KeylessRow[] = [];
  if (childIds.length === 0) return { table: map, keyless };
  // One row per (child, work) for a whole classroom: far past 1000. Unpaged,
  // rule 10 would audit the first 1000 rows and call the rest consistent.
  const { rows, error } = await fetchAllRows<{
    child_id: string; work_key: string | null; work_name: string | null; status: string | null;
  }>((from, to) =>
    supabase
      .from('montree_child_progress')
      .select('child_id, work_key, work_name, status')
      .in('child_id', childIds)
      .order('child_id')
      .order('id')
      .range(from, to),
  );
  if (error) {
    console.error('[tracking/health] progress load failed:', error.message || error);
    return { table: map, keyless };
  }
  for (const row of rows) {
    const status = normaliseStatus(row.status);
    if (!row.work_key) {
      // A keyless row holding 'not_started' says nothing and is not worth a teacher's
      // attention; anything above it is a real observation nothing can find again.
      if (status !== 'not_started') {
        keyless.push({ childId: row.child_id, workName: row.work_name ?? '(no name)', status });
      }
      continue;
    }
    const child = map.get(row.child_id) ?? new Map<string, Status>();
    child.set(row.work_key, status);
    map.set(row.child_id, child);
  }
  return { table: map, keyless };
}

/**
 * Constant-time comparison for the cron secret. `===` on strings short-circuits at
 * the first differing byte; over enough requests that is a timing oracle for the
 * secret's prefix. Length is compared first (and non-secretly — the length of a
 * random secret is not the secret).
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function loadFocus(
  supabase: Supa,
  childIds: string[],
): Promise<{ childId: string; workName?: string; workKey?: string }[]> {
  if (childIds.length === 0) return [];
  try {
    const { rows, error } = await fetchAllRows<{ child_id: string; work_name: string | null; work_key: string | null }>(
      (from, to) =>
        supabase
          .from('montree_child_focus_works')
          .select('child_id, work_name, work_key')
          .in('child_id', childIds)
          .order('child_id')
          .order('id')
          .range(from, to),
    );
    if (error) return [];
    return rows.map((r) => ({
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
    const { rows, error } = await fetchAllRows<{ child_id: string; current_lesson: number | null }>(
      (from, to) =>
        supabase
          .from('montree_child_english_progress')
          .select('child_id, current_lesson')
          .in('child_id', childIds)
          .order('child_id')
          .order('id')
          .range(from, to),
    );
    if (error) return out;
    for (const row of rows) {
      if (typeof row.current_lesson === 'number') out[row.child_id] = row.current_lesson;
    }
    return out;
  } catch {
    return out;
  }
}
