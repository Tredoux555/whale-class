// tests/progress/unknown-never-writes.test.ts
//
// RULE 5 — UNKNOWN NAMES NEVER WRITE, and RULE 1 — ONE WORK, ONE KEY.
//
// The door refuses to write montree_child_progress when it cannot resolve a
// work_key, and leaves the observation in montree_progress_review_queue instead.
// These tests drive writeProgress against a fake PostgREST builder and assert on
// what it actually sent — the point is the WRITE, not the plumbing.

import { describe, it, expect } from 'vitest';
import { writeProgress } from '@/lib/montree/progress/write-progress';

type Call = { table: string; op: string; payload: unknown };

/**
 * Minimal thenable stand-in for the supabase client: every builder method returns
 * `this`, and awaiting it yields whatever the table+op is seeded to return. Enough
 * to observe exactly which rows the primitive tried to write, and where.
 */
function fakeSupabase(seed: Record<string, unknown[]>) {
  const calls: Call[] = [];
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
        lte() { return builder; },
        order() { return builder; },
        limit() { return builder; },
        maybeSingle() { return builder; },
        insert(rows: unknown) { op = 'insert'; payload = rows; calls.push({ table, op, payload }); return builder; },
        upsert(rows: unknown) { op = 'upsert'; payload = rows; calls.push({ table, op, payload }); return builder; },
        update(row: unknown) { op = 'update'; payload = row; calls.push({ table, op, payload }); return builder; },
        delete() { op = 'delete'; calls.push({ table, op, payload: null }); return builder; },
        then(resolve: (value: { data: unknown; error: null }) => unknown) {
          if (op === 'upsert' || op === 'insert') {
            return Promise.resolve(resolve({ data: seed[`${table}:return`] ?? [], error: null }));
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

const baseSeed = () => ({
  montree_children: [{ id: CHILD, classroom_id: CLASSROOM }],
  montree_classrooms: [{ id: CLASSROOM, school_id: SCHOOL }],
  montree_child_progress: [],
  montree_classroom_curriculum_works: [],
  'montree_child_progress:return': [{ id: 'row-1', child_id: CHILD, work_name: 'x', status: 'presented' }],
});

describe('rule 5 — a name with no key never writes progress', () => {
  it('queues instead of writing when nothing can resolve the name', async () => {
    const { client, calls } = fakeSupabase(baseSeed());

    const result = await writeProgress(client, {
      childId: CHILD,
      workName: 'Blue Series blends',
      area: 'language',
      status: 'presented',
      source: 'photo',
    });

    expect(result.outcome).toBe('queued');
    expect(result.reason).toBe('unresolved-work');
    expect(result.workKey).toBeNull();

    // Nothing was written to the progress table…
    expect(calls.filter((c) => c.table === 'montree_child_progress')).toEqual([]);
    // …and the observation was not lost.
    const queued = calls.find((c) => c.table === 'montree_progress_review_queue');
    expect(queued?.op).toBe('insert');
    expect((queued?.payload as Record<string, unknown>[])[0]).toMatchObject({
      child_id: CHILD,
      classroom_id: CLASSROOM,
      school_id: SCHOOL,
      raw_work_name: 'Blue Series blends',
      requested_status: 'presented',
      source: 'photo',
    });
  });

  it('writes when the caller supplies the key, and journals it', async () => {
    const { client, calls } = fakeSupabase(baseSeed());

    const result = await writeProgress(client, {
      childId: CHILD,
      workName: 'Some Custom Work',
      workKey: 'custom_some_custom_work_abcd1234',
      area: 'language',
      status: 'presented',
      source: 'photo_confirm',
    });

    expect(result.outcome).toBe('written');
    expect(calls.some((c) => c.table === 'montree_progress_review_queue')).toBe(false);
    expect(calls.find((c) => c.table === 'montree_child_progress')?.op).toBe('upsert');
    const journal = calls.find((c) => c.table === 'montree_progress_events');
    expect((journal?.payload as Record<string, unknown>[])[0]).toMatchObject({
      work_key: 'custom_some_custom_work_abcd1234',
      new_status: 'presented',
      source: 'photo_confirm',
    });
  });

  it('strict:false is the escape hatch, and it still writes no key it does not have', async () => {
    const { client, calls } = fakeSupabase(baseSeed());

    const result = await writeProgress(client, {
      childId: CHILD,
      workName: 'Something Nobody Knows',
      status: 'presented',
      source: 'photo_confirm',
      strict: false,
    });

    expect(result.outcome).toBe('written');
    expect(calls.some((c) => c.table === 'montree_progress_review_queue')).toBe(false);
  });
});

describe('rule 1 — every Dark Phonics spelling is the same one work', () => {
  // The spellings the constitution's "Teacher typing" scenario names, plus the
  // 'dp' prefix parseWorkName also strips. 'dp t 3' is deliberately NOT here: with no
  // 'work'/'w' token it is not a Dark Phonics work name, and guessing is rule 5's job
  // to refuse (see the last test in this block).
  for (const typed of ['t Dark Phonics work 3', 't w3', 'T-Work-3', 't dark phonics work 3', 'dp t work 3']) {
    it(`"${typed}" resolves to dp:t:3 under the canonical name`, async () => {
      const { client, calls } = fakeSupabase(baseSeed());

      const result = await writeProgress(client, {
        childId: CHILD,
        workName: typed,
        area: 'language',
        status: 'practicing',
        source: 'tap',
      });

      expect(result.outcome).toBe('written');
      expect(result.workKey).toBe('dp:t:3');
      // The row is filed under the ONE canonical name — the same name migration 344
      // seeds into the classroom curriculum — so five spellings are not five rows.
      expect(result.workName).toBe('t Dark Phonics work 3');
      const upsert = calls.find((c) => c.table === 'montree_child_progress');
      expect((upsert?.payload as Record<string, unknown>[])[0]).toMatchObject({
        work_name: 't Dark Phonics work 3',
        work_key: 'dp:t:3',
      });
    });
  }

  it('does not invent a Dark Phonics key for a letter that is not one', async () => {
    const { client } = fakeSupabase(baseSeed());
    const result = await writeProgress(client, {
      childId: CHILD,
      workName: 'zz work 9',
      status: 'presented',
      source: 'tap',
    });
    expect(result.outcome).toBe('queued');
  });
});
