// lib/montree/tracking/guidance.ts
//
// GUIDING THE CLASSROOM — rule 7 ("sequence is data, next is computed") for
// EVERY area, not just Dark Phonics.
//
// This is the ONE function that decides what a child does next. Not
// replan-child's own per-area loop, not the Guru's 8-factor scorer, and never
// an LLM. Everything else in the repo — the weekly-wrap replan, the shelf
// autopilot, the Home Companion, the focus-works routes — asks this file and
// then only *presents* the answer.
//
// THE RULES, in the order they are applied inside one area:
//
//   1. CONTINUE BEFORE YOU START. A work the child is 'practicing' is the
//      next work. Nothing new goes on the shelf while a work is in progress
//      (this is the Montessori invariant replan-child was already defending:
//      a work leaves the shelf only when it is mastered).
//   2. RE-PRESENT WHAT WENT COLD. A work left at 'presented' for more than
//      `rePresentAfterDays` (default 7) with no SECOND observation was seen
//      once and never returned to — present it again rather than moving on.
//      A presented work that has a second observation, or that is still
//      fresh, is simply continued.
//   3. NEXT = THE FIRST UNMASTERED WORK BY ASCENDING SEQUENCE. Never a score,
//      never a guess, never more than ONE unmastered work ahead of where the
//      child actually is — which falls out of taking the *first* unmastered
//      work: the engine can only ever step onto the very next rung.
//   4. GAPS ARE FLAGGED, NEVER FILLED (rule 7). A work below something the
//      child has already mastered that was never started is reported in
//      `gaps`; when it is also the first unmastered work, the reason is
//      'gap-below' so the teacher is told WHY the shelf went backwards.
//   5. DARK PHONICS FOLLOWS THE RIBBON. Within a letter, works 1→5; the next
//      letter is only reachable once the current letter's five works are
//      mastered. Letters whose book is not published yet ('coming') are never
//      proposed. This is enforced on the KEY (dp:<letter>:<n>), so a wrong
//      `sequence` in a classroom's curriculum table cannot break the ribbon.
//   6. THE WRITING SHELF IS A GATED PARALLEL TRACK. Trays (ws:<n>) are not
//      candidates for the Language shelf until the child's current letter has
//      reached `writingShelfAfterLetter` (default 'b') OR a tray has already
//      been touched. When the gate is open they come back as a SECOND
//      entry with track:'writing-shelf', so the letter work and the tray can
//      both be on the shelf without either displacing the other.
//   7. TIES BREAK BY SEQUENCE, THEN NAME, THEN KEY. Two runs over the same
//      ledger always produce byte-identical output.
//
// Every answer carries a `because` sentence built in code — explainable by
// construction, and safe to show a teacher verbatim.

import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import { childCurrent, flags, type Flag } from './derive';
import { dayOf, replay } from './ledger';
import type { CurriculumWork, GuidanceReason, Ledger, Status } from './types';

// ── Vocabulary ───────────────────────────────────────────────────────────

/** The five areas every classroom is guided across. */
export const CORE_AREAS = [
  'practical_life',
  'sensorial',
  'mathematics',
  'language',
  'cultural',
] as const;

export type CoreArea = (typeof CORE_AREAS)[number];

export type { GuidanceReason };

export type GuidanceTrack = 'main' | 'writing-shelf';

export interface GuidanceWorkRef {
  work_key: string;
  name: string;
  area: string;
  /** The sequence the engine ordered by (canonical for dp:/ws: keys). */
  sequence: number;
  status: Status;
}

export interface GuidanceGap {
  work_key: string;
  name: string;
  sequence: number;
  status: Status;
  because: string;
}

export interface AreaGuidance {
  area: string;
  track: GuidanceTrack;
  /** Highest-sequence work the child is on (presented | practicing), if any. */
  current: GuidanceWorkRef | null;
  /** The ONE work to put in front of the child next. */
  next: GuidanceWorkRef | null;
  reason: GuidanceReason;
  /** A sentence a teacher can read, built in code. Never AI. */
  because: string;
  /** Rule 7: unmastered works below something already mastered. Flagged, not filled. */
  gaps: GuidanceGap[];
}

export interface GuidanceOptions {
  /** ISO timestamp the guidance is "as of". Defaults to now. Pass it for determinism. */
  asOf?: string;
  /** Days a 'presented' work may sit unrevisited before it is re-presented. */
  rePresentAfterDays?: number;
  /** Writing Shelf trays unlock once the child's letter has reached this one. */
  writingShelfAfterLetter?: string;
  /** Restrict the answer to these areas (normalised). Defaults to core + whatever the curriculum has. */
  areas?: string[];
  /** Emit the gated Writing Shelf track as an extra entry. Default true. */
  includeTracks?: boolean;
}

export const DEFAULT_RE_PRESENT_DAYS = 7;
export const DEFAULT_WRITING_SHELF_AFTER_LETTER = 'b';

// ── Area names ───────────────────────────────────────────────────────────

const AREA_ALIASES: Record<string, string> = {
  practical: 'practical_life',
  practical_life: 'practical_life',
  practical_life_exercises: 'practical_life',
  epl: 'practical_life',
  sensorial: 'sensorial',
  sensory: 'sensorial',
  math: 'mathematics',
  maths: 'mathematics',
  mathematics: 'mathematics',
  language: 'language',
  english: 'language',
  literacy: 'language',
  cultural: 'cultural',
  culture: 'cultural',
  cultural_studies: 'cultural',
  science_and_culture: 'cultural',
};

/** One spelling per area. 'culture' and 'cultural' are the same shelf. */
export function normaliseArea(raw: string | null | undefined): string {
  const key = String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!key) return 'other';
  return AREA_ALIASES[key] ?? key;
}

const AREA_LABEL: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

export function areaLabel(area: string): string {
  return AREA_LABEL[area] ?? area.replace(/_/g, ' ');
}

// ── Keys, letters, ordering ──────────────────────────────────────────────

const DP_KEY = /^dp:([a-z]{1,2}):([1-5])$/;
const WS_KEY = /^ws:(\d+)$/;

const LETTER_INDEX = new Map(TRACKER_LETTERS.map((l, i) => [l.letter, i]));
const LIVE_LETTER = new Set(TRACKER_LETTERS.filter((l) => l.status === 'live').map((l) => l.letter));

export function parseDpKey(workKey: string): { letter: string; n: number } | null {
  const m = DP_KEY.exec(workKey);
  return m ? { letter: m[1], n: Number(m[2]) } : null;
}

export function isWritingShelf(work: CurriculumWork): boolean {
  return WS_KEY.test(work.work_key) || work.group === 'writing-shelf';
}

/**
 * The number the engine sorts by. dp:/ws: keys get their CANONICAL position
 * (book order × 10 + work number) so the ribbon holds even if a classroom's
 * curriculum table has a wrong or missing `sequence`.
 */
export function effectiveSequence(work: CurriculumWork): number {
  const dp = parseDpKey(work.work_key);
  if (dp) return (LETTER_INDEX.get(dp.letter) ?? 900) * 10 + dp.n;
  const ws = WS_KEY.exec(work.work_key);
  if (ws) return 5000 + Number(ws[1]);
  return Number.isFinite(work.sequence) ? work.sequence : 1_000_000;
}

function compareWorks(a: CurriculumWork, b: CurriculumWork): number {
  const d = effectiveSequence(a) - effectiveSequence(b);
  if (d !== 0) return d;
  const n = a.name.localeCompare(b.name);
  return n !== 0 ? n : a.work_key.localeCompare(b.work_key);
}

const DAY_MS = 86400000;

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS
  );
}

// ── Observations ─────────────────────────────────────────────────────────

interface Observation {
  /** Every row that counted as activity — ladder moves AND repeat observations. */
  count: number;
  lastDay: string | null;
}

/**
 * What the journal actually SAW, per work, for one child. A repeat observation
 * (rejected as 'no-op' by the ladder, kept as evidence) is activity — it is
 * exactly what tells the engine a presented work has been returned to.
 */
export function observationsFor(
  ledger: Ledger,
  childId: string
): Map<string, Observation> {
  const out = new Map<string, Observation>();
  const { rows } = replay(ledger.events);
  for (const { event, result } of rows) {
    if (event.child_id !== childId) continue;
    if (!event.work_key) continue;
    if (!result.accepted && result.attachAsEvidence !== true) continue;
    const day = dayOf(event.created_at);
    const prev = out.get(event.work_key);
    if (!prev) out.set(event.work_key, { count: 1, lastDay: day });
    else out.set(event.work_key, {
      count: prev.count + 1,
      lastDay: prev.lastDay && prev.lastDay > day ? prev.lastDay : day,
    });
  }
  return out;
}

/** The ledger as it stood at the end of `asOfDay` — nothing later is visible. */
export function asOfLedger(ledger: Ledger, asOfDay: string): Ledger {
  const events = ledger.events.filter((e) => dayOf(e.created_at) <= asOfDay);
  return events.length === ledger.events.length ? ledger : { ...ledger, events };
}

// ── The engine ───────────────────────────────────────────────────────────

interface Ctx {
  asOfDay: string;
  rePresentAfterDays: number;
  status: (work: CurriculumWork) => Status;
  obs: Map<string, Observation>;
}

function ref(work: CurriculumWork, ctx: Ctx): GuidanceWorkRef {
  return {
    work_key: work.work_key,
    name: work.name,
    area: normaliseArea(work.area),
    sequence: effectiveSequence(work),
    status: ctx.status(work),
  };
}

/** A dp work of an unpublished letter is never proposed unless already touched. */
function proposable(work: CurriculumWork, ctx: Ctx): boolean {
  const dp = parseDpKey(work.work_key);
  if (dp && !LIVE_LETTER.has(dp.letter)) return ctx.status(work) !== 'not_started';
  return true;
}

function gapsIn(works: readonly CurriculumWork[], ctx: Ctx): GuidanceGap[] {
  const mastered = works.filter((w) => ctx.status(w) === 'mastered');
  if (mastered.length === 0) return [];
  const highest = mastered.reduce((a, b) => (compareWorks(a, b) >= 0 ? a : b));
  const bar = effectiveSequence(highest);
  return works
    .filter((w) => ctx.status(w) === 'not_started' && effectiveSequence(w) < bar)
    .sort(compareWorks)
    .map((w) => ({
      work_key: w.work_key,
      name: w.name,
      sequence: effectiveSequence(w),
      status: 'not_started' as Status,
      because: `"${w.name}" was never started, yet "${highest.name}" further along is already mastered — flagged, not filled.`,
    }));
}

function decide(
  area: string,
  track: GuidanceTrack,
  works: readonly CurriculumWork[],
  ctx: Ctx
): AreaGuidance {
  const label = areaLabel(area);
  const sorted = [...works].sort(compareWorks);
  const gaps = gapsIn(sorted, ctx);

  if (sorted.length === 0) {
    return {
      area,
      track,
      current: null,
      next: null,
      reason: 'area-complete',
      because: `No ${label} works are in this classroom's curriculum yet, so there is nothing to guide.`,
      gaps,
    };
  }

  const inProgress = sorted.filter((w) => {
    const s = ctx.status(w);
    return s === 'presented' || s === 'practicing';
  });
  const current = inProgress.length
    ? inProgress.reduce((a, b) => (compareWorks(a, b) >= 0 ? a : b))
    : null;

  const unmastered = sorted.filter((w) => ctx.status(w) !== 'mastered' && proposable(w, ctx));

  if (unmastered.length === 0) {
    return {
      area,
      track,
      current: current ? ref(current, ctx) : null,
      next: null,
      reason: 'area-complete',
      because: `Every ${label} work in this curriculum is mastered — there is nothing left in sequence to present.`,
      gaps,
    };
  }

  // Rule 1 / rule 2 — the child is already on something.
  if (current) {
    const status = ctx.status(current);
    const seen = ctx.obs.get(current.work_key);
    const lastDay = seen?.lastDay ?? null;
    const idleDays = lastDay ? daysBetween(lastDay, ctx.asOfDay) : null;

    if (status === 'practicing') {
      return {
        area,
        track,
        current: ref(current, ctx),
        next: ref(current, ctx),
        reason: 'continue-practising',
        because:
          `${current.name} is still being practised${lastDay ? ` (last seen ${lastDay})` : ''} — ` +
          'it stays on the shelf until it is mastered; nothing new goes on top of it.',
        gaps,
      };
    }

    const revisited = (seen?.count ?? 0) >= 2;
    const stale = !revisited && (idleDays === null || idleDays > ctx.rePresentAfterDays);
    if (stale) {
      return {
        area,
        track,
        current: ref(current, ctx),
        next: ref(current, ctx),
        reason: 're-present',
        because:
          `${current.name} was presented${lastDay ? ` on ${lastDay}` : ''} and has not been returned to` +
          `${idleDays === null ? '' : ` for ${idleDays} days`} — present it again before moving on.`,
        gaps,
      };
    }

    return {
      area,
      track,
      current: ref(current, ctx),
      next: ref(current, ctx),
      reason: 'continue-practising',
      because:
        `${current.name} was presented${lastDay ? ` on ${lastDay}` : ''} and ` +
        `${revisited ? 'has been returned to since' : 'is still fresh'} — give it another turn before anything new.`,
      gaps,
    };
  }

  // Rule 3 / rule 4 — nothing in progress: take the FIRST unmastered work.
  const next = unmastered[0];
  const mastered = sorted.filter((w) => ctx.status(w) === 'mastered');
  const highestMastered = mastered.length
    ? mastered.reduce((a, b) => (compareWorks(a, b) >= 0 ? a : b))
    : null;
  const isGap = !!highestMastered && effectiveSequence(next) < effectiveSequence(highestMastered);

  if (isGap && highestMastered) {
    return {
      area,
      track,
      current: null,
      next: ref(next, ctx),
      reason: 'gap-below',
      because:
        `${next.name} sits below "${highestMastered.name}", which is already mastered, and was never started — ` +
        'the engine goes back for it rather than filling the gap in silently.',
      gaps,
    };
  }

  const dp = parseDpKey(next.work_key);
  const ribbon =
    dp && dp.n === 1
      ? ` It opens the '${dp.letter}' book${highestMastered ? ` now that "${highestMastered.name}" is mastered` : ''}.`
      : '';

  return {
    area,
    track,
    current: null,
    next: ref(next, ctx),
    reason: 'present-next',
    because:
      `${next.name} is the first unmastered work in the ${label} sequence` +
      `${highestMastered && !ribbon ? `, straight after "${highestMastered.name}"` : ''}.${ribbon}`,
    gaps,
  };
}

/** The child's current Dark Phonics letter, by key — the Writing Shelf gate reads it. */
function currentDpLetterIndex(works: readonly CurriculumWork[], ctx: Ctx): number {
  let best = -1;
  for (const w of works) {
    const dp = parseDpKey(w.work_key);
    if (!dp) continue;
    if (ctx.status(w) === 'not_started') continue;
    best = Math.max(best, LETTER_INDEX.get(dp.letter) ?? -1);
  }
  return best;
}

/**
 * THE function. For one child, the next work in every area — deterministic,
 * explainable, and computed only from curriculum sequence + journalled status.
 */
export function nextWorks(
  ledger: Ledger,
  childId: string,
  opts: GuidanceOptions = {}
): AreaGuidance[] {
  const asOf = opts.asOf ?? new Date().toISOString();
  const ctxBase = {
    asOfDay: asOf.length === 10 ? asOf : dayOf(asOf),
    rePresentAfterDays: opts.rePresentAfterDays ?? DEFAULT_RE_PRESENT_DAYS,
  };
  const includeTracks = opts.includeTracks !== false;
  const gateLetter = opts.writingShelfAfterLetter ?? DEFAULT_WRITING_SHELF_AFTER_LETTER;
  const gateIndex = LETTER_INDEX.get(gateLetter) ?? Number.POSITIVE_INFINITY;

  // "As of" means as of: a row journalled after that day cannot influence the
  // answer, so replaying yesterday's ledger tomorrow gives yesterday's answer.
  const scoped = asOfLedger(ledger, ctxBase.asOfDay);
  const { state } = replay(scoped.events);
  const current = childCurrent(state.current, childId);
  const obs = observationsFor(scoped, childId);
  const ctx: Ctx = {
    ...ctxBase,
    obs,
    status: (w) => current.get(w.work_key) ?? 'not_started',
  };

  const byArea = new Map<string, CurriculumWork[]>();
  for (const w of ledger.works) {
    const area = normaliseArea(w.area);
    const list = byArea.get(area);
    if (list) list.push(w);
    else byArea.set(area, [w]);
  }

  const wanted = opts.areas
    ? Array.from(new Set(opts.areas.map(normaliseArea)))
    : Array.from(new Set([...CORE_AREAS, ...byArea.keys()]));
  const coreIndex = new Map<string, number>(CORE_AREAS.map((a, i) => [a as string, i]));
  wanted.sort((a, b) => {
    const ai = coreIndex.get(a) ?? 100 + a.charCodeAt(0);
    const bi = coreIndex.get(b) ?? 100 + b.charCodeAt(0);
    return ai !== bi ? ai - bi : a.localeCompare(b);
  });

  const out: AreaGuidance[] = [];
  for (const area of wanted) {
    const works = byArea.get(area) ?? [];
    const trays = works.filter(isWritingShelf);
    const rest = works.filter((w) => !isWritingShelf(w));

    // Rule 6: the tray gate.
    const anyTrayTouched = trays.some((w) => ctx.status(w) !== 'not_started');
    const gateOpen =
      trays.length > 0 && (anyTrayTouched || currentDpLetterIndex(works, ctx) >= gateIndex);
    const restHasWork = rest.some((w) => ctx.status(w) !== 'mastered' && proposable(w, ctx));

    // The trays only carry the main shelf when there is nothing else left in the area.
    const mainWorks = restHasWork || !gateOpen ? rest : works;
    out.push(decide(area, 'main', mainWorks.length ? mainWorks : works, ctx));

    if (includeTracks && gateOpen && restHasWork && trays.length > 0) {
      const tray = decide(area, 'writing-shelf', trays, ctx);
      if (tray.next) out.push(tray);
    }
  }
  return out;
}

/** The main-track answer per area, keyed by area — what a one-work-per-area shelf wants. */
export function nextWorkByArea(
  ledger: Ledger,
  childId: string,
  opts: GuidanceOptions = {}
): Record<string, AreaGuidance> {
  const out: Record<string, AreaGuidance> = {};
  for (const g of nextWorks(ledger, childId, opts)) {
    if (g.track === 'main') out[g.area] = g;
  }
  return out;
}

// ── The class view ───────────────────────────────────────────────────────

export interface ClassSuggestion {
  childId: string;
  childName: string;
  because: string;
}

export interface ReadyForLetter extends ClassSuggestion {
  letter: string;
  work_key: string;
  work_name: string;
}

export interface StuckChild extends ClassSuggestion {
  work_key: string | null;
  code: Flag['code'];
}

export interface IdleWork {
  work_key: string;
  name: string;
  area: string;
  sequence: number;
  because: string;
}

export interface PresentTogether {
  work_key: string;
  name: string;
  area: string;
  childIds: string[];
  childNames: string[];
  because: string;
}

export interface ClassGuidanceResult {
  asOf: string;
  readyForNextLetter: ReadyForLetter[];
  stuck: StuckChild[];
  idleWorks: IdleWork[];
  presentTogether: PresentTogether[];
}

/**
 * The whole room in one pass: who is ready to open a new book, who has been
 * standing still, which works nobody has touched, and which children can be
 * given the same presentation together. Every row explains itself.
 */
export function classGuidance(ledger: Ledger, opts: GuidanceOptions = {}): ClassGuidanceResult {
  const asOf = opts.asOf ?? new Date().toISOString();
  const asOfDay = asOf.length === 10 ? asOf : dayOf(asOf);
  const nameOf = new Map(ledger.children.map((c) => [c.id, c.name]));

  const readyForNextLetter: ReadyForLetter[] = [];
  const together = new Map<string, { work: GuidanceWorkRef; childIds: string[] }>();

  for (const child of ledger.children) {
    for (const g of nextWorks(ledger, child.id, { ...opts, asOf })) {
      if (!g.next) continue;
      if (g.track === 'main') {
        const bucket = together.get(g.next.work_key);
        if (bucket) bucket.childIds.push(child.id);
        else together.set(g.next.work_key, { work: g.next, childIds: [child.id] });
      }
      const dp = parseDpKey(g.next.work_key);
      if (dp && dp.n === 1 && g.reason === 'present-next') {
        readyForNextLetter.push({
          childId: child.id,
          childName: child.name,
          letter: dp.letter,
          work_key: g.next.work_key,
          work_name: g.next.name,
          because: `${child.name} has finished every work before it — the '${dp.letter}' book is next.`,
        });
      }
    }
  }

  const stuck: StuckChild[] = flags(ledger, asOfDay)
    .filter((f) => f.code === 'stuck')
    .map((f) => ({
      childId: f.childId,
      childName: nameOf.get(f.childId) ?? f.childId,
      work_key: f.workKey ?? null,
      code: f.code,
      because: f.message,
    }));

  const touched = new Set<string>();
  for (const e of asOfLedger(ledger, asOfDay).events) if (e.work_key) touched.add(e.work_key);
  const idleWorks: IdleWork[] = ledger.works
    .filter((w) => !touched.has(w.work_key))
    .filter((w) => {
      const dp = parseDpKey(w.work_key);
      return !dp || LIVE_LETTER.has(dp.letter);
    })
    .sort(compareWorks)
    .map((w) => ({
      work_key: w.work_key,
      name: w.name,
      area: normaliseArea(w.area),
      sequence: effectiveSequence(w),
      because: `No child in this room has been presented "${w.name}" yet.`,
    }));

  const presentTogether: PresentTogether[] = Array.from(together.values())
    .filter((g) => g.childIds.length >= 2)
    .map((g) => {
      const childNames = g.childIds.map((id) => nameOf.get(id) ?? id);
      return {
        work_key: g.work.work_key,
        name: g.work.name,
        area: g.work.area,
        childIds: g.childIds,
        childNames,
        because: `${listOf(childNames)} are all on "${g.work.name}" next — present it to them together.`,
      };
    })
    .sort(
      (a, b) =>
        b.childIds.length - a.childIds.length ||
        a.area.localeCompare(b.area) ||
        a.work_key.localeCompare(b.work_key)
    );

  return { asOf, readyForNextLetter, stuck, idleWorks, presentTogether };
}

function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
