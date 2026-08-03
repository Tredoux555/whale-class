/**
 * GET /api/montree/evaluation/cohort/report — the Cohort Milestone Report (funder-facing)
 *
 * ?schoolYear=2026-2027&windowCode=spring[&classroomId=…][&compareWindow=autumn]
 *
 * Aggregate only. This route returns NO child ids and NO child names, ever — a funder report
 * is not a roster. Suppression is applied before anything leaves the server:
 *
 *   • fewer than 12 children in scope         → no percentages, and it says why
 *   • a child whose own figure was suppressed → excluded from the mean, counted openly
 *   • a domain below the domain minimum (6)   → band chip only, never a figure
 *
 * The transparency block (unassessed, overrides, abandoned sittings) is mandatory and is
 * always populated. Selective reporting is a build defect, so a flat or negative growth
 * result is returned exactly as computed.
 */
import {
  isMigrationPendingError, json, migrationPending, openRoute, selectAll, serverError,
} from '@/lib/montree/evaluation/route-helpers';
import { verifyClassroomBelongsToSchool } from '@/lib/montree/evaluation/montree-bridge';
import { getBankIndex } from '@/lib/montree/evaluation/bank';
import {
  buildMethodStatement, CHINA_MOE_SCOPE_NOTE, chinaMoeApplicability, englishMediumStrandIds,
} from '@/lib/montree/evaluation/benchmark-map';
import { COHORT_MIN_CHILDREN, isWindowCode, schoolYearFor } from '@/lib/montree/evaluation/constants';
import { aggregateCohortMap, bestFitBand, computeGrowth } from '@/lib/montree/evaluation/scoring';
import { windowSortKey } from '@/lib/montree/evaluation/session-service';
import type {
  BandOrUnassessed, GrowthInputResult, MapResult, Track, WindowCode,
} from '@/lib/montree/evaluation/types';

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
  session_id: string; child_id: string; milestone_id: string; domain_id: string; track: Track;
  band_final: BandOrUnassessed; band_source: string;
}

const emptyCounts = (): Record<BandOrUnassessed, number> =>
  ({ emerging: 0, developing: 0, secure: 0, unassessed: 0 });

export async function GET(request: Request): Promise<Response> {
  const opened = await openRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const url = new URL(request.url);
  const schoolYear = url.searchParams.get('schoolYear') || schoolYearFor();
  const windowParam = url.searchParams.get('windowCode');
  const windowCode: WindowCode = isWindowCode(windowParam) ? windowParam : 'spring';
  const classroomId = url.searchParams.get('classroomId');
  const compareParam = url.searchParams.get('compareWindow');
  const compareWindow: WindowCode | null = isWindowCode(compareParam) ? compareParam : null;

  if (classroomId) {
    const ok = await verifyClassroomBelongsToSchool(ctx.supabase, classroomId, ctx.auth.schoolId);
    if (!ok) {
      console.warn(`[montree-milestones][SECURITY] classroom ${classroomId} rejected for school ${ctx.auth.schoolId}`);
      return json({ error: 'forbidden', reason: 'classroom does not belong to this school' }, 403);
    }
  }

  try {
    const { rows: sessions, error: sErr } = await selectAll<SessionRow>(
      ctx.supabase,
      'montree_evaluation_sessions',
      'id, child_id, classroom_id, school_year, window_code, age_band, delivery_mode, status, completed_at, map_percent, map_denominator, map_suppressed, efl_map_percent, efl_map_denominator, efl_map_suppressed, milestones_unassessed, override_count',
      (q) => {
        let query = q.eq('school_id', ctx.auth.schoolId).eq('school_year', schoolYear);
        if (classroomId) query = query.eq('classroom_id', classroomId);
        return query;
      },
    );
    if (sErr) {
      if (isMigrationPendingError(sErr)) return migrationPending((sErr as { message?: string }).message);
      return serverError('cohort sessions', sErr);
    }

    const inWindow = sessions.filter((s) => s.window_code === windowCode);
    const completed = inWindow.filter((s) => s.status === 'completed');
    const abandoned = inWindow.filter((s) => s.status === 'abandoned').length;
    const observationOnly = completed.filter((s) => s.delivery_mode === 'observation_only').length;
    const children = new Set(completed.map((s) => s.child_id)).size;

    const index = getBankIndex();
    const config = index.bank.scoring;

    const cohortSuppressed = children < COHORT_MIN_CHILDREN;
    const cohortReason = cohortSuppressed
      ? `Only ${children} child${children === 1 ? '' : 'ren'} completed a check-in in this window (minimum ${COHORT_MIN_CHILDREN}). ` +
        'Figures from a group this small can identify individual children and are not reported.'
      : null;

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

    // Per-domain roll-up across the cohort.
    const sessionIds = completed.map((s) => s.id);
    let results: ResultRow[] = [];
    if (sessionIds.length) {
      const { rows, error } = await selectAll<ResultRow>(
        ctx.supabase,
        'montree_evaluation_milestone_results',
        'session_id, child_id, milestone_id, domain_id, track, band_final, band_source',
        (q) => q.eq('school_id', ctx.auth.schoolId).in('session_id', sessionIds),
      );
      if (error) {
        if (isMigrationPendingError(error)) return migrationPending((error as { message?: string }).message);
        return serverError('cohort results', error);
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
        const suppressed = cohortSuppressed || n < config.domainBandMinN || bucket.children.size < COHORT_MIN_CHILDREN;
        return {
          domainId: d.id,
          name: d.name,
          track: d.track,
          n,
          children: bucket.children.size,
          counts: suppressed ? null : bucket.counts,
          band: suppressed ? null : bestFitBand(bucket.counts),
          suppressed,
        };
      });

    // Cohort growth against an earlier window — the defensible claim at small n.
    let growth: {
      fromWindow: WindowCode; comparable: number; movedUp: number; steady: number; watching: number;
      movedUpPercent: number | null; suppressed: boolean; reason: string | null;
    } | null = null;

    const earlier = compareWindow ?? (windowSortKey(schoolYear, windowCode) > windowSortKey(schoolYear, 'autumn') ? 'autumn' : null);
    if (earlier && earlier !== windowCode) {
      const priorSessions = sessions.filter((s) => s.window_code === earlier && s.status === 'completed');
      const priorIds = priorSessions.map((s) => s.id);
      let priorResults: ResultRow[] = [];
      if (priorIds.length) {
        const { rows, error } = await selectAll<ResultRow>(
          ctx.supabase,
          'montree_evaluation_milestone_results',
          'session_id, child_id, milestone_id, domain_id, track, band_final, band_source',
          (q) => q.eq('school_id', ctx.auth.schoolId).in('session_id', priorIds),
        );
        if (!error) priorResults = rows;
      }

      const byChildPrior = new Map<string, GrowthInputResult[]>();
      for (const r of priorResults) {
        const list = byChildPrior.get(r.child_id) ?? [];
        list.push({ milestoneId: r.milestone_id, domainId: r.domain_id, track: r.track, bandFinal: r.band_final });
        byChildPrior.set(r.child_id, list);
      }
      const byChildNow = new Map<string, GrowthInputResult[]>();
      for (const r of results) {
        const list = byChildNow.get(r.child_id) ?? [];
        list.push({ milestoneId: r.milestone_id, domainId: r.domain_id, track: r.track, bandFinal: r.band_final });
        byChildNow.set(r.child_id, list);
      }

      let comparable = 0, movedUp = 0, steady = 0, watching = 0, pairedChildren = 0;
      for (const [childId, now] of byChildNow) {
        const before = byChildPrior.get(childId);
        if (!before?.length) continue;
        pairedChildren += 1;
        const g = computeGrowth(before, now);
        comparable += g.comparable; movedUp += g.movedUp; steady += g.steady; watching += g.watching;
      }

      const growthSuppressed = pairedChildren < COHORT_MIN_CHILDREN || comparable === 0;
      growth = {
        fromWindow: earlier,
        comparable,
        movedUp,
        steady,
        watching,
        movedUpPercent: growthSuppressed ? null : Math.round((1000 * movedUp) / comparable) / 10,
        suppressed: growthSuppressed,
        reason: growthSuppressed
          ? (comparable === 0
              ? 'No milestone was assessed in both windows, so no movement can be reported.'
              : `Only ${pairedChildren} child${pairedChildren === 1 ? '' : 'ren'} have check-ins in both windows (minimum ${COHORT_MIN_CHILDREN}).`)
          : null,
      };
    }

    // ── China-MoE crosswalk section ────────────────────────────────────────────────
    // Milestones the MoE Guide does not speak to — the whole EFL track and the two
    // English-medium literacy strands (LCL-C, LCL-D) — are excluded from BOTH the numerator
    // and the denominator, and reported separately with the reason. Counting them as gaps
    // would misrepresent the Guide; hiding them would be selective reporting.
    const englishMediumStrands = new Set(englishMediumStrandIds(index));
    const moeCounts = emptyCounts();
    const excludedStrandTally = new Map<string, number>();
    let moeAssessed = 0;
    for (const r of results) {
      const milestone = index.milestoneById.get(r.milestone_id);
      const applicable = milestone ? chinaMoeApplicability(milestone, index).applicable : r.track !== 'efl';
      if (!applicable) {
        excludedStrandTally.set(r.milestone_id.split('.')[0], (excludedStrandTally.get(r.milestone_id.split('.')[0]) ?? 0) + 1);
        continue;
      }
      moeCounts[r.band_final] += 1;
      if (r.band_final !== 'unassessed') moeAssessed += 1;
    }
    const moeSuppressed = cohortSuppressed || moeAssessed < config.domainBandMinN;
    const chinaMoeCrosswalk = {
      inScopeMilestones: moeCounts.emerging + moeCounts.developing + moeCounts.secure + moeCounts.unassessed,
      assessed: moeAssessed,
      counts: moeSuppressed ? null : moeCounts,
      band: moeSuppressed ? null : bestFitBand(moeCounts),
      suppressed: moeSuppressed,
      suppressionReason: moeSuppressed
        ? (cohortReason ?? `Fewer than ${config.domainBandMinN} in-scope milestones were assessed.`)
        : null,
      excludedByDesign: {
        eflTrack: results.filter((r) => r.track === 'efl').length,
        englishMediumStrands: [...excludedStrandTally.entries()]
          .filter(([strandId]) => englishMediumStrands.has(strandId))
          .reduce((total, [, n]) => total + n, 0),
        strandIds: [...englishMediumStrands],
      },
      scopeNote: CHINA_MOE_SCOPE_NOTE,
    };

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
      scope: { schoolId: ctx.auth.schoolId, classroomId: classroomId ?? null, schoolYear, window: windowCode },
      cohort: {
        children,
        sessions: completed.length,
        suppressed: cohortSuppressed,
        suppressionReason: cohortReason,
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
        note: 'The English track is reported separately and is never merged into the core figure.',
      },
      domains,
      chinaMoeCrosswalk,
      growth,
      transparency: {
        unassessed,
        overrides,
        abandonedSessions: abandoned,
        observationOnlySessions: observationOnly,
        childrenWithSuppressedOwnFigure: completed.filter((s) => s.map_suppressed).length,
        note: 'Unassessed milestones, teacher overrides and unfinished sittings are reported, never hidden.',
      },
      method: buildMethodStatement({
        map: coreMapForMethod,
        windows: growth ? 2 : 1,
        deliveryModes: [...new Set(completed.map((s) => s.delivery_mode))],
        extra: 'Figures describe the children who were checked in during this window. They do not establish that any change was caused by the programme.',
      }),
    });
  } catch (error) {
    if (isMigrationPendingError(error)) return migrationPending((error as { message?: string }).message);
    return serverError('cohort report GET', error);
  }
}
