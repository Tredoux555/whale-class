// tests/progress/journal-roundtrip.test.ts
//
// THE MISSING DECISIVE TEST — rules 3 + 4 of docs/tracking/TRACKING_CONSTITUTION.md.
// Written from the sketch in docs/audits/2026-09-06-code-audit/08-verify-tracking.md §9.
//
//   Rule 3: "Current-status table = cache of the journal, rebuildable."
//   Rule 4: "Downgrade = explicit teacher correction with a reason, journaled as
//            source 'correction'."
//
// Every other test in tests/progress asserts what the door WRITES. None asserted
// that what it writes can be READ BACK. That gap was load-bearing: rule 8 makes
// every human-facing surface (ribbon, weekly summary, parent report) derived from
// the journal at read time, so a journal row the engine refuses on replay is a
// silent lie on the parent's screen while the cache looks correct. The audit ran
// the real door and found three shipped callers whose downgrades replayed as
// 'backward-without-correction' or 'correction-without-reason'.
//
// The contract, asserted for EVERY caller shape:
//   writeProgress(...) → the rows appended to montree_progress_events
//                      → toProgressEvent() → replay()
//                      → THE SAME STATUS THE CACHE WAS GIVEN.

import { describe, it, expect } from 'vitest';
import { writeProgress } from '@/lib/montree/progress/write-progress';
import { toProgressEvent, rebuiltRowsFor } from '@/lib/montree/tracking/persistence';
import { replay } from '@/lib/montree/tracking/ledger';
import type { ProgressEvent } from '@/lib/montree/tracking/types';

type Call = { table: string; op: string; payload: unknown };

function fakeSupabase(seed: Record<string, unknown[]>) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      let op = 'select';
      let payload: unknown = null;
      const b: Record<string, unknown> = {
        select() { return b; }, eq() { return b; }, in() { return b; }, is() { return b; },
        gte() { return b; }, order() { return b; }, limit() { return b; }, maybeSingle() { return b; },
        insert(rows: unknown) { op = 'insert'; payload = rows; calls.push({ table, op, payload }); return b; },
        upsert(rows: unknown) { op = 'upsert'; payload = rows; calls.push({ table, op, payload }); return b; },
        update(row: unknown) { op = 'update'; payload = row; calls.push({ table, op, payload }); return b; },
        delete() { op = 'delete'; calls.push({ table, op, payload: null }); return b; },
        then(resolve: (v: { data: unknown; error: null }) => unknown) {
          if (op === 'upsert' || op === 'insert') {
            return Promise.resolve(resolve({ data: seed[`${table}:return`] ?? [], error: null }));
          }
          return Promise.resolve(resolve({ data: seed[table] ?? [], error: null }));
        },
      };
      return b;
    },
  };
  return { client: client as never, calls };
}

const CHILD  = '11111111-1111-1111-1111-111111111111';
const ROOM   = '22222222-2222-2222-2222-222222222222';
const SCHOOL = '33333333-3333-3333-3333-333333333333';
const WORK   = 't Dark Phonics work 3';
const KEY    = 'dp:t:3';

/** The journal as it stood before this write: the child climbed to `upTo`. */
function priorJournal(upTo: 'presented' | 'practicing' | 'mastered'): Record<string, unknown>[] {
  const ladder = ['presented', 'practicing', 'mastered'] as const;
  const days = ['2026-09-01', '2026-09-02', '2026-09-03'];
  const out: Record<string, unknown>[] = [];
  let prev: string | null = null;
  for (let i = 0; i < ladder.length; i++) {
    out.push({
      child_id: CHILD, classroom_id: ROOM, work_key: KEY, work_name: WORK, area: 'language',
      old_status: prev, new_status: ladder[i], source: 'teacher_update', actor: 't',
      created_at: `${days[i]}T02:00:00.000Z`, reason: null, evidence_id: null,
    });
    prev = ladder[i];
    if (ladder[i] === upTo) break;
  }
  return out;
}

function seedAt(status: string, prior: Record<string, unknown>[]) {
  return {
    montree_children: [{ id: CHILD, classroom_id: ROOM }],
    montree_classrooms: [{ id: ROOM, school_id: SCHOOL }],
    montree_child_progress: [{
      id: 'row-1', child_id: CHILD, work_name: WORK, status, area: 'language', work_key: KEY,
      classroom_id: ROOM, school_id: SCHOOL, notes: null,
      presented_at: '2026-09-01T02:00:00.000Z',
      mastered_at: status === 'mastered' ? '2026-09-03T02:00:00.000Z' : null,
    }],
    montree_classroom_curriculum_works: [],
    // The door's same-day pre-read reads this table too; prior rows are on earlier
    // days, so they never suppress today's write.
    montree_progress_events: prior,
    'montree_child_progress:return': [{ id: 'row-1', child_id: CHILD, work_name: WORK, status }],
  };
}

const journalled = (calls: Call[]) =>
  calls
    .filter((c) => c.table === 'montree_progress_events' && c.op === 'insert')
    .flatMap((c) => c.payload as Record<string, unknown>[]);

/** Rule 3, in one function: what does the journal say this child's rung is? */
function derivedStatus(rows: Record<string, unknown>[]): string {
  const events: ProgressEvent[] = rows.map(toProgressEvent);
  return replay(events).state.current.get(CHILD)?.get(KEY) ?? 'not_started';
}

describe('rule 3 — every write round-trips: journal → replay → the cached status', () => {
  it('a forward tap round-trips', async () => {
    const prior = priorJournal('presented');
    const { client, calls } = fakeSupabase(seedAt('presented', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      source: 'tap', classroomId: ROOM,
    });
    expect(r.outcome).toBe('written');
    expect(r.journalled).toBe(true);
    expect(derivedStatus([...prior, ...journalled(calls)])).toBe(r.status);
  });

  it('a correction WITH a reason round-trips', async () => {
    const prior = priorJournal('mastered');
    const { client, calls } = fakeSupabase(seedAt('mastered', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      source: 'correction', allowDowngrade: true, reason: 'tagged the wrong child on Tuesday',
    });
    expect(r.outcome).toBe('written');
    expect(derivedStatus([...prior, ...journalled(calls)])).toBe('practicing');
  });

  // ── THE DOWNGRADE CALLERS ───────────────────────────────────────────────────
  // Each is a real, shipped caller. Before the fix the door ACCEPTED the downgrade
  // (it builds its in-memory engine event with source 'correction' and a synthesised
  // reason) but JOURNALLED the caller's raw source and a null reason, so replay
  // refused the row and the derived reads drifted from the cache forever.
  it.each([
    // app/api/montree/progress/update/route.ts — the teacher P/P/M picker
    // (ShelfView, photo-audit, WeeklyWrapTab, voice-onboarding, TeachGuruWorkModal).
    ['progress/update (P/P/M picker)', { source: 'teacher_update', allowDowngrade: true }],
    // app/api/montree/intelligence/evidence/route.ts — revoke_mastery, which now
    // sends its own reason as well.
    ['intelligence/evidence revoke',   { source: 'correction', allowDowngrade: true,
                                        reason: 'teacher revoked mastery confirmation for "t Dark Phonics work 3"' }],
    // lib/montree/guru/tool-executor.ts — correcting_downward, likewise.
    ['guru correcting_downward',       { source: 'guru', allowDowngrade: true,
                                        reason: 'teacher correction via Guru: lowered to practicing' }],
    // …and the two shapes that arrive with NO reason at all, which the door
    // synthesises one for rather than journalling an unreplayable row.
    ['a reasonless teacher_update',    { source: 'teacher_update', allowDowngrade: true }],
    ['a reasonless guru correction',   { source: 'guru', allowDowngrade: true }],
  ] as const)('a downgrade from %s round-trips', async (_label, entry) => {
    const prior = priorJournal('mastered');
    const { client, calls } = fakeSupabase(seedAt('mastered', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      classroomId: ROOM, ...entry,
    });

    expect(r.outcome).toBe('written');
    expect(r.status).toBe('practicing');

    const rows = journalled(calls);
    // Rule 4 as a property of the ROW, not of the caller's intent: a row that
    // lowered the rung must be readable back as a correction with a reason.
    const change = rows.find((x) => x.old_status !== x.new_status);
    expect(change, 'the downgrade must be journalled at all').toBeTruthy();
    expect(change!.source, 'rule 4: a downgrade is journalled as source correction').toBe('correction');
    expect(String(change!.reason ?? ''), 'rule 4: a correction carries its reason').not.toBe('');

    // And the whole point: the derived read agrees with the cache.
    expect(
      derivedStatus([...prior, ...rows]),
      'the ribbon, the weekly summary and the parent report all read this',
    ).toBe(r.status);
  });

  // ── THE FORWARD CALLER SHAPES ───────────────────────────────────────────────
  // Every source the door is called with in production, each replayed back.
  it.each([
    ['tap (tracker grid)',            'tap'],
    ['photo (photo-audit confirm)',   'photo'],
    ['ai (guru / photo-insight)',     'guru'],
    ['import (admin import)',         'admin_import'],
    ['digital (ShelfPlayer done)',    'shelf_player'],
    ['live (class recap)',            'class_recap'],
  ] as const)('a forward write from %s round-trips', async (_label, source) => {
    const prior = priorJournal('presented');
    const { client, calls } = fakeSupabase(seedAt('presented', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'mastered',
      source, classroomId: ROOM,
    });
    expect(r.outcome).toBe('written');
    expect(derivedStatus([...prior, ...journalled(calls)])).toBe(r.status);
  });

  it('the review-queue resolver round-trips (it writes with strict:false)', async () => {
    const prior = priorJournal('presented');
    const { client, calls } = fakeSupabase(seedAt('presented', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, workKey: KEY, area: 'language', status: 'practicing',
      source: 'photo', classroomId: ROOM, strict: false,
      reason: 'review-queue resolve: "t w3" → dp:t:3',
    });
    expect(r.outcome).toBe('written');
    expect(derivedStatus([...prior, ...journalled(calls)])).toBe(r.status);
  });
});

describe('rule 3 — rebuild parity', () => {
  it('rebuiltRowsFor(journal) reproduces the status the door cached', async () => {
    const prior = priorJournal('mastered');
    const { client, calls } = fakeSupabase(seedAt('mastered', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      source: 'teacher_update', allowDowngrade: true, classroomId: ROOM,
    });
    const rows = rebuiltRowsFor(CHILD, [...prior, ...journalled(calls)].map(toProgressEvent));
    // POST /api/montree/tracking/rebuild writes exactly these rows through the door.
    expect(rows.find((x) => x.work_key === KEY)?.status).toBe(r.status);
  });
});

describe('rule 3 — the journal is written FIRST, and a failure stops the cache', () => {
  it('reports journalled:true and writes the cache on the happy path', async () => {
    const prior = priorJournal('presented');
    const { client, calls } = fakeSupabase(seedAt('presented', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      source: 'tap', classroomId: ROOM,
    });
    expect(r.journalled).toBe(true);
    const order = calls
      .filter((c) => c.op === 'insert' || c.op === 'upsert')
      .map((c) => c.table);
    expect(order.indexOf('montree_progress_events')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('montree_progress_events')).toBeLessThan(order.indexOf('montree_child_progress'));
  });

  it('writes NO cache row when the journal insert fails for an unknown reason', async () => {
    const prior = priorJournal('presented');
    const seed = seedAt('presented', prior);
    const calls: Call[] = [];
    const client = {
      from(table: string) {
        let op = 'select';
        const b: Record<string, unknown> = {
          select() { return b; }, eq() { return b; }, in() { return b; }, is() { return b; },
          gte() { return b; }, order() { return b; }, limit() { return b; }, maybeSingle() { return b; },
          insert(rows: unknown) { op = 'insert'; calls.push({ table, op, payload: rows }); return b; },
          upsert(rows: unknown) { op = 'upsert'; calls.push({ table, op, payload: rows }); return b; },
          update(row: unknown) { op = 'update'; calls.push({ table, op, payload: row }); return b; },
          delete() { op = 'delete'; calls.push({ table, op, payload: null }); return b; },
          then(resolve: (v: { data: unknown; error: unknown }) => unknown) {
            if (op === 'insert' && table === 'montree_progress_events') {
              // Not 23505, not a missing column, not a missing table: unknown, so fatal.
              return Promise.resolve(resolve({ data: null, error: { code: '42501', message: 'permission denied' } }));
            }
            if (op === 'upsert' || op === 'insert') {
              return Promise.resolve(resolve({ data: (seed as Record<string, unknown[]>)[`${table}:return`] ?? [], error: null }));
            }
            return Promise.resolve(resolve({ data: (seed as Record<string, unknown[]>)[table] ?? [], error: null }));
          },
        };
        return b;
      },
    };

    const r = await writeProgress(client as never, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      source: 'tap', classroomId: ROOM,
    });

    expect(r.outcome).toBe('failed');
    expect(r.journalled).toBe(false);
    // Rule 3: no cache row may exist for a transition the journal does not hold.
    expect(calls.filter((c) => c.table === 'montree_child_progress' && c.op !== 'select')).toEqual([]);
  });
});
