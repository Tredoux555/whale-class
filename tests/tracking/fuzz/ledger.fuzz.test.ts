// tests/tracking/fuzz/ledger.fuzz.test.ts
//
// Property-based tests for rules 3 and 4 (the journal is the truth; status
// only moves forward on its own).

import { describe, expect, it } from 'vitest';
import {
  applyEvent,
  emptyState,
  dayOf,
  dedupeSameDay,
  rebuildCurrent,
  replay,
  sortEvents,
  STATUS_RANK,
  type LedgerState,
} from '@/lib/montree/tracking/ledger';
import type { ProgressEvent, Status } from '@/lib/montree/tracking/types';
import { forEachSeed, genEvents, Rng, shrinkEvents, show } from './gen';

const CASES = 2000;

function currentToObject(m: Map<string, Map<string, Status>>): Record<string, Record<string, Status>> {
  const out: Record<string, Record<string, Status>> = {};
  for (const [child, works] of [...m].sort((a, b) => a[0].localeCompare(b[0]))) {
    out[child] = Object.fromEntries([...works].sort((a, b) => a[0].localeCompare(b[0])));
  }
  return out;
}

function fold(events: readonly ProgressEvent[]): LedgerState {
  let state = emptyState();
  for (const e of events) state = applyEvent(state, e).state;
  return state;
}

describe('ledger fuzz', () => {
  it('applyEvent never throws on any generated row (2000 cases)', () => {
    forEachSeed(CASES, 1_000_000, (rng) => {
      const events = genEvents(rng, { count: rng.between(0, 30) });
      let state = emptyState();
      for (const e of events) {
        const r = applyEvent(state, e);
        expect(typeof r.accepted).toBe('boolean');
        state = r.state;
      }
    });
  });

  it('rebuildCurrent(events) equals the incrementally applied state (2000 cases)', () => {
    forEachSeed(CASES, 2_000_000, (rng) => {
      const events = genEvents(rng, { count: rng.between(0, 30) });
      const fails = (evs: ProgressEvent[]) =>
        JSON.stringify(currentToObject(rebuildCurrent(evs))) !==
        JSON.stringify(currentToObject(fold(sortEvents(evs)).current));
      if (fails(events)) {
        throw new Error(`rebuildCurrent != incremental fold\n${show(shrinkEvents(events, fails))}`);
      }
    });
  });

  it('status never moves backward without a correction carrying a reason (2000 cases)', () => {
    forEachSeed(CASES, 3_000_000, (rng) => {
      const events = genEvents(rng, { count: rng.between(0, 30) });
      const fails = (evs: ProgressEvent[]) => {
        const seen = new Map<string, Status>();
        for (const { event, result } of replay(evs).rows) {
          if (!result.accepted || !event.work_key) continue;
          const pair = `${event.child_id}|${event.work_key}`;
          const before = seen.get(pair) ?? 'not_started';
          const after = event.new_status;
          if (STATUS_RANK[after] < STATUS_RANK[before]) {
            const legal =
              event.source === 'correction' && !!event.reason && event.reason.trim().length > 0;
            if (!legal) return true;
          }
          seen.set(pair, after);
        }
        return false;
      };
      if (fails(events)) {
        throw new Error(`backward move without a reasoned correction\n${show(shrinkEvents(events, fails))}`);
      }
    });
  });

  it('dedupeSameDay: at most one non-correction ladder move per child+work+day (2000 cases)', () => {
    forEachSeed(CASES, 4_000_000, (rng) => {
      const events = genEvents(rng, { count: rng.between(0, 30) });
      const fails = (evs: ProgressEvent[]) => {
        const moves = new Map<string, number>();
        for (const { event, result } of replay(evs).rows) {
          if (!result.accepted || !event.work_key) continue;
          if (event.source === 'correction') continue;
          const k = `${event.child_id}|${event.work_key}|${dayOf(event.created_at)}`;
          const n = (moves.get(k) ?? 0) + 1;
          if (n > 1) return true;
          moves.set(k, n);
        }
        return false;
      };
      if (fails(events)) {
        throw new Error(`two ladder moves for one child+work+day\n${show(shrinkEvents(events, fails))}`);
      }
    });
  });

  it('dedupeSameDay agrees with applyEvent, and keeps the duplicate as evidence (2000 cases)', () => {
    forEachSeed(CASES, 4_500_000, (rng) => {
      const events = genEvents(rng, { count: rng.between(0, 20) });
      let state = emptyState();
      for (const e of sortEvents(events)) {
        const dupe = dedupeSameDay(state, e);
        const r = applyEvent(state, e);
        if (!dupe.accepted) {
          expect(r.accepted).toBe(false);
          expect(r.why).toBe('duplicate-same-day');
          expect(r.attachAsEvidence).toBe(true);
        }
        state = r.state;
      }
    });
  });

  // The constitution says the journal is the truth, so TIMESTAMP order wins:
  // replay() sorts before folding. Arrival order is therefore irrelevant, and
  // shuffling the array must not change a single derived status.
  it('timestamp order wins: shuffling arrival order never changes the state (2000 cases)', () => {
    forEachSeed(CASES, 5_000_000, (rng) => {
      const events = genEvents(rng, { count: rng.between(0, 24) });
      // Give every row a distinct instant so the stable tie-break by arrival
      // index cannot legitimately matter.
      const distinct = events.map((e, i) => ({
        ...e,
        created_at: new Date(Date.parse(e.created_at) + i * 1000).toISOString(),
      }));
      const base = JSON.stringify(currentToObject(rebuildCurrent(distinct)));
      for (let k = 0; k < 3; k++) {
        const shuffled = rng.shuffle(distinct);
        const got = JSON.stringify(currentToObject(rebuildCurrent(shuffled)));
        if (got !== base) {
          const fails = (evs: ProgressEvent[]) =>
            JSON.stringify(currentToObject(rebuildCurrent(evs))) !==
            JSON.stringify(currentToObject(rebuildCurrent([...evs].reverse())));
          throw new Error(`arrival order changed the state\n${show(shrinkEvents(distinct, fails))}`);
        }
      }
    });
  });

  // SEMANTIC DECISION, recorded here because the two readings genuinely differ.
  // Folding rows in ARRIVAL order and folding them in TIMESTAMP order are not
  // the same function: a row that arrives late but happened first is a
  // backward move in arrival order and a forward move in timestamp order.
  // Constitution rule 3 says the journal is the truth and the current-status
  // table is a cache of it, so TIMESTAMP order is the semantics — which is
  // what replay()/rebuildCurrent() implement, and what every derived read
  // therefore inherits. This test pins the difference down rather than
  // pretending it does not exist.
  it('arrival-order folding is NOT the semantics — timestamp order is', () => {
    const early: ProgressEvent = {
      child_id: 'c1',
      classroom_id: 'class-1',
      work_key: 'dp:s:1',
      work_name: 's Dark Phonics work 1',
      area: 'Language',
      old_status: null,
      new_status: 'presented',
      source: 'photo',
      actor: 'teacher:ruth',
      created_at: '2026-01-05T09:00:00.000Z',
      reason: null,
      evidence_id: null,
    };
    const late: ProgressEvent = {
      ...early,
      new_status: 'mastered',
      created_at: '2026-01-12T09:00:00.000Z',
    };
    // The mastery row arrives FIRST; the presentation is journalled late.
    const arrival = [late, early];
    // Arrival order would reject the second row as backward and hold 'mastered'
    // by luck; timestamp order builds presented -> mastered deliberately.
    expect(fold(arrival).current.get('c1')!.get('dp:s:1')).toBe('mastered');
    expect(rebuildCurrent(arrival).get('c1')!.get('dp:s:1')).toBe('mastered');
    // The two orders agree on the value here, but only replay() explains it:
    // it accepted BOTH rows, arrival-order folding accepted one and dropped
    // the other as 'backward-without-correction'.
    const arrivalVerdicts = (() => {
      let state = emptyState();
      return arrival.map((e) => {
        const r = applyEvent(state, e);
        state = r.state;
        return r.accepted;
      });
    })();
    expect(arrivalVerdicts).toEqual([true, false]);
    expect(replay(arrival).rows.map((r) => r.result.accepted)).toEqual([true, true]);
  });

  it('sortEvents is a stable chronological permutation (2000 cases)', () => {
    forEachSeed(CASES, 6_000_000, (rng) => {
      const events = genEvents(rng, { count: rng.between(0, 30) });
      const sorted = sortEvents(events);
      expect(sorted.length).toBe(events.length);
      for (let i = 1; i < sorted.length; i++) {
        expect(Date.parse(sorted[i - 1].created_at)).toBeLessThanOrEqual(
          Date.parse(sorted[i].created_at)
        );
      }
      // same multiset
      const key = (e: ProgressEvent) => JSON.stringify(e);
      expect(sorted.map(key).sort()).toEqual(events.map(key).sort());
      // idempotent
      expect(sortEvents(sorted).map(key)).toEqual(sorted.map(key));
    });
  });

  it('a rejected row leaves the state untouched (2000 cases)', () => {
    forEachSeed(CASES, 7_000_000, (rng) => {
      const events = genEvents(rng, { count: rng.between(0, 20) });
      let state = emptyState();
      for (const e of sortEvents(events)) {
        const before = JSON.stringify(currentToObject(state.current));
        const r = applyEvent(state, e);
        if (!r.accepted) {
          expect(JSON.stringify(currentToObject(r.state.current))).toBe(before);
        }
        state = r.state;
      }
    });
  });
});
