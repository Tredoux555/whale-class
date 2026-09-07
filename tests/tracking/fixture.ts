// tests/tracking/fixture.ts
//
// The simulated term. One classroom, eight children, twelve weeks, every
// acceptance scenario in docs/tracking/TRACKING_CONSTITUTION.md played as
// events. Nothing here touches Supabase — the whole term is an array.

import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import {
  WRITING_SHELF_MATERIALS,
  WRITING_SHELF_NAMES,
} from '@/lib/montree/dark-phonics/writing-shelf-curriculum';
import type { Child, CurriculumWork, Ledger, ProgressEvent, Source, Status } from '@/lib/montree/tracking/types';

export const LIVE_LETTERS = TRACKER_LETTERS.filter((l) => l.status === 'live');

/**
 * The tray MATERIALS, exactly as migration 352 seeds them into
 * montree_classroom_curriculum_works.description. The material stays its own
 * column — the parent summary interpolates it — while the row's `name` is the
 * DISPLAY name ('Writing Shelf tray 3 · Word chains'), which carries the
 * material after a ' · ' for a human reading a curriculum list.
 */
export const TRAY_NAMES: readonly string[] = WRITING_SHELF_MATERIALS;

/** The display names, in tray order. */
export const TRAY_DISPLAY_NAMES: readonly string[] = WRITING_SHELF_NAMES;

export function buildWorks(): CurriculumWork[] {
  const works: CurriculumWork[] = [];
  LIVE_LETTERS.forEach((letter, li) => {
    letter.works.forEach((w) => {
      works.push({
        work_key: w.id,
        name: w.name,
        area: 'Language',
        sequence: li * 10 + w.n,
        group: 'dark-phonics',
      });
    });
  });
  TRAY_NAMES.forEach((tray, i) => {
    works.push({
      work_key: `ws:${i + 1}`,
      name: TRAY_DISPLAY_NAMES[i],
      description: tray,
      area: 'Language',
      sequence: 5000 + i + 1,
      group: 'writing-shelf',
    });
  });
  // Two legacy Language works that must never reach a parent (rules 8/9).
  works.push({
    work_key: 'lang:beginning-sounds-vocab',
    name: 'Beginning Sounds — Vocabulary',
    area: 'Language',
    sequence: 9001,
    group: 'other',
  });
  works.push({
    work_key: 'lang:blue-series-blends',
    name: 'Blue Series blends',
    area: 'Language',
    sequence: 9002,
    group: 'other',
  });
  return works;
}

export const CHILDREN: Child[] = [
  { id: 'mei', name: 'Mei', pronoun: 'she' },
  { id: 'chris', name: 'Chris', pronoun: 'he' },
  { id: 'li', name: 'Li', pronoun: 'they' },
  { id: 'amir', name: 'Amir', pronoun: 'he' },
  { id: 'sara', name: 'Sara', pronoun: 'she' },
  { id: 'noor', name: 'Noor', pronoun: 'they' },
  { id: 'tom', name: 'Tom', pronoun: 'he' },
  { id: 'ava', name: 'Ava', pronoun: 'she' },
];

/** Twelve Mondays. 2026-01-05 is a Monday. */
export const WEEK_STARTS: string[] = Array.from({ length: 12 }, (_, i) => {
  const d = new Date('2026-01-05T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + i * 7);
  return d.toISOString().slice(0, 10);
});

/** week is 1-based, offset 0 = Monday. */
export function day(week: number, offset = 0): string {
  const d = new Date(`${WEEK_STARTS[week - 1]}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function at(week: number, offset = 0, hour = 9): string {
  return `${day(week, offset)}T${String(hour).padStart(2, '0')}:15:00.000Z`;
}

const NAME_BY_KEY = new Map(buildWorks().map((w) => [w.work_key, w.name]));

export interface TickOpts {
  status?: Status;
  source?: Source;
  reason?: string;
  actor?: string;
  evidence_id?: string;
  hour?: number;
}

export function ev(
  childId: string,
  workKey: string,
  week: number,
  offset = 0,
  opts: TickOpts = {}
): ProgressEvent {
  return {
    child_id: childId,
    classroom_id: 'class-1',
    work_key: workKey,
    work_name: NAME_BY_KEY.get(workKey) ?? workKey,
    area: 'Language',
    old_status: null,
    new_status: opts.status ?? 'mastered',
    source: opts.source ?? 'tap',
    actor: opts.actor ?? 'teacher:ruth',
    created_at: at(week, offset, opts.hour ?? 9),
    reason: opts.reason ?? null,
    evidence_id: opts.evidence_id ?? null,
  };
}

const dp = (letter: string, n: number) => `dp:${letter}:${n}`;

export function buildEvents(): ProgressEvent[] {
  const e: ProgressEvent[] = [];

  // ── Mei — the racer. Finishes 's' in two weeks, 'a' inside week 3.
  e.push(ev('mei', dp('s', 1), 1, 0), ev('mei', dp('s', 2), 1, 1), ev('mei', dp('s', 3), 1, 2));
  e.push(ev('mei', dp('s', 4), 2, 0), ev('mei', dp('s', 5), 2, 1));
  e.push(
    ev('mei', dp('a', 1), 3, 0),
    ev('mei', dp('a', 2), 3, 1),
    ev('mei', dp('a', 3), 3, 2, { source: 'photo', evidence_id: 'photo-a3-am' }),
    // Scenario "Duplicate photo same morning": second shot of the same work,
    // same day. One event only.
    ev('mei', dp('a', 3), 3, 2, { source: 'photo', evidence_id: 'photo-a3-am-2', hour: 11 }),
    ev('mei', dp('a', 4), 3, 3),
    ev('mei', dp('a', 5), 3, 4)
  );
  e.push(ev('mei', dp('t', 1), 11, 0), ev('mei', dp('t', 2), 11, 1), ev('mei', dp('t', 3), 11, 2));
  e.push(ev('mei', dp('t', 4), 12, 0));
  // Scenario "Downward correction with reason".
  e.push(
    ev('mei', dp('t', 1), 12, 2, {
      status: 'practicing',
      source: 'correction',
      reason: 'Tagged the wrong child on Monday — Mei has not finished work 1.',
    })
  );

  // ── Chris — steady. One work a week; 's' completes in week 5.
  for (let n = 1; n <= 5; n++) e.push(ev('chris', dp('s', n), n, 1));
  // A legacy Language work in the same week: it must never appear in a summary.
  e.push(ev('chris', 'lang:beginning-sounds-vocab', 5, 3));
  e.push(ev('chris', dp('a', 1), 6, 1), ev('chris', dp('a', 2), 7, 1), ev('chris', dp('a', 3), 8, 1));
  e.push(ev('chris', dp('a', 4), 9, 1), ev('chris', dp('a', 5), 10, 1));
  e.push(ev('chris', dp('t', 1), 11, 1), ev('chris', dp('t', 2), 12, 1));

  // ── Li — stalls. Works 1-4 of 's', then three weeks of repeat observations
  //    on the same work: activity, no ladder movement.
  for (let n = 1; n <= 4; n++) e.push(ev('li', dp('s', n), n, 2));
  for (const week of [5, 6, 7]) {
    e.push(ev('li', dp('s', 4), week, 2, { source: 'photo', evidence_id: `li-w${week}` }));
  }

  // ── Amir — absent from week 4. Class-letter fallback + no-observation flag.
  e.push(ev('amir', dp('s', 1), 1, 3), ev('amir', dp('s', 2), 2, 3), ev('amir', dp('s', 3), 3, 3));

  // ── Sara — joins mid-year in week 8. 's', 'a', 't' backfilled; 'p' current.
  for (const letter of ['s', 'a', 't']) {
    for (let n = 1; n <= 5; n++) {
      e.push(ev('sara', dp(letter, n), 8, 0, { source: 'backfill', actor: 'admin:import' }));
    }
  }
  e.push(ev('sara', dp('p', 1), 10, 0), ev('sara', dp('p', 2), 10, 2), ev('sara', dp('p', 3), 10, 4));

  // ── Noor — out of sequence: work 2 and work 4 of 'i', nothing between.
  e.push(ev('noor', dp('i', 2), 6, 0), ev('noor', dp('i', 4), 6, 3));

  // ── Tom — Writing Shelf only, plus a legacy blends row on the same day.
  e.push(ev('tom', 'ws:1', 4, 1), ev('tom', 'lang:blue-series-blends', 4, 1));

  // ── Ava — one observation in week 1, then silence.
  e.push(ev('ava', dp('s', 1), 1, 4));

  return e;
}

export function buildLedger(): Ledger {
  return {
    events: buildEvents(),
    works: buildWorks(),
    children: CHILDREN,
    classWeekLetter: 't',
    weekStarts: WEEK_STARTS,
  };
}
