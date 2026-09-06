// tests/tracking/fuzz/invariants.fuzz.test.ts
//
// Rule 10: IT CHECKS ITSELF. A ledger built by the rules must come back
// silent; a ledger with one injected fault must name that exact fault.

import { describe, expect, it } from 'vitest';
import { workId } from '@/lib/montree/dark-phonics/tracker-works';
import { checkInvariants } from '@/lib/montree/tracking/invariants';
import { dayOf, rebuildCurrent, replay, sortEvents } from '@/lib/montree/tracking/ledger';
import type { CurrentMap } from '@/lib/montree/tracking/ledger';
import type { ProgressEvent, Status } from '@/lib/montree/tracking/types';
import { forEachSeed, genConsistentLedger, show } from './gen';

const CASES = 2000;

function lastDay(events: readonly ProgressEvent[]): string {
  const s = sortEvents(events);
  return s.length ? dayOf(s[s.length - 1].created_at) : '2026-01-05';
}

function cloneCurrent(m: CurrentMap): CurrentMap {
  return new Map([...m].map(([k, v]) => [k, new Map(v)]));
}

describe('invariants fuzz', () => {
  it('a consistent ledger reports nothing but no-observation (2000 cases)', () => {
    forEachSeed(CASES, 51_000_000, (rng) => {
      const ledger = genConsistentLedger(rng);
      const asOf = lastDay(ledger.events);
      const violations = checkInvariants(ledger, {
        asOf,
        currentTable: rebuildCurrent(ledger.events),
        focus: ledger.works.length
          ? [{ childId: ledger.children[0].id, workKey: rng.pick(ledger.works).work_key }]
          : [],
      });
      const unexpected = violations.filter((v) => v.code !== 'no-observation-10d');
      expect(
        unexpected.map((v) => v.code),
        `consistent ledger reported ${show(unexpected)}`
      ).toEqual([]);
    });
  });

  it('checkInvariants is deterministic and side-effect free (2000 cases)', () => {
    forEachSeed(CASES, 51_500_000, (rng) => {
      const ledger = genConsistentLedger(rng);
      const asOf = lastDay(ledger.events);
      const before = JSON.stringify(ledger.events);
      const a = checkInvariants(ledger, { asOf });
      const b = checkInvariants(ledger, { asOf });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(JSON.stringify(ledger.events)).toBe(before);
      for (const v of a) {
        expect(v.message).not.toContain('undefined');
        expect(v.message.trim().length).toBeGreaterThan(0);
      }
    });
  });

  it('dropping an event surfaces status-without-event / cache-journal-drift (2000 cases)', () => {
    forEachSeed(CASES, 52_000_000, (rng) => {
      const ledger = genConsistentLedger(rng);
      if (ledger.events.length === 0) return;
      const asOf = lastDay(ledger.events);
      const cached = rebuildCurrent(ledger.events); // the cache built BEFORE the loss
      // Drop the final accepted advance of some (child, work), so the journal
      // can genuinely no longer account for the cached status.
      const rows = replay(ledger.events).rows.filter((r) => r.result.accepted);
      if (rows.length === 0) return;
      const finals = new Map<string, ProgressEvent>();
      for (const r of rows) finals.set(`${r.event.child_id}|${r.event.work_key}`, r.event);
      const victim = rng.pick([...finals.values()]);
      const damaged = {
        ...ledger,
        events: ledger.events.filter((e) => e !== victim),
      };
      const found = checkInvariants(damaged, { asOf, currentTable: cached }).filter(
        (v) => v.childId === victim.child_id && v.workKey === victim.work_key
      );
      // invariants.ts reports the two cache/journal faults separately:
      // nothing left in the journal for the pair -> 'status-without-event'
      // (a rebuild would ERASE the status); some events left but they replay
      // to a different status -> 'cache-journal-drift' (rebuild is the fix).
      const survivors = damaged.events.some(
        (e) => e.child_id === victim.child_id && e.work_key === victim.work_key
      );
      const expected = survivors ? 'cache-journal-drift' : 'status-without-event';
      expect(
        found.map((v) => v.code),
        `dropped ${victim.work_key} for ${victim.child_id} but nothing was reported\n${show(victim)}`
      ).toContain(expected);
    });
  });

  it('corrupting the cached status surfaces cache-journal-drift (2000 cases)', () => {
    forEachSeed(CASES, 53_000_000, (rng) => {
      const ledger = genConsistentLedger(rng);
      const cached = cloneCurrent(rebuildCurrent(ledger.events));
      const withRows = [...cached].filter(([, works]) => works.size > 0);
      if (withRows.length === 0) return;
      const [childId, works] = rng.pick(withRows);
      const workKey = rng.pick([...works.keys()]);
      const real = works.get(workKey)!;
      const wrong = (['not_started', 'presented', 'practicing', 'mastered'] as Status[]).filter(
        (s) => s !== real
      );
      works.set(workKey, rng.pick(wrong));
      const found = checkInvariants(ledger, {
        asOf: lastDay(ledger.events),
        currentTable: cached,
      }).filter((v) => v.code === 'cache-journal-drift' || v.code === 'status-without-event');
      expect(found.length, `corrupted ${childId}/${workKey} went unreported`).toBeGreaterThan(0);
      const hit = found.find((v) => v.childId === childId && v.workKey === workKey);
      expect(hit, `corrupted ${childId}/${workKey} went unreported`).toBeTruthy();
      // The pair IS journalled, so it is drift, not a status with no event.
      expect(hit!.code).toBe('cache-journal-drift');
    });
  });

  it('an orphan (keyless) row surfaces no-key (2000 cases)', () => {
    forEachSeed(CASES, 54_000_000, (rng) => {
      const ledger = genConsistentLedger(rng);
      const orphan: ProgressEvent = {
        child_id: rng.pick(ledger.children).id,
        classroom_id: 'class-1',
        work_key: null,
        work_name: 'Blue Series blends',
        area: 'Language',
        old_status: null,
        new_status: 'presented',
        source: 'ai',
        actor: 'ai:photo',
        created_at: '2026-02-10T09:00:00.000Z',
        reason: null,
        evidence_id: null,
      };
      const damaged = { ...ledger, events: [...ledger.events, orphan] };
      const codes = checkInvariants(damaged, { asOf: '2026-02-10' }).map((v) => v.code);
      expect(codes).toContain('no-key');
      // and the clean ledger does not report it
      expect(checkInvariants(ledger, { asOf: '2026-02-10' }).map((v) => v.code)).not.toContain(
        'no-key'
      );
    });
  });

  it('a focus work outside the curriculum surfaces focus-not-in-curriculum (2000 cases)', () => {
    forEachSeed(CASES, 55_000_000, (rng) => {
      const ledger = genConsistentLedger(rng);
      const bogus = rng.pick(['dp:zz:3', 'ws:99', 'lang:blue-series-blends', 'made-up-key']);
      const codes = checkInvariants(ledger, {
        asOf: lastDay(ledger.events),
        focus: [{ childId: rng.pick(ledger.children).id, workKey: bogus }],
      }).map((v) => v.code);
      expect(codes, `focus ${bogus} was not flagged`).toContain('focus-not-in-curriculum');
    });
  });

  it('removing a curriculum row under a mastered letter surfaces mastered-letter-missing-work (2000 cases)', () => {
    forEachSeed(CASES, 56_000_000, (rng) => {
      const ledger = genConsistentLedger(rng);
      const current = rebuildCurrent(ledger.events);
      // find a mastered dp work
      const masteredKeys: string[] = [];
      for (const [, works] of current) {
        for (const [key, status] of works) {
          if (status === 'mastered' && key.startsWith('dp:')) masteredKeys.push(key);
        }
      }
      if (masteredKeys.length === 0) return;
      const key = rng.pick(masteredKeys);
      const letter = key.split(':')[1];
      // Remove a DIFFERENT work of the same letter from the curriculum.
      const sibling = [1, 2, 3, 4, 5]
        .map((n) => workId(letter, n))
        .find((k) => k !== key && ledger.works.some((w) => w.work_key === k));
      if (!sibling) return;
      const damaged = { ...ledger, works: ledger.works.filter((w) => w.work_key !== sibling) };
      const found = checkInvariants(damaged, { asOf: lastDay(ledger.events) }).filter(
        (v) => v.code === 'mastered-letter-missing-work'
      );
      expect(found.some((v) => v.workKey === sibling), `${sibling} was not reported`).toBe(true);
    });
  });

  it('two curriculum rows sharing a name surface duplicate-work-name (2000 cases)', () => {
    forEachSeed(CASES, 57_000_000, (rng) => {
      const ledger = genConsistentLedger(rng);
      if (ledger.works.length === 0) return;
      const twin = rng.pick(ledger.works);
      const damaged = {
        ...ledger,
        works: [...ledger.works, { ...twin, work_key: `${twin.work_key}-dupe` }],
      };
      const codes = checkInvariants(damaged, { asOf: lastDay(ledger.events) }).map((v) => v.code);
      expect(codes).toContain('duplicate-work-name');
    });
  });

  it('a surviving 1-128 pointer surfaces legacy-pointer-conflict (2000 cases)', () => {
    forEachSeed(CASES, 58_000_000, (rng) => {
      const ledger = genConsistentLedger(rng);
      const child = rng.pick(ledger.children).id;
      const asOf = lastDay(ledger.events);
      const inRange = checkInvariants(ledger, {
        asOf,
        legacyPointers: { [child]: rng.between(1, 128) },
      }).map((v) => v.code);
      expect(inRange).toContain('legacy-pointer-conflict');
      const outOfRange = checkInvariants(ledger, {
        asOf,
        legacyPointers: { [child]: rng.pick([0, 129, 500, Number.NaN]) },
      }).map((v) => v.code);
      expect(outOfRange).not.toContain('legacy-pointer-conflict');
    });
  });
});
