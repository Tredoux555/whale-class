// tests/tracking/window.test.ts
//
// THE WINDOWED LEDGER READ — and the proof that it changes no answer.
//
// lib/montree/tracking/persistence.ts loadLedger() used to read every event a
// classroom had ever produced. That read grows forever: in year three the tracker
// page pulls three years of journal to answer a question about this week, and the
// EVENT_LIMIT cap eventually starts SILENTLY TRUNCATING history — which would make
// old works fall back to 'not_started' with no error anywhere.
//
// The fix is a bounded window (26 weeks by default) plus a CARRY-IN: for every
// (child, work_key) pair, the last status-CHANGING event before the window, fetched
// in one query via montree_latest_events_before() (migration 347). The carry-in is
// what makes the window safe — it is a compressed prefix of the history, holding
// exactly the fact the prefix proves: where each rung stood when the window opened.
//
// These tests are the equivalence proof, in three parts:
//   1. On the simulated term with the default window, the windowed read returns the
//      SAME events and therefore identical derive/guidance output.
//   2. With a deliberately TIGHT window that cuts the term in half, every derived
//      CURRENT-STATE read — ribbon, letters, nextWorks, the rebuilt cache rows —
//      is still identical to the full read. That is the property the carry-in buys.
//   3. Without the RPC (migration 347 not pasted), the loader falls back to the full
//      journal rather than quietly serving a window it cannot make exact.

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WINDOW_WEEKS,
  loadLedger,
  rebuiltRowsFor,
  windowStartFor,
} from '@/lib/montree/tracking/persistence';
import { ribbon, currentLetter, childCurrent } from '@/lib/montree/tracking/derive';
import { nextWorks } from '@/lib/montree/tracking/guidance';
import { rebuildCurrent } from '@/lib/montree/tracking/ledger';
import type { Ledger } from '@/lib/montree/tracking/types';
import { CHILDREN, buildEvents, buildWorks, day } from './fixture';

const CLASSROOM = '22222222-2222-2222-2222-222222222222';
const AS_OF = day(12, 4);

type Reply = { data: unknown; error: unknown };

interface Query { table: string; select: string; filters: Array<[string, unknown]> }

/**
 * A fake PostgREST client backed by the simulated term, WITH a working `rpc()` so
 * the carry-in path is actually exercised. `gte('created_at', …)` is honoured, which
 * is what makes the window real rather than mocked away.
 */
function fakeSupabase(options: { rpc?: boolean } = {}) {
  const events = buildEvents();
  const works = buildWorks();
  const queries: Query[] = [];
  let rpcCalls = 0;

  const tables: Record<string, unknown[]> = {
    montree_children: CHILDREN.map((c) => ({ id: c.id, name: c.name, pronoun: c.pronoun })),
    montree_classroom_curriculum_areas: [{ id: 'area-lang', area_key: 'language' }],
    montree_classroom_curriculum_works: works.map((w) => ({
      work_key: w.work_key, name: w.name, description: w.description ?? null,
      sequence: w.sequence, area_id: 'area-lang',
    })),
    montree_class_dark_phonics_week: [{ letter: 't' }],
  };

  const client: Record<string, unknown> = {
    from(table: string) {
      const query: Query = { table, select: '', filters: [] };
      const builder: Record<string, unknown> = {
        select(cols: string) { query.select = cols; queries.push(query); return builder; },
        eq(col: string, v: unknown) { query.filters.push([col, v]); return builder; },
        in(col: string, v: unknown) { query.filters.push([col, v]); return builder; },
        is(col: string, v: unknown) { query.filters.push([col, v]); return builder; },
        gte(col: string, v: unknown) { query.filters.push([col, v]); return builder; },
        order() { return builder; },
        limit() { return builder; },
        maybeSingle() {
          return { then(resolve: (r: Reply) => unknown) {
            const rows = tables[table] ?? [];
            return Promise.resolve(resolve({ data: rows[0] ?? null, error: null }));
          } };
        },
        then(resolve: (r: Reply) => unknown) {
          if (table === 'montree_progress_events') {
            const since = query.filters.find(([c]) => c === 'created_at')?.[1] as string | undefined;
            const rows = events.filter((e) => (since ? e.created_at >= since : true));
            return Promise.resolve(resolve({ data: rows, error: null }));
          }
          return Promise.resolve(resolve({ data: tables[table] ?? [], error: null }));
        },
      };
      return builder;
    },
  };

  if (options.rpc !== false) {
    client.rpc = (fn: string, args: Record<string, unknown>) => {
      rpcCalls++;
      if (fn !== 'montree_latest_events_before') {
        return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'not found' } });
      }
      const before = String(args.p_before);
      // The SQL: DISTINCT ON (child_id, work_key), last status-CHANGING row before.
      const latest = new Map<string, (typeof events)[number]>();
      for (const e of events) {
        if (!e.work_key) continue;
        if (e.created_at >= before) continue;
        if (e.old_status === e.new_status) continue;
        const k = `${e.child_id}|${e.work_key}`;
        const prev = latest.get(k);
        if (!prev || e.created_at > prev.created_at) latest.set(k, e);
      }
      return Promise.resolve({ data: Array.from(latest.values()), error: null });
    };
  }

  return { client: client as never, queries, rpcCalls: () => rpcCalls };
}

/** Everything a human ever sees, for every child, in one comparable blob. */
function derivedShape(ledger: Ledger) {
  const current = rebuildCurrent(ledger.events);
  return CHILDREN.map((child) => ({
    id: child.id,
    status: Object.fromEntries(childCurrent(current, child.id)),
    ribbon: ribbon(childCurrent(current, child.id), ledger.works),
    letter: currentLetter(childCurrent(current, child.id), ledger.works),
    next: nextWorks(ledger, child.id, { asOf: AS_OF }).map((a) => ({
      area: a.area,
      track: a.track,
      current: a.current?.work_key ?? null,
      pick: a.next?.work_key ?? null,
      reason: a.reason,
      because: a.because,
      gaps: a.gaps.map((g) => g.work_key),
    })),
    rebuilt: rebuiltRowsFor(child.id, ledger.events),
  }));
}

describe('windowStartFor', () => {
  it('anchors on the Monday of the current week, 26 weeks back by default', () => {
    // 2026-09-06 is a Sunday; its week's Monday is 2026-08-31.
    expect(windowStartFor('2026-09-06')).toBe('2026-03-02T00:00:00.000Z');
    expect(windowStartFor('2026-08-31')).toBe('2026-03-02T00:00:00.000Z');
    expect(windowStartFor('2026-09-06', 1)).toBe('2026-08-24T00:00:00.000Z');
    expect(DEFAULT_WINDOW_WEEKS).toBe(26);
  });
});

describe('the default window is identical to the full read on the simulated term', () => {
  it('returns exactly the same events', async () => {
    const full = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF, window: 'all',
    });
    const windowed = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF,
    });

    // The term is twelve weeks; 26 weeks of window swallows it whole, so this is a
    // straight equality — not "close enough".
    expect(windowed.events).toEqual(full.events);
    expect(windowed.weekStarts).toEqual(full.weekStarts);
  });

  it('derives the same ribbon, letter, guidance and rebuilt cache for every child', async () => {
    const full = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF, window: 'all',
    });
    const windowed = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF,
    });

    expect(derivedShape(windowed)).toEqual(derivedShape(full));
  });

  it('uses two queries, not one per child', async () => {
    const fake = fakeSupabase();
    await loadLedger(fake.client, { classroomId: CLASSROOM, asOf: AS_OF });
    expect(fake.rpcCalls()).toBe(1);
    expect(fake.queries.filter((q) => q.table === 'montree_progress_events')).toHaveLength(1);
  });
});

describe('a window that genuinely cuts the term still derives the same current state', () => {
  // Four weeks back from the Monday of week 12 lands inside week 8 — Sara's whole
  // backfilled history, Mei's 's' and 'a' letters and Li's stall are all BEFORE it.
  const TIGHT = 4;

  it('carries in the last status-changing event per (child, work)', async () => {
    const windowed = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF, window: TIGHT,
    });
    const full = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF, window: 'all',
    });

    // It really is a window: fewer rows came back.
    expect(windowed.events.length).toBeLessThan(full.events.length);
    // …and every row it did return is one the full read also has.
    for (const e of windowed.events) expect(full.events).toContainEqual(e);

    // The property the carry-in exists for: the replayed CURRENT STATE is identical.
    const a = rebuildCurrent(windowed.events);
    const b = rebuildCurrent(full.events);
    for (const child of CHILDREN) {
      expect(Object.fromEntries(childCurrent(a, child.id))).toEqual(
        Object.fromEntries(childCurrent(b, child.id)),
      );
    }
  });

  it('keeps ribbon, current letter and the rebuilt cache rows exact', async () => {
    const windowed = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF, window: TIGHT,
    });
    const full = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF, window: 'all',
    });

    for (const child of CHILDREN) {
      const w = childCurrent(rebuildCurrent(windowed.events), child.id);
      const f = childCurrent(rebuildCurrent(full.events), child.id);
      expect(ribbon(w, windowed.works)).toEqual(ribbon(f, full.works));
      expect(currentLetter(w, windowed.works)).toBe(currentLetter(f, full.works));
      expect(rebuiltRowsFor(child.id, windowed.events).map((r) => [r.work_key, r.status]))
        .toEqual(rebuiltRowsFor(child.id, full.events).map((r) => [r.work_key, r.status]));
    }
  });

  it('does not stretch the week grid back to the carried-in rows', async () => {
    const windowed = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF, window: TIGHT,
    });
    // Sara's backfill sits in week 8 and is carried in; the grid must still start at
    // the window, not at week 8.
    expect(windowed.weekStarts[0] >= day(8, 0)).toBe(true);
    expect(windowed.weekStarts.length).toBeLessThanOrEqual(TIGHT + 2);
  });
});

describe('an environment without migration 347', () => {
  it('falls back to the full journal rather than serving an inexact window', async () => {
    const fake = fakeSupabase({ rpc: false });
    const windowed = await loadLedger(fake.client, {
      classroomId: CLASSROOM, asOf: AS_OF, window: 4,
    });
    const full = await loadLedger(fakeSupabase().client, {
      classroomId: CLASSROOM, asOf: AS_OF, window: 'all',
    });
    expect(windowed.events).toEqual(full.events);
  });

  it("still honours an explicit window: 'all' with one query", async () => {
    const fake = fakeSupabase();
    await loadLedger(fake.client, { classroomId: CLASSROOM, asOf: AS_OF, window: 'all' });
    expect(fake.rpcCalls()).toBe(0);
    expect(fake.queries.filter((q) => q.table === 'montree_progress_events')).toHaveLength(1);
  });
});
