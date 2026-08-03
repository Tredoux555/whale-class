/**
 * GET /api/montree/evaluation/reports/school — the School Reflection view (principal).
 *
 *   ?schoolYear=2026-2027&windowCode=winter[&compareWindow=autumn]
 *
 * One school, aggregate only. This route returns NO child ids and NO child names, ever —
 * a principal who wants to look at one child opens that child's Growth Story, which is a
 * different route with a different (child-scoped) permission check.
 *
 * Suppression is applied before anything leaves the server, exactly as the funder cohort
 * report applies it:
 *   • fewer than 12 children with a reportable figure → no percentage, and it says why
 *   • a child whose own figure was suppressed         → excluded from the mean, counted openly
 *   • a domain below the domain minimum (6)           → band chip only, never a figure
 *   • the EFL track                                   → its own figure, never merged into core
 *     (and never a percentage below A5 — scoring.ts suppresses it at A3/A4 at source, so a
 *     school of three- and four-year-olds simply has no English percentage to average)
 *   • unassessed milestones                           → counted and returned, never dropped
 *
 * Every percentage is computed by the shared scoring module, not re-derived here.
 */
import { type NextRequest } from 'next/server';
import {
  isMigrationPendingError, json, migrationPending, selectAll, serverError,
} from '@/lib/montree/evaluation/route-helpers';
import { getBankIndex } from '@/lib/montree/evaluation/bank';
import { buildMethodStatement } from '@/lib/montree/evaluation/benchmark-map';
import { COHORT_MIN_CHILDREN, isWindowCode, schoolYearFor, WINDOW_CODES } from '@/lib/montree/evaluation/constants';
import { aggregateCohortMap, bestFitBand, computeGrowth } from '@/lib/montree/evaluation/scoring';
import type { BandOrUnassessed, GrowthInputResult, MapResult, Track, WindowCode } from '@/lib/montree/evaluation/types';
import { openPrincipalReport, round1 } from '../_shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface SessionRow {
  id: string; child_id: string; classroom_id: string; school_year: string; window_code: WindowCode;
  age_band: string; delivery_mode: string; status: string; completed_at: string | null;
  map_percent: number | null; map_denominator: number | null; map_suppressed: boolean;
  efl_map_percent: number | null; efl_map_denominator: number | null; efl_map_suppressed: boolean;
  milestones_unassessed: number | null; override_count: number | null;
}

interface ResultRow {
  session_id: string; child_id: string; classroom_id: string; milestone_id: string;
  domain_id: string; track: Track; band_final: BandOrUnassessed; band_source: string;
}

interface ClassroomRow { id: string; name: string | null }

const emptyCounts = (): Record<BandOrUnassessed, number> =>
  ({ emerging: 0, developing: 0, secure: 0, unassessed: 0 });

const tooFewChildren = (n: number): string =>
  `Only ${n} child${n === 1 ? '' : 'ren'} completed a check-in here (minimum ${COHORT_MIN_CHILDREN}). ` +
  'Figures from a group this small can identify individual children, so they are not shown.';

export async function GET(request: NextRequest): Promise<Response> {
  const opened = await openPrincipalReport(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;
  const schoolId = ctx.auth.schoolId;

  const url = new URL(request.url);
  const schoolYear = url.searchParams.get('schoolYear') || schoolYearFor();
  const windowParam = url.searchParams.get('windowCode');
  const compareParam = url.searchParams.get('compareWindow');

  try {
    // ── every session this school has in this school year ──────────────────────────
    const { rows: allSessions, error: sErr } = await selectAll<SessionRow>(
      ctx.supabase,
      'montree_evaluation_sessions',
      'id, child_id, classroom_id, school_year, window_code, age_band, delivery_mode, status, completed_at, map_percent, map_denominator, map_suppressed, efl_map_percent, efl_map_denominator, efl_map_suppressed, milestones_unassessed, override_count',
      (q) => q.eq('school_id', schoolId).eq('school_year', schoolYear),
    );
    if (sErr) {
      if (isMigrationPendingError(sErr)) return migrationPending((sErr as { message?: string }).message);
      return serverError('school report sessions', sErr);
    }

    // Which windows actually have data, so the UI can offer real choices rather than
    // three tabs where two are empty.
    const windows = WINDOW_CODES.map((code) => {
      const inWindow = allSessions.filter((s) => s.window_code === code);
      const done = inWindow.filter((s) => s.status === 'completed');
      return {
        windowCode: code,
        sessions: inWindow.length,
        completed: done.length,
        children: new Set(done.map((s) => s.child_id)).size,
      };
    });

    // Default to the latest window that has any completed sitting — a principal opening
    // this page in February wants Winter, not an empty Spring.
    const latestWithData = [...WINDOW_CODES].reverse().find(
      (code) => windows.find((w) => w.windowCode === code)!.completed > 0,
    );
    const windowCode: WindowCode = isWindowCode(windowParam) ? windowParam : (latestWithData ?? 'autumn');
    const requestedCompare: WindowCode | null = isWindowCode(compareParam) ? compareParam : null;

    const inWindow = allSessions.filter((s) => s.window_code === windowCode);
    const completed = inWindow.filter((s) => s.status === 'completed');
    const childIds = new Set(completed.map((s) => s.child_id));
    const children = childIds.size;

    const index = getBankIndex();
    const config = index.bank.scoring;
    const cohortSuppressed = children < COHORT_MIN_CHILDREN;
    const cohortReason = cohortSuppressed ? tooFewChildren(children) : null;

    // ── roll of the school ────────────────────────────────────────────────────────
    const { data: classroomData, error: cErr } = await ctx.supabase
      .from('montree_classrooms')
      .select('id, name')
      .eq('school_id', schoolId);
    if (cErr && isMigrationPendingError(cErr)) return migrationPending((cErr as { message?: string }).message);
    const classrooms = ((classroomData ?? []) as ClassroomRow[]);

    // How many children could have been checked in at all. Reported so "12 of 34" is
    // visible rather than a bare 12 that looks like the whole school.
    let childrenOnRoll = 0;
    if (classrooms.length) {
      const { count } = await ctx.supabase
        .from('montree_children')
        .select('id', { count: 'exact', head: true })
        .in('classroom_id', classrooms.map((c) => c.id));
      childrenOnRoll = typeof count === 'number' ? count : 0;
    }

    // ── attainment, core and English, each aggregated by the shared scorer ────────
    const core = aggregateCohortMap(
      completed.map((s) => ({
        childId: s.child_id,
        mapPercent: s.map_percent,
        denominator: s.map_denominator ?? 0,
        suppressed: Boolean(s.map_suppressed),
      })),
      COHORT_MIN_CHILDREN,
    );
    const efl = aggregateCohortMap(
      completed.map((s) => ({
        childId: s.child_id,
        mapPercent: s.efl_map_percent,
        denominator: s.efl_map_denominator ?? 0,
        suppressed: Boolean(s.efl_map_suppressed),
      })),
      COHORT_MIN_CHILDREN,
    );

    // ── milestone results for the window ─────────────────────────────────────────
    const sessionIds = completed.map((s) => s.id);
    let results: ResultRow[] = [];
    if (sessionIds.length) {
      const { rows, error } = await selectAll<ResultRow>(
        ctx.supabase,
        'montree_evaluation_milestone_results',
        'session_id, child_id, classroom_id, milestone_id, domain_id, track, band_final, band_source',
        (q) => q.eq('school_id', schoolId).in('session_id', sessionIds),
      );
      if (error) {
        if (isMigrationPendingError(error)) return migrationPending((error as { message?: string }).message);
        return serverError('school report results', error);
      }
      results = rows;
    }

    const byDomain = new Map<string, { counts: Record<BandOrUnassessed, number>; children: Set<string> }>();
    let overrides = 0;
    let unassessed = 0;
    for (const r of results) {
      if (r.band_source === 'teacher_override') overrides += 1;
      if (r.band_final === 'unassessed') unassessed += 1;
      const bucket = byDomain.get(r.domain_id) ?? { counts: emptyCounts(), children: new Set<string>() };
      bucket.counts[r.band_final] += 1;
      bucket.children.add(r.child_id);
      byDomain.set(r.domain_id, bucket);
    }

    const domains = index.bank.domains
      .filter((d) => byDomain.has(d.id))
      .map((d) => {
        const bucket = byDomain.get(d.id)!;
        const n = bucket.counts.emerging + bucket.counts.developing + bucket.counts.secure;
        const suppressed =
          cohortSuppressed || n < config.domainBandMinN || bucket.children.size < COHORT_MIN_CHILDREN;
        return {
          domainId: d.id,
          name: d.name,
          track: d.track,
          n,
          children: bucket.children.size,
          counts: suppressed ? null : bucket.counts,
          band: suppressed ? null : bestFitBand(bucket.counts),
          suppressed,
          suppressionReason: suppressed
            ? (cohortReason ??
                `Fewer than ${config.domainBandMinN} milestones were checked in this area, so only the ` +
                'milestone list is meaningful here.')
            : null,
        };
      });

    // ── classroom comparison ─────────────────────────────────────────────────────
    // Each classroom gets its own n = 12 gate. A four-child classroom never shows a
    // figure, however large the school around it is.
    const classroomNames = new Map(classrooms.map((c) => [c.id, c.name ?? 'Classroom']));
    const classroomIds = new Set<string>([
      ...classrooms.map((c) => c.id),
      ...completed.map((s) => s.classroom_id),
    ]);
    const classroomRows = [...classroomIds].map((classroomId) => {
      const mine = completed.filter((s) => s.classroom_id === classroomId);
      const kids = new Set(mine.map((s) => s.child_id)).size;
      const agg = aggregateCohortMap(
        mine.map((s) => ({
          childId: s.child_id,
          mapPercent: s.map_percent,
          denominator: s.map_denominator ?? 0,
          suppressed: Boolean(s.map_suppressed),
        })),
        COHORT_MIN_CHILDREN,
      );
      const counts = emptyCounts();
      let resultChildren = 0;
      const seen = new Set<string>();
      for (const r of results) {
        if (r.classroom_id !== classroomId) continue;
        counts[r.band_final] += 1;
        if (!seen.has(r.child_id)) { seen.add(r.child_id); resultChildren += 1; }
      }
      const bandSuppressed = resultChildren < COHORT_MIN_CHILDREN;
      return {
        classroomId,
        name: classroomNames.get(classroomId) ?? 'Classroom',
        childrenAssessed: kids,
        sessions: mine.length,
        mapMeanPercent: agg.mean,
        mapMedianPercent: agg.median,
        denominatorMean: agg.denominatorMean,
        reportableChildren: agg.n,
        suppressed: agg.suppressed,
        suppressionReason: agg.suppressed ? (kids < COHORT_MIN_CHILDREN ? tooFewChildren(kids) : agg.reason) : null,
        counts: bandSuppressed ? null : counts,
        band: bandSuppressed ? null : bestFitBand(counts),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // ── window-over-window growth ────────────────────────────────────────────────
    // Growth is the defensible claim at small n: it is within-child movement, not a
    // cross-sectional comparison. It still gets its own n = 12 gate on PAIRED children.
    const orderIndex = (w: WindowCode) => WINDOW_CODES.indexOf(w);
    const earlier: WindowCode | null =
      requestedCompare && requestedCompare !== windowCode
        ? requestedCompare
        : ([...WINDOW_CODES]
            .filter((w) => orderIndex(w) < orderIndex(windowCode))
            .reverse()
            .find((w) => windows.find((x) => x.windowCode === w)!.completed > 0) ?? null);

    let growth: {
      fromWindow: WindowCode; toWindow: WindowCode; pairedChildren: number; comparable: number;
      movedUp: number; steady: number; watching: number; movedUpPercent: number | null;
      suppressed: boolean; reason: string | null;
    } | null = null;

    if (earlier) {
      const priorSessions = allSessions.filter((s) => s.window_code === earlier && s.status === 'completed');
      const priorIds = priorSessions.map((s) => s.id);
      let priorResults: ResultRow[] = [];
      if (priorIds.length) {
        const { rows, error } = await selectAll<ResultRow>(
          ctx.supabase,
          'montree_evaluation_milestone_results',
          'session_id, child_id, classroom_id, milestone_id, domain_id, track, band_final, band_source',
          (q) => q.eq('school_id', schoolId).in('session_id', priorIds),
        );
        if (!error) priorResults = rows;
      }

      const group = (rows: ResultRow[]): Map<string, GrowthInputResult[]> => {
        const out = new Map<string, GrowthInputResult[]>();
        for (const r of rows) {
          const list = out.get(r.child_id) ?? [];
          list.push({ milestoneId: r.milestone_id, domainId: r.domain_id, track: r.track, bandFinal: r.band_final });
          out.set(r.child_id, list);
        }
        return out;
      };
      const before = group(priorResults);
      const now = group(results);

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
        fromWindow: earlier,
        toWindow: windowCode,
        pairedChildren: paired,
        comparable,
        movedUp,
        steady,
        watching,
        movedUpPercent: suppressed ? null : round1((100 * movedUp) / comparable),
        suppressed,
        reason: suppressed
          ? (comparable === 0
              ? 'No milestone was checked in both windows, so no movement can be described yet.'
              : `Only ${paired} child${paired === 1 ? '' : 'ren'} have check-ins in both windows (minimum ${COHORT_MIN_CHILDREN}).`)
          : null,
      };
    }

    const coreMapForMethod: MapResult = {
      track: 'core',
      mapPercent: core.suppressed ? null : core.mean,
      denominator: Math.round(core.denominatorMean ?? 0),
      met: 0,
      exceeded: 0,
      unassessed,
      suppressed: core.suppressed || cohortSuppressed,
      suppressionReason: cohortReason ?? core.reason,
      counts: emptyCounts(),
    };

    return json({
      available: true,
      scope: { schoolId, schoolYear, window: windowCode, compareWindow: earlier },
      windows,
      participation: {
        childrenOnRoll,
        childrenAssessed: children,
        sessionsCompleted: completed.length,
        sessionsInProgress: inWindow.filter((s) => s.status === 'in_progress').length,
        sessionsAbandoned: inWindow.filter((s) => s.status === 'abandoned').length,
        observationOnlySessions: completed.filter((s) => s.delivery_mode === 'observation_only').length,
        classroomsWithData: new Set(completed.map((s) => s.classroom_id)).size,
        classroomsTotal: classrooms.length,
      },
      attainment: {
        mapMeanPercent: cohortSuppressed ? null : core.mean,
        mapMedianPercent: cohortSuppressed ? null : core.median,
        denominatorMean: cohortSuppressed ? null : core.denominatorMean,
        reportableChildren: core.n,
        suppressed: cohortSuppressed || core.suppressed,
        suppressionReason: cohortReason ?? core.reason,
      },
      eflAttainment: {
        mapMeanPercent: cohortSuppressed ? null : efl.mean,
        mapMedianPercent: cohortSuppressed ? null : efl.median,
        denominatorMean: cohortSuppressed ? null : efl.denominatorMean,
        reportableChildren: efl.n,
        suppressed: cohortSuppressed || efl.suppressed,
        suppressionReason: cohortReason ?? efl.reason,
        note: 'The English track is reported on its own and is never merged into the core figure. '
          + 'It is not expressed as a percentage before A5.',
      },
      domains,
      classrooms: classroomRows,
      growth,
      transparency: {
        unassessed,
        overrides,
        childrenWithSuppressedOwnFigure: completed.filter((s) => s.map_suppressed).length,
        note: 'Unassessed milestones, teacher decisions that replaced a computed band, and unfinished '
          + 'sittings are all counted here rather than hidden.',
      },
      method: buildMethodStatement({
        map: coreMapForMethod,
        windows: growth ? 2 : 1,
        deliveryModes: [...new Set(completed.map((s) => s.delivery_mode))],
        extra: 'These figures describe the children who were checked in during this window. They do not '
          + 'establish that any change was caused by the programme.',
      }),
    });
  } catch (error) {
    if (isMigrationPendingError(error)) return migrationPending((error as { message?: string }).message);
    return serverError('school report GET', error);
  }
}
