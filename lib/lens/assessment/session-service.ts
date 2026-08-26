/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/lens/assessment/session-service.ts
// Montree Lens — milestone check-in persistence and finalisation.
//
// The Lens twin of lib/montree/evaluation/session-service.ts. Shared by all
// THREE entry paths — the digital runner's /complete, the paper-entry route and
// the tablet /import — so a band can never depend on how the evidence arrived:
// every path writes raw responses through persistResponses() and finishes
// through finalizeSession(), and both of those re-score from the shared bank.
//
// 🚨 THE SCORER IS NOT COPIED. `scoreSession` and `computeGrowth` are imported
// straight from lib/montree/evaluation/scoring.ts, and the bank from
// lib/montree/evaluation/bank.ts. Those modules are pure — they import their own
// siblings and item-bank.json and nothing else, no supabase, no auth — which is
// exactly why only the storage layer needed duplicating. If a Lens band ever
// disagrees with a Montree band on the same evidence, that is a bug in this
// file, not a difference of opinion between two instruments.
//
// Nothing in this file deletes anything.

import { getBankIndex } from '@/lib/montree/evaluation/bank';
import { computeGrowth, scoreSession } from '@/lib/montree/evaluation/scoring';
import type {
  AgeBand, Band, FormCode, GrowthInputResult, GrowthSummary, MilestoneResult,
  RawItemResponse, ScoredItemResponse, SessionSummary, TeacherOverride, WindowCode,
} from '@/lib/montree/evaluation/types';
import { isAssessmentSetupPending, type LensDbClient } from './bridge';
import { comparabilityFlags, mergeSessionFacts, readSessionFacts } from './session-facts';
import type { LensAssessmentSessionRow } from './types';

export const WINDOW_ORDER: WindowCode[] = ['autumn', 'winter', 'spring'];

/** Sortable key so "the previous check-in" is unambiguous across school years. */
export function windowSortKey(schoolYear: string, windowCode: WindowCode): string {
  const idx = Math.max(0, WINDOW_ORDER.indexOf(windowCode));
  return `${schoolYear}#${idx}`;
}

export class LensAssessmentServiceError extends Error {
  constructor(message: string, readonly cause: unknown, readonly setupPending = false) {
    super(message);
    this.name = 'LensAssessmentServiceError';
  }
}

const raise = (where: string, error: unknown): never => {
  throw new LensAssessmentServiceError(where, error, isAssessmentSetupPending(error));
};

/* ─────────────────────────────────────────────────────────────── loading */

/** Rebuild the raw responses for a session in the shape the scorer wants. */
export async function loadRawResponses(
  supabase: LensDbClient,
  sessionId: string,
): Promise<{
  responses: RawItemResponse[];
  observations: Array<{ milestoneId: string; band: Band; note?: string | null }>;
}> {
  const responses: RawItemResponse[] = [];
  const observations: Array<{ milestoneId: string; band: Band; note?: string | null }> = [];

  // Supabase caps an un-ranged select at 1000 rows. A full sitting is well under
  // that, but a paged read costs nothing and a silent truncation here would
  // quietly lower a child's bands.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('lens_assessment_item_responses')
      .select('item_id, milestone_id, item_type, response, observed_band, attempts, replay_count, latency_ms, administered, skipped_reason, client_points_awarded, evidence_note, answered_at')
      .eq('session_id', sessionId)
      .order('answered_at', { ascending: true })
      .range(from, from + 999);
    if (error) raise('load responses', error);
    const page = (data ?? []) as any[];
    for (const row of page) {
      const payload = (row.response ?? {}) as RawItemResponse;
      responses.push({
        itemId: row.item_id,
        optionIds: payload.optionIds ?? undefined,
        sequence: payload.sequence ?? undefined,
        rubricScore: payload.rubricScore ?? undefined,
        band: (row.observed_band ?? payload.band) as Band | undefined,
        note: row.evidence_note ?? payload.note,
        attempts: row.attempts ?? 1,
        replayCount: row.replay_count ?? 0,
        latencyMs: row.latency_ms ?? null,
        administered: row.administered !== false,
        skippedReason: row.skipped_reason ?? null,
        clientPointsAwarded: row.client_points_awarded ?? null,
        answeredAt: row.answered_at,
      });
      if (row.item_type === 'observation_checklist' && row.milestone_id && row.observed_band) {
        observations.push({
          milestoneId: row.milestone_id,
          band: row.observed_band as Band,
          note: row.evidence_note ?? null,
        });
      }
    }
    if (page.length < 1000) break;
  }
  return { responses, observations };
}

/** Existing overrides, so re-running complete never quietly discards a judgement. */
export async function loadExistingOverrides(
  supabase: LensDbClient,
  sessionId: string,
): Promise<TeacherOverride[]> {
  const { data, error } = await supabase
    .from('lens_assessment_milestone_results')
    .select('milestone_id, band_final, band_source, override_reason')
    .eq('session_id', sessionId)
    .eq('band_source', 'teacher_override');
  if (error) raise('load overrides', error);
  return ((data ?? []) as any[])
    .filter((r) => r.override_reason)
    .map((r) => ({ milestoneId: r.milestone_id, band: r.band_final, reason: r.override_reason }));
}

/**
 * Earlier completed check-ins filed under the SAME NAME by the same observer at
 * the same school. Candidates only.
 *
 * 🚨 AN ALIAS IS NOT AN IDENTITY, AND THIS FUNCTION NEVER PRETENDS IT IS.
 * Montree links a child's sittings by a child id issued from a roster. Lens has
 * no roster: it has a string an adult typed while standing at the back of a
 * room. Two children called Leo in the same nursery produce two identical
 * strings, and a system that quietly treats them as one person will report one
 * child's growth under the other child's name — the single worst thing this
 * feature could do.
 *
 * So: this returns POSSIBILITIES, each with the reasons it may not be
 * comparable even if it IS the same child (see comparabilityFlags). Nothing
 * downstream may compute a change, a delta or a growth summary from what comes
 * back here without a human first confirming, per comparison, that these are the
 * same person. finalizeSession does not call it at all.
 */
export interface PossibleAliasMatch {
  id: string;
  school_year: string;
  window_code: WindowCode;
  age_band: string;
  form_code: string;
  completed_at: string | null;
  /** Why this may not be a like-for-like comparison even if it is the same child. */
  comparabilityFlags: string[];
  /** Always false here. There is no code path in Lens that sets it true. */
  confirmedSameChild: false;
}

export async function listPossibleAliasMatches(
  supabase: LensDbClient,
  args: {
    observerId: string; schoolId: string; childAlias: string;
    ageBand: string; formCode: string; excludeSessionId?: string;
  },
): Promise<PossibleAliasMatch[]> {
  const { data, error } = await supabase
    .from('lens_assessment_sessions')
    .select('id, school_year, window_code, age_band, form_code, completed_at, status')
    // Same observer AND same school AND the same trimmed name. Still not proof.
    .eq('observer_id', args.observerId)
    .eq('school_id', args.schoolId)
    .eq('child_alias', args.childAlias)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20);
  if (error) raise('list possible alias matches', error);

  return ((data ?? []) as any[])
    .filter((r) => r.id !== args.excludeSessionId)
    .map((r) => ({
      id: r.id as string,
      school_year: r.school_year as string,
      window_code: r.window_code as WindowCode,
      age_band: r.age_band as string,
      form_code: r.form_code as string,
      completed_at: (r.completed_at ?? null) as string | null,
      comparabilityFlags: comparabilityFlags(
        { age_band: args.ageBand, form_code: args.formCode },
        { age_band: r.age_band, form_code: r.form_code },
      ),
      confirmedSameChild: false as const,
    }));
}

/**
 * The milestone rows of ONE named earlier session, for a comparison a human has
 * already confirmed is the same child.
 *
 * The prior session id must be passed in explicitly — there is deliberately no
 * "find the previous one" behind this. Ownership is re-proved on the load rather
 * than assumed from the caller, so a confirmed comparison still cannot reach
 * another observer's data.
 */
export async function loadConfirmedPriorResults(
  supabase: LensDbClient,
  args: { observerId: string; priorSessionId: string },
): Promise<{ results: GrowthInputResult[]; window: WindowCode | null; schoolYear: string | null }> {
  const { data, error } = await supabase
    .from('lens_assessment_sessions')
    .select('id, school_year, window_code, status')
    .eq('id', args.priorSessionId)
    .eq('observer_id', args.observerId)
    .maybeSingle();
  if (error) raise('load confirmed prior session', error);
  const prior = data as { id: string; school_year: string; window_code: WindowCode; status: string } | null;
  if (!prior || prior.status !== 'completed') return { results: [], window: null, schoolYear: null };

  const { data: rows, error: rErr } = await supabase
    .from('lens_assessment_milestone_results')
    .select('milestone_id, domain_id, track, band_final')
    .eq('session_id', prior.id)
    .eq('observer_id', args.observerId);
  if (rErr) raise('load confirmed prior results', rErr);

  return {
    results: ((rows ?? []) as any[]).map((r) => ({
      milestoneId: r.milestone_id,
      domainId: r.domain_id,
      track: r.track,
      bandFinal: r.band_final,
    })),
    window: prior.window_code,
    schoolYear: prior.school_year,
  };
}

/**
 * Void every observation row on a session whose co-rating claim has been
 * withdrawn.
 *
 * NOTHING IS DELETED. This file deletes nothing, ever, and a row that was once
 * real evidence is part of the record of what happened — so the rows are turned
 * into what they now are: not-administered, with the reason written down. The
 * band is cleared as well as the flag, so there is no field left for a future
 * reader to reconstruct a rating from.
 *
 * 🚨 VOIDING IS ONE-WAY. A later re-import that turns co-rating back on re-opens
 * the observation section for NEW ratings; it does not un-void these. A voided
 * row only carries evidence again if a fresh upload supplies a fresh rating for
 * that same item, which is a new write by somebody making a new claim — not the
 * old claim coming back because a flag moved.
 */
export const OBSERVATION_VOID_REASON = 'observation_voided_not_co_rated';

export async function voidObservationEvidence(
  supabase: LensDbClient,
  args: { sessionId: string; observerId: string },
): Promise<number> {
  const { data, error } = await supabase
    .from('lens_assessment_item_responses')
    .update({
      administered: false,
      skipped_reason: OBSERVATION_VOID_REASON,
      observed_band: null,
      points_awarded: 0,
      is_correct: null,
    })
    .eq('session_id', args.sessionId)
    // Repeated rather than trusted from the caller, as on every other write here.
    .eq('observer_id', args.observerId)
    .eq('item_type', 'observation_checklist')
    .select('id');
  if (error) raise('void observation evidence', error);
  return ((data ?? []) as any[]).length;
}

/* ────────────────────────────────────────────────────────────── persisting */

export interface PersistResponsesArgs {
  supabase: LensDbClient;
  session: LensAssessmentSessionRow;
  responses: RawItemResponse[];
}

/**
 * Store raw responses, re-scored server-side.
 *
 * Idempotent on (session_id, item_id) so a runner that retries a batch after a
 * dropped connection cannot double-write, and so keying a paper sheet in twice
 * corrects rather than duplicates.
 */
export async function persistResponses(args: PersistResponsesArgs): Promise<{
  written: number; scored: ScoredItemResponse[]; unknownItemIds: string[]; disagreements: number;
}> {
  const index = getBankIndex();
  const rows: Record<string, unknown>[] = [];
  const scored: ScoredItemResponse[] = [];
  const unknownItemIds: string[] = [];
  const session = args.session;

  for (const raw of args.responses) {
    const item = index.itemById.get(raw.itemId);
    if (!item) { unknownItemIds.push(raw.itemId); continue; }
    const s = scoreSession({
      ageBand: session.age_band,
      formCode: session.form_code,
      modules: session.modules ?? [],
      assessmentLocale: session.assessment_locale,
      responses: [raw],
      index,
    }).scored[0];
    scored.push(s);

    rows.push({
      session_id: session.id,
      observer_id: session.observer_id,
      school_id: session.school_id,
      classroom_id: session.classroom_id,
      child_alias: session.child_alias,
      item_id: item.id,
      milestone_id: item.milestoneId ?? null,
      strand_id: item.strandId,
      module_id: item.moduleId,
      age_band: item.ageBand,
      form_code: item.form,
      item_type: item.type,
      response: {
        optionIds: raw.optionIds ?? null,
        sequence: raw.sequence ?? null,
        rubricScore: raw.rubricScore ?? null,
        band: raw.band ?? null,
        note: raw.note ?? null,
      },
      points_awarded: s.pointsAwarded,
      points_possible: s.pointsPossible,
      is_correct: s.isCorrect,
      observed_band: s.band ?? raw.band ?? null,
      attempts: raw.attempts ?? 1,
      replay_count: raw.replayCount ?? 0,
      latency_ms: raw.latencyMs ?? null,
      administered: raw.administered !== false,
      skipped_reason: raw.skippedReason ?? null,
      client_points_awarded: typeof raw.clientPointsAwarded === 'number' ? raw.clientPointsAwarded : null,
      evidence_note: raw.note ? String(raw.note).slice(0, 300) : null,
      answered_at: raw.answeredAt ?? new Date().toISOString(),
    });
  }

  if (rows.length) {
    const { error } = await args.supabase
      .from('lens_assessment_item_responses')
      .upsert(rows, { onConflict: 'session_id,item_id' });
    if (error) raise('write responses', error);
  }

  const disagreements = scored.filter((s) => s.clientDisagreement).length;
  if (disagreements) {
    console.warn(
      `[lens/assessment] session ${session.id}: ${disagreements} response(s) where the client's own ` +
      'arithmetic disagreed with the server re-score. Server value stored; client value kept for audit.',
    );
  }
  return { written: rows.length, scored, unknownItemIds, disagreements };
}

/* ───────────────────────────────────────────────────────────── finalisation */

export interface FinalizeArgs {
  supabase: LensDbClient;
  session: LensAssessmentSessionRow;
  overrides?: TeacherOverride[];
  durationSeconds?: number | null;
  status?: 'completed' | 'abandoned';
  overrideById?: string | null;
  /**
   * A prior sitting a HUMAN has confirmed is the same child. Absent by default,
   * and absent is the only value any current caller passes: growth is never
   * derived from an alias match. See listPossibleAliasMatches().
   */
  confirmedPriorSessionId?: string | null;
}

export interface FinalizeOutput {
  session: LensAssessmentSessionRow;
  summary: SessionSummary;
  results: MilestoneResult[];
  growth: GrowthSummary | null;
  warnings: string[];
}

/**
 * Re-score the whole sitting from stored raw evidence, write one row per
 * milestone, and stamp the session summary.
 *
 * Idempotent — safe to call again after a late observation or an edited
 * override, and safe to call on an already-completed session (the caller decides
 * whether to allow that; nothing here corrupts on a second run).
 */
export async function finalizeSession(args: FinalizeArgs): Promise<FinalizeOutput> {
  const index = getBankIndex();
  const { supabase, session } = args;

  const { responses: storedResponses, observations: storedObservations } =
    await loadRawResponses(supabase, session.id);

  // 🚨 THE CO-RATING GATE IS ENFORCED AT SCORE TIME, NOT ONLY AT WRITE TIME.
  // items/route.ts and paper-entry/route.ts both refuse an observation rating on
  // a sitting that is not co-rated, but a refusal at the door only governs rows
  // written AFTER the door was closed. A session can be co-rated, collect real
  // observation rows, and then be re-imported with co_rated:false — at which
  // point every one of those rows is still sitting in the table, and a scorer
  // that reads them would band milestones from ratings the session no longer
  // claims anybody qualified gave. The fact is read fresh from THIS row on every
  // re-score, so whatever the current answer is, the evidence matches it.
  const coRated = readSessionFacts(session.summary_json).coRated;
  const responses = coRated
    ? storedResponses
    : storedResponses.filter((r) => index.itemById.get(r.itemId)?.type !== 'observation_checklist');
  const observations = coRated ? storedObservations : [];

  const storedOverrides = await loadExistingOverrides(supabase, session.id);
  const overrideMap = new Map<string, TeacherOverride>();
  for (const o of storedOverrides) overrideMap.set(o.milestoneId, o);
  for (const o of args.overrides ?? []) {
    if (o.reason?.trim()) overrideMap.set(o.milestoneId, o);
  }

  // 🚨 NO AUTOMATIC GROWTH. This used to reach for "the last check-in under the
  // same name" and hand it to the scorer as a previous window, which turned a
  // typed string into an identity claim and produced a growth sentence about a
  // child who might be a different child entirely. A comparison now happens only
  // when a human has confirmed, for that specific pair of sittings, that they are
  // the same person — and the caller must name the prior session to say so.
  // listPossibleAliasMatches() surfaces the candidates; nothing else may.
  const previous = args.confirmedPriorSessionId
    ? await loadConfirmedPriorResults(supabase, {
      observerId: session.observer_id,
      priorSessionId: args.confirmedPriorSessionId,
    })
    : { results: [] as GrowthInputResult[], window: null as WindowCode | null, schoolYear: null as string | null };

  const scoredSession = scoreSession({
    ageBand: session.age_band as AgeBand,
    formCode: session.form_code as FormCode,
    modules: session.modules ?? [],
    assessmentLocale: session.assessment_locale,
    responses,
    observations,
    overrides: [...overrideMap.values()],
    previousResults: previous.results,
    previousWindow: previous.window,
    currentWindow: session.window_code,
    index,
  });

  const resultRows = scoredSession.results.map((r) => ({
    session_id: session.id,
    observer_id: session.observer_id,
    school_id: session.school_id,
    classroom_id: session.classroom_id,
    child_alias: session.child_alias,
    school_year: session.school_year,
    window_code: session.window_code,
    milestone_id: r.milestoneId,
    strand_id: r.strandId,
    domain_id: r.domainId,
    track: r.track,
    age_band: r.ageBand,
    expectation: r.expectation,
    band_computed: r.bandComputed,
    band_final: r.bandFinal,
    band_source: r.bandSource,
    override_reason: r.overrideReason,
    override_by_id: r.bandSource === 'teacher_override' ? (args.overrideById ?? null) : null,
    coverage: r.coverage,
    points_earned: r.pointsEarned,
    points_possible: r.pointsPossible,
    evidence_note: r.evidenceNote,
  }));

  if (resultRows.length) {
    const { error } = await supabase
      .from('lens_assessment_milestone_results')
      .upsert(resultRows, { onConflict: 'session_id,milestone_id' });
    if (error) raise('write milestone results', error);
  }

  const summary = scoredSession.summary;
  const counts = summary.counts;
  const patch = {
    status: args.status ?? 'completed',
    completed_at: new Date().toISOString(),
    duration_seconds: args.durationSeconds ?? session.duration_seconds ?? null,
    map_percent: summary.core.mapPercent,
    map_denominator: summary.core.denominator,
    map_suppressed: summary.core.suppressed,
    milestones_secure: counts.secure,
    milestones_developing: counts.developing,
    milestones_emerging: counts.emerging,
    milestones_unassessed: counts.unassessed,
    milestones_exceeded: summary.core.exceeded + summary.efl.exceeded,
    override_count: summary.overrideCount,
    efl_map_percent: summary.efl.mapPercent,
    efl_map_denominator: summary.efl.denominator,
    efl_map_suppressed: summary.efl.suppressed,
    // The scorer's summary knows nothing about co-rating. Merging the stored
    // facts back over it is what stops a finished check-in from forgetting that
    // an adult who knows the child was in the room — or that one was not.
    summary_json: mergeSessionFacts(summary, session.summary_json),
    bank_version: index.bank.bankVersion,
    bank_checksum: index.bank.bankChecksum,
  };

  // The observer_id filter is repeated on the write, not merely trusted from the
  // load: an UPDATE without it would be one refactor away from touching another
  // observer's row.
  const { data, error } = await supabase
    .from('lens_assessment_sessions')
    .update(patch)
    .eq('id', session.id)
    .eq('observer_id', session.observer_id)
    .select('*')
    .maybeSingle();
  if (error) raise('update session summary', error);

  return {
    session: (data as unknown as LensAssessmentSessionRow) ?? ({ ...session, ...patch } as LensAssessmentSessionRow),
    summary,
    results: scoredSession.results,
    growth: summary.growth ?? null,
    warnings: scoredSession.warnings,
  };
}

/* ──────────────────────────────────────────────────────────────── growth */

export function growthFromRows(
  previous: Array<{ milestone_id: string; domain_id: string; track: string; band_final: string }>,
  current: Array<{ milestone_id: string; domain_id: string; track: string; band_final: string }>,
): GrowthSummary {
  const adapt = (rows: typeof previous): GrowthInputResult[] =>
    rows.map((r) => ({
      milestoneId: r.milestone_id,
      domainId: r.domain_id,
      track: r.track as GrowthInputResult['track'],
      bandFinal: r.band_final as GrowthInputResult['bandFinal'],
    }));
  return computeGrowth(adapt(previous), adapt(current));
}
