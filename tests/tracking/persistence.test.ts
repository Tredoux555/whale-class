// tests/tracking/persistence.test.ts
//
// lib/montree/tracking/persistence.ts is the ONE adapter between the pure engine
// and Supabase, so every bug it can have is a MAPPING bug: a column read into the
// wrong field, a legacy value that never gets normalised, a missing column that
// takes the whole load down with it. These tests drive it against a fake
// PostgREST builder and assert on the Ledger that comes out.
//
// The fake is deliberately the same shape as the one in
// tests/progress/unknown-never-writes.test.ts: builder methods return `this`, and
// awaiting yields whatever the table (and select list) is seeded to return.

import { describe, it, expect } from 'vitest';
import {
  EVENT_LIMIT,
  groupOf,
  loadLedger,
  mondayOf,
  normaliseSource,
  normaliseStatus,
  pronounFrom,
  rebuildChildProgress,
  rebuiltRowsFor,
  weekStartsBetween,
  type RebuiltRow,
} from '@/lib/montree/tracking/persistence';
import type { ProgressEvent } from '@/lib/montree/tracking/types';

const CLASSROOM = '22222222-2222-2222-2222-222222222222';

type Reply = { data: unknown; error: unknown };
type Responder = (table: string, select: string) => Reply;

interface Query {
  table: string;
  select: string;
  filters: Array<[string, unknown]>;
}

function fakeSupabase(responder: Responder) {
  const queries: Query[] = [];
  const client = {
    from(table: string) {
      const query: Query = { table, select: '', filters: [] };
      const builder: Record<string, unknown> = {
        select(cols: string) { query.select = cols; queries.push(query); return builder; },
        eq(col: string, value: unknown) { query.filters.push([col, value]); return builder; },
        in(col: string, value: unknown) { query.filters.push([col, value]); return builder; },
        is(col: string, value: unknown) { query.filters.push([col, value]); return builder; },
        gte(col: string, value: unknown) { query.filters.push([col, value]); return builder; },
        order() { return builder; },
        limit() { return builder; },
        maybeSingle() {
          const reply = responder(table, query.select);
          const rows = reply.data as unknown[] | null;
          return {
            then(resolve: (value: Reply) => unknown) {
              return Promise.resolve(
                resolve({ data: Array.isArray(rows) ? (rows[0] ?? null) : rows, error: reply.error }),
              );
            },
          };
        },
        then(resolve: (value: Reply) => unknown) {
          return Promise.resolve(resolve(responder(table, query.select)));
        },
      };
      return builder;
    },
  };
  return { client: client as never, queries };
}

const MISSING_COLUMN = { code: '42703', message: 'column "pronoun" does not exist' };

/** A responder for a fully-migrated database. */
function fullDb(overrides: Partial<Record<string, unknown[]>> = {}): Responder {
  const tables: Record<string, unknown[]> = {
    montree_children: [
      { id: 'c1', name: 'Mei', gender: 'girl' },
      { id: 'c2', name: 'Chris', gender: 'boy' },
      { id: 'c3', name: 'Li', gender: null },
    ],
    montree_classroom_curriculum_areas: [{ id: 'area-lang', area_key: 'language' }],
    montree_classroom_curriculum_works: [
      { work_key: 'dp:s:1', name: 's Dark Phonics work 1', sequence: 11, area_id: 'area-lang' },
      { work_key: 'ws:3', name: 'Writing Shelf tray 3', sequence: 903, area_id: 'area-lang' },
      { work_key: 'la_sandpaper', name: 'Sandpaper Letters', sequence: 40, area_id: 'area-lang' },
    ],
    montree_progress_events: [],
    montree_class_dark_phonics_week: [{ letter: 't' }],
    ...overrides,
  };
  return (table) => ({ data: tables[table] ?? [], error: null });
}

describe('vocabulary normalisation', () => {
  it("maps every legacy source onto rule 3's eight, and never invents a correction", () => {
    expect(normaliseSource('photo_confirm')).toBe('photo');
    expect(normaliseSource('teacher_update')).toBe('tap');
    expect(normaliseSource('guru')).toBe('ai');
    expect(normaliseSource('correction')).toBe('correction');
    // The one that matters: an unknown source must not gain the power to downgrade.
    expect(normaliseSource('something_new_in_2027')).toBe('tap');
    expect(normaliseSource(null)).toBe('tap');
  });

  it("treats 'completed' as migration 111's alias for mastered", () => {
    expect(normaliseStatus('completed')).toBe('mastered');
    expect(normaliseStatus('MASTERED')).toBe('mastered');
    expect(normaliseStatus('nonsense')).toBe('not_started');
  });

  it('groups works by rule 1 key prefix', () => {
    expect(groupOf('dp:t:3')).toBe('dark-phonics');
    expect(groupOf('ws:8')).toBe('writing-shelf');
    expect(groupOf('la_blue_series')).toBe('other');
  });

  it('reads a pronoun, falls back to gender, and never guesses', () => {
    expect(pronounFrom({ pronoun: 'they' })).toBe('they');
    expect(pronounFrom({ gender: 'girl' })).toBe('she');
    expect(pronounFrom({ gender: 'boy' })).toBe('he');
    expect(pronounFrom({})).toBe('they');
    expect(pronounFrom({ gender: 'unspecified' })).toBe('they');
  });
});

describe('week arithmetic', () => {
  it('snaps any day to its Monday', () => {
    expect(mondayOf('2026-01-05')).toBe('2026-01-05'); // a Monday
    expect(mondayOf('2026-01-08')).toBe('2026-01-05'); // Thursday
    expect(mondayOf('2026-01-11')).toBe('2026-01-05'); // Sunday
    expect(mondayOf('2026-01-12')).toBe('2026-01-12'); // next Monday
  });

  it('lists the Mondays of a range inclusively', () => {
    expect(weekStartsBetween('2026-01-07', '2026-01-20')).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
    ]);
  });

  it('always returns at least one week', () => {
    expect(weekStartsBetween('2026-03-04', '2026-03-04')).toEqual(['2026-03-02']);
  });
});

describe('loadLedger', () => {
  it('builds a Ledger from real rows', async () => {
    const { client } = fakeSupabase(
      fullDb({
        montree_progress_events: [
          {
            child_id: 'c1',
            classroom_id: CLASSROOM,
            work_key: 'dp:s:1',
            work_name: 's Dark Phonics work 1',
            area: 'language',
            old_status: null,
            new_status: 'presented',
            source: 'photo_confirm',
            actor: 'teacher-1',
            created_at: '2026-01-06T09:00:00.000Z',
            reason: null,
            evidence_id: 'media-1',
          },
        ],
      }),
    );

    const ledger = await loadLedger(client, { classroomId: CLASSROOM, asOf: '2026-01-09' });

    expect(ledger.children).toEqual([
      { id: 'c1', name: 'Mei', pronoun: 'she' },
      { id: 'c2', name: 'Chris', pronoun: 'he' },
      { id: 'c3', name: 'Li', pronoun: 'they' },
    ]);
    expect(ledger.works.map((w) => [w.work_key, w.group, w.area])).toEqual([
      ['dp:s:1', 'dark-phonics', 'language'],
      ['ws:3', 'writing-shelf', 'language'],
      ['la_sandpaper', 'other', 'language'],
    ]);
    expect(ledger.classWeekLetter).toBe('t');
    expect(ledger.weekStarts).toEqual(['2026-01-05']);
    expect(ledger.events).toHaveLength(1);
    expect(ledger.events[0]).toMatchObject({
      child_id: 'c1',
      work_key: 'dp:s:1',
      old_status: null,
      new_status: 'presented',
      source: 'photo', // normalised out of 'photo_confirm'
      evidence_id: 'media-1',
    });
  });

  it('retries the child select without the columns this database does not have', async () => {
    // 'pronoun' does not exist anywhere today; 'gender' (migration 119) does. A
    // deploy that is ahead of the database must still load the roster.
    const base = fullDb();
    const { client, queries } = fakeSupabase((table, select) => {
      if (table === 'montree_children' && select.includes('pronoun')) {
        return { data: null, error: MISSING_COLUMN };
      }
      return base(table, select);
    });

    const ledger = await loadLedger(client, { classroomId: CLASSROOM, asOf: '2026-01-09' });

    expect(ledger.children.map((c) => c.pronoun)).toEqual(['she', 'he', 'they']);
    const childSelects = queries.filter((q) => q.table === 'montree_children').map((q) => q.select);
    expect(childSelects[0]).toContain('pronoun');
    expect(childSelects[1]).toBe('id, name, gender');
  });

  it('retries the event select without evidence_id when migration 346 has not been pasted', async () => {
    const base = fullDb({
      montree_progress_events: [
        {
          child_id: 'c1',
          work_key: 'dp:s:1',
          work_name: 's Dark Phonics work 1',
          old_status: 'presented',
          new_status: 'completed',
          source: 'tap',
          created_at: '2026-01-06T09:00:00.000Z',
        },
      ],
    });
    const { client, queries } = fakeSupabase((table, select) => {
      if (table === 'montree_progress_events' && select.includes('evidence_id')) {
        return { data: null, error: { code: '42703', message: 'column "evidence_id" does not exist' } };
      }
      return base(table, select);
    });

    const ledger = await loadLedger(client, { classroomId: CLASSROOM, asOf: '2026-01-09' });

    expect(queries.filter((q) => q.table === 'montree_progress_events')).toHaveLength(2);
    expect(ledger.events[0].new_status).toBe('mastered'); // 'completed' normalised
    expect(ledger.events[0].evidence_id).toBeNull();
  });

  it('survives a database with no journal table at all (migration 314 pending)', async () => {
    const base = fullDb();
    const { client } = fakeSupabase((table, select) => {
      if (table === 'montree_progress_events') {
        return { data: null, error: { code: '42P01', message: 'relation does not exist' } };
      }
      if (table === 'montree_class_dark_phonics_week') {
        return { data: null, error: { code: '42P01', message: 'relation does not exist' } };
      }
      return base(table, select);
    });

    const ledger = await loadLedger(client, { classroomId: CLASSROOM, asOf: '2026-01-09' });
    expect(ledger.events).toEqual([]);
    expect(ledger.children).toHaveLength(3);
    // No letter set anywhere → the first live letter, never null.
    expect(ledger.classWeekLetter).toBe('s');
  });

  it('drops a duplicated work_key rather than letting one work have two rows', async () => {
    const { client } = fakeSupabase(
      fullDb({
        montree_classroom_curriculum_works: [
          { work_key: 'ws:1', name: 'Writing Shelf tray 1', sequence: 901, area_id: 'area-lang' },
          { work_key: 'ws:1', name: 'Writing shelf tray one', sequence: 999, area_id: 'area-lang' },
        ],
      }),
    );
    const ledger = await loadLedger(client, { classroomId: CLASSROOM, asOf: '2026-01-09' });
    expect(ledger.works).toHaveLength(1);
    expect(ledger.works[0].name).toBe('Writing Shelf tray 1');
  });

  it('caps the journal read', () => {
    expect(EVENT_LIMIT).toBeGreaterThan(1000);
  });
});

// ── rule 3: the cache, rebuilt from the journal ────────────────────────────

function event(partial: Partial<ProgressEvent> & { new_status: ProgressEvent['new_status']; created_at: string }): ProgressEvent {
  return {
    child_id: 'c1',
    classroom_id: CLASSROOM,
    work_key: 'dp:s:1',
    work_name: 's Dark Phonics work 1',
    area: 'language',
    old_status: null,
    source: 'tap',
    actor: null,
    reason: null,
    evidence_id: null,
    ...partial,
  } as ProgressEvent;
}

describe('rebuiltRowsFor — rule 3', () => {
  it('derives the current status, and the FIRST date of each rung', () => {
    const rows = rebuiltRowsFor('c1', [
      event({ old_status: null, new_status: 'presented', created_at: '2026-01-06T09:00:00.000Z' }),
      event({ old_status: 'presented', new_status: 'practicing', created_at: '2026-01-13T09:00:00.000Z' }),
      event({ old_status: 'practicing', new_status: 'mastered', created_at: '2026-01-20T09:00:00.000Z' }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      child_id: 'c1',
      work_key: 'dp:s:1',
      work_name: 's Dark Phonics work 1',
      status: 'mastered',
      presented_at: '2026-01-06T09:00:00.000Z',
      mastered_at: '2026-01-20T09:00:00.000Z',
      classroom_id: CLASSROOM,
    });
  });

  it('ignores an evidence row — a repeat observation moves no rung', () => {
    const rows = rebuiltRowsFor('c1', [
      event({ old_status: null, new_status: 'presented', created_at: '2026-01-06T09:00:00.000Z' }),
      // Same morning, second photo: old === new.
      event({
        old_status: 'presented',
        new_status: 'presented',
        source: 'photo',
        evidence_id: 'media-2',
        created_at: '2026-01-06T11:00:00.000Z',
      }),
    ]);
    expect(rows[0].status).toBe('presented');
  });

  it('honours a correction downwards, and keeps the historical mastery date', () => {
    const rows = rebuiltRowsFor('c1', [
      event({ old_status: null, new_status: 'mastered', created_at: '2026-01-06T09:00:00.000Z' }),
      event({
        old_status: 'mastered',
        new_status: 'practicing',
        source: 'correction',
        reason: 'tagged the wrong child',
        created_at: '2026-01-07T09:00:00.000Z',
      }),
    ]);
    expect(rows[0].status).toBe('practicing');
    // The date this child once mastered the work is a fact about the past.
    expect(rows[0].mastered_at).toBe('2026-01-06T09:00:00.000Z');
  });

  it('never rebuilds a keyless row (rule 1)', () => {
    const rows = rebuiltRowsFor('c1', [
      event({ work_key: null, work_name: 'Blue Series blends', new_status: 'presented', created_at: '2026-01-06T09:00:00.000Z' }),
    ]);
    expect(rows).toEqual([]);
  });

  it('only rebuilds the child it was asked about', () => {
    const rows = rebuiltRowsFor('c1', [
      event({ child_id: 'c2', new_status: 'mastered', created_at: '2026-01-06T09:00:00.000Z' }),
    ]);
    expect(rows).toEqual([]);
  });
});

describe('rebuildChildProgress', () => {
  it('hands the rebuilt rows to the door and reports what was written', async () => {
    const { client } = fakeSupabase(
      fullDb({
        montree_progress_events: [
          {
            child_id: 'c1',
            classroom_id: CLASSROOM,
            work_key: 'ws:3',
            work_name: 'Writing Shelf tray 3',
            area: 'language',
            old_status: null,
            new_status: 'presented',
            source: 'digital',
            created_at: '2026-01-06T09:00:00.000Z',
          },
        ],
      }),
    );

    const seen: RebuiltRow[][] = [];
    const result = await rebuildChildProgress(client, 'c1', async (_s, _c, rows) => {
      seen.push(rows);
      return { written: rows.length };
    });

    expect(result.written).toBe(1);
    expect(seen[0][0]).toMatchObject({ work_key: 'ws:3', status: 'presented' });
  });

  it('writes nothing at all for a child with an empty journal', async () => {
    const { client } = fakeSupabase(fullDb());
    let called = false;
    const result = await rebuildChildProgress(client, 'c1', async () => {
      called = true;
      return { written: 99 };
    });
    expect(called).toBe(false);
    expect(result.written).toBe(0);
  });
});
