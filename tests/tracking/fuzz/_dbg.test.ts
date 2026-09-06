// tests/tracking/fuzz/_dbg.test.ts
//
// Self-test for the seeded generators in ./gen.ts. A property suite is only
// worth its failure messages if the seed in the message really reproduces the
// case, so that is what this file pins down.
//
// (The filename is a leftover: this workspace does not permit deleting files,
// so the scratch file this started as was rewritten into something useful
// rather than left as debug noise.)

import { describe, expect, it } from 'vitest';
import { genConsistentLedger, genEvents, genLedger, mulberry32, Rng } from './gen';
import { rebuildCurrent, replay, STATUS_RANK } from '@/lib/montree/tracking/ledger';

describe('fuzz generators', () => {
  it('mulberry32 is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('the same seed rebuilds the identical ledger', () => {
    for (const seed of [1, 42, 999, 21_000_022]) {
      expect(JSON.stringify(genLedger(new Rng(seed)))).toBe(
        JSON.stringify(genLedger(new Rng(seed)))
      );
      expect(JSON.stringify(genEvents(new Rng(seed)))).toBe(
        JSON.stringify(genEvents(new Rng(seed)))
      );
    }
  });

  it('Rng.shuffle is a permutation', () => {
    const rng = new Rng(7);
    const xs = Array.from({ length: 50 }, (_, i) => i);
    for (let i = 0; i < 100; i++) {
      const out = rng.shuffle(xs);
      expect(out.length).toBe(xs.length);
      expect([...out].sort((a, b) => a - b)).toEqual(xs);
    }
  });

  it('genEvents actually exercises the interesting shapes', () => {
    const events = Array.from({ length: 40 }, (_, i) => genEvents(new Rng(500 + i), { count: 30 })).flat();
    expect(events.some((e) => e.work_key === null)).toBe(true);
    expect(events.some((e) => e.source === 'correction' && !e.reason)).toBe(true);
    expect(events.some((e) => e.source === 'correction' && !!e.reason)).toBe(true);
    // out-of-order arrival really happens
    expect(
      events.some((e, i) => i > 0 && Date.parse(e.created_at) < Date.parse(events[i - 1].created_at))
    ).toBe(true);
  });

  it('genConsistentLedger really is consistent — forward-only, one move per day', () => {
    for (let seed = 0; seed < 200; seed++) {
      const ledger = genConsistentLedger(new Rng(seed));
      const keys = new Set(ledger.works.map((w) => w.work_key));
      const seen = new Map<string, number>();
      const days = new Set<string>();
      for (const { event, result } of replay(ledger.events).rows) {
        expect(event.work_key).toBeTruthy();
        expect(keys.has(event.work_key!)).toBe(true);
        expect(event.source).not.toBe('correction');
        expect(result.accepted, `rejected ${result.why} on a by-the-rules ledger`).toBe(true);
        const pair = `${event.child_id}|${event.work_key}`;
        const prev = seen.get(pair) ?? 0;
        expect(STATUS_RANK[event.new_status]).toBe(prev + 1);
        seen.set(pair, STATUS_RANK[event.new_status]);
        const dayKey = `${pair}|${event.created_at.slice(0, 10)}`;
        expect(days.has(dayKey)).toBe(false);
        days.add(dayKey);
      }
      // and the rebuild agrees with the walk
      for (const [pair, rank] of seen) {
        const [child, key] = pair.split('|');
        expect(STATUS_RANK[rebuildCurrent(ledger.events).get(child)!.get(key)!]).toBe(rank);
      }
    }
  });
});
