// tests/progress/same-day-race.test.ts
//
// RULES 3 + 4, UNDER CONCURRENCY.
//
// The same-day dedupe in lib/montree/progress/write-progress.ts is read-then-write:
// step 3b reads today's journal, step 4 asks lib/montree/tracking/ledger.ts whether
// the rung already moved today. Two taps that interleave between those two points
// both see "not moved yet" and both journal the move — the child's ribbon shows one
// work advanced twice, and every read that counts observations double-counts.
//
// migrations/347_progress_journal_backfill.sql closes that with a PARTIAL UNIQUE
// index over (child_id, work_key, new_status, UTC day) WHERE the row is a status
// CHANGE and has a key. The loser of the race gets Postgres 23505. These tests are
// the contract for what the door does with it:
//
//   * it does not throw, and it does not surface an error to the caller;
//   * it RE-READS the row and reports what the row now says;
//   * the outcome is the engine's own verdict for a duplicate — 'skipped_noop' with
//     reason 'duplicate-same-day' — so a race and a slow double-tap are
//     indistinguishable to every caller;
//   * firstMastery is false, so the shelf-advance does not fire twice;
//   * an EVIDENCE row (old_status = new_status) is outside the index predicate and
//     is never affected.
//
// Same fake-builder pattern as tests/progress/engine-decides.test.ts.

import { describe, it, expect } from 'vitest';
import { appendEvents, writeProgress, writeProgressBatch } from '@/lib/montree/progress/write-progress';

type Call = { table: string; op: string; payload: unknown };

interface FakeOptions {
  /** Insert attempts on montree_progress_events that come back 23505. */
  uniqueViolationOn?: (rows: Record<string, unknown>[], attempt: number) => boolean;
  /**
   * What montree_child_progress says on the RE-READ — i.e. what the writer that won
   * the race left on the row. The first select (the door's own pre-read) still sees
   * the seeded status, so the two are distinguishable.
   */
  racedStatus?: string;
}

function fakeSupabase(seed: Record<string, unknown[]>, options: FakeOptions = {}) {
  const calls: Call[] = [];
  let eventInserts = 0;
  let progressSelects = 0;
  const client = {
    from(table: string) {
      let op = 'select';
      let payload: unknown = null;
      const builder: Record<string, unknown> = {
        select() { return builder; },
        eq() { return builder; },
        in() { return builder; },
        is() { return builder; },
        gte() { return builder; },
        order() { return builder; },
        limit() { return builder; },
        range() { return builder; },
        maybeSingle() { return builder; },
        insert(rows: unknown) { op = 'insert'; payload = rows; calls.push({ table, op, payload }); return builder; },
        upsert(rows: unknown) { op = 'upsert'; payload = rows; calls.push({ table, op, payload }); return builder; },
        update(row: unknown) { op = 'update'; payload = row; calls.push({ table, op, payload }); return builder; },
        delete() { op = 'delete'; calls.push({ table, op, payload: null }); return builder; },
        then(resolve: (value: { data: unknown; error: unknown }) => unknown) {
          if (table === 'montree_progress_events' && op === 'insert') {
            const rows = (Array.isArray(payload) ? payload : [payload]) as Record<string, unknown>[];
            const attempt = eventInserts++;
            if (options.uniqueViolationOn?.(rows, attempt)) {
              return Promise.resolve(
                resolve({
                  data: null,
                  error: {
                    code: '23505',
                    message:
                      'duplicate key value violates unique constraint "idx_montree_progress_events_one_move_per_day"',
                  },
                }),
              );
            }
            return Promise.resolve(resolve({ data: [], error: null }));
          }
          if (op === 'upsert' || op === 'insert') {
            return Promise.resolve(resolve({ data: seed[`${table}:return`] ?? [], error: null }));
          }
          if (table === 'montree_child_progress' && op === 'select') {
            const rows = (seed[table] ?? []) as Record<string, unknown>[];
            const nth = progressSelects++;
            const data =
              nth > 0 && options.racedStatus
                ? rows.map((r) => ({ ...r, status: options.racedStatus }))
                : rows;
            return Promise.resolve(resolve({ data, error: null }));
          }
          return Promise.resolve(resolve({ data: seed[table] ?? [], error: null }));
        },
      };
      return builder;
    },
  };
  return { client: client as never, calls };
}

const CHILD = '11111111-1111-1111-1111-111111111111';
const CLASSROOM = '22222222-2222-2222-2222-222222222222';
const SCHOOL = '33333333-3333-3333-3333-333333333333';
const WORK = 't Dark Phonics work 3';
const KEY = 'dp:t:3';

/** A database where the child already sits on `status` for dp:t:3. */
function seedRace(status: string) {
  return {
    montree_children: [{ id: CHILD, classroom_id: CLASSROOM }],
    montree_classrooms: [{ id: CLASSROOM, school_id: SCHOOL }],
    montree_child_progress: [
      { id: 'row-1', child_id: CHILD, work_name: WORK, status, area: 'language', work_key: KEY,
        classroom_id: CLASSROOM, school_id: SCHOOL, notes: null, presented_at: null, mastered_at: null },
    ],
    montree_classroom_curriculum_works: [],
    montree_progress_events: [],
    'montree_child_progress:return': [{ id: 'row-1', child_id: CHILD, work_name: WORK, status }],
  };
}

const journalInserts = (calls: Call[]) =>
  calls.filter((c) => c.table === 'montree_progress_events' && c.op === 'insert');

describe('migration 347 guard index — 23505 on the journal insert', () => {
  it("reports the loser of the race as 'duplicate-same-day', not as an error", async () => {
    // Every attempt at this row — the batch and the per-row retry — loses the race.
    const { client } = fakeSupabase(seedRace('presented'), { uniqueViolationOn: () => true });

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'practicing', source: 'tap',
    });

    expect(result.outcome).toBe('skipped_noop');
    expect(result.reason).toBe('duplicate-same-day');
    expect(result.error).toBeUndefined();
    // The rung the OTHER writer left the row on, re-read rather than assumed.
    expect(result.status).toBe('presented');
    expect(result.previousStatus).toBe('presented');
    expect(result.firstMastery).toBe(false);
  });

  it('re-reads the row, so the caller is told what the winner actually wrote', async () => {
    // The winner went all the way to mastered; this call only asked for practicing.
    const { client } = fakeSupabase(seedRace('presented'), {
      uniqueViolationOn: () => true,
      racedStatus: 'mastered',
    });

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'practicing', source: 'tap',
    });

    expect(result.outcome).toBe('skipped_noop');
    expect(result.status).toBe('mastered');
    // A rung this call did not move must never fire the shelf-advance.
    expect(result.firstMastery).toBe(false);
  });

  it('retries row by row, so one duplicate never costs the batch its journal', async () => {
    const seed = seedRace('presented');
    seed.montree_child_progress.push({
      id: 'row-2', child_id: CHILD, work_name: 't Dark Phonics work 4', status: 'presented',
      area: 'language', work_key: 'dp:t:4', classroom_id: CLASSROOM, school_id: SCHOOL,
      notes: null, presented_at: null, mastered_at: null,
    });

    const { client, calls } = fakeSupabase(seed, {
      // The BATCH insert loses (one of its rows is a duplicate); the per-row retries
      // all land, which is the whole point of retrying one at a time.
      uniqueViolationOn: (rows) => rows.length > 1,
    });

    const results = await writeProgressBatch(client, [
      { childId: CHILD, workName: WORK, status: 'practicing', source: 'tap' },
      { childId: CHILD, workName: 't Dark Phonics work 4', status: 'practicing', source: 'tap' },
    ]);

    // Nothing was reported as a race, because every row eventually landed.
    expect(results.map((r) => r.outcome)).toEqual(['written', 'written']);

    const inserts = journalInserts(calls);
    // 1 batch attempt (23505) + one attempt per row.
    expect(inserts).toHaveLength(3);
    expect((inserts[0].payload as unknown[]).length).toBe(2);
    for (const insert of inserts.slice(1)) {
      expect((insert.payload as unknown[]).length).toBe(1);
    }
  });

  it('leaves a successful write alone — no 23505, no re-read, outcome written', async () => {
    const { client } = fakeSupabase(seedRace('presented'));

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'practicing', source: 'tap',
    });

    expect(result.outcome).toBe('written');
    expect(result.reason).toBeUndefined();
    expect(result.status).toBe('practicing');
  });

  it('an evidence row is outside the index predicate and is not reported as a race', async () => {
    // Same status again → the door writes an EVIDENCE row (old === new), never a
    // change row, so the guard index cannot reject it.
    const { client, calls } = fakeSupabase(seedRace('practicing'));

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'practicing', source: 'photo',
      evidenceId: '55555555-5555-5555-5555-555555555555',
    });

    expect(result.outcome).toBe('skipped_noop');
    const rows = journalInserts(calls).flatMap((c) => c.payload as Record<string, unknown>[]);
    expect(rows).toHaveLength(1);
    expect(rows[0].old_status).toBe(rows[0].new_status);
  });
});

describe('appendEvents', () => {
  it('reports which rows the guard index refused, and inserts the rest', async () => {
    const { client } = fakeSupabase({}, {
      // Batch fails; then row 1 of 3 is the duplicate.
      uniqueViolationOn: (rows, attempt) => attempt === 0 || (rows.length === 1 && attempt === 2),
    });

    const rows = [0, 1, 2].map((n) => ({
      child_id: CHILD, work_key: `dp:t:${n + 1}`, work_name: `t Dark Phonics work ${n + 1}`,
      old_status: 'not_started', new_status: 'presented', source: 'tap',
      created_at: '2026-09-06T09:00:00.000Z',
    }));

    const result = await appendEvents(client, rows);

    expect(result.duplicated).toEqual([1]);
    expect(result.inserted).toBe(2);
  });

  it('returns nothing duplicated on a clean insert', async () => {
    const { client } = fakeSupabase({});
    const result = await appendEvents(client, [
      { child_id: CHILD, work_key: KEY, work_name: WORK, old_status: null, new_status: 'presented',
        source: 'tap', created_at: '2026-09-06T09:00:00.000Z' },
    ]);
    // `failed` and `tableMissing` were added when the journal stopped being
    // best-effort (audit §6a): the door now needs to know WHICH rows the journal
    // refused, because a refused row must not become a cache row.
    expect(result).toEqual({ inserted: 1, duplicated: [], failed: [], tableMissing: false });
  });
});
