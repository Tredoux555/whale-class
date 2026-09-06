// tests/tracking/fuzz/gen.ts
//
// Seeded random generators for the tracking-engine property tests.
// No fast-check in node_modules and we are not allowed to install, so this is
// a tiny mulberry32 PRNG plus hand-rolled generators + a shrinker that trims
// the event list. Every failure message carries the seed, so any counterexample
// is reproducible with one number.

import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import type {
  Child,
  CurriculumWork,
  Ledger,
  ProgressEvent,
  Source,
  Status,
} from '@/lib/montree/tracking/types';

// ── PRNG ─────────────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private r: () => number;
  constructor(public readonly seed: number) {
    this.r = mulberry32(seed);
  }
  float(): number {
    return this.r();
  }
  int(nExclusive: number): number {
    return Math.floor(this.r() * nExclusive);
  }
  between(lo: number, hi: number): number {
    return lo + this.int(hi - lo + 1);
  }
  bool(p = 0.5): boolean {
    return this.r() < p;
  }
  pick<T>(xs: readonly T[]): T {
    return xs[this.int(xs.length)];
  }
  shuffle<T>(xs: readonly T[]): T[] {
    const out = [...xs];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

// ── Vocabulary ───────────────────────────────────────────────────────────

export const LIVE = TRACKER_LETTERS.filter((l) => l.status === 'live').map((l) => l.letter);
export const COMING = TRACKER_LETTERS.filter((l) => l.status === 'coming').map((l) => l.letter);
export const ALL_LETTERS = TRACKER_LETTERS.map((l) => l.letter);

export const STATUSES: Status[] = ['not_started', 'presented', 'practicing', 'mastered'];
export const SOURCES: Source[] = [
  'tap',
  'photo',
  'ai',
  'digital',
  'live',
  'import',
  'backfill',
  'correction',
];

export const TRAY_NAMES = [
  'Sound boxes',
  'Movable alphabet',
  'Word chains',
  'Dictation',
  'Sentence builder',
  'Story books',
  "Author's chair",
  'Grammar symbols',
];

export const CHILD_POOL: Child[] = [
  { id: 'c1', name: 'Mei', pronoun: 'she' },
  { id: 'c2', name: 'Chris', pronoun: 'he' },
  { id: 'c3', name: 'Li', pronoun: 'they' },
  { id: 'c4', name: 'Amir', pronoun: 'he' },
  { id: 'c5', name: 'Sara', pronoun: 'she' },
  { id: 'c6', name: 'Bartholomew Fitzwilliam Oyelaran', pronoun: 'he' },
];

/** Twelve Mondays from 2026-01-05. */
export const WEEK_STARTS: string[] = Array.from({ length: 12 }, (_, i) => {
  const d = new Date('2026-01-05T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + i * 7);
  return d.toISOString().slice(0, 10);
});

export function dayPlus(base: string, n: number): string {
  const d = new Date(`${base}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A day inside the 12-week window, plus a random hour. */
export function isoOn(rng: Rng, dayOffset: number, hour?: number): string {
  const day = dayPlus(WEEK_STARTS[0], dayOffset);
  const h = hour ?? rng.between(6, 17);
  const m = rng.between(0, 59);
  return `${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
}

// ── Curriculum ───────────────────────────────────────────────────────────

export interface WorksOpts {
  /** letters to include (defaults to a random handful of live letters). */
  letters?: string[];
  /** how many of the 5 works per letter to include (default 5). */
  worksPerLetter?: number;
  trays?: number;
  legacy?: boolean;
}

export function genWorks(rng: Rng, opts: WorksOpts = {}): CurriculumWork[] {
  const letters = opts.letters ?? LIVE.slice(0, rng.between(1, 4));
  const per = opts.worksPerLetter ?? 5;
  const works: CurriculumWork[] = [];
  letters.forEach((letter, li) => {
    for (let n = 1; n <= per; n++) {
      works.push({
        work_key: `dp:${letter}:${n}`,
        name: `${letter} Dark Phonics work ${n}`,
        area: 'Language',
        sequence: li * 10 + n,
        group: 'dark-phonics',
      });
    }
  });
  const trays = opts.trays ?? rng.between(0, 8);
  for (let i = 1; i <= trays; i++) {
    works.push({
      work_key: `ws:${i}`,
      name: `Writing Shelf tray ${i}`,
      description: TRAY_NAMES[i - 1],
      area: 'Language',
      sequence: 5000 + i,
      group: 'writing-shelf',
    });
  }
  if (opts.legacy ?? rng.bool(0.4)) {
    works.push({
      work_key: 'lang:blue-series-blends',
      name: 'Blue Series blends',
      area: 'Language',
      sequence: 9002,
      group: 'other',
    });
  }
  return works;
}

// ── Events ───────────────────────────────────────────────────────────────

export interface EventsOpts {
  children?: Child[];
  works?: CurriculumWork[];
  count?: number;
  /** allow work_key values that are not in `works` (incl. null / junk). */
  wild?: boolean;
}

/**
 * Deliberately hostile: out-of-order arrival, same-day repeats, backward
 * statuses, corrections with and without a reason, keys the curriculum does
 * not carry, and (when `wild`) a null key.
 */
export function genEvents(rng: Rng, opts: EventsOpts = {}): ProgressEvent[] {
  const children = opts.children ?? CHILD_POOL.slice(0, rng.between(1, 4));
  const works = opts.works ?? genWorks(rng);
  const wild = opts.wild ?? true;
  const n = opts.count ?? rng.between(0, 40);

  const keyPool: (string | null)[] = works.map((w) => w.work_key);
  if (wild) {
    keyPool.push(`dp:${rng.pick(COMING)}:${rng.between(1, 5)}`);
    keyPool.push(`ws:${rng.between(9, 12)}`);
    keyPool.push('lang:beginning-sounds-vocab');
    keyPool.push(null);
  }
  if (keyPool.length === 0) keyPool.push(null);

  const nameOf = new Map(works.map((w) => [w.work_key, w.name]));
  const out: ProgressEvent[] = [];
  for (let i = 0; i < n; i++) {
    const child = rng.pick(children);
    const key = rng.pick(keyPool);
    const source = rng.pick(SOURCES);
    const isCorrection = source === 'correction';
    out.push({
      child_id: child.id,
      classroom_id: 'class-1',
      work_key: key,
      work_name: key ? (nameOf.get(key) ?? key) : 'Something the teacher typed',
      area: 'Language',
      old_status: null,
      new_status: rng.pick(STATUSES),
      source,
      actor: 'teacher:ruth',
      // out-of-order arrival is the point: the day is random, not increasing.
      created_at: isoOn(rng, rng.int(84), rng.bool(0.3) ? 9 : undefined),
      // Half the corrections deliberately arrive with no reason (rule 4).
      reason: isCorrection && rng.bool(0.5) ? 'teacher fixed a mistagged photo' : null,
      evidence_id: rng.bool(0.3) ? `ev-${i}` : null,
    });
  }
  return out;
}

export function genLedger(rng: Rng, opts: EventsOpts & WorksOpts = {}): Ledger {
  const works = opts.works ?? genWorks(rng, opts);
  const children = opts.children ?? CHILD_POOL.slice(0, rng.between(1, 4));
  const events = genEvents(rng, { ...opts, works, children });
  return {
    events,
    works,
    children,
    classWeekLetter: rng.pick(LIVE),
    weekStarts: WEEK_STARTS,
  };
}

/**
 * A ledger built BY THE RULES: forward-only per (child, work), at most one
 * ladder move per (child, work, day), every key present in the curriculum,
 * no corrections, no null keys. checkInvariants() must be silent on this.
 */
export function genConsistentLedger(rng: Rng, opts: { letters?: string[] } = {}): Ledger {
  const letters = opts.letters ?? LIVE.slice(0, rng.between(1, 3));
  const works = genWorks(rng, { letters, trays: rng.between(0, 4), legacy: false });
  const children = CHILD_POOL.slice(0, rng.between(1, 4));
  const rank: Record<Status, number> = {
    not_started: 0,
    presented: 1,
    practicing: 2,
    mastered: 3,
  };
  const nameOf = new Map(works.map((w) => [w.work_key, w.name]));
  const at = new Map<string, Status>();
  const lastOffset = new Map<string, number>();
  const events: ProgressEvent[] = [];

  const steps = rng.between(0, 60);
  for (let i = 0; i < steps; i++) {
    const child = rng.pick(children);
    const work = rng.pick(works);
    const pair = `${child.id}|${work.work_key}`;
    const cur = at.get(pair) ?? 'not_started';
    if (cur === 'mastered') continue;
    const nextRank = rank[cur] + 1;
    const next = (['not_started', 'presented', 'practicing', 'mastered'] as Status[])[nextRank];
    // The journal is replayed in TIMESTAMP order, so a by-the-rules ledger has
    // to move forward in time as well as up the ladder: each step for a pair
    // lands on a strictly later day than the last, which also satisfies the
    // one-ladder-move-per-day rule for free.
    const prevOffset = lastOffset.get(pair);
    const dayOffset = prevOffset === undefined ? rng.int(40) : prevOffset + rng.between(1, 8);
    if (dayOffset > 80) continue;
    lastOffset.set(pair, dayOffset);
    const day = dayPlus(WEEK_STARTS[0], dayOffset);
    at.set(pair, next);
    events.push({
      child_id: child.id,
      classroom_id: 'class-1',
      work_key: work.work_key,
      work_name: nameOf.get(work.work_key)!,
      area: 'Language',
      old_status: cur,
      new_status: next,
      source: rng.pick(SOURCES.filter((s) => s !== 'correction')),
      actor: 'teacher:ruth',
      created_at: `${day}T${String(rng.between(6, 17)).padStart(2, '0')}:00:00.000Z`,
      reason: null,
      evidence_id: null,
    });
  }
  return {
    events: rng.shuffle(events),
    works,
    children,
    classWeekLetter: rng.pick(letters),
    weekStarts: WEEK_STARTS,
  };
}

// ── Shrinking ────────────────────────────────────────────────────────────

/**
 * Trim the event list to the smallest prefix/subset that still fails.
 * `fails(events)` must be a pure predicate.
 */
export function shrinkEvents(
  events: readonly ProgressEvent[],
  fails: (evs: ProgressEvent[]) => boolean
): ProgressEvent[] {
  let best = [...events];
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 40) {
    changed = false;
    // Try halves first, then single-element deletions.
    for (const chunk of [Math.ceil(best.length / 2), 1]) {
      for (let i = 0; i + chunk <= best.length; i++) {
        const candidate = [...best.slice(0, i), ...best.slice(i + chunk)];
        if (candidate.length === best.length) continue;
        let bad = false;
        try {
          bad = fails(candidate);
        } catch {
          bad = true;
        }
        if (bad) {
          best = candidate;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  return best;
}

export function show(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** Run `body` for `cases` seeds; on the first failure, report seed + payload. */
export function forEachSeed(cases: number, baseSeed: number, body: (rng: Rng, seed: number) => void) {
  for (let i = 0; i < cases; i++) {
    const seed = baseSeed + i;
    try {
      body(new Rng(seed), seed);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      e.message = `[seed ${seed}] ${e.message}`;
      throw e;
    }
  }
}
