// tests/tracking/timezone.test.ts
//
// THE SCHOOL'S DAY, NOT GREENWICH'S (audit 08-verify-tracking §5).
//
// Every day and week boundary in the engine used to be UTC: dayOf() was
// toISOString().slice(0,10), and the dedupe, the week grid and the weekly summary
// all read it. Two consequences, both reproduced below as the audit reproduced them:
//
//   A) Beijing (UTC+8). 07:30 and 08:30 local are 23:30Z and 00:30Z — two UTC days.
//      Two photos of the same work in one morning BOTH advanced the ladder.
//   B) Any school WEST of UTC. The local day straddles UTC midnight in the middle
//      of the AFTERNOON, so the same miss happens during operating hours: a 15:00
//      and a 17:30 observation on one Friday were two different "days".
//
// The DB guard index (migration 347) is still keyed on the UTC day, deliberately —
// an index expression cannot consult a row's school. It is a coarse concurrency
// backstop; THIS is the authoritative rule, and it is stricter.

import { describe, it, expect } from 'vitest';
import {
  applyEvent,
  dayOf,
  dedupeSameDay,
  emptyState,
  replay,
} from '@/lib/montree/tracking/ledger';
import { inWeek, weekTicks } from '@/lib/montree/tracking/derive';
import { mondayOf, weekStartsBetween } from '@/lib/montree/tracking/persistence';
import type { ProgressEvent, Status } from '@/lib/montree/tracking/types';

const CHILD = 'child-1';
const KEY = 'dp:t:3';
const BEIJING = 'Asia/Shanghai';
const PACIFIC = 'America/Los_Angeles';

function ev(at: string, next: Status, old: Status | null): ProgressEvent {
  return {
    child_id: CHILD, classroom_id: 'room', work_key: KEY, work_name: 't Dark Phonics work 3',
    area: 'language', old_status: old, new_status: next, source: 'photo', actor: 't',
    created_at: at, reason: null, evidence_id: null,
  };
}

describe('dayOf — the calendar day is read in the school’s timezone', () => {
  it('Beijing 07:30 and 08:30 are ONE school day (they are two UTC days)', () => {
    const at0730 = '2026-09-07T23:30:00.000Z'; // Tue 8 Sep, 07:30 Beijing
    const at0830 = '2026-09-08T00:30:00.000Z'; // Tue 8 Sep, 08:30 Beijing
    expect(dayOf(at0730)).toBe('2026-09-07');            // the old, wrong answer
    expect(dayOf(at0830)).toBe('2026-09-08');
    expect(dayOf(at0730, BEIJING)).toBe('2026-09-08');   // both, correctly, Tuesday
    expect(dayOf(at0830, BEIJING)).toBe('2026-09-08');
  });

  it('US Pacific 15:00 and 17:30 are ONE school day (mid-afternoon UTC seam)', () => {
    const at1500 = '2026-09-04T22:00:00.000Z'; // Fri 4 Sep, 15:00 Pacific
    const at1730 = '2026-09-05T00:30:00.000Z'; // Fri 4 Sep, 17:30 Pacific
    expect(dayOf(at1500)).toBe('2026-09-04');
    expect(dayOf(at1730)).toBe('2026-09-05');            // the old, wrong answer
    expect(dayOf(at1500, PACIFIC)).toBe('2026-09-04');
    expect(dayOf(at1730, PACIFIC)).toBe('2026-09-04');
  });

  it('an unknown zone falls back to UTC rather than throwing', () => {
    expect(dayOf('2026-09-08T00:30:00.000Z', 'Mars/Olympus')).toBe('2026-09-08');
  });
});

describe('rule 4 — one ladder move per SCHOOL day', () => {
  it('A) Beijing: the second photo of the morning is evidence, not a second rung', () => {
    const first = ev('2026-09-07T23:30:00.000Z', 'practicing', 'presented');
    const second = ev('2026-09-08T00:30:00.000Z', 'mastered', 'practicing');

    // Before the fix (UTC): both accepted, the ladder moved twice in one morning.
    const utc = emptyState();
    utc.current.set(CHILD, new Map([[KEY, 'presented' as Status]]));
    const utc1 = applyEvent(utc, first);
    const utc2 = applyEvent(utc1.state, second);
    expect(utc1.accepted).toBe(true);
    expect(utc2.accepted).toBe(true);

    // After: one move, and the second is kept as evidence (rule 11).
    const cn = emptyState();
    cn.current.set(CHILD, new Map([[KEY, 'presented' as Status]]));
    const cn1 = applyEvent(cn, first, BEIJING);
    const cn2 = applyEvent(cn1.state, second, BEIJING);
    expect(cn1.accepted).toBe(true);
    expect(cn2.accepted).toBe(false);
    expect(cn2.why).toBe('duplicate-same-day');
    expect(cn2.attachAsEvidence).toBe(true);
  });

  it('B) US Pacific: the same miss, in the middle of the school afternoon', () => {
    const first = ev('2026-09-04T22:00:00.000Z', 'practicing', 'presented');
    const second = ev('2026-09-05T00:30:00.000Z', 'mastered', 'practicing');
    const state = emptyState();
    state.current.set(CHILD, new Map([[KEY, 'presented' as Status]]));
    const one = applyEvent(state, first, PACIFIC);
    expect(one.accepted).toBe(true);
    const two = applyEvent(one.state, second, PACIFIC);
    expect(two.accepted).toBe(false);
    expect(two.why).toBe('duplicate-same-day');
  });

  it('dedupeSameDay agrees with applyEvent on its own', () => {
    const state = emptyState();
    state.current.set(CHILD, new Map([[KEY, 'presented' as Status]]));
    const moved = applyEvent(state, ev('2026-09-07T23:30:00.000Z', 'practicing', 'presented'), BEIJING);
    const verdict = dedupeSameDay(moved.state, ev('2026-09-08T00:30:00.000Z', 'mastered', 'practicing'), BEIJING);
    expect(verdict.accepted).toBe(false);

    // …and the SAME pair, applied and asked entirely in UTC, is NOT deduped —
    // which is the bug. (The state must be rebuilt in UTC too: it records the day
    // the rung moved, in the zone it moved in.)
    const utcState = emptyState();
    utcState.current.set(CHILD, new Map([[KEY, 'presented' as Status]]));
    const utcMoved = applyEvent(utcState, ev('2026-09-07T23:30:00.000Z', 'practicing', 'presented'));
    expect(
      dedupeSameDay(utcMoved.state, ev('2026-09-08T00:30:00.000Z', 'mastered', 'practicing')).accepted,
    ).toBe(true);
  });

  it('a correction is exempt in every timezone', () => {
    const state = emptyState();
    state.current.set(CHILD, new Map([[KEY, 'mastered' as Status]]));
    const moved = applyEvent(state, ev('2026-09-07T23:30:00.000Z', 'mastered', 'practicing'), BEIJING);
    const correction: ProgressEvent = {
      ...ev('2026-09-08T01:00:00.000Z', 'practicing', 'mastered'),
      source: 'correction',
      reason: 'wrong child',
    };
    expect(applyEvent(moved.state, correction, BEIJING).accepted).toBe(true);
  });
});

describe('week bucketing reads the same timezone', () => {
  // Beijing Monday 14 Sep 04:00 is 2026-09-13T20:00Z — the UTC read files it in
  // LAST week, so the tick vanished from the grid the teacher was looking at.
  const mondayMorning = '2026-09-13T20:00:00.000Z';

  it('inWeek puts a Beijing Monday morning in ITS week', () => {
    expect(inWeek(mondayMorning, '2026-09-07')).toBe(true);            // UTC: last week
    expect(inWeek(mondayMorning, '2026-09-14')).toBe(false);
    expect(inWeek(mondayMorning, '2026-09-14', BEIJING)).toBe(true);   // correct
    expect(inWeek(mondayMorning, '2026-09-07', BEIJING)).toBe(false);
  });

  it('mondayOf snaps an instant to the Monday of ITS school week', () => {
    expect(mondayOf(mondayMorning)).toBe('2026-09-07');
    expect(mondayOf(mondayMorning, BEIJING)).toBe('2026-09-14');
    // A bare calendar day is already a school day — the timezone changes nothing.
    expect(mondayOf('2026-09-16', BEIJING)).toBe('2026-09-14');
  });

  it('weekStartsBetween spans the same weeks in either zone for bare days', () => {
    expect(weekStartsBetween('2026-09-01', '2026-09-16', 104, BEIJING)).toEqual([
      '2026-08-31', '2026-09-07', '2026-09-14',
    ]);
  });

  it('weekTicks reports the Beijing Monday tick in the Beijing week', () => {
    const events = [ev(mondayMorning, 'practicing', 'presented')];
    expect(weekTicks(events, CHILD, '2026-09-14').length).toBe(0);
    const ticks = weekTicks(events, CHILD, '2026-09-14', BEIJING);
    expect(ticks.length).toBe(1);
    expect(ticks[0].day).toBe('2026-09-14');
  });
});

describe('the replay cache is keyed on the timezone, not just the array', () => {
  it('the same array replayed in two zones gives two answers', () => {
    const events = [
      ev('2026-09-07T23:30:00.000Z', 'practicing', 'presented'),
      ev('2026-09-08T00:30:00.000Z', 'mastered', 'practicing'),
    ];
    // UTC: two days, so both moves land → mastered.
    expect(replay(events).state.current.get(CHILD)?.get(KEY)).toBe('mastered');
    // Beijing: one day, so the second is evidence → practicing.
    expect(replay(events, BEIJING).state.current.get(CHILD)?.get(KEY)).toBe('practicing');
    // And again, from the cache, unchanged.
    expect(replay(events).state.current.get(CHILD)?.get(KEY)).toBe('mastered');
  });
});
