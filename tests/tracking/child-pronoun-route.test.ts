// tests/tracking/child-pronoun-route.test.ts
//
// PATCH /api/montree/tracking/child-pronoun — the tracker's He · She toggle.
//
// It writes ONE column on ONE child, so the tests are about exactly two things:
// who is allowed to reach that child, and what lands in the column. The second
// matters more than it looks: the engine reads `gender` in the app's existing
// 'boy' / 'girl' spelling, and a route that wrote 'he' would leave every summary
// exactly as broken as it was while looking saved.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/montree/verify-request', () => ({ verifySchoolRequest: vi.fn() }));
vi.mock('@/lib/supabase-client', () => ({ getSupabase: vi.fn() }));

import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { PATCH, GENDER_FOR, parsePronoun } from '@/app/api/montree/tracking/child-pronoun/route';
import { pronounFrom, pronounIsSet } from '@/lib/montree/tracking/persistence';

const CHILD = '33333333-3333-3333-3333-333333333333';
const ROOM = '22222222-2222-2222-2222-222222222222';
const OTHER_ROOM = '44444444-4444-4444-4444-444444444444';

const teacher = { userId: 'u-1', schoolId: 'school-A', classroomId: ROOM, role: 'teacher' as const };
const principal = { userId: 'u-2', schoolId: 'school-A', role: 'principal' as const };

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

/** Records the update payload; answers child/classroom selects from the seed. */
function fakeSupabase(seed: {
  child?: { id: string; classroom_id: string | null; school_id: string | null } | null;
  classroomSchool?: string | null;
  updateError?: { message: string } | null;
}) {
  const updates: Array<{ table: string; values: Record<string, unknown>; id: unknown }> = [];
  const client = {
    from(table: string) {
      let updateValues: Record<string, unknown> | null = null;
      let whereId: unknown = null;
      const builder: Record<string, unknown> = {
        select() { return builder; },
        update(values: Record<string, unknown>) { updateValues = values; return builder; },
        eq(_col: string, value: unknown) {
          whereId = value;
          if (updateValues) {
            updates.push({ table, values: updateValues, id: whereId });
            return Promise.resolve({ error: seed.updateError ?? null });
          }
          return builder;
        },
        async maybeSingle() {
          if (table === 'montree_children') {
            return { data: seed.child === undefined ? { id: CHILD, classroom_id: ROOM, school_id: 'school-A' } : seed.child, error: null };
          }
          return {
            data: seed.classroomSchool === undefined ? null : { id: ROOM, school_id: seed.classroomSchool },
            error: null,
          };
        },
      };
      return builder;
    },
  };
  vi.mocked(getSupabase).mockReturnValue(client as never);
  return updates;
}

beforeEach(() => {
  vi.mocked(verifySchoolRequest).mockReset().mockResolvedValue(teacher);
  vi.mocked(getSupabase).mockReset();
});

describe('the column it writes', () => {
  it("uses the app's own gender spelling, which pronounFrom() already reads", () => {
    expect(GENDER_FOR.he).toBe('boy');
    expect(GENDER_FOR.she).toBe('girl');
    // A round trip: what the route stores is what the engine reads back.
    expect(pronounFrom({ gender: GENDER_FOR.he })).toBe('he');
    expect(pronounFrom({ gender: GENDER_FOR.she })).toBe('she');
    expect(pronounIsSet({ gender: GENDER_FOR.he })).toBe(true);
  });

  it("clears the column for 'they' — the fallback is an absence, not a value", () => {
    expect(GENDER_FOR.they).toBeNull();
    expect(pronounIsSet({ gender: GENDER_FOR.they })).toBe(false);
  });

  it('accepts only the three pronouns, case-insensitively', () => {
    expect(parsePronoun('He')).toBe('he');
    expect(parsePronoun(' she ')).toBe('she');
    expect(parsePronoun('they')).toBe('they');
    expect(parsePronoun('boy')).toBeNull();
    expect(parsePronoun('')).toBeNull();
    expect(parsePronoun(undefined)).toBeNull();
  });

  it('saves a teacher’s tap as boy/girl on that child', async () => {
    const updates = fakeSupabase({});
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'she' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, pronoun: 'she', pronoun_set: true });
    expect(updates).toEqual([{ table: 'montree_children', values: { gender: 'girl' }, id: CHILD }]);
  });

  it("reports pronoun_set false when the tap cleared the field", async () => {
    const updates = fakeSupabase({});
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'they' }));

    await expect(res.json()).resolves.toMatchObject({ pronoun_set: false });
    expect(updates[0].values).toEqual({ gender: null });
  });

  it('500s rather than claiming a failed write saved', async () => {
    fakeSupabase({ updateError: { message: 'boom' } });
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'he' }));
    expect(res.status).toBe(500);
  });
});

describe('who may reach the child', () => {
  it('401s without a session', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    );
    const updates = fakeSupabase({});
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'he' }));
    expect(res.status).toBe(401);
    expect(updates).toHaveLength(0);
  });

  it('403s a parent session — this is a teacher control', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue({
      userId: 'p-1', schoolId: 'school-A', role: 'homeschool_parent' as const,
    });
    const updates = fakeSupabase({});
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'he' }));
    expect(res.status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it("403s a child in another school", async () => {
    const updates = fakeSupabase({ child: { id: CHILD, classroom_id: ROOM, school_id: 'school-B' } });
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'he' }));
    expect(res.status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it("403s a teacher reaching outside their own classroom", async () => {
    const updates = fakeSupabase({
      child: { id: CHILD, classroom_id: OTHER_ROOM, school_id: 'school-A' },
    });
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'he' }));
    expect(res.status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it('lets a principal touch any classroom in their own school', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue(principal);
    const updates = fakeSupabase({
      child: { id: CHILD, classroom_id: OTHER_ROOM, school_id: 'school-A' },
    });
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'he' }));
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
  });

  it("falls back to the classroom's school when the child row has no school_id", async () => {
    const updates = fakeSupabase({
      child: { id: CHILD, classroom_id: ROOM, school_id: null },
      classroomSchool: 'school-A',
    });
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'he' }));
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
  });

  it('a null school_id is never read as permission', async () => {
    const updates = fakeSupabase({
      child: { id: CHILD, classroom_id: ROOM, school_id: null },
      classroomSchool: 'school-B',
    });
    const res = await PATCH(req({ child_id: CHILD, pronoun: 'he' }));
    expect(res.status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it('404s an unknown child, and 400s a body that is not a UUID / pronoun', async () => {
    const updates = fakeSupabase({ child: null });
    expect((await PATCH(req({ child_id: CHILD, pronoun: 'he' }))).status).toBe(404);

    fakeSupabase({});
    expect((await PATCH(req({ child_id: 'not-a-uuid', pronoun: 'he' }))).status).toBe(400);
    expect((await PATCH(req({ child_id: CHILD, pronoun: 'boy' }))).status).toBe(400);
    expect(updates).toHaveLength(0);
  });
});
