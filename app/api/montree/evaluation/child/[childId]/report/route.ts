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
import {
  assessGrowthComparability, computeDomainSummaries, computeGrowth, computeMAP,
  DISCONTINUE_BIAS_CAVEAT, DISCONTINUE_LINE_LABEL,
} from '@/lib/montree/evaluation/scoring';
import {
  ENGLISH_MEDIUM_LITERACY_FEATURE_KEY, localeSuppressedStrandIds, LOCALE_SUPPRESSION_REASON,
} from '@/lib/montree/evaluation/locale-gate';
import { isFeatureEnabled } from '@/lib/montree/evaluation/montree-bridge';
import { loadClassroomPosition, windowSortKey } from '@/lib/montree/evaluation/session-service';
import type {
  AgeBand, BandOrUnassessed, FormCode, GrowthInputResult, MilestoneResult, SessionSummary, WindowCode,
} from '@/lib/montree/evaluation/types';

const EMPTY_COUNTS = (): Record<BandOrUnassessed, number> =>
  ({ emerging: 0, developing: 0, secure: 0, unassessed: 0 });

/** Band counts for one sitting — the object a side-by-side comparison is built from. */
const countBands = (rows: ResultRow[]): Record<BandOrUnassessed, number> => {
  const counts = EMPTY_COUNTS();
  for (const r of rows) {
    const band = r.band_final as BandOrUnassessed;
    if (band in counts) counts[band] += 1;
  }
  return counts;
};

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
      .select('id, school_year, window_code, age_band, age_months, form_code, delivery_mode, assessment_locale, status, completed_at, map_percent, map_denominator, map_suppressed, efl_map_percent, efl_map_denominator, efl_map_suppressed, milestones_unassessed, override_count, summary_json')
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

    /**
     * FIX C — a change statement is only made where a change statement is defensible.
     *
     * Forms A and B are CONTENT-matched, not psychometrically equated: no linking study
     * puts them on one scale, so "moved up" across an A→B pair may be the item set moving
     * rather than the child. Autumn and Spring are both form A, so Autumn→Spring is the
     * one honest within-year delta; anything involving Winter (form B) is shown as two
     * profiles side by side, with the reason, and no arithmetic between them.
     *
     * A change of age band is a second, larger break — a different band is a different
     * milestone list, not a harder version of the same one — and is called out on top.
     */
    const comparability = previous
      ? assessGrowthComparability({
          fromForm: (previous.form_code as FormCode | null) ?? null,
          toForm: current.form_code as FormCode,
          fromAgeBand: (previous.age_band as AgeBand | null) ?? null,
          toAgeBand: ageBand,
        })
      : null;

    const growth = previous && comparability?.comparable
      ? computeGrowth(adapt(previousRows), adapt(currentRows), {
          fromWindow: previous.window_code as WindowCode,
          toWindow: current.window_code as WindowCode,
        })
      : null;

    /**
     * The two profiles, shown WITHOUT a computed delta when the comparison is not
     * like-for-like. Nothing is hidden — the earlier sitting is still on the page, it is
     * simply not subtracted from this one.
     */
    const sideBySide = previous && comparability && !comparability.comparable
      ? {
          note: comparability.note,
          previous: {
            schoolYear: previous.school_year,
            window: previous.window_code,
            formCode: previous.form_code ?? null,
            ageBand: previous.age_band ?? null,
            completedAt: previous.completed_at ?? null,
            counts: countBands(previousRows),
          },
          current: {
            schoolYear: current.school_year,
            window: current.window_code,
            formCode: current.form_code ?? null,
            ageBand,
            completedAt: current.completed_at ?? null,
            counts: countBands(currentRows),
          },
        }
      : null;

    // The language-of-assessment gate, recomputed on read from the session's own locale.
    // `unassessedReason` is derived rather than stored, so a stored result row carries no
    // trace of it — this is where a report learns WHY an English-medium core strand is
    // blank in a non-English sitting (see lib/montree/evaluation/locale-gate.ts).
    const assessmentLocale = (current.assessment_locale as string | null) ?? 'en';
    // FIX E — the gate is keyed to the school's PROGRAMME. A bilingual school that teaches
    // English phonics keeps LCL-C / LCL-D, so nothing is reported as a language gap that
    // the school actually taught and the child actually sat. Fails closed.
    let englishMediumLiteracy = false;
    try {
      englishMediumLiteracy = await isFeatureEnabled(ctx.auth.schoolId, ENGLISH_MEDIUM_LITERACY_FEATURE_KEY);
    } catch { englishMediumLiteracy = false; }
    const localeSuppressed = localeSuppressedStrandIds(
      index.bank.strands, assessmentLocale, { englishMediumLiteracy },
    );

    // Attach the milestone wording so the report never re-derives copy from an id.
    const milestones = results.map((r) => {
      const m = index.milestoneById.get(r.milestoneId);
      return {
        ...r,
        unassessedReason: localeSuppressed.has(r.strandId) ? LOCALE_SUPPRESSION_REASON : null,
        statement: m?.statement ?? { en: r.milestoneId },
        bandDescriptors: m?.bandDescriptors ?? null,
        strandName: index.strandById.get(r.strandId)?.name ?? null,
        domainName: index.domainById.get(r.domainId)?.name ?? null,
      };
    });

    // Surfaced so the panel can print the gap honestly instead of showing a silent zero.
    // Only sent when the gate actually removed something from THIS check-in — a note
    // about nothing is noise, not transparency.
    const suppressedMilestoneCount = milestones
      .filter((m) => m.unassessedReason === LOCALE_SUPPRESSION_REASON).length;
    const suppressedStrandIds = [...localeSuppressed]
      .filter((id) => index.strandById.has(id))
      .sort();
    const localeSuppression = suppressedMilestoneCount > 0
      ? {
          reason: LOCALE_SUPPRESSION_REASON,
          assessmentLocale,
          strandIds: suppressedStrandIds,
          strandNames: suppressedStrandIds.map((id) => index.strandById.get(id)?.name ?? null),
          milestoneCount: suppressedMilestoneCount,
        }
      : null;

    const name = child.name?.trim() || 'This child';
    const ageYears = ageYearsFromMonths(Number(current.age_months));
    const fromLabel = growth?.fromWindow ? (WINDOW_LABELS[growth.fromWindow]?.en ?? growth.fromWindow) : null;

    /**
     * FIX A — the discontinue rule, made visible.
     *
     * Stop rules end a strand once it has stopped yielding information. The milestones that
     * loses are NOT missing at random: they are the ones the child was finding hard, and
     * dropping them out of the MAP% denominator lifts the figure that remains. The count
     * and the caveat are read from the stored summary, which is where the scorer wrote them
     * at finalisation with the raw evidence in hand.
     */
    const storedSummary = (current.summary_json ?? {}) as Partial<SessionSummary>;
    const discontinue = {
      label: DISCONTINUE_LINE_LABEL,
      count: storedSummary.unassessedByDiscontinue ?? 0,
      expectedInScope: storedSummary.expectedInScope ?? 0,
      sharePercent: storedSummary.discontinueSharePercent ?? null,
      flagged: storedSummary.discontinueBiasFlag === true,
      caveat: storedSummary.discontinueBiasFlag === true ? DISCONTINUE_BIAS_CAVEAT : null,
    };

    /**
     * FIX D — the milestone band profile leads, the percentage follows.
     *
     * MAP% is the most figure-like object this module produces, and a percentage at the top
     * of a payload becomes a percentage at the top of a page. The per-domain bands and the
     * secure / developing / emerging counts are the thing a teacher can act on, so they are
     * serialised first and `headline` sits below them.
     */
    const profileCounts = countBands(currentRows);

    return json({
      available: true,
      child: { id: childId, name: child.name, ageMonths: Number(current.age_months), ageBand },
      schoolYear: current.school_year,
      window: current.window_code,
      session: current,
      // ── lead with the profile ────────────────────────────────────────────────────────
      profile: {
        counts: profileCounts,
        domains,
        assessed: profileCounts.secure + profileCounts.developing + profileCounts.emerging,
        unassessed: profileCounts.unassessed,
        discontinue,
      },
      discontinue,
      comparison: sideBySide,
      growthComparability: comparability,
      headline: {
        growthSentence: growth && fromLabel
          ? renderGrowthSentence({ name, fromWindowLabel: fromLabel, movedUp: growth.movedUp, steady: growth.steady, watching: growth.watching })
          : null,
        profileSentence: renderMapSentence({ name, ageYears, map: core, ageBand }),
        englishSentence: efl.denominator > 0 ? renderMapSentence({ name, ageYears, map: efl, ageBand }) : null,
        growth,
        map: core,
        efl,
      },
      domains,
      milestones,
      localeSuppression,
      englishMediumLiteracy,
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
