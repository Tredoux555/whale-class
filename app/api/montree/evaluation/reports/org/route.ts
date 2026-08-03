/**
 * GET /api/montree/evaluation/reports/org — the organisational (multi-school) view.
 *
 *   ?schoolYear=2026-2027&windowCode=winter
 *
 * ⚠️ ORG TIER STAND-IN. There is no organisational role in this codebase today. The JWT
 * role enum is `teacher | principal | homeschool_parent | agent`, and super-admin is a
 * separate, platform-wide auth system rather than an "several schools, not all schools"
 * tier. Until that role exists, this route is gated on super-admin — see
 * `openOrgReport()` in ../_shared.ts, which is the single place to change when it lands.
 *
 * Aggregate only, one row per school, and every row obeys the same suppression rules as
 * the single-school view: a school with fewer than 12 reportable children shows its
 * participation and its band picture, never a percentage. No child ids, no child names,
 * and no classroom breakdown — an org leader who needs that detail asks the principal,
 * who has the school view.
 */
import { type NextRequest } from 'next/server';
import {
  isMigrationPendingError, json, migrationPending, selectAll, serverError,
} from '@/lib/montree/evaluation/route-helpers';
import { buildMethodStatement } from '@/lib/montree/evaluation/benchmark-map';
import { COHORT_MIN_CHILDREN, isWindowCode, schoolYearFor, WINDOW_CODES } from '@/lib/montree/evaluation/constants';
import { aggregateCohortMap, computeGrowth } from '@/lib/montree/evaluation/scoring';
import type { BandOrUnassessed, GrowthInputResult, MapResult, Track, WindowCode } from '@/lib/montree/evaluation/types';
import { loadFeatureScope, openOrgReport, round1, schoolHasFeature } from '../_shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface SessionRow {
  id: string; school_id: string; child_id: string; classroom_id: string; window_code: WindowCode;
  status: string; delivery_mode: string;
  map_percent: number | null; map_denominator: number | null; map_suppressed: boolean;
  efl_map_percent: number | null; efl_map_denominator: number | null; efl_map_suppressed: boolean;
}

interface ResultRow {
  session_id: string; school_id: string; child_id: string; milestone_id: string;
  domain_id: string; track: Track; band_final: BandOrUnassessed; band_source: string;
}

interface SchoolRow { id: string; name: string | null }

const emptyCounts = (): Record<BandOrUnassessed, number> =>
  ({ emerging: 0, developing: 0, secure: 0, unassessed: 0 });

export async function GET(request: NextRequest): Promise<Response> {
  const opened = await openOrgReport(request);
  if ('response' in opened) return opened.response;
  const { supabase } = opened;

  const url = new URL(request.url);
  const schoolYear = url.searchParams.get('schoolYear') || schoolYearFor();
  const windowParam = url.searchParams.get('windowCode');

  try {
    const { scope, error: scopeErr } = await loadFeatureScope(supabase);
    if (scopeErr || !scope) {
      if (isMigrationPendingError(scopeErr)) return migrationPending((scopeErr as { message?: string }).message);
      return serverError('org report feature scope', scopeErr);
    }

    const { data: schoolData, error: schErr } = await supabase
      .from('montree_schools')
      .select('id, name');
    if (schErr) {
      if (isMigrationPendingError(schErr)) return migrationPending((schErr as { message?: string }).message);
      return serverError('org report schools', schErr);
    }
    const optedIn = ((schoolData ?? []) as SchoolRow[]).filter((s) => schoolHasFeature(scope, s.id));
    const optedInIds = optedIn.map((s) => s.id);

    if (!optedInIds.length) {
      return json({
        available: true,
        scope: { schoolYear, window: isWindowCode(windowParam) ? windowParam : 'autumn' },
        schools: [],
        totals: {
          schools: 0, schoolsWithData: 0, childrenAssessed: 0, sessionsCompleted: 0,
          reportableSchools: 0, mapMeanPercent: null, suppressed: true,
          suppressionReason: 'No school has switched Montree Milestones on yet.',
        },
        windows: WINDOW_CODES.map((code) => ({ windowCode: code, completed: 0, children: 0 })),
        method: null,
      });
    }

    const { rows: allSessions, error: sErr } = await selectAll<SessionRow>(
      supabase,
      'montree_evaluation_sessions',
      'id, school_id, child_id, classroom_id, window_code, status, delivery_mode, map_percent, map_denominator, map_suppressed, efl_map_percent, efl_map_denominator, efl_map_suppressed',
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
