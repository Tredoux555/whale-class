// tests/security/backfill-guides-tenant-scope.test.ts
//
// Guards the fix to /api/montree/admin/backfill-guides.
//
// The route takes `?classroom_id=` (ownership-checked) or `?all=true`. The
// `all=true` branch built its query against montree_classroom_curriculum_works
// with NO classroom and NO school filter, then UPDATEd every row it got back —
// so one request from any authenticated caller rewrote the curriculum text of
// every classroom in EVERY school on the platform, and fanned translations out
// across all of them too.
//
// `all=true` now means "every classroom in the caller's own school". A genuine
// platform-wide run requires `scope=platform` AND a super-admin credential.
//
// What is asserted is the SHAPE OF THE QUERY: an unfiltered select against that
// table is the bug, so the fake Supabase records every filter applied and the
// tests check a school-scoping filter was present.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const SCHOOL = 'school-aaa';

const MY_CLASSROOMS = ['room-1', 'room-2'];

/** Every filter applied to the works query, in order. */
let worksFilters: Array<{ op: string; arg: unknown }> = [];
/** Rows the works query returns. */
const WORK_ROWS = [
  { id: 'w1', name: 'Pink Tower', work_key: 'pink_tower', classroom_id: 'room-1' },
];

let authRole: 'principal' | 'teacher' = 'principal';
let superAdminValid = false;
const updatedIds: string[] = [];

vi.mock('@/lib/montree/verify-request', () => ({
  verifySchoolRequest: async () => ({
    userId: 'principal-1',
    schoolId: SCHOOL,
    role: authRole,
  }),
}));

vi.mock('@/lib/verify-super-admin', () => ({
  verifySuperAdminAuth: async () => ({ valid: superAdminValid }),
}));

vi.mock('@/lib/montree/security/require-principal', () => ({
  requirePrincipalOrSuperAdmin: async () => null,
}));

vi.mock('@/lib/montree/curriculum-loader', () => ({
  loadAllCurriculumWorks: () => [
    {
      name: 'Pink Tower',
      work_key: 'pink_tower',
      quick_guide: 'g',
      parent_description: 'p',
      why_it_matters: 'w',
      presentation_steps: [],
      direct_aims: [],
      materials: [],
      control_of_error: 'c',
    },
  ],
}));

vi.mock('@/lib/montree/curriculum/apply-global-translations', () => ({
  applyGlobalTranslations: async () => undefined,
}));

vi.mock('@/lib/supabase-client', () => ({
  getSupabase: () => ({
    from(table: string) {
      if (table === 'montree_classrooms') {
        const b: Record<string, unknown> = {
          select: () => b,
          eq: (_c: string, v: unknown) => {
            // Scope lookup: which classrooms belong to the caller's school?
            (b as { _school?: unknown })._school = v;
            return b;
          },
          single: async () => ({
            data: { school_id: SCHOOL },
            error: null,
          }),
          then: (res: (v: unknown) => void) =>
            res({
              data:
                (b as { _school?: unknown })._school === SCHOOL
                  ? MY_CLASSROOMS.map((id) => ({ id }))
                  : [],
              error: null,
            }),
        };
        return b;
      }

      if (table === 'montree_classroom_curriculum_works') {
        const b: Record<string, unknown> = {
          select: () => b,
          eq: (c: string, v: unknown) => {
            // An .eq('id', ...) here is the UPDATE's target, not a read filter.
            if (c === 'id') { updatedIds.push(String(v)); return Promise.resolve({ error: null }); }
            worksFilters.push({ op: `eq:${c}`, arg: v });
            return b;
          },
          in: (c: string, v: unknown) => {
            worksFilters.push({ op: `in:${c}`, arg: v });
            return b;
          },
          update: () => b,
          then: (res: (v: unknown) => void) =>
            res({ data: WORK_ROWS, error: null }),
        };
        return b;
      }

      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

const { GET } = await import('@/app/api/montree/admin/backfill-guides/route');

const call = (qs: string) =>
  GET(new NextRequest(`http://localhost/api/montree/admin/backfill-guides${qs}`));

beforeEach(() => {
  worksFilters = [];
  updatedIds.length = 0;
  authRole = 'principal';
  superAdminValid = false;
});

/** Did the works query get confined to a set of classrooms / a school? */
const wasScoped = () =>
  worksFilters.some(
    (f) => f.op === 'in:classroom_id' || f.op === 'eq:classroom_id'
  );

describe('GET /api/montree/admin/backfill-guides — tenant scoping', () => {
  it('?all=true is confined to the caller\'s OWN school', async () => {
    const res = await call('?all=true');
    expect(res.status).toBe(200);

    expect(
      wasScoped(),
      'all=true ran an UNFILTERED query — this rewrites every school on the platform'
    ).toBe(true);

    const scope = worksFilters.find((f) => f.op === 'in:classroom_id');
    expect(scope?.arg).toEqual(MY_CLASSROOMS);
  });

  it('never touches a classroom outside the caller\'s school', async () => {
    await call('?all=true');
    const scope = worksFilters.find((f) => f.op === 'in:classroom_id');
    const ids = (scope?.arg ?? []) as string[];
    expect(ids).not.toContain('room-elsewhere');
    expect(ids.every((id) => MY_CLASSROOMS.includes(id))).toBe(true);
  });

  it('refuses scope=platform for an ordinary principal', async () => {
    const res = await call('?all=true&scope=platform');
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'platform_scope_forbidden' });
    // And critically: nothing was written.
    expect(updatedIds).toEqual([]);
  });

  it('allows scope=platform for a verified super-admin, unfiltered by design', async () => {
    superAdminValid = true;
    const res = await call('?all=true&scope=platform');
    expect(res.status).toBe(200);
    expect(wasScoped()).toBe(false);
  });

  it('still scopes a single classroom by id', async () => {
    const res = await call('?classroom_id=room-1');
    expect(res.status).toBe(200);
    expect(worksFilters).toContainEqual({ op: 'eq:classroom_id', arg: 'room-1' });
  });

  it('still requires one of classroom_id / all', async () => {
    const res = await call('');
    expect(res.status).toBe(400);
  });
});
