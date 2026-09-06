// tests/progress/event-route.test.ts
//
// The API contract for POST /api/montree/progress/event
// (docs/tracking/ENGINE_V2_PLAN.md). Agents D/E/F build against these outcome
// strings, so they are asserted here rather than left to a reviewer's memory.
//
// The route is a thin wrapper — auth, validation, then the door — so what is
// tested is exactly that: the guards it owns, and the mapping from the door's
// ProgressResult to the contract's {outcome, why}. writeProgress itself is
// stubbed; its behaviour is covered by engine-decides.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const CHILD = '11111111-1111-1111-1111-111111111111';
const CLASSROOM = '22222222-2222-2222-2222-222222222222';
const SCHOOL = '33333333-3333-3333-3333-333333333333';

const writeProgressMock = vi.fn();

vi.mock('@/lib/montree/verify-request', () => ({
  verifySchoolRequest: async () => ({
    userId: 'teacher-1',
    schoolId: SCHOOL,
    classroomId: CLASSROOM,
    role: 'teacher' as const,
  }),
}));

vi.mock('@/lib/supabase-client', () => ({
  getSupabase: () => ({
    from(table: string) {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () =>
          Promise.resolve({
            data:
              table === 'montree_children'
                ? { id: CHILD, classroom_id: CLASSROOM, school_id: SCHOOL }
                : { id: 'queue-1' },
            error: null,
          }),
      };
      return builder;
    },
  }),
}));

vi.mock('@/lib/montree/progress/write-progress', () => ({
  writeProgress: (...args: unknown[]) => writeProgressMock(...args),
}));

const { POST } = await import('@/app/api/montree/progress/event/route');

function post(body: unknown) {
  return new NextRequest('http://localhost/api/montree/progress/event', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const ok = (over: Record<string, unknown> = {}) => ({
  outcome: 'written',
  childId: CHILD,
  workName: 't Dark Phonics work 3',
  status: 'practicing',
  previousStatus: 'presented',
  workKey: 'dp:t:3',
  classroomId: CLASSROOM,
  schoolId: SCHOOL,
  firstMastery: false,
  ...over,
});

beforeEach(() => {
  writeProgressMock.mockReset();
  writeProgressMock.mockResolvedValue(ok());
});

describe('rule 3 — the source vocabulary is closed', () => {
  for (const source of ['tap', 'photo', 'ai', 'digital', 'live', 'import', 'backfill']) {
    it(`accepts '${source}'`, async () => {
      const res = await POST(post({ child_id: CHILD, work: 't w3', status: 'practicing', source }));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ outcome: 'applied', work_key: 'dp:t:3' });
    });
  }

  it('rejects a source nobody agreed on', async () => {
    const res = await POST(post({ child_id: CHILD, work: 't w3', status: 'practicing', source: 'vibes' }));
    expect(res.status).toBe(400);
    expect((await res.json()).outcome).toBe('rejected');
    expect(writeProgressMock).not.toHaveBeenCalled();
  });

  it('rejects a status that is not on the ladder', async () => {
    const res = await POST(post({ child_id: CHILD, work: 't w3', status: 'completed', source: 'tap' }));
    expect(res.status).toBe(400);
  });
});

describe("rule 4 — 'correction' is the only way down, and it needs a reason", () => {
  it('refuses a correction with no reason', async () => {
    const res = await POST(post({ child_id: CHILD, work: 't w3', status: 'presented', source: 'correction' }));
    expect(res.status).toBe(400);
    expect((await res.json()).why).toMatch(/reason/i);
    expect(writeProgressMock).not.toHaveBeenCalled();
  });

  it('passes allowDowngrade to the door ONLY for a correction', async () => {
    await POST(post({ child_id: CHILD, work: 't w3', status: 'presented', source: 'correction', reason: 'wrong child' }));
    expect(writeProgressMock.mock.calls[0][1]).toMatchObject({
      allowDowngrade: true,
      reason: 'wrong child',
    });

    writeProgressMock.mockClear();
    await POST(post({ child_id: CHILD, work: 't w3', status: 'presented', source: 'photo' }));
    expect(writeProgressMock.mock.calls[0][1]).toMatchObject({ allowDowngrade: false });
  });
});

describe('outcome mapping', () => {
  it('queued → queued, with the queue row to resolve', async () => {
    writeProgressMock.mockResolvedValue(ok({ outcome: 'queued', reason: 'unresolved-work', workKey: null }));
    const res = await POST(post({ child_id: CHILD, work: 'Blue Series blends', status: 'presented', source: 'photo' }));
    expect(await res.json()).toMatchObject({ outcome: 'queued', why: 'unresolved-work', queue_id: 'queue-1' });
  });

  it('a repeat observation → noop', async () => {
    writeProgressMock.mockResolvedValue(
      ok({ outcome: 'skipped_noop', reason: 'no-op', status: 'practicing', previousStatus: 'practicing' }),
    );
    const res = await POST(post({ child_id: CHILD, work: 't w3', status: 'practicing', source: 'photo' }));
    expect(await res.json()).toMatchObject({ outcome: 'noop', why: 'no-op' });
  });

  it('a refused downgrade → rejected', async () => {
    writeProgressMock.mockResolvedValue(
      ok({ outcome: 'skipped_rank', reason: 'backward-without-correction', status: 'mastered', previousStatus: 'mastered' }),
    );
    const res = await POST(post({ child_id: CHILD, work: 't w3', status: 'presented', source: 'photo' }));
    expect(await res.json()).toMatchObject({ outcome: 'rejected', why: 'backward-without-correction' });
  });

  it('a door failure → rejected, 500', async () => {
    writeProgressMock.mockResolvedValue(ok({ outcome: 'failed', error: 'progress upsert failed' }));
    const res = await POST(post({ child_id: CHILD, work: 't w3', status: 'practicing', source: 'tap' }));
    expect(res.status).toBe(500);
    expect((await res.json()).outcome).toBe('rejected');
  });
});

describe('guards', () => {
  it('requires a UUID child_id', async () => {
    const res = await POST(post({ child_id: 'nope', work: 't w3', status: 'practicing', source: 'tap' }));
    expect(res.status).toBe(400);
  });

  it('requires a work', async () => {
    const res = await POST(post({ child_id: CHILD, work: '   ', status: 'practicing', source: 'tap' }));
    expect(res.status).toBe(400);
  });
});
