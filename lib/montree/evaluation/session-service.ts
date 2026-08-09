/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Montree Milestones — session persistence and finalisation.
 *
 * Shared by POST /sessions/[id]/complete and POST /import so the two paths can never
 * diverge: both re-score from the bank, both write the same rows, both refuse to write
 * before probing that the target columns exist.
 *
 * Nothing in this file deletes anything.
 */
import { getBankIndex } from './bank';
import { CANOPY_BAND, COHORT_MIN_CHILDREN } from './constants';
import { isCheckConstraintViolation, isMigrationPendingError, type RouteContext } from './route-helpers';
import { computeGrowth, scoreSession } from './scoring';
import type {
  AgeBand, Band, EvaluationMilestoneResultRow, EvaluationSessionRow, FormCode, GrowthInputResult,
  GrowthSummary, MilestoneResult, RawItemResponse, ScoredItemResponse, SessionSummary,
  TeacherOverride, WindowCode,
} from './types';
import type { SupabaseLike } from './montree-bridge';

export const WINDOW_ORDER: WindowCode[] = ['autumn', 'winter', 'spring'];

/** Sortable key so "the previous check-in" is unambiguous across school years. */
export function windowSortKey(schoolYear: string, windowCode: WindowCode): string {
  const idx = Math.max(0, WINDOW_ORDER.indexOf(windowCode));
  return `${schoolYear}#${idx}`;
}

export class ServiceError extends Error {
  constructor(message: string, readonly cause: unknown, readonly migrationPending = false) {
    super(message);
    this.name = 'ServiceError';
  }
}

const raise = (where: string, error: unknown): never => {
  throw new ServiceError(where, error, isMigrationPendingError(error));
};

/* ──────────────────────────────────────────────────────────── bank versions */

/** Record which bank produced these results. Idempotent; failure never blocks a check-in. */
export async function ensureBankVersionRow(supabase: SupabaseLike): Promise<void> {
  const { bank } = getBankIndex();
  const { error } = await supabase
    .from('montree_evaluation_bank_versions')
    .upsert({
      bank_version: bank.bankVersion,
      bank_checksum: bank.bankChecksum,
      schema_version: bank.schemaVersion,
      item_count: bank.items.length,
      milestone_count: bank.milestones.length,
      stimulus_count: bank.stimuli.length,
      notes: bank.attribution?.note ?? null,
    }, { onConflict: 'bank_version' });
  if (error && !isMigrationPendingError(error)) {
    console.warn('[montree-milestones] bank version row not written:', error);
  }
}

/* ─────────────────────────────────────────────────────────────── loading */

export async function loadSession(
  supabase: SupabaseLike,
  sessionId: string,
  schoolId: string,
): Promise<EvaluationSessionRow | null> {
  const { data, error } = await supabase
    .from('montree_evaluation_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('school_id', schoolId)      // tenancy filter, always, on every read
    .maybeSingle();
  if (error) raise('load session', error);
  return (data as EvaluationSessionRow) ?? null;
}

/** Rebuild the raw responses for a session in the shape the scorer wants. */
export async function loadRawResponses(
  supabase: SupabaseLike,
  sessionId: string,
): Promise<{ responses: RawItemResponse[]; observations: Array<{ milestoneId: string; band: Band; note?: string | null; evidenceMediaId?: string | null }> }> {
  const responses: RawItemResponse[] = [];
  const observations: Array<{ milestoneId: string; band: Band; note?: string | null; evidenceMediaId?: string | null }> = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('montree_evaluation_item_responses')
      .select('item_id, milestone_id, item_type, response, observed_band, attempts, replay_count, latency_ms, administered, skipped_reason, client_points_awarded, evidence_note, evidence_media_id, answered_at')
      .eq('session_id', sessionId)
      .order('answered_at', { ascending: true })
      .range(from, from + 999);
    if (error) raise('load responses', error);
    const page = (data ?? []) as any[];
    for (const row of page) {
      const payload = (row.response ?? {}) as RawItemResponse;
      responses.push({
        itemId: row.item_id,
        optionIds: payload.optionIds,
        sequence: payload.sequence,
        rubricScore: payload.rubricScore,
        band: (row.observed_band ?? payload.band) as Band | undefined,
        note: row.evidence_note ?? payload.note,
        evidenceMediaId: row.evidence_media_id ?? null,
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
          evidenceMediaId: row.evidence_media_id ?? null,
        });
      }
    }
    if (page.length < 1000) break;
  }
  return { responses, observations };
}

/** Existing overrides, so re-running `complete` never quietly discards a teacher's judgement. */
export async function loadExistingOverrides(
  supabase: SupabaseLike,
  sessionId: string,
): Promise<TeacherOverride[]> {
  const { data, error } = await supabase
    .from('montree_evaluation_milestone_results')
    .select('milestone_id, band_final, band_source, override_reason')
    .eq('session_id', sessionId)
    .eq('band_source', 'teacher_override');
  if (error) raise('load overrides', error);
  return ((data ?? []) as any[])
    .filter((r) => r.override_reason)
    .map((r) => ({ milestoneId: r.milestone_id, band: r.band_final, reason: r.override_reason }));
}

/** The most recent completed check-in for this child BEFORE the given window. */
export async function loadPreviousWindowResults(
  supabase: SupabaseLike,
  args: { childId: string; schoolId: string; schoolYear: string; windowCode: WindowCode },
): Promise<{ results: GrowthInputResult[]; window: WindowCode | null; schoolYear: string | null }> {
  const { data, error } = await supabase
    .from('montree_evaluation_sessions')
    .select('id, school_year, window_code, completed_at, status')
    .eq('child_id', args.childId)
    .eq('school_id', args.schoolId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20);
  if (error) raise('load prior sessions', error);

  const currentKey = windowSortKey(args.schoolYear, args.windowCode);
  const prior = ((data ?? []) as any[])
    .filter((s) => windowSortKey(s.school_year, s.window_code) < currentKey)
    .sort((a, b) => windowSortKey(b.school_year, b.window_code).localeCompare(windowSortKey(a.school_year, a.window_code)))[0];
  if (!prior) return { results: [], window: null, schoolYear: null };

  const { data: rows, error: rErr } = await supabase
    .from('montree_evaluation_milestone_results')
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
  ctx: RouteContext;
  session: EvaluationSessionRow;
  responses: RawItemResponse[];
}

/**
 * Store raw responses, re-scored server-side. Idempotent on (session_id, item_id) so a
 * tablet that retries a batch after a dropped connection cannot double-write.
 */
export async function persistResponses(args: PersistResponsesArgs): Promise<{
  written: number; scored: ScoredItemResponse[]; unknownItemIds: string[]; disagreements: number;
}> {
  const index = getBankIndex();
  const rows: Record<string, unknown>[] = [];
  const scored: ScoredItemResponse[] = [];
  const unknownItemIds: string[] = [];

  for (const raw of args.responses) {
    const item = index.itemById.get(raw.itemId);
    if (!item) { unknownItemIds.push(raw.itemId); continue; }
    const s = scoreSession({
      ageBand: args.session.age_band,
      formCode: args.session.form_code,
      modules: args.session.modules ?? [],
      assessmentLocale: args.session.assessment_locale,
      responses: [raw],
      index,
    }).scored[0];
    scored.push(s);

    rows.push({
      session_id: args.session.id,
      school_id: args.session.school_id,
      classroom_id: args.session.classroom_id,
      child_id: args.session.child_id,
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
      evidence_media_id: raw.evidenceMediaId ?? null,
      answered_at: raw.answeredAt ?? new Date().toISOString(),
    });
  }

  if (rows.length) {
    const { error } = await args.ctx.supabase
      .from('montree_evaluation_item_responses')
      .upsert(rows, { onConflict: 'session_id,item_id' });
    if (error) raise('write responses', error);
  }

  const disagreements = scored.filter((s) => s.clientDisagreement).length;
  if (disagreements) {
    console.warn(
      `[montree-milestones] session ${args.session.id}: ${disagreements} response(s) where the client's ` +
      'own arithmetic disagreed with the server re-score. Server value stored; client value kept for audit.',
    );
  }
  return { written: rows.length, scored, unknownItemIds, disagreements };
}

/* ───────────────────────────────────────────────────────────── finalisation */

export interface FinalizeArgs {
  ctx: RouteContext;
  session: EvaluationSessionRow;
  overrides?: TeacherOverride[];
  durationSeconds?: number | null;
  status?: 'completed' | 'abandoned';
  overrideByRole?: EvaluationSessionRow['administered_by_role'];
  overrideById?: string | null;
}

export interface FinalizeOutput {
  session: EvaluationSessionRow;
  summary: SessionSummary;
  results: MilestoneResult[];
  growth: GrowthSummary | null;
  warnings: string[];
}

/**
 * Re-score the whole sitting from stored raw evidence, write one row per milestone, and
 * stamp the session summary. Idempotent: safe to call again after a teacher edits an
 * override or adds a late observation.
 */
export async function finalizeSession(args: FinalizeArgs): Promise<FinalizeOutput> {
  const index = getBankIndex();
  const { supabase } = args.ctx;
  const session = args.session;

  const { responses, observations } = await loadRawResponses(supabase, session.id);
  const storedOverrides = await loadExistingOverrides(supabase, session.id);
  const overrideMap = new Map<string, TeacherOverride>();
  for (const o of storedOverrides) overrideMap.set(o.milestoneId, o);
  for (const o of args.overrides ?? []) {
    if (o.reason?.trim()) overrideMap.set(o.milestoneId, o);
  }

  const previous = await loadPreviousWindowResults(supabase, {
    childId: session.child_id,
    schoolId: session.school_id,
    schoolYear: session.school_year,
    windowCode: session.window_code,
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
    school_id: session.school_id,
    classroom_id: session.classroom_id,
    child_id: session.child_id,
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
    override_by_role: r.bandSource === 'teacher_override' ? (args.overrideByRole ?? null) : null,
    override_by_id: r.bandSource === 'teacher_override' ? (args.overrideById ?? null) : null,
    coverage: r.coverage,
    points_earned: r.pointsEarned,
    points_possible: r.pointsPossible,
    evidence_note: r.evidenceNote,
    evidence_media_id: r.evidenceMediaId,
  }));

  if (resultRows.length) {
    const { error } = await supabase
      .from('montree_evaluation_milestone_results')
      .upsert(resultRows, { onConflict: 'session_id,milestone_id' });
    if (error) {
      // Defence in depth for Montree Canopy. A G1 session cannot be created before
      // migration 322 widens the sessions CHECK, so this results-table CHECK should be
      // unreachable — but if a G1 row ever arrives ahead of the SQL, it degrades to a
      // clean "migration pending" 503 instead of an opaque 500 mid-finalisation.
      if (session.age_band === CANOPY_BAND && isCheckConstraintViolation(error)) {
        throw new ServiceError('write milestone results', error, true);
      }
      raise('write milestone results', error);
    }
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

  const { data, error } = await supabase
    .from('montree_evaluation_sessions')
    .update(patch)
    .eq('id', session.id)
    .eq('school_id', session.school_id)
    .select('*')
    .maybeSingle();
  if (error) raise('update session summary', error);

  await ensureBankVersionRow(supabase);

  return {
    session: (data as EvaluationSessionRow) ?? { ...session, ...patch } as EvaluationSessionRow,
    summary,
    results: scoredSession.results,
    growth: summary.growth ?? null,
    warnings: scoredSession.warnings,
  };
}

/* ───────────────────────────────────────────────── read-only classroom side */

/**
 * The "what the classroom says" half of a report. Both sources are READ-ONLY here — this
 * module never writes to montree_child_progress or montree_child_english_progress.
 */
export async function loadClassroomPosition(supabase: SupabaseLike, childId: string) {
  const byArea = new Map<string, { area: string; not_started: number; presented: number; practicing: number; mastered: number }>();

  const { data: progress, error: pErr } = await supabase
    .from('montree_child_progress')
    .select('area, status')
    .eq('child_id', childId)
    .limit(2000);
  if (pErr && !isMigrationPendingError(pErr)) {
    console.warn('[montree-milestones] montree_child_progress read failed:', pErr);
  }
  for (const row of ((progress ?? []) as any[])) {
    const area = row.area ?? 'unknown';
    const bucket = byArea.get(area) ?? { area, not_started: 0, presented: 0, practicing: 0, mastered: 0 };
    const status = typeof row.status === 'number'
      ? (['not_started', 'presented', 'practicing', 'mastered'][row.status] ?? 'not_started')
      : String(row.status ?? 'not_started');
    if (status in bucket) (bucket as any)[status] += 1;
    byArea.set(area, bucket);
  }

  let english: { current_phase: string; current_lesson: number; mastered_lessons: number[] } | null = null;
  const { data: eng, error: eErr } = await supabase
    .from('montree_child_english_progress')
    .select('current_phase, current_lesson, mastered_lessons')
    .eq('child_id', childId)
    .maybeSingle();
  if (eErr && !isMigrationPendingError(eErr)) {
    console.warn('[montree-milestones] montree_child_english_progress read failed:', eErr);
  }
  if (eng) {
    english = {
      current_phase: eng.current_phase,
      current_lesson: eng.current_lesson,
      mastered_lessons: eng.mastered_lessons ?? [],
    };
  }

  return { montessori: [...byArea.values()].sort((a, b) => a.area.localeCompare(b.area)), english };
}

/* ────────────────────────────────────────────────────────── cohort helpers */

export const COHORT_SUPPRESSION_MIN = COHORT_MIN_CHILDREN;

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

export type { EvaluationMilestoneResultRow };
