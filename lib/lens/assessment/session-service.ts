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
 * The most recent completed check-in for this alias BEFORE the given window.
 *
 * 🚨 THE ALIAS MATCH IS DELIBERATELY NARROW. Montree matches growth on a child
 * id; Lens has only a name the observer typed, so the match requires the SAME
 * observer, the SAME school and the same trimmed alias before two sittings are
 * treated as the same child. Two "Ana"s at different schools, or the same name
 * seen by two observers, never merge. Even so this is a judgement about a
 * string: growth is presented as "compared with the last check-in under this
 * name", never as an identity claim.
 */
export async function loadPreviousWindowResults(
  supabase: LensDbClient,
  args: {
    observerId: string; schoolId: string; childAlias: string;
    schoolYear: string; windowCode: WindowCode; excludeSessionId: string;
  },
): Promise<{ results: GrowthInputResult[]; window: WindowCode | null; schoolYear: string | null }> {
  const { data, error } = await supabase
    .from('lens_assessment_sessions')
    .select('id, school_year, window_code, completed_at, status')
    .eq('observer_id', args.observerId)
    .eq('school_id', args.schoolId)
    .eq('child_alias', args.childAlias)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20);
  if (error) raise('load prior sessions', error);

  const currentKey = windowSortKey(args.schoolYear, args.windowCode);
  const prior = ((data ?? []) as any[])
    .filter((s) => s.id !== args.excludeSessionId)
    .filter((s) => windowSortKey(s.school_year, s.window_code) < currentKey)
    .sort((a, b) => windowSortKey(b.school_year, b.window_code)
      .localeCompare(windowSortKey(a.school_year, a.window_code)))[0];
  if (!prior) return { results: [], window: null, schoolYear: null };

  const { data: rows, error: rErr } = await supabase
    .from('lens_assessment_milestone_results')
    .select('milestone_id, domain_id, track, band_final')
    .eq('session_id', prior.id);
  if (rErr) raise('load prior results', rErr);

  return {
    results: ((rows ?? []) as any[]).map((r) => ({
      milestoneId: r.milestone_id,
      domainId: r.domain_id,
      track: r.track,
      bandFinal: r.band_final,
    })),
    window: prior.window_code as WindowCode,
    schoolYear: prior.school_year as string,
  };
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

  const { responses, observations } = await loadRawResponses(supabase, session.id);
  const storedOverrides = await loadExistingOverrides(supabase, session.id);
  const overrideMap = new Map<string, TeacherOverride>();
  for (const o of storedOverrides) overrideMap.set(o.milestoneId, o);
  for (const o of args.overrides ?? []) {
    if (o.reason?.trim()) overrideMap.set(o.milestoneId, o);
  }

  const previous = await loadPreviousWindowResults(supabase, {
    observerId: session.observer_id,
    schoolId: session.school_id,
    childAlias: session.child_alias,
    schoolYear: session.school_year,
    windowCode: session.window_code,
    excludeSessionId: session.id,
  });

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
    summary_json: summary,
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
