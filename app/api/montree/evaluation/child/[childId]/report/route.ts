/**
 * GET /api/montree/evaluation/child/[childId]/report — the Growth Story payload
 *
 * ?schoolYear=2026-2027&windowCode=spring   (both optional; defaults to the latest completed)
 *
 * Growth is the headline. The Milestone Attainment Profile is secondary context and is
 * suppressed rather than fudged when the n is too small. Unassessed milestones are returned
 * in full — nothing is silently dropped, because selective reporting is a build defect.
 *
 * Reads montree_child_progress and montree_child_english_progress READ-ONLY for the
 * classroom-position side of the story. This route writes nothing.
 */
import {
  ageYearsFromMonths, badRequest, isMigrationPendingError, json, migrationPending, openRoute,
  requireChild, serverError,
} from '@/lib/montree/evaluation/route-helpers';
import { getBankIndex } from '@/lib/montree/evaluation/bank';
import {
  buildMethodStatement, renderGrowthSentence, renderMapSentence, WINDOW_LABELS,
} from '@/lib/montree/evaluation/benchmark-map';
import { computeDomainSummaries, computeGrowth, computeMAP } from '@/lib/montree/evaluation/scoring';
import { loadClassroomPosition, windowSortKey } from '@/lib/montree/evaluation/session-service';
import type {
  AgeBand, GrowthInputResult, MilestoneResult, WindowCode,
} from '@/lib/montree/evaluation/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type ResultRow = {
  milestone_id: string; strand_id: string; domain_id: string; track: string; age_band: string;
  expectation: string; band_computed: string | null; band_final: string; band_source: string;
  override_reason: string | null; coverage: number | null; points_earned: number | null;
  points_possible: number | null; evidence_note: string | null; evidence_media_id: string | null;
};

const toMilestoneResult = (r: ResultRow): MilestoneResult => ({
  milestoneId: r.milestone_id,
  strandId: r.strand_id,
  domainId: r.domain_id,
  track: r.track as MilestoneResult['track'],
  ageBand: r.age_band as AgeBand,
  expectation: r.expectation as MilestoneResult['expectation'],
  bandComputed: r.band_computed as MilestoneResult['bandComputed'],
  bandFinal: r.band_final as MilestoneResult['bandFinal'],
  bandSource: r.band_source as MilestoneResult['bandSource'],
  overrideReason: r.override_reason,
  coverage: r.coverage,
  pointsEarned: r.points_earned,
  pointsPossible: r.points_possible,
  evidenceNote: r.evidence_note,
  evidenceMediaId: r.evidence_media_id,
  evidenceItemIds: [],
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ childId: string }> },
): Promise<Response> {
  const opened = await openRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const { childId } = await params;
  if (!childId) return badRequest('child_id_required');

  const childCheck = await requireChild(ctx, childId);
  if ('response' in childCheck) return childCheck.response;
  const child = childCheck.child;

  const url = new URL(request.url);
  const wantYear = url.searchParams.get('schoolYear');
  const wantWindow = url.searchParams.get('windowCode');

  try {
    const { data: sessionRows, error: sErr } = await ctx.supabase
      .from('montree_evaluation_sessions')
      .select('id, school_year, window_code, age_band, age_months, form_code, delivery_mode, status, completed_at, map_percent, map_denominator, map_suppressed, efl_map_percent, efl_map_denominator, efl_map_suppressed, milestones_unassessed, override_count, summary_json')
      .eq('child_id', childId)
      .eq('school_id', ctx.auth.schoolId)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(24);
    if (sErr) {
      if (isMigrationPendingError(sErr)) return migrationPending(sErr.message);
      return serverError('load child sessions', sErr);
    }

    const completed = ((sessionRows ?? []) as Array<Record<string, unknown>>)
      .filter((s) => s.status === 'completed')
      .sort((a, b) => windowSortKey(String(b.school_year), b.window_code as WindowCode)
        .localeCompare(windowSortKey(String(a.school_year), a.window_code as WindowCode)));

    if (!completed.length) {
      return json({
        available: true,
        child: { id: childId, name: child.name, ageMonths: null, ageBand: null },
        session: null,
        message: 'No completed check-in yet for this child.',
        history: [],
        classroomPosition: await loadClassroomPosition(ctx.supabase, childId),
      });
    }

    const current = (wantYear || wantWindow)
      ? completed.find((s) => (!wantYear || s.school_year === wantYear) && (!wantWindow || s.window_code === wantWindow))
      : completed[0];
    if (!current) return json({ error: 'no_session_for_window', schoolYear: wantYear, windowCode: wantWindow }, 404);

    const currentKey = windowSortKey(String(current.school_year), current.window_code as WindowCode);
    const previous = completed.find(
      (s) => windowSortKey(String(s.school_year), s.window_code as WindowCode) < currentKey,
    );

    const loadResults = async (sessionId: string): Promise<ResultRow[]> => {
      const { data, error } = await ctx.supabase
        .from('montree_evaluation_milestone_results')
        .select('milestone_id, strand_id, domain_id, track, age_band, expectation, band_computed, band_final, band_source, override_reason, coverage, points_earned, points_possible, evidence_note, evidence_media_id')
        .eq('session_id', sessionId)
        .eq('school_id', ctx.auth.schoolId)
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as ResultRow[];
    };

    const currentRows = await loadResults(String(current.id));
    const previousRows = previous ? await loadResults(String(previous.id)) : [];

    const index = getBankIndex();
    const results = currentRows.map(toMilestoneResult);
    const ageBand = current.age_band as AgeBand;

    const core = computeMAP(results, { track: 'core', ageBand }, index);
    const efl = computeMAP(results, { track: 'efl', ageBand }, index);
    const domains = computeDomainSummaries(results, index);

    const adapt = (rows: ResultRow[]): GrowthInputResult[] => rows.map((r) => ({
      milestoneId: r.milestone_id,
      domainId: r.domain_id,
      track: r.track as GrowthInputResult['track'],
      bandFinal: r.band_final as GrowthInputResult['bandFinal'],
    }));

    const growth = previous
      ? computeGrowth(adapt(previousRows), adapt(currentRows), {
          fromWindow: previous.window_code as WindowCode,
          toWindow: current.window_code as WindowCode,
        })
      : null;

    // Attach the milestone wording so the report never re-derives copy from an id.
    const milestones = results.map((r) => {
      const m = index.milestoneById.get(r.milestoneId);
      return {
        ...r,
        statement: m?.statement ?? { en: r.milestoneId },
        bandDescriptors: m?.bandDescriptors ?? null,
        strandName: index.strandById.get(r.strandId)?.name ?? null,
        domainName: index.domainById.get(r.domainId)?.name ?? null,
      };
    });

    const name = child.name?.trim() || 'This child';
    const ageYears = ageYearsFromMonths(Number(current.age_months));
    const fromLabel = growth?.fromWindow ? (WINDOW_LABELS[growth.fromWindow]?.en ?? growth.fromWindow) : null;

    return json({
      available: true,
      child: { id: childId, name: child.name, ageMonths: Number(current.age_months), ageBand },
      schoolYear: current.school_year,
      window: current.window_code,
      session: current,
      headline: {
        growthSentence: growth && fromLabel
          ? renderGrowthSentence({ name, fromWindowLabel: fromLabel, movedUp: growth.movedUp, steady: growth.steady, watching: growth.watching })
          : null,
        profileSentence: renderMapSentence({ name, ageYears, map: core }),
        englishSentence: efl.denominator > 0 ? renderMapSentence({ name, ageYears, map: efl }) : null,
        growth,
        map: core,
        efl,
      },
      domains,
      milestones,
      history: completed.map((s) => ({
        sessionId: s.id,
        schoolYear: s.school_year,
        window: s.window_code,
        completedAt: s.completed_at,
        mapPercent: s.map_percent,
        mapDenominator: s.map_denominator,
        mapSuppressed: s.map_suppressed,
        unassessed: s.milestones_unassessed,
      })),
      classroomPosition: await loadClassroomPosition(ctx.supabase, childId),
      method: buildMethodStatement({
        map: core,
        windows: completed.length,
        deliveryModes: [String(current.delivery_mode)],
      }),
    });
  } catch (error) {
    if (isMigrationPendingError(error)) return migrationPending((error as { message?: string }).message);
    return serverError('child report GET', error);
  }
}
