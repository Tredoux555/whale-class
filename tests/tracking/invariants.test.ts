// tests/tracking/invariants.test.ts
//
// RULE 10, on the two ways the CACHE and the JOURNAL can disagree.
//
// montree_child_progress is a cache of montree_progress_events (rule 3). Until now
// every disagreement between them was reported as one code, 'status-without-event',
// with one fix: "rebuild". That fix is right for one of the two cases and DESTRUCTIVE
// for the other —
//
//   * the journal has NOTHING for this (child, work): the row is pre-engine history,
//     or something wrote around the door. Rebuilding would erase a real status that
//     the journal simply cannot prove. The fix is the backfill,
//     migrations/347_progress_journal_backfill.sql.
//
//   * the journal HAS events and they replay to a different status: the cache is
//     merely stale. The journal is the truth, so rebuilding the child is exactly
//     right and loses nothing. That is the new 'cache-journal-drift'.
//
// The simulated term is the fixture; these tests dirty one cell at a time.

import { describe, it, expect } from 'vitest';
import { checkInvariants } from '@/lib/montree/tracking/invariants';
import { rebuildCurrent, type CurrentMap } from '@/lib/montree/tracking/ledger';
import type { Status } from '@/lib/montree/tracking/types';
import { buildLedger, day } from './fixture';

const ledger = buildLedger();
const AS_OF = day(12, 1);

/** The cache as it SHOULD be — the journal, replayed. */
function cleanCache(): CurrentMap {
  return rebuildCurrent(ledger.events);
}

function set(cache: CurrentMap, childId: string, workKey: string, status: Status): CurrentMap {
  const child = cache.get(childId) ?? new Map<string, Status>();
  child.set(workKey, status);
  cache.set(childId, child);
  return cache;
}

const codes = (cache: CurrentMap) =>
  checkInvariants(ledger, { asOf: AS_OF, currentTable: cache }).map((v) => v.code);

describe('rule 10 — cache versus journal', () => {
  it('reports nothing when the cache is exactly the replayed journal', () => {
    expect(codes(cleanCache())).not.toContain('cache-journal-drift');
    expect(codes(cleanCache())).not.toContain('status-without-event');
  });

  it("calls a stale cache row 'cache-journal-drift' and offers a rebuild", () => {
    // Chris really is on dp:a:5 mastered; the cache claims he is still practicing.
    const cache = set(cleanCache(), 'chris', 'dp:a:5', 'practicing');

    const found = checkInvariants(ledger, { asOf: AS_OF, currentTable: cache }).find(
      (v) => v.code === 'cache-journal-drift',
    );

    expect(found?.childId).toBe('chris');
    expect(found?.workKey).toBe('dp:a:5');
    expect(found?.message).toContain("journal replays 'mastered'");
    expect(found?.fix).toContain('rebuild child');
  });

  it("calls a row the journal has never heard of 'status-without-event', and does NOT offer a rebuild", () => {
    // Ava has one event, on dp:s:1. Nothing anywhere mentions dp:s:5 for her.
    const cache = set(cleanCache(), 'ava', 'dp:s:5', 'mastered');

    const found = checkInvariants(ledger, { asOf: AS_OF, currentTable: cache }).find(
      (v) => v.code === 'status-without-event',
    );

    expect(found?.childId).toBe('ava');
    expect(found?.workKey).toBe('dp:s:5');
    expect(found?.message).toContain('no event in the journal at all');
    // The whole point of the split: this one must NOT be rebuilt away.
    expect(found?.fix).toContain('347');
    expect(found?.fix).not.toContain('rebuild child');
  });

  it('separates the two on the same child, in the same sweep', () => {
    const cache = cleanCache();
    set(cache, 'mei', 'dp:t:4', 'presented');      // drift — the journal says mastered
    set(cache, 'mei', 'dp:b:1', 'practicing');     // no event for dp:b:1 anywhere

    const found = checkInvariants(ledger, { asOf: AS_OF, currentTable: cache }).filter(
      (v) => v.childId === 'mei' && (v.code === 'cache-journal-drift' || v.code === 'status-without-event'),
    );

    expect(found.map((v) => [v.code, v.workKey])).toEqual(
      expect.arrayContaining([
        ['cache-journal-drift', 'dp:t:4'],
        ['status-without-event', 'dp:b:1'],
      ]),
    );
  });

  it('after the 347 backfill there is nothing left to report — the journal accounts for the cache', () => {
    // What 347 does, in memory: every cache row gets its own event. Replay it back
    // and the cache and the journal agree by construction.
    const cache = cleanCache();
    const backfilled = {
      ...ledger,
      events: [
        ...ledger.events,
        // A pre-engine row for Ava, exactly as 347 writes it.
        {
          child_id: 'ava',
          classroom_id: 'class-1',
          work_key: 'dp:s:5',
          work_name: 's Dark Phonics work 5',
          area: 'Language',
          old_status: 'not_started' as Status,
          new_status: 'mastered' as Status,
          source: 'import' as const,
          actor: 'backfill-347',
          created_at: '2025-11-03T08:00:00.000Z',
          reason: 'journal backfill from cache (pre-engine history)',
          evidence_id: null,
        },
      ],
    };
    set(cache, 'ava', 'dp:s:5', 'mastered');

    const found = checkInvariants(backfilled, { asOf: AS_OF, currentTable: cache }).filter(
      (v) => v.code === 'status-without-event' || v.code === 'cache-journal-drift',
    );
    expect(found).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// RULE 10, MADE READABLE (2026-09-06 Whale-class burn-in).
//
// The live classroom produced 1,145 keyless journal events across 388 distinct
// work names. One violation per event is 1,145 lines that all say the same
// thing; nobody reads that, so nobody fixes it. groupKeyless() collapses them
// to one line per NAME, biggest first, and says whether the ONE reader can
// resolve the name (→ migration 349 repairs it in place) or cannot (→ it needs
// a human in the review queue).
// ---------------------------------------------------------------------------

import { groupKeyless, SAMPLE_CHILDREN } from '@/lib/montree/tracking/invariants';
import type { CurriculumWork } from '@/lib/montree/tracking/types';

describe('rule 10 — keyless rows are grouped by name, not listed per row', () => {
  const works: CurriculumWork[] = [
    { work_key: 'pl_carrying_mat', name: 'Carrying a Mat', area: 'practical_life', sequence: 1 },
    { work_key: 'ma_clock', name: 'Clock Work', area: 'mathematics', sequence: 2 },
    { work_key: 'cu_clock', name: 'Clock Work', area: 'cultural', sequence: 3 },
  ];

  const rows = [
    ...Array.from({ length: 11 }, (_, i) => ({ childId: `c${i % 7}`, workName: 'Carrying a Mat' })),
    ...Array.from({ length: 5 }, (_, i) => ({ childId: `c${i}`, workName: 'Clock Work' })),
    { childId: 'c1', workName: 'Map of China' },
  ];

  it('emits one line per distinct name, biggest first', () => {
    const out = groupKeyless(rows, works);
    expect(out.map((v) => v.workName)).toEqual(['Carrying a Mat', 'Clock Work', 'Map of China']);
    expect(out.every((v) => v.code === 'no-key')).toBe(true);
  });

  it('carries the row count, the child count and a sample of ids', () => {
    const [mat] = groupKeyless(rows, works);
    expect(mat.count).toBe(11);
    expect(mat.childCount).toBe(7);
    expect(mat.sampleChildIds?.length).toBe(SAMPLE_CHILDREN);
    expect(mat.message).toContain('11 keyless rows across 7 children');
  });

  it('says which names migration 349 can repair and which need a human', () => {
    const [mat, clock, china] = groupKeyless(rows, works);
    // Resolvable → repairable in place.
    expect(mat.workKey).toBe('pl_carrying_mat');
    expect(mat.fix).toContain('349');
    // A tie and an absent work are both "not repairable automatically".
    expect(clock.workKey).toBeUndefined();
    expect(clock.message).toContain('2 works answer to it');
    expect(china.workKey).toBeUndefined();
    expect(china.fix).toContain('review queue');
  });

  it('names differing only in case and punctuation are ONE group', () => {
    const out = groupKeyless(
      [
        { childId: 'a', workName: 'Carrying a Mat' },
        { childId: 'b', workName: 'carrying a mat' },
        { childId: 'c', workName: 'Carrying a Mat!' },
      ],
      works,
    );
    expect(out.length).toBe(1);
    expect(out[0].count).toBe(3);
  });

  it('a single-child group names the child, a multi-child group does not', () => {
    const [one] = groupKeyless([{ childId: 'solo', workName: 'Map of China' }], works);
    expect(one.childId).toBe('solo');
    const [many] = groupKeyless(rows, works);
    expect(many.childId).toBeUndefined();
  });
});

describe('rule 10 — checkInvariants groups its own keyless events', () => {
  it('reports one no-key line per name, not one per event', () => {
    const dirty = {
      ...ledger,
      events: [
        ...ledger.events,
        ...Array.from({ length: 9 }, (_, i) => ({
          child_id: 'chris',
          work_key: null,
          work_name: 'Blue Series blends',
          old_status: null,
          new_status: 'presented' as Status,
          source: 'import' as const,
          created_at: `${day(2, 1)}T09:0${i}:00.000Z`,
        })),
      ],
    };
    const noKey = checkInvariants(dirty, { asOf: AS_OF }).filter((v) => v.code === 'no-key');
    expect(noKey.length).toBe(1);
    expect(noKey[0].count).toBe(9);
    expect(noKey[0].workName).toBe('Blue Series blends');
  });
});
