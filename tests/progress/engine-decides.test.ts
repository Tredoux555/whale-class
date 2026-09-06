// tests/progress/engine-decides.test.ts
//
// RULES 3 + 4, asserted AT THE DOOR.
//
// lib/montree/progress/write-progress.ts used to carry its own copy of the ladder
// (a STATUS_RANK comparison) and had no same-day policy at all. It now delegates
// both to lib/montree/tracking/ledger.ts — applyEvent / dedupeSameDay — so there
// is exactly one implementation of the rules and tests/tracking's simulated term
// is exercising the same code the write path runs.
//
// These tests are the proof of that delegation, expressed as the outcomes a caller
// sees: what lands in montree_child_progress, and what lands in the journal.

import { describe, it, expect } from 'vitest';
import { writeProgress } from '@/lib/montree/progress/write-progress';

type Call = { table: string; op: string; payload: unknown };

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
const WORK = 't Dark Phonics work 3';
const KEY = 'dp:t:3';

/** A database where the child already sits on `status` for dp:t:3. */
function seedAt(status: string, extra: Record<string, unknown[]> = {}) {
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
    ...extra,
  };
}

const journalRows = (calls: Call[]) =>
  calls
    .filter((c) => c.table === 'montree_progress_events' && c.op === 'insert')
    .flatMap((c) => c.payload as Record<string, unknown>[]);

const progressWrites = (calls: Call[]) => calls.filter((c) => c.table === 'montree_child_progress');

describe('rule 4 — the ladder is the engine’s, and it only moves forward', () => {
  it('advances a rung and journals the change', async () => {
    const { client, calls } = fakeSupabase(seedAt('presented'));

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'practicing', source: 'tap',
    });

    expect(result.outcome).toBe('written');
    expect(result.previousStatus).toBe('presented');
    expect(journalRows(calls)[0]).toMatchObject({
      work_key: KEY, old_status: 'presented', new_status: 'practicing',
    });
  });

  it('REFUSES a downgrade that is not a correction', async () => {
    const { client, calls } = fakeSupabase(seedAt('mastered'));

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'presented', source: 'photo',
    });

    expect(result.outcome).toBe('skipped_rank');
    expect(result.reason).toBe('backward-without-correction');
    expect(result.status).toBe('mastered');
    expect(progressWrites(calls)).toEqual([]);
    // A refused downgrade is not evidence of anything, so nothing is journalled.
    expect(journalRows(calls)).toEqual([]);
  });

  it('allows a downgrade as an explicit correction, and journals the reason', async () => {
    const { client, calls } = fakeSupabase(seedAt('mastered'));

    const result = await writeProgress(client, {
      childId: CHILD,
      workName: WORK,
      status: 'practicing',
      source: 'correction',
      allowDowngrade: true,
      reason: 'tagged the wrong child on Tuesday',
      evidenceId: '44444444-4444-4444-4444-444444444444',
    });

    expect(result.outcome).toBe('written');
    expect(journalRows(calls)[0]).toMatchObject({
      old_status: 'mastered',
      new_status: 'practicing',
      reason: 'tagged the wrong child on Tuesday',
      evidence_id: '44444444-4444-4444-4444-444444444444',
    });
  });
});

describe('rule 3 — a repeat observation is evidence, not a rung', () => {
  it('records the same status again as an evidence row (old === new)', async () => {
    const { client, calls } = fakeSupabase(seedAt('practicing'));

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'practicing', source: 'photo',
      evidenceId: '55555555-5555-5555-5555-555555555555',
    });

    expect(result.outcome).toBe('skipped_noop');
    expect(result.reason).toBe('no-op');
    expect(progressWrites(calls)).toEqual([]);

    // …but weekTicks() must still see the child at the work this week.
    const evidence = journalRows(calls)[0];
    expect(evidence).toMatchObject({
      work_key: KEY,
      old_status: 'practicing',
      new_status: 'practicing',
      source: 'photo',
      evidence_id: '55555555-5555-5555-5555-555555555555',
    });
  });

  it('collapses a second observation on the SAME DAY into one ladder move', async () => {
    // The journal already carries this morning's advance for this exact work.
    const today = new Date().toISOString();
    const { client, calls } = fakeSupabase(
      seedAt('presented', {
        montree_progress_events: [
          { child_id: CHILD, work_key: KEY, old_status: null, new_status: 'presented', created_at: today },
        ],
      }),
    );

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'practicing', source: 'photo',
      evidenceId: '66666666-6666-6666-6666-666666666666',
    });

    expect(result.outcome).toBe('skipped_noop');
    expect(result.reason).toBe('duplicate-same-day');
    expect(progressWrites(calls)).toEqual([]);
    // The second photo of the morning is kept, hung off an evidence row.
    expect(journalRows(calls)[0]).toMatchObject({
      old_status: 'presented',
      new_status: 'presented',
      evidence_id: '66666666-6666-6666-6666-666666666666',
    });
  });

  it('an EVIDENCE row earlier today does not block a real advance', async () => {
    const today = new Date().toISOString();
    const { client, calls } = fakeSupabase(
      seedAt('presented', {
        montree_progress_events: [
          // old === new: this row moved nothing, so it must not suppress a move.
          { child_id: CHILD, work_key: KEY, old_status: 'presented', new_status: 'presented', created_at: today },
        ],
      }),
    );

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'practicing', source: 'photo',
    });

    expect(result.outcome).toBe('written');
    expect(journalRows(calls)[0]).toMatchObject({ old_status: 'presented', new_status: 'practicing' });
  });

  it('a correction is exempt from the same-day dedupe', async () => {
    const today = new Date().toISOString();
    const { client } = fakeSupabase(
      seedAt('practicing', {
        montree_progress_events: [
          { child_id: CHILD, work_key: KEY, old_status: 'presented', new_status: 'practicing', created_at: today },
        ],
      }),
    );

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'presented', source: 'correction',
      allowDowngrade: true, reason: 'wrong rung this morning',
    });

    expect(result.outcome).toBe('written');
  });
});

describe('backward compatibility with the callers this door already has', () => {
  it('still creates the FIRST row for a work, including a not_started one', async () => {
    const { client, calls } = fakeSupabase({
      montree_children: [{ id: CHILD, classroom_id: CLASSROOM }],
      montree_classrooms: [{ id: CLASSROOM, school_id: SCHOOL }],
      montree_child_progress: [],
      montree_classroom_curriculum_works: [],
      montree_progress_events: [],
      'montree_child_progress:return': [{ id: 'row-1', child_id: CHILD, work_name: WORK, status: 'not_started' }],
    });

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'not_started', source: 'import',
    });

    expect(result.outcome).toBe('written');
    expect(progressWrites(calls)[0].op).toBe('upsert');
  });

  it('advanceProgressOnConfirm’s updated_at refresh still touches the row', async () => {
    // The shape advance-on-confirm sends when a work is already 'practicing':
    // same rung, allowDowngrade true. It has always written; it must keep writing.
    const { client, calls } = fakeSupabase(seedAt('practicing'));

    const result = await writeProgress(client, {
      childId: CHILD, workName: WORK, status: 'practicing', source: 'photo_confirm',
      allowDowngrade: true,
    });

    expect(result.outcome).toBe('written');
    expect(progressWrites(calls)[0].op).toBe('upsert');
    // No rung moved, so the journal gets the evidence row and nothing else.
    const rows = journalRows(calls);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ old_status: 'practicing', new_status: 'practicing' });
  });
});
