/**
 * Montree Milestones — the check-in runner's state machine.
 *
 * A direct port of the standalone tablet build (build/D2_montree_milestones_app.html):
 * same step order, same stop rules, same extension rule, same "practice is never part of
 * the record" boundary. It lives in `lib/` rather than in the component so it can be
 * exercised without a DOM — the flow rules are the part of this feature a child feels.
 *
 * TWO THINGS THIS FILE DELIBERATELY DOES NOT DO
 *
 *  1. It does not import `./bank`. That module pulls in the 1.6 MB `item-bank.json`, and
 *     this file runs in the browser. The runner is handed a projection instead
 *     (`bank-projection.ts`), so only the slice one sitting needs crosses the wire.
 *  2. It does not decide bands. Client point totals are recorded as
 *     `clientPointsAwarded` for audit only; the server re-scores everything from the full
 *     bank in `scoring.ts`. Two scorers would eventually disagree, and the one a parent
 *     reads must be the server's.
 */
import type {
  AgeBand, Band, BankItem, BankModule, FormCode, RawItemResponse, Strand, WindowCode,
} from './types';
import type { ProjectedBank } from './bank-projection';

/* ───────────────────────────────────────────────────────────────── lookups */

export interface RunnerIndex {
  itemById: Map<string, BankItem>;
  strandById: Map<string, Strand>;
  moduleById: Map<string, BankModule>;
  stimulusById: Map<string, ProjectedBank['stimuli'][number]>;
  /** milestoneId → the observation item that rates it 1:1. */
  observationItemByMilestoneId: Map<string, BankItem>;
}

export function buildRunnerIndex(bank: ProjectedBank): RunnerIndex {
  const observationItemByMilestoneId = new Map<string, BankItem>();
  for (const item of bank.items) {
    if (item.type === 'observation_checklist' && item.milestoneId) {
      observationItemByMilestoneId.set(item.milestoneId, item);
    }
  }
  return {
    itemById: new Map(bank.items.map((i) => [i.id, i])),
    strandById: new Map(bank.strands.map((s) => [s.id, s])),
    moduleById: new Map(bank.modules.map((m) => [m.id, m])),
    stimulusById: new Map(bank.stimuli.map((s) => [s.id, s])),
    observationItemByMilestoneId,
  };
}

/* ───────────────────────────────────────────────────────────────── state */

export type RunPhase =
  | 'intro'        // "let's play X together" before each module
  | 'practice'     // practice item on screen
  | 'item'         // scored item on screen
  | 'rest'         // between-module break: carry on / stop for now / finish here
  | 'paused'
  | 'observation'  // teacher-rated checklist, no child present
  | 'close';       // the warm close — identical regardless of what happened

export interface RunStep {
  kind: 'practice' | 'item';
  itemId: string;
  moduleId: string;
  /** True for an item borrowed from the band above under the extension rule. */
  extension: boolean;
  skipped: boolean;
  skipReason: string | null;
}

export interface StoredResponse {
  itemId: string;
  strandId: string;
  moduleId: string;
  optionIds?: string[];
  sequence?: string[];
  rubricScore?: number;
  band?: Band;
  note?: string;
  clientPointsAwarded: number;
  pointsPossible: number;
  administered: boolean;
  skippedReason: string | null;
  extension: boolean;
  latencyMs: number | null;
  replayCount: number;
  answeredAt: string;
}

export interface RunConfig {
  childId: string;
  ageBand: AgeBand;
  ageMonths: number | null;
  formCode: FormCode;
  windowCode: WindowCode;
  schoolYear: string;
  moduleIds: string[];
  assessmentLocale: string;
}

export interface RunState {
  /** Server session id once created; null while a sitting is being set up offline. */
  sessionId: string | null;
  localId: string;
  config: RunConfig;
  /** Modules with a child present, in order. M-OBS is handled after these. */
  directModules: string[];
  moduleIndex: number;
  steps: RunStep[];
  stepIndex: number;
  responses: Record<string, StoredResponse>;
  observations: Record<string, { band: Band; note?: string }>;
  strandStreak: Record<string, number>;
  moduleStreak: number;
  extensionUsed: Record<string, boolean>;
  phase: RunPhase;
  startedAt: string;
  startedMs: number;
  completedAt: string | null;
  durationSeconds: number | null;
  bankVersion: string;
  bankChecksum: string;
}

const BAND_UP: Record<AgeBand, AgeBand | null> = { A3: 'A4', A4: 'A5', A5: null };

export function newLocalId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* older webview */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* ───────────────────────────────────────────── age, window and form defaults
 *
 * These mirror `bank.ts` (`ageBandFromMonths`, `defaultFormForWindow`) and
 * `route-helpers.ts` (`ageMonthsFromBirthDate`) so the setup screen can suggest a band
 * without importing the 1.6 MB bank into the browser. They are SUGGESTIONS: the server
 * re-derives the band it stores, and a teacher may deliberately override it (a child new
 * to English, a child who has just turned five mid-window).
 */

/** Whole months between a date of birth and a reference date. Local-date safe. */
export function ageMonthsFromBirthDate(birthDate: string | null | undefined, at: Date = new Date()): number | null {
  if (!birthDate) return null;
  const dob = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let months = (at.getFullYear() - dob.getFullYear()) * 12 + (at.getMonth() - dob.getMonth());
  if (at.getDate() < dob.getDate()) months -= 1;
  return months >= 0 ? months : null;
}

export function ageBandFromMonths(ageMonths: number): AgeBand {
  if (ageMonths < 48) return 'A3';
  if (ageMonths < 60) return 'A4';
  return 'A5';
}

/** Autumn→A, Winter→B, Spring→A (ARCHITECTURE.md §4.3). Overridable by the teacher. */
export function defaultFormForWindow(windowCode: WindowCode): FormCode {
  return windowCode === 'winter' ? 'B' : 'A';
}

/** Which window a date falls in, on a September-start school year. */
export function windowForDate(at: Date = new Date()): WindowCode {
  const month = at.getMonth(); // 0 = January
  if (month >= 8 && month <= 11) return 'autumn';   // Sep–Dec
  if (month >= 0 && month <= 2) return 'winter';    // Jan–Mar
  return 'spring';                                   // Apr–Aug
}

/** `2026-2027`, matching `schoolYearFor()` in constants.ts. */
export function schoolYearForDate(at: Date = new Date(), yearStartMonth = 8): string {
  const year = at.getFullYear();
  const start = at.getMonth() >= yearStartMonth ? year : year - 1;
  return `${start}-${start + 1}`;
}

/* ─────────────────────────────────────────────────────── bank field readers */

export const correctOptionIds = (item: BankItem): string[] => item.scoring?.correctOptionIds ?? [];
export const correctSequence = (item: BankItem): string[] => item.scoring?.correctSequence ?? [];

/** How many taps make one answer. `listen_do` items want a sequence; everything else, one. */
export function tapsNeeded(item: BankItem): number {
  const seq = correctSequence(item);
  return seq.length > 1 ? seq.length : 1;
}

const countsTowardStrandStop = (item: BankItem): boolean => item.stop?.countsTowardStrandStop !== false;
const countsTowardModuleStop = (item: BankItem): boolean => item.stop?.countsTowardModuleStop !== false;

/** Points the client believes it saw. Stored for audit; the server decides the real total. */
export function clientPointsFor(
  item: BankItem,
  answer: { optionIds?: string[]; sequence?: string[]; rubricScore?: number },
): { points: number; possible: number } {
  const possible = item.scored === false ? 0 : (item.scoring?.maxPoints ?? 1);
  if (item.scoring?.method === 'teacher_rubric') {
    return { points: Math.max(0, Math.min(answer.rubricScore ?? 0, possible)), possible };
  }
  const seq = correctSequence(item);
  if (seq.length > 1) {
    const given = answer.sequence ?? answer.optionIds ?? [];
    const ok = given.length === seq.length && given.every((x, i) => x === seq[i]);
    return { points: ok ? possible : 0, possible };
  }
  const keys = correctOptionIds(item);
  const given = answer.optionIds ?? [];
  const ok = given.length > 0 && given.every((x) => keys.includes(x)) && given.length === Math.max(1, keys.length);
  return { points: ok ? possible : 0, possible };
}

/* ──────────────────────────────────────────────────────────── step building */

/** Practice first, then the scored items for this module in strand then sequence order. */
export function buildModuleSteps(
  bank: ProjectedBank,
  index: RunnerIndex,
  moduleId: string,
  ageBand: AgeBand,
  formCode: FormCode,
): RunStep[] {
  const mod = index.moduleById.get(moduleId);
  const strandOrder = new Map<string, number>();
  (mod?.strandIds ?? []).forEach((s, i) => strandOrder.set(s, i));

  const steps: RunStep[] = [];
  const practiceIds = mod?.practiceItemIds?.[ageBand] ?? [];
  for (const id of practiceIds) {
    const item = index.itemById.get(id);
    if (item) steps.push({ kind: 'practice', itemId: id, moduleId, extension: false, skipped: false, skipReason: null });
  }

  const scored = bank.items
    .filter((i) => i.moduleId === moduleId
      && i.ageBand === ageBand
      && i.form === formCode
      && i.type !== 'observation_checklist')
    .sort((a, b) => {
      const oa = strandOrder.get(a.strandId) ?? 99;
      const ob = strandOrder.get(b.strandId) ?? 99;
      return oa - ob || (a.sequence ?? 0) - (b.sequence ?? 0);
    });
  for (const item of scored) {
    steps.push({ kind: 'item', itemId: item.id, moduleId, extension: false, skipped: false, skipReason: null });
  }
  return steps;
}

export function createRun(bank: ProjectedBank, index: RunnerIndex, config: RunConfig): RunState {
  const directModules = config.moduleIds.filter((m) => m !== 'M-OBS');
  const now = new Date();
  const run: RunState = {
    sessionId: null,
    localId: newLocalId(),
    config,
    directModules,
    moduleIndex: 0,
    steps: [],
    stepIndex: 0,
    responses: {},
    observations: {},
    strandStreak: {},
    moduleStreak: 0,
    extensionUsed: {},
    phase: directModules.length ? 'intro' : 'observation',
    startedAt: now.toISOString(),
    startedMs: now.getTime(),
    completedAt: null,
    durationSeconds: null,
    bankVersion: bank.bankVersion,
    bankChecksum: bank.bankChecksum,
  };
  if (directModules.length) openModule(bank, index, run, 0);
  return run;
}

export function openModule(bank: ProjectedBank, index: RunnerIndex, run: RunState, moduleIdx: number): void {
  run.moduleIndex = moduleIdx;
  run.stepIndex = 0;
  run.moduleStreak = 0;
  run.strandStreak = {};
  run.steps = buildModuleSteps(
    bank, index, run.directModules[moduleIdx], run.config.ageBand, run.config.formCode,
  );
}

export function currentStep(run: RunState): RunStep | null {
  return run.steps[run.stepIndex] ?? null;
}

export function currentItem(run: RunState, index: RunnerIndex): BankItem | null {
  const step = currentStep(run);
  return step ? (index.itemById.get(step.itemId) ?? null) : null;
}

/* ────────────────────────────────────────────────────── recording a response */

export interface AnswerPayload {
  optionIds?: string[];
  sequence?: string[];
  rubricScore?: number;
  latencyMs?: number | null;
  replayCount?: number;
}

/**
 * Store one scored response and apply the stop rules.
 *
 * A stop rule is not a failure signal and is never shown to the child: it ends a strand
 * (or a module) that has stopped yielding information, so a four-year-old is not walked
 * through six more items they cannot yet do. Skipped items are written down as
 * `administered: false` — they are absent evidence, never zero evidence, and the server's
 * coverage rule turns them into "not looked at this time" rather than a low band.
 */
export function recordResponse(
  index: RunnerIndex,
  run: RunState,
  item: BankItem,
  answer: AnswerPayload,
): void {
  const step = currentStep(run);
  if (step?.kind === 'practice') return;  // practice is never part of the record

  const { points, possible } = clientPointsFor(item, answer);
  run.responses[item.id] = {
    itemId: item.id,
    strandId: item.strandId,
    moduleId: item.moduleId,
    optionIds: answer.optionIds,
    sequence: answer.sequence,
    rubricScore: answer.rubricScore,
    clientPointsAwarded: points,
    pointsPossible: possible,
    administered: true,
    skippedReason: null,
    extension: !!step?.extension,
    latencyMs: answer.latencyMs ?? null,
    replayCount: answer.replayCount ?? 0,
    answeredAt: new Date().toISOString(),
  };

  const incorrect = points === 0;
  const strand = index.strandById.get(item.strandId);
  const mod = index.moduleById.get(item.moduleId);

  if (countsTowardStrandStop(item)) {
    run.strandStreak[item.strandId] = incorrect ? (run.strandStreak[item.strandId] ?? 0) + 1 : 0;
  }
  if (countsTowardModuleStop(item)) {
    run.moduleStreak = incorrect ? run.moduleStreak + 1 : 0;
  }

  const modStop = mod?.stopRule;
  if (modStop?.type === 'consecutive_incorrect' && run.moduleStreak >= modStop.n) {
    skipRemaining(index, run, (s) => s.moduleId === item.moduleId, 'module_stop');
    return;
  }
  const strandStop = strand?.stopRule;
  if (strandStop?.type === 'consecutive_incorrect' && (run.strandStreak[item.strandId] ?? 0) >= strandStop.n) {
    skipRemaining(
      index, run,
      (s) => s.kind === 'item' && index.itemById.get(s.itemId)?.strandId === item.strandId,
      'strand_stop',
    );
  }
}

export function recordObservation(run: RunState, milestoneId: string, band: Band, note?: string): void {
  run.observations[milestoneId] = { band, note: note?.slice(0, 300) };
}

function skipRemaining(
  index: RunnerIndex,
  run: RunState,
  predicate: (step: RunStep) => boolean,
  reason: string,
): void {
  for (let i = run.stepIndex + 1; i < run.steps.length; i += 1) {
    const step = run.steps[i];
    if (step.kind !== 'item' || step.skipped) continue;
    if (!predicate(step)) continue;
    const item = index.itemById.get(step.itemId);
    if (!item) continue;
    step.skipped = true;
    step.skipReason = reason;
    run.responses[item.id] = {
      itemId: item.id,
      strandId: item.strandId,
      moduleId: item.moduleId,
      clientPointsAwarded: 0,
      pointsPossible: 0,
      administered: false,
      skippedReason: reason,
      extension: step.extension,
      latencyMs: null,
      replayCount: 0,
      answeredAt: new Date().toISOString(),
    };
  }
}

/** Everything not yet answered is written down as not-administered — a teacher ending early. */
export function endEarly(index: RunnerIndex, run: RunState, reason = 'teacher_ended'): void {
  skipRemaining(index, run, () => true, reason);
  const step = currentStep(run);
  if (step && step.kind === 'item' && !run.responses[step.itemId]) {
    const item = index.itemById.get(step.itemId);
    if (item) {
      run.responses[item.id] = {
        itemId: item.id,
        strandId: item.strandId,
        moduleId: item.moduleId,
        clientPointsAwarded: 0,
        pointsPossible: 0,
        administered: false,
        skippedReason: reason,
        extension: step.extension,
        latencyMs: null,
        replayCount: 0,
        answeredAt: new Date().toISOString(),
      };
    }
  }
}

/* ────────────────────────────────────────────────────────── extension rule */

/** Item ids this bank genuinely treats as band-up evidence for a child at `ageBand`. */
export function extensionEvidenceIds(bank: ProjectedBank, ageBand: AgeBand, formCode: FormCode): Set<string> {
  const out = new Set<string>();
  for (const m of bank.milestones) {
    if (m.ageBand !== ageBand || m.expectation !== 'extension') continue;
    const ev = m.evidence;
    if (!ev?.evidenceBand || ev.evidenceBand === ageBand) continue;
    for (const id of ev.byForm?.[formCode] ?? ev.itemIds ?? []) out.add(id);
  }
  return out;
}

/**
 * A strand answered fully correct earns a few items from the band above.
 *
 * Only ids the bank marks as band-up evidence are offered: outside that set a bonus round
 * buys nothing and spends a child's attention. The items are recorded but never used as
 * evidence for a milestone at the child's own band (see `scoring.ts`) — a milestone from
 * the band above is only ever marked secure by a teacher, with a reason.
 */
export function maybeExtend(
  bank: ProjectedBank,
  index: RunnerIndex,
  run: RunState,
  finishedStrandId: string,
  moduleId: string,
): number {
  const mod = index.moduleById.get(moduleId);
  if (!mod?.extensionRule?.administerBandUp) return 0;
  if (!BAND_UP[run.config.ageBand]) return 0;

  const key = `${moduleId}|${finishedStrandId}`;
  if (run.extensionUsed[key]) return 0;

  const cap = mod.extensionRule.maxItems ?? 4;
  const already = run.steps.filter((s) => s.extension && s.moduleId === moduleId).length;
  const room = cap - already;
  if (room <= 0) return 0;

  const done = Object.values(run.responses).filter(
    (r) => r.strandId === finishedStrandId && r.moduleId === moduleId && r.administered && !r.extension,
  );
  if (!done.length) return 0;
  if (!done.every((r) => r.clientPointsAwarded >= r.pointsPossible)) return 0;

  const allowed = extensionEvidenceIds(bank, run.config.ageBand, run.config.formCode);
  const bandUp = BAND_UP[run.config.ageBand];
  const pool = bank.items
    .filter((i) => i.moduleId === moduleId
      && i.strandId === finishedStrandId
      && i.ageBand === bandUp
      && i.form === run.config.formCode
      && i.scored !== false
      && allowed.has(i.id))
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .slice(0, room);
  if (!pool.length) return 0;

  run.extensionUsed[key] = true;
  const insertAt = run.stepIndex + 1;
  pool.forEach((item, k) => {
    run.steps.splice(insertAt + k, 0, {
      kind: 'item', itemId: item.id, moduleId, extension: true, skipped: false, skipReason: null,
    });
  });
  return pool.length;
}

/* ──────────────────────────────────────────────────────────────── advancing */

export type AdvanceOutcome =
  | { next: 'step' }
  | { next: 'rest' }
  | { next: 'observation' }
  | { next: 'close' };

/**
 * Move to the next thing on screen. Steps already skipped by a stop rule are stepped over
 * without ever being shown — the child does not see a gap, only the next question.
 */
export function advance(bank: ProjectedBank, index: RunnerIndex, run: RunState): AdvanceOutcome {
  const previous = run.steps[run.stepIndex];
  if (previous && previous.kind === 'item' && !previous.skipped && !previous.extension) {
    const prevItem = index.itemById.get(previous.itemId);
    const next = run.steps[run.stepIndex + 1];
    const nextItem = next ? index.itemById.get(next.itemId) : null;
    const strandFinished = !next || next.kind !== 'item' || nextItem?.strandId !== prevItem?.strandId;
    if (strandFinished && prevItem) maybeExtend(bank, index, run, prevItem.strandId, previous.moduleId);
  }

  run.stepIndex += 1;
  while (run.steps[run.stepIndex]?.skipped) run.stepIndex += 1;

  if (run.stepIndex >= run.steps.length) {
    if (run.moduleIndex + 1 < run.directModules.length) {
      openModule(bank, index, run, run.moduleIndex + 1);
      run.phase = 'rest';
      return { next: 'rest' };
    }
    if (run.config.moduleIds.includes('M-OBS')) {
      run.phase = 'observation';
      return { next: 'observation' };
    }
    finish(run);
    return { next: 'close' };
  }

  run.phase = run.steps[run.stepIndex].kind === 'practice' ? 'practice' : 'item';
  return { next: 'step' };
}

export function finish(run: RunState): void {
  if (!run.completedAt) {
    run.completedAt = new Date().toISOString();
    run.durationSeconds = Math.max(0, Math.round((Date.now() - run.startedMs) / 1000));
  }
  run.phase = 'close';
}

/* ───────────────────────────────────────────── what gets sent to the server */

/** Responses in the shape `POST /sessions/[id]/items` expects. */
export function toRawResponses(run: RunState): RawItemResponse[] {
  return Object.values(run.responses).map((r) => ({
    itemId: r.itemId,
    optionIds: r.optionIds,
    sequence: r.sequence,
    rubricScore: r.rubricScore,
    band: r.band,
    note: r.note,
    replayCount: r.replayCount,
    latencyMs: r.latencyMs,
    administered: r.administered,
    skippedReason: r.skippedReason,
    clientPointsAwarded: r.clientPointsAwarded,
    answeredAt: r.answeredAt,
  }));
}

export function toObservationPayload(run: RunState): Array<{ milestoneId: string; band: Band; note?: string }> {
  return Object.entries(run.observations).map(([milestoneId, v]) => ({
    milestoneId, band: v.band, note: v.note,
  }));
}

/** Teacher-only progress readout. The child never sees a progress bar (ARCHITECTURE §6 D2). */
export function progressDots(run: RunState): Array<'done' | 'now' | 'todo' | 'skip'> {
  return run.steps.map((s, i) => {
    if (s.skipped) return 'skip';
    if (i === run.stepIndex) return 'now';
    return run.responses[s.itemId] || i < run.stepIndex ? 'done' : 'todo';
  });
}

export function answeredCount(run: RunState): number {
  return Object.values(run.responses).filter((r) => r.administered).length;
}
