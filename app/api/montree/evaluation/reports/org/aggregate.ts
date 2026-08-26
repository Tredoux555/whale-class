/**
 * The organisational (multi-school) Milestones aggregation, extracted so TWO surfaces can
 * share one implementation:
 *
 *   • GET /api/montree/evaluation/reports/org — platform-wide, super-admin gated. Every
 *     school that has opted into `child_evaluation`. Unchanged behaviour; the route is now
 *     a thin wrapper around this function.
 *   • GET /api/montree/org/reports/milestones — an ORGANIZATION leader's own schools only
 *     (Phase 6). Same payload, same suppression, `restrictToSchoolIds` set to the schools
 *     carrying that organisation's organization_id.
 *
 * Everything below the scoping decision is identical for both, which is the point: an org
 * leader and the platform owner must never see two different arithmetics of the same data.
 *
 * The rules this file enforces, unchanged from the single-school view:
 *   • fewer than COHORT_MIN_CHILDREN in scope → no percentage, and it says why
 *   • a child whose own figure is suppressed  → excluded from the mean, counted openly
 *   • unassessed milestones                   → always printed, never silently dropped
 *   • the EFL track                           → reported separately, never merged
 *
 * Aggregate only, one row per school. No child ids, no child names, no classroom breakdown.
 */
import {
  isMigrationPendingError, json, migrationPending, selectAll, serverError,
} from '@/lib/montree/evaluation/route-helpers';
import { buildMethodStatement } from '@/lib/montree/evaluation/benchmark-map';
import { COHORT_MIN_CHILDREN, isWindowCode, WINDOW_CODES } from '@/lib/montree/evaluation/constants';
import { aggregateCohortMap, computeGrowth } from '@/lib/montree/evaluation/scoring';
import type { BandOrUnassessed, GrowthInputResult, MapResult, Track, WindowCode } from '@/lib/montree/evaluation/types';
import type { SupabaseLike } from '@/lib/montree/evaluation/montree-bridge';
import { loadFeatureScope, rollUpDiscontinue, round1, schoolHasFeature } from '../_shared';

interface SessionRow {
  id: string; school_id: string; child_id: string; classroom_id: string; window_code: WindowCode;
  status: string; delivery_mode: string;
  map_percent: number | null; map_denominator: number | null; map_suppressed: boolean;
  efl_map_percent: number | null; efl_map_denominator: number | null; efl_map_suppressed: boolean;
  /** FIX A — carries unassessedByDiscontinue / expectedInScope / discontinueBiasFlag. */
  summary_json?: unknown;
}

interface ResultRow {
  session_id: string; school_id: string; child_id: string; milestone_id: string;
  domain_id: string; track: Track; band_final: BandOrUnassessed; band_source: string;
}

interface SchoolRow { id: string; name: string | null }

const emptyCounts = (): Record<BandOrUnassessed, number> =>
  ({ emerging: 0, developing: 0, secure: 0, unassessed: 0 });

export interface OrgReportOptions {
  schoolYear: string;
  windowParam: string | null;
  /**
   * NULL = every opted-in school on the platform (the super-admin view). An array = only
   * these schools, and an EMPTY array means "this organisation has no schools", which is a
   * legitimate, well-handled empty state rather than a fall-through to platform-wide.
   */
  restrictToSchoolIds?: string[] | null;
  /** What to say when nothing is in scope. Differs for a platform view and an org view. */
  emptyMessage?: string;
}

export async function buildOrgReport(
  supabase: SupabaseLike,
  options: OrgReportOptions,
): Promise<Response> {
  const { schoolYear, windowParam, restrictToSchoolIds = null } = options;
  const emptyMessage = options.emptyMessage ?? 'No school has switched Montree Milestones on yet.';

  try {
    const { scope, error: scopeErr } = await loadFeatureScope(supabase);
    if (scopeErr || !scope) {
      if (isMigrationPendingError(scopeErr)) return migrationPending((scopeErr as { message?: string }).message);
      return serverError('org report feature scope', scopeErr);
    }

    let schoolQuery = supabase.from('montree_schools').select('id, name');
    if (restrictToSchoolIds) {
      // An organisation with no schools yet: skip the query entirely rather than issue an
      // `.in()` with an empty list, whose behaviour is not worth relying on.
      if (!restrictToSchoolIds.length) {
        return json(emptyPayload(schoolYear, windowParam, emptyMessage));
      }
      schoolQuery = schoolQuery.in('id', restrictToSchoolIds);
    }
    const { data: schoolData, error: schErr } = await schoolQuery;
    if (schErr) {
      if (isMigrationPendingError(schErr)) return migrationPending((schErr as { message?: string }).message);
      return serverError('org report schools', schErr);
    }
    const optedIn = ((schoolData ?? []) as SchoolRow[]).filter((s) => schoolHasFeature(scope, s.id));
    const optedInIds = optedIn.map((s) => s.id);

    if (!optedInIds.length) {
      return json(emptyPayload(schoolYear, windowParam, emptyMessage));
    }

    const { rows: allSessions, error: sErr } = await selectAll<SessionRow>(
      supabase,
      'montree_evaluation_sessions',
      'id, school_id, child_id, classroom_id, window_code, status, delivery_mode, map_percent, map_denominator, map_suppressed, efl_map_percent, efl_map_denominator, efl_map_suppressed, summary_json',
      (q) => q.in('school_id', optedInIds).eq('school_year', schoolYear),
    );
    if (sErr) {
      if (isMigrationPendingError(sErr)) return migrationPending((sErr as { message?: string }).message);
      return serverError('org report sessions', sErr);
    }

    const windows = WINDOW_CODES.map((code) => {
      const done = allSessions.filter((s) => s.window_code === code && s.status === 'completed');
      return { windowCode: code, completed: done.length, children: new Set(done.map((s) => s.child_id)).size };
    });
    const latestWithData = [...WINDOW_CODES].reverse().find(
      (code) => windows.find((w) => w.windowCode === code)!.completed > 0,
    );
    const windowCode: WindowCode = isWindowCode(windowParam) ? windowParam : (latestWithData ?? 'autumn');
    const earlier: WindowCode | null = [...WINDOW_CODES]
      .filter((w) => WINDOW_CODES.indexOf(w) < WINDOW_CODES.indexOf(windowCode))
      .reverse()
      .find((w) => windows.find((x) => x.windowCode === w)!.completed > 0) ?? null;

    const completed = allSessions.filter((s) => s.window_code === windowCode && s.status === 'completed');
    const priorCompleted = earlier
      ? allSessions.filter((s) => s.window_code === earlier && s.status === 'completed')
      : [];

    const loadResults = async (ids: string[]): Promise<ResultRow[]> => {
      if (!ids.length) return [];
      const { rows, error } = await selectAll<ResultRow>(
        supabase,
        'montree_evaluation_milestone_results',
        'session_id, school_id, child_id, milestone_id, domain_id, track, band_final, band_source',
        (q) => q.in('session_id', ids),
      );
      if (error) throw error;
      return rows;
    };

    const results = await loadResults(completed.map((s) => s.id));
    const priorResults = await loadResults(priorCompleted.map((s) => s.id));

    const groupByChild = (rows: ResultRow[]): Map<string, GrowthInputResult[]> => {
      const out = new Map<string, GrowthInputResult[]>();
      for (const r of rows) {
        const list = out.get(r.child_id) ?? [];
        list.push({ milestoneId: r.milestone_id, domainId: r.domain_id, track: r.track, bandFinal: r.band_final });
        out.set(r.child_id, list);
      }
      return out;
    };

    const schools = optedIn.map((school) => {
      const mine = completed.filter((s) => s.school_id === school.id);
      const childrenAssessed = new Set(mine.map((s) => s.child_id)).size;
      const belowMinimum = childrenAssessed < COHORT_MIN_CHILDREN;

      const core = aggregateCohortMap(
        mine.map((s) => ({
          childId: s.child_id, mapPercent: s.map_percent,
          denominator: s.map_denominator ?? 0, suppressed: Boolean(s.map_suppressed),
        })),
        COHORT_MIN_CHILDREN,
      );
      const efl = aggregateCohortMap(
        mine.map((s) => ({
          childId: s.child_id, mapPercent: s.efl_map_percent,
          denominator: s.efl_map_denominator ?? 0, suppressed: Boolean(s.efl_map_suppressed),
        })),
        COHORT_MIN_CHILDREN,
      );

      const counts = emptyCounts();
      let unassessed = 0;
      let overrides = 0;
      for (const r of results) {
        if (r.school_id !== school.id) continue;
        counts[r.band_final] += 1;
        if (r.band_final === 'unassessed') unassessed += 1;
        if (r.band_source === 'teacher_override') overrides += 1;
      }

      let growth: {
        fromWindow: WindowCode; pairedChildren: number; comparable: number; movedUp: number;
        steady: number; watching: number; movedUpPercent: number | null; suppressed: boolean; reason: string | null;
      } | null = null;
      if (earlier) {
        const before = groupByChild(priorResults.filter((r) => r.school_id === school.id));
        const now = groupByChild(results.filter((r) => r.school_id === school.id));
        let comparable = 0, movedUp = 0, steady = 0, watching = 0, paired = 0;
        for (const [childId, current] of now) {
          const previous = before.get(childId);
          if (!previous?.length) continue;
          paired += 1;
          const g = computeGrowth(previous, current, { fromWindow: earlier, toWindow: windowCode });
          comparable += g.comparable; movedUp += g.movedUp; steady += g.steady; watching += g.watching;
        }
        const suppressed = paired < COHORT_MIN_CHILDREN || comparable === 0;
        growth = {
          fromWindow: earlier, pairedChildren: paired, comparable, movedUp, steady, watching,
          movedUpPercent: suppressed ? null : round1((100 * movedUp) / comparable),
          suppressed,
          reason: suppressed
            ? (comparable === 0
                ? 'No milestone was checked in both windows here yet.'
                : `Only ${paired} child${paired === 1 ? '' : 'ren'} have check-ins in both windows (minimum ${COHORT_MIN_CHILDREN}).`)
            : null,
        };
      }

      const suppressionReason = belowMinimum
        ? `Only ${childrenAssessed} child${childrenAssessed === 1 ? '' : 'ren'} completed a check-in here ` +
          `(minimum ${COHORT_MIN_CHILDREN}). Figures from a group this small can identify individual children.`
        : core.reason;

      return {
        schoolId: school.id,
        name: school.name ?? 'School',
        childrenAssessed,
        sessionsCompleted: mine.length,
        classroomsWithData: new Set(mine.map((s) => s.classroom_id)).size,
        mapMeanPercent: belowMinimum ? null : core.mean,
        mapMedianPercent: belowMinimum ? null : core.median,
        denominatorMean: belowMinimum ? null : core.denominatorMean,
        reportableChildren: core.n,
        suppressed: belowMinimum || core.suppressed,
        suppressionReason: belowMinimum || core.suppressed ? suppressionReason : null,
        eflMapMeanPercent: belowMinimum ? null : efl.mean,
        eflSuppressed: belowMinimum || efl.suppressed,
        eflSuppressionReason: belowMinimum || efl.suppressed ? (belowMinimum ? suppressionReason : efl.reason) : null,
        counts: belowMinimum ? null : counts,
        unassessed,
        // FIX A — its own line per school: the part of the gap the stop rule made.
        discontinue: rollUpDiscontinue(mine),
        overrides,
        childrenWithSuppressedOwnFigure: mine.filter((s) => s.map_suppressed).length,
        growth,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // Organisation-wide figure: the mean across every reportable child in every opted-in
    // school, not a mean of school means (which would weight a 12-child school the same
    // as a 120-child one).
    const orgAggregate = aggregateCohortMap(
      completed.map((s) => ({
        childId: `${s.school_id}:${s.child_id}`,
        mapPercent: s.map_percent,
        denominator: s.map_denominator ?? 0,
        suppressed: Boolean(s.map_suppressed),
      })),
      COHORT_MIN_CHILDREN,
    );

    const orgMapForMethod: MapResult = {
      track: 'core',
      mapPercent: orgAggregate.suppressed ? null : orgAggregate.mean,
      denominator: Math.round(orgAggregate.denominatorMean ?? 0),
      met: 0,
      exceeded: 0,
      unassessed: results.filter((r) => r.band_final === 'unassessed').length,
      suppressed: orgAggregate.suppressed,
      suppressionReason: orgAggregate.reason,
      counts: emptyCounts(),
    };

    return json({
      available: true,
      scope: { schoolYear, window: windowCode, compareWindow: earlier },
      windows,
      schools,
      totals: {
        schools: optedIn.length,
        schoolsWithData: schools.filter((s) => s.sessionsCompleted > 0).length,
        schoolsReportable: schools.filter((s) => !s.suppressed).length,
        childrenAssessed: new Set(completed.map((s) => `${s.school_id}:${s.child_id}`)).size,
        sessionsCompleted: completed.length,
        mapMeanPercent: orgAggregate.mean,
        mapMedianPercent: orgAggregate.median,
        denominatorMean: orgAggregate.denominatorMean,
        reportableChildren: orgAggregate.n,
        suppressed: orgAggregate.suppressed,
        suppressionReason: orgAggregate.reason,
        unassessed: orgMapForMethod.unassessed,
        discontinue: rollUpDiscontinue(completed),
        overrides: results.filter((r) => r.band_source === 'teacher_override').length,
      },
      method: buildMethodStatement({
        map: orgMapForMethod,
        windows: earlier ? 2 : 1,
        deliveryModes: [...new Set(completed.map((s) => s.delivery_mode))],
        extra: 'Schools are listed side by side for reflection, in alphabetical order. Differences between schools '
          + 'reflect who was checked in and when, and do not establish that one setting causes better '
          + 'outcomes than another.',
      }),
    });
  } catch (error) {
    if (isMigrationPendingError(error)) return migrationPending((error as { message?: string }).message);
    return serverError('org report GET', error);
  }
}

/** The nothing-in-scope payload. Same shape as a full one so the UI needs no special case. */
function emptyPayload(schoolYear: string, windowParam: string | null, message: string) {
  return {
    available: true,
    scope: { schoolYear, window: isWindowCode(windowParam) ? windowParam : 'autumn' },
    schools: [],
    totals: {
      schools: 0, schoolsWithData: 0, childrenAssessed: 0, sessionsCompleted: 0,
      reportableSchools: 0, mapMeanPercent: null, suppressed: true,
      suppressionReason: message,
    },
    windows: WINDOW_CODES.map((code) => ({ windowCode: code, completed: 0, children: 0 })),
    method: null,
  };
}
