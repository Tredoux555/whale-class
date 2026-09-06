// tests/tracking/pagination.test.ts
//
// THE 1000-ROW CEILING — the bug this file exists to keep fixed.
//
// PostgREST answers every request with at most the project's `max-rows` (1000
// on Supabase). It does it SILENTLY: no error, no flag, and `.limit(5000)` does
// not raise the cap, it only lowers it. So a reader that asks once for a
// classroom's journal gets the OLDEST 1000 rows and believes that is all of
// them. After migration 347 backfilled the journal, that is exactly what
// happened: a classroom's montree_progress_events passed 1000 rows and today's
// tap stopped appearing on the class grid (the child route, loading one child,
// stayed under the cap and kept showing it).
//
// fetchAllRows() is the single loop that fixes it, and these tests pin the
// three things a caller depends on:
//   1. it returns EVERY row, in order, across as many pages as it takes;
//   2. it stops at the first SHORT page (a full page always means "ask again");
//   3. an error is surfaced, not swallowed — with the pages already read.
//
// The last test is the regression proper: loadEvents() must reach for .range(),
// never .limit(), because .limit() is the call that quietly loses the tail.

import { describe, it, expect } from 'vitest';
import { fetchAllRows, PAGE_SIZE } from '@/lib/montree/tracking/paging';
import { loadLedger } from '@/lib/montree/tracking/persistence';

const TOTAL = 2350;
const CLASSROOM = '22222222-2222-2222-2222-222222222222';

interface Row { id: string; n: number }

/** 2,350 rows, each one identifiable, in a stable order. */
function table(total = TOTAL): Row[] {
  return Array.from({ length: total }, (_, i) => ({ id: `row-${String(i).padStart(5, '0')}`, n: i }));
}

/**
 * A builder that behaves like PostgREST: it honours `.range(from, to)` AND
 * silently truncates any window wider than max-rows, which is the behaviour
 * that breaks a naive `.limit(20000)`.
 */
function pagedBuilder(rows: Row[], maxRows = PAGE_SIZE) {
  const ranges: Array<[number, number]> = [];
  const build = (from: number, to: number) => {
    ranges.push([from, to]);
    const width = Math.min(to - from + 1, maxRows);
    return Promise.resolve({ data: rows.slice(from, from + width), error: null });
  };
  return { build, ranges };
}

describe('fetchAllRows — paging past PostgREST max-rows', () => {
  it('returns all 2,350 rows, in order, across three pages', async () => {
    const { build, ranges } = pagedBuilder(table());
    const { rows, error } = await fetchAllRows<Row>(build);

    expect(error).toBeNull();
    expect(rows).toHaveLength(TOTAL);
    // In order and without gaps or duplicates — the property a paged read loses
    // first if the underlying order is not deterministic.
    expect(rows.map((r) => r.n)).toEqual(table().map((r) => r.n));
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('stops on the first short page and asks for nothing more', async () => {
    const { build, ranges } = pagedBuilder(table(1500));
    const { rows } = await fetchAllRows<Row>(build);
    expect(rows).toHaveLength(1500);
    // Page 2 came back short (500 of 1000), so there is no page 3.
    expect(ranges).toHaveLength(2);
  });

  it('treats an EXACTLY full last page as "ask again", not as the end', async () => {
    const { build, ranges } = pagedBuilder(table(2000));
    const { rows } = await fetchAllRows<Row>(build);
    expect(rows).toHaveLength(2000);
    // The third request is the one that proves 2000 was the whole table.
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('surfaces an error — with the pages it had already read', async () => {
    const rows = table();
    let calls = 0;
    const { rows: got, error } = await fetchAllRows<Row>((from, to) => {
      calls += 1;
      if (calls === 2) {
        return Promise.resolve({ data: null, error: { code: '57014', message: 'statement timeout' } });
      }
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe('57014');
    expect(got).toHaveLength(PAGE_SIZE); // page 1 survived; the loop stopped there
    expect(calls).toBe(2);
  });

  it('honours `max` as a runaway guard, and never asks past it', async () => {
    const { build, ranges } = pagedBuilder(table());
    const { rows } = await fetchAllRows<Row>(build, { max: 2000 });
    expect(rows).toHaveLength(2000);
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });

  it('clamps a too-large pageSize to max-rows instead of stopping after one page', async () => {
    // Asking for 5000 and getting 1000 back is what made every page look short.
    const { build, ranges } = pagedBuilder(table());
    const { rows } = await fetchAllRows<Row>(build, { pageSize: 5000 });
    expect(rows).toHaveLength(TOTAL);
    expect(ranges[0]).toEqual([0, 999]);
  });
});

/* -------------------------------------------------------------------------- */
/* The regression: the journal read must PAGE, not .limit().                   */
/* -------------------------------------------------------------------------- */

type Call = { table: string; method: string; args: unknown[] };

/**
 * A fake PostgREST client in the shape the other tracking tests use, but one
 * that records every builder call and serves montree_progress_events from a
 * 2,350-row journal through `.range()` — capping each response at 1000 exactly
 * as the real server does.
 */
function fakeSupabase(journal: Record<string, unknown>[]) {
  const calls: Call[] = [];
  const seed: Record<string, unknown[]> = {
    montree_children: [{ id: 'c1', name: 'Mei', gender: 'girl' }],
    montree_classroom_curriculum_areas: [{ id: 'area-lang', area_key: 'language' }],
    montree_classroom_curriculum_works: [
      { work_key: 'la_sandpaper', name: 'Sandpaper Letters', sequence: 40, area_id: 'area-lang' },
    ],
    montree_class_dark_phonics_week: [{ letter: 't' }],
  };

  const client = {
    from(t: string) {
      let range: [number, number] | null = null;
      const rec = (method: string) => (...args: unknown[]) => {
        calls.push({ table: t, method, args });
        if (method === 'range') range = [args[0] as number, args[1] as number];
        return builder;
      };
      const rows = () => {
        const all = t === 'montree_progress_events' ? journal : (seed[t] ?? []);
        if (!range) return all;
        const [from, to] = range;
        return all.slice(from, from + Math.min(to - from + 1, PAGE_SIZE));
      };
      const builder: Record<string, unknown> = {
        select: rec('select'), eq: rec('eq'), in: rec('in'), is: rec('is'),
        gte: rec('gte'), lte: rec('lte'), not: rec('not'),
        order: rec('order'), limit: rec('limit'), range: rec('range'),
        maybeSingle() {
          calls.push({ table: t, method: 'maybeSingle', args: [] });
          return Promise.resolve({ data: rows()[0] ?? null, error: null });
        },
        then(resolve: (v: { data: unknown; error: unknown }) => unknown) {
          return Promise.resolve(resolve({ data: rows(), error: null }));
        },
      };
      return builder;
    },
  };
  return { client: client as never, calls };
}

/** 2,350 journal rows for one child, oldest first — the shape migration 347 leaves. */
function bigJournal(): Record<string, unknown>[] {
  return Array.from({ length: TOTAL }, (_, i) => {
    const day = new Date(Date.UTC(2026, 0, 1) + i * 3600_000).toISOString();
    return {
      id: `e-${String(i).padStart(5, '0')}`,
      child_id: 'c1',
      classroom_id: CLASSROOM,
      work_key: 'la_sandpaper',
      work_name: 'Sandpaper Letters',
      area: 'language',
      old_status: 'presented',
      new_status: 'presented',
      source: 'tap',
      actor: 'teacher',
      created_at: day,
    };
  });
}

describe('loadEvents pages the journal', () => {
  it('reads every event past the 1000-row cap — including the newest one', async () => {
    const journal = bigJournal();
    const { client } = fakeSupabase(journal);
    const ledger = await loadLedger(client, { classroomId: CLASSROOM, window: 'all', asOf: '2026-04-30' });

    expect(ledger.events).toHaveLength(TOTAL);
    // THE BUG, in one assertion: unpaged, this was event 999 and the last
    // 1,350 taps — today's included — were invisible to the class grid.
    expect(ledger.events[ledger.events.length - 1].created_at).toBe(journal[TOTAL - 1].created_at);
  });

  it('asks with .range() and never with .limit()', async () => {
    const { client, calls } = fakeSupabase(bigJournal());
    await loadLedger(client, { classroomId: CLASSROOM, window: 'all', asOf: '2026-04-30' });

    const eventCalls = calls.filter((c) => c.table === 'montree_progress_events');
    expect(eventCalls.filter((c) => c.method === 'limit')).toHaveLength(0);
    expect(eventCalls.filter((c) => c.method === 'range').map((c) => c.args)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('orders by created_at with `id` as the tiebreak, so the pages line up', async () => {
    const { client, calls } = fakeSupabase(bigJournal());
    await loadLedger(client, { classroomId: CLASSROOM, window: 'all', asOf: '2026-04-30' });

    // Per page: a deterministic order is what makes .range() coherent at all.
    // Without the `id` tiebreak, two events sharing a created_at can swap
    // between requests and be returned twice or not at all.
    const orders = calls
      .filter((c) => c.table === 'montree_progress_events' && c.method === 'order')
      .map((c) => c.args[0]);
    expect(orders.slice(0, 2)).toEqual(['created_at', 'id']);
  });
});
