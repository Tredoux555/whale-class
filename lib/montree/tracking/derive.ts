// lib/montree/tracking/derive.ts
//
// Rule 8: EVERYTHING A HUMAN READS IS DERIVED. Ribbon, week ticks, flags and
// the Weekly Plan Language cell are all computed here from the journal — none
// of them is stored, and none of them reads the retired 1–128 pointer.
//
// Rule 7: SEQUENCE IS DATA. "Next" is position + status, never a guess, and a
// gap is flagged rather than filled.

import { TRACKER_LETTERS, workId, workName } from '@/lib/montree/dark-phonics/tracker-works';
import { dayOf, replay, replayBefore, sortEvents, tzOf, UTC_TZ, type CurrentMap } from './ledger';
import type { CurriculumWork, Ledger, ProgressEvent, Status } from './types';

export type RibbonState = 'mastered' | 'in-progress' | 'not-started' | 'coming';

export const LIVE_LETTERS: readonly string[] = TRACKER_LETTERS.filter((l) => l.status === 'live').map(
  (l) => l.letter
);

const LETTER_ORDER = new Map(TRACKER_LETTERS.map((l, i) => [l.letter, i]));

export type ChildCurrent = Map<string, Status>;

export function childCurrent(current: CurrentMap, childId: string): ChildCurrent {
  return new Map(current.get(childId) ?? []);
}

function letterWorkKeys(letter: string, works: readonly CurriculumWork[]): string[] {
  const present = new Set(works.map((w) => w.work_key));
  return [1, 2, 3, 4, 5].map((n) => workId(letter, n)).filter((k) => present.has(k));
}

/** Rule 7: a letter is mastered when its five works are mastered. */
export function ribbon(
  current: ChildCurrent,
  works: readonly CurriculumWork[]
): Record<string, RibbonState> {
  const out: Record<string, RibbonState> = {};
  for (const def of TRACKER_LETTERS) {
    const keys = letterWorkKeys(def.letter, works);
    const statuses = keys.map((k) => current.get(k) ?? 'not_started');
    const mastered = statuses.filter((s) => s === 'mastered').length;
    const touched = statuses.filter((s) => s !== 'not_started').length;
    if (keys.length === 5 && mastered === 5) out[def.letter] = 'mastered';
    else if (touched > 0) out[def.letter] = 'in-progress';
    else if (def.status === 'coming') out[def.letter] = 'coming';
    else out[def.letter] = 'not-started';
  }
  return out;
}

export function isLetterMastered(
  current: ChildCurrent,
  works: readonly CurriculumWork[],
  letter: string
): boolean {
  const keys = letterWorkKeys(letter, works);
  return keys.length === 5 && keys.every((k) => current.get(k) === 'mastered');
}

/**
 * The letter a child is actually on: the furthest live letter they have
 * touched but not finished. If they have finished everything they touched,
 * it is the first live letter still unmastered.
 */
export function currentLetter(current: ChildCurrent, works: readonly CurriculumWork[]): string | null {
  let found: string | null = null;
  for (const letter of LIVE_LETTERS) {
    const keys = letterWorkKeys(letter, works);
    const touched = keys.some((k) => (current.get(k) ?? 'not_started') !== 'not_started');
    if (touched && !isLetterMastered(current, works, letter)) found = letter;
  }
  if (found) return found;
  return LIVE_LETTERS.find((l) => !isLetterMastered(current, works, l)) ?? null;
}

/**
 * The next book. With `afterLetter`, the first live unmastered letter that
 * comes after it in book order — which is what "we will start the '<next>'
 * book" means the week a letter is finished.
 */
export function nextLetter(
  current: ChildCurrent,
  works: readonly CurriculumWork[],
  afterLetter?: string | null
): string | null {
  const from = afterLetter != null ? (LETTER_ORDER.get(afterLetter) ?? -1) : -1;
  const candidates = LIVE_LETTERS.filter((l) => (LETTER_ORDER.get(l) ?? -1) > from);
  return candidates.find((l) => !isLetterMastered(current, works, l)) ?? null;
}

export interface Tick {
  event: ProgressEvent;
  work_key: string;
  work_name: string;
  /** True when this row moved the ladder; false for a repeat observation. */
  advanced: boolean;
  status: Status;
  day: string;
}

export function weekEnd(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function inWeek(iso: string, weekStart: string, tz: string = UTC_TZ): boolean {
  const day = dayOf(iso, tz);
  return day >= weekStart && day < weekEnd(weekStart);
}

/**
 * Everything observed for one child in one week — advances and repeats alike.
 * A repeat is real activity (it is why "continued with…" exists) even though
 * it never moves the ladder.
 */
export function weekTicks(
  events: readonly ProgressEvent[],
  childId: string,
  weekStart: string,
  tz: string = UTC_TZ
): Tick[] {
  const { rows } = replay(events, tz);
  const out: Tick[] = [];
  for (const { event, result } of rows) {
    if (event.child_id !== childId) continue;
    if (!event.work_key) continue;
    if (!inWeek(event.created_at, weekStart, tz)) continue;
    const accepted = result.accepted;
    const evidence = !accepted && result.attachAsEvidence === true;
    if (!accepted && !evidence) continue; // hard-rejected rows are not activity
    out.push({
      event,
      work_key: event.work_key,
      work_name: event.work_name,
      advanced: accepted,
      status: event.new_status,
      day: dayOf(event.created_at, tz),
    });
  }
  return out;
}

export type FlagCode = 'stuck' | 'no-observation' | 'gap';

export interface Flag {
  code: FlagCode;
  childId: string;
  workKey?: string;
  letter?: string;
  message: string;
}

const DAY_MS = 86400000;

function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00.000Z`) - Date.parse(`${a}T00:00:00.000Z`)) / DAY_MS
  );
}

function dpSequence(key: string): number {
  const m = /^dp:([a-z]{1,2}):([1-5])$/.exec(key);
  if (!m) return -1;
  return (LETTER_ORDER.get(m[1]) ?? 999) * 10 + Number(m[2]);
}

/** The furthest Dark Phonics work a child touched in a week, or null. */
function highestDpOfWeek(ledger: Ledger, childId: string, weekStart: string): string | null {
  const ticks = weekTicks(ledger.events, childId, weekStart, tzOf(ledger)).filter((t) =>
    t.work_key.startsWith('dp:')
  );
  if (ticks.length === 0) return null;
  return ticks.reduce((best, t) => (dpSequence(t.work_key) > dpSequence(best) ? t.work_key : best), ticks[0].work_key);
}

export const STUCK_WEEKS = 3;
export const NO_OBSERVATION_DAYS = 14;

/** Rule 10's read-time flags: stuck, silent, and out-of-sequence. */
export function flags(ledger: Ledger, asOf: string): Flag[] {
  const out: Flag[] = [];
  const tz = tzOf(ledger);
  const { state } = replay(ledger.events, tz);
  const weeks = ledger.weekStarts.filter((w) => w <= asOf);

  for (const child of ledger.children) {
    // stuck — same highest Dark Phonics work, three consecutive weeks with activity.
    const recent = weeks.slice(-STUCK_WEEKS);
    if (recent.length === STUCK_WEEKS) {
      const highs = recent.map((w) => highestDpOfWeek(ledger, child.id, w));
      if (highs.every((h) => h !== null && h === highs[0])) {
        out.push({
          code: 'stuck',
          childId: child.id,
          workKey: highs[0] as string,
          message: `${child.name} has been on ${highs[0]} for ${STUCK_WEEKS} weeks running.`,
        });
      }
    }

    // no-observation — nothing at all for a fortnight.
    const mine = sortEvents(ledger.events.filter((e) => e.child_id === child.id));
    const last = mine.length ? dayOf(mine[mine.length - 1].created_at, tz) : null;
    if (!last || daysBetween(last, asOf) >= NO_OBSERVATION_DAYS) {
      out.push({
        code: 'no-observation',
        childId: child.id,
        message: last
          ? `${child.name}: no observation since ${last}.`
          : `${child.name}: no observation on record.`,
      });
    }

    // gap — rule 7: flagged, never filled.
    const current = childCurrent(state.current, child.id);
    for (const letter of LIVE_LETTERS) {
      const keys = letterWorkKeys(letter, ledger.works);
      for (let i = 0; i < keys.length; i++) {
        if (current.get(keys[i]) !== 'mastered') continue;
        for (let j = 0; j < i; j++) {
          if ((current.get(keys[j]) ?? 'not_started') === 'not_started') {
            out.push({
              code: 'gap',
              childId: child.id,
              workKey: keys[i],
              letter,
              message: `${child.name} has ${keys[i]} mastered but ${keys[j]} was never started.`,
            });
          }
        }
      }
    }
    for (const letter of LIVE_LETTERS) {
      if (!isLetterMastered(current, ledger.works, letter)) continue;
      const idx = LETTER_ORDER.get(letter) ?? 0;
      for (const earlier of LIVE_LETTERS) {
        if ((LETTER_ORDER.get(earlier) ?? 0) >= idx) continue;
        if (!isLetterMastered(current, ledger.works, earlier)) {
          out.push({
            code: 'gap',
            childId: child.id,
            letter,
            message: `${child.name} mastered '${letter}' with '${earlier}' unfinished.`,
          });
        }
      }
    }
  }
  return out;
}

function sequenceOf(ledger: Ledger, key: string): number {
  return ledger.works.find((w) => w.work_key === key)?.sequence ?? -1;
}

/**
 * The single work name the Weekly Plan's Language column shows. Rule 9: it
 * only ever reads dp: and ws: keys, so "Blue Series blends" can never land
 * next to "Beginning Sounds" again.
 */
export function planLanguageCell(ledger: Ledger, childId: string, weekStart: string): string | null {
  const tz = tzOf(ledger);
  const ticks = weekTicks(ledger.events, childId, weekStart, tz).filter(
    (t) => t.work_key.startsWith('dp:') || t.work_key.startsWith('ws:')
  );
  if (ticks.length > 0) {
    const best = ticks.reduce((a, t) =>
      sequenceOf(ledger, t.work_key) > sequenceOf(ledger, a.work_key) ? t : a
    );
    return ledger.works.find((w) => w.work_key === best.work_key)?.name ?? best.work_name;
  }

  // §4b: replayBefore, not replay(filter(...)) — a fresh array per call defeats
  // the identity memo and this is one of the two hot paths the audit measured.
  const { state } = replayBefore(ledger.events, weekStart, tz);
  const current = childCurrent(state.current, childId);
  const letter = currentLetter(current, ledger.works);
  if (!letter) return null;
  for (const n of [1, 2, 3, 4, 5]) {
    const key = workId(letter, n);
    if (!ledger.works.some((w) => w.work_key === key)) continue;
    if ((current.get(key) ?? 'not_started') !== 'mastered') {
      return ledger.works.find((w) => w.work_key === key)?.name ?? workName(letter, n);
    }
  }
  return null;
}
