// tests/plans-gating.test.ts
//
// WP-B verification — the ROUTE GATE and the BASIC PHOTO CAP.
// Plan: docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md §3 + §5.
//
// The gate helper (lib/montree/plans/gate.ts) is the exact code path every
// gated route runs — requireCapability() IS the gate — so exercising it here
// covers all ~40 gated routes without mounting Next.js per route.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  requireCapability,
  planGateBody,
  planGateResponse,
  planBudgetExhaustedResponse,
} from '@/lib/montree/plans/gate';
import { invalidatePlanCache } from '@/lib/montree/plans/capabilities';
import { enforcePhotoCap, countCappedPhotos } from '@/lib/montree/plans/photo-cap';
import { ALL_CAPABILITIES } from '@/lib/montree/plans/types';

// ── Stub client (same shape as tests/plans-capabilities.test.ts) ────────────

function fakeSupabase(plan: string, explicitOn: string[] = [], planChangedAt: string | null = null) {
  return {
    from(table: string) {
      if (table === 'montree_schools') {
        return {
          select: () => ({
            eq: () => ({
              async maybeSingle() {
                return {
                  data: { plan, plan_source: 'stripe', plan_changed_at: planChangedAt },
                  error: null,
                };
              },
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: (_col: string, keys: string[]) => {
                void _col;
                return {
                  async limit() {
                    const hit = keys.filter((k) => explicitOn.includes(k));
                    return { data: hit.map((feature_key) => ({ feature_key })), error: null };
                  },
                };
              },
            }),
          }),
        }),
      };
    },
  };
}

// ── The 402 contract ───────────────────────────────────────────────────────

describe('planGateBody — the 402 contract WP-C renders', () => {
  it('carries requires_upgrade, upgrade_url, feature AND the new capability', () => {
    const body = planGateBody('montages');
    expect(body.requires_upgrade).toBe(true);
    expect(body.upgrade_url).toBe('/montree/admin/billing');
    expect(body.feature).toBe('montages');
    expect(body.capability).toBe('montages');
    expect(typeof body.error).toBe('string');
  });

  it('names the unlocking plan for every capability', () => {
    for (const cap of ALL_CAPABILITIES) {
      expect(planGateBody(cap).error).toMatch(/Lite|Full/);
    }
  });

  it('honours a caller-supplied message', () => {
    expect(planGateBody('guru', 'Custom.').error).toBe('Custom.');
  });

  it('planGateResponse is a 402', async () => {
    const res = planGateResponse('guru');
    expect(res.status).toBe(402);
    expect((await res.json()).capability).toBe('guru');
  });
});

describe('planBudgetExhaustedResponse — NOT an upgrade failure', () => {
  it('is a 429 with no requires_upgrade, so UpgradeCard never renders', async () => {
    const res = planBudgetExhaustedResponse();
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.requires_upgrade).toBeUndefined();
    expect(body.ai_budget_exhausted).toBe(true);
    expect(body.error).toContain('resets on the 1st');
  });
});

// ── requireCapability, per plan ────────────────────────────────────────────

describe('requireCapability — Basic', () => {
  beforeEach(() => invalidatePlanCache());

  it('402s Guru with capability:guru', async () => {
    const gate = await requireCapability(fakeSupabase('basic'), 's1', 'guru');
    expect(gate).not.toBeNull();
    expect(gate!.status).toBe(402);
    expect((await gate!.json()).capability).toBe('guru');
  });

  it('402s photo recognition with capability:photoRecognition', async () => {
    const gate = await requireCapability(fakeSupabase('basic'), 's1', 'photoRecognition');
    expect(gate!.status).toBe(402);
    expect((await gate!.json()).capability).toBe('photoRecognition');
  });

  it('402s montages with capability:montages', async () => {
    const gate = await requireCapability(fakeSupabase('basic'), 's1', 'montages');
    expect(gate!.status).toBe(402);
    expect((await gate!.json()).capability).toBe('montages');
  });

  it('denies every capability', async () => {
    for (const cap of ALL_CAPABILITIES) {
      invalidatePlanCache();
      expect(await requireCapability(fakeSupabase('basic'), 's1', cap)).not.toBeNull();
    }
  });

  it('402s when the schoolId is missing entirely — never fails open', async () => {
    expect(await requireCapability(fakeSupabase('full'), null, 'guru')).not.toBeNull();
  });
});

describe('requireCapability — Lite', () => {
  beforeEach(() => invalidatePlanCache());

  it('allows Guru', async () => {
    expect(await requireCapability(fakeSupabase('lite'), 's1', 'guru')).toBeNull();
  });

  it('allows Astra and AI reports', async () => {
    expect(await requireCapability(fakeSupabase('lite'), 's1', 'astra')).toBeNull();
    invalidatePlanCache();
    expect(await requireCapability(fakeSupabase('lite'), 's1', 'aiReports')).toBeNull();
  });

  it('still refuses photo recognition — the whole point of the tier', async () => {
    const gate = await requireCapability(fakeSupabase('lite'), 's1', 'photoRecognition');
    expect(gate!.status).toBe(402);
    expect((await gate!.json()).capability).toBe('photoRecognition');
  });

  it('refuses montages, messaging, appointments, calls, org onboarding, evaluation', async () => {
    for (const cap of ['montages', 'parentMessaging', 'appointments', 'videoCalls', 'orgOnboarding', 'cmsBridge'] as const) {
      invalidatePlanCache();
      expect(await requireCapability(fakeSupabase('lite'), 's1', cap)).not.toBeNull();
    }
  });
});

describe('requireCapability — Full', () => {
  beforeEach(() => invalidatePlanCache());

  it('allows every capability', async () => {
    for (const cap of ALL_CAPABILITIES) {
      invalidatePlanCache();
      expect(await requireCapability(fakeSupabase('full'), 's1', cap)).toBeNull();
    }
  });
});

describe('requireCapability — grandfathered per-school override', () => {
  beforeEach(() => invalidatePlanCache());

  it('a Basic school hand-granted appointments keeps appointments', async () => {
    expect(
      await requireCapability(fakeSupabase('basic', ['appointments']), 's1', 'appointments')
    ).toBeNull();
  });

  it('but an unrelated override does not open a different capability', async () => {
    expect(
      await requireCapability(fakeSupabase('basic', ['appointments']), 's1', 'montages')
    ).not.toBeNull();
  });
});

// ── Photo cap ──────────────────────────────────────────────────────────────

/**
 * Photo-cap stub. Records every archive UPDATE so the test can assert WHICH
 * rows were archived, and honours the grandfather line by only ever returning
 * rows at/after `gte('created_at', …)` when one is applied.
 */
function fakePhotoSupabase(opts: {
  plan: string;
  planChangedAt?: string | null;
  /** id + captured_at + created_at, oldest first. */
  photos: Array<{ id: string; captured_at: string; created_at: string }>;
}) {
  const archived: string[][] = [];
  const capStamp: Array<Record<string, unknown>> = [];

  const live = () => opts.photos;

  function mediaQuery() {
    let gteCreated: string | null = null;
    let limitN = Infinity;
    const q: Record<string, unknown> = {};
    const self = {
      select: (_c: string, o?: { count?: string; head?: boolean }) => {
        q.head = o?.head === true;
        return self;
      },
      eq: () => self,
      is: () => self,
      gte: (_col: string, v: string) => {
        gteCreated = v;
        return self;
      },
      order: () => self,
      limit: (n: number) => {
        limitN = n;
        return Promise.resolve({ data: rows().slice(0, limitN), error: null });
      },
      update: (patch: Record<string, unknown>) => ({
        in: (_col: string, ids: string[]) => {
          archived.push(ids);
          return Promise.resolve({ error: null });
        },
        eq: () => ({ is: () => Promise.resolve({ error: null }) }),
        ...patch,
      }),
      then: (resolve: (v: unknown) => void) =>
        resolve({ count: rows().length, data: null, error: null }),
    };
    function rows() {
      const arch = new Set(archived.flat());
      return live().filter(
        (p) => !arch.has(p.id) && (!gteCreated || p.created_at >= gteCreated)
      );
    }
    return self;
  }

  return {
    archived,
    capStamp,
    from(table: string) {
      if (table === 'montree_schools') {
        return {
          select: () => ({
            eq: () => ({
              async maybeSingle() {
                return {
                  data: {
                    plan: opts.plan,
                    plan_source: 'stripe',
                    plan_changed_at: opts.planChangedAt ?? null,
                  },
                  error: null,
                };
              },
            }),
          }),
          update: (patch: Record<string, unknown>) => {
            capStamp.push(patch);
            return { eq: () => ({ is: () => Promise.resolve({ error: null }) }) };
          },
        };
      }
      return mediaQuery();
    },
  };
}

function photo(i: number, day: string) {
  return { id: `p${i}`, captured_at: `${day}T00:00:00Z`, created_at: `${day}T00:00:00Z` };
}

describe('enforcePhotoCap', () => {
  beforeEach(() => invalidatePlanCache());

  it('is a no-op on Lite — uncapped plans never query, never archive', async () => {
    const db = fakePhotoSupabase({ plan: 'lite', photos: [photo(1, '2026-01-01')] });
    const r = await enforcePhotoCap(db, 's1');
    expect(r.applied).toBe(false);
    expect(r.cap).toBeNull();
    expect(db.archived).toEqual([]);
  });

  it('is a no-op on Full', async () => {
    const db = fakePhotoSupabase({ plan: 'full', photos: [photo(1, '2026-01-01')] });
    const r = await enforcePhotoCap(db, 's1');
    expect(r.applied).toBe(false);
    expect(db.archived).toEqual([]);
  });

  it('archives nothing on Basic while under the cap', async () => {
    const db = fakePhotoSupabase({
      plan: 'basic',
      photos: Array.from({ length: 10 }, (_, i) => photo(i, '2026-01-01')),
    });
    const r = await enforcePhotoCap(db, 's1');
    expect(r.cap).toBe(500);
    expect(r.counted).toBe(10);
    expect(r.archived).toBe(0);
    expect(db.archived).toEqual([]);
  });

  it('archives exactly the overshoot, oldest first, and stamps the school', async () => {
    // 503 photos, cap 500 → exactly 3 archived, and they must be p0/p1/p2
    // (ordered by captured_at ASC — the stub returns them in insertion order).
    const db = fakePhotoSupabase({
      plan: 'basic',
      photos: Array.from({ length: 503 }, (_, i) =>
        photo(i, `2026-01-${String((i % 28) + 1).padStart(2, '0')}`)
      ),
    });
    const r = await enforcePhotoCap(db, 's1');
    expect(r.counted).toBe(503);
    expect(r.archived).toBe(3);
    expect(db.archived.flat()).toEqual(['p0', 'p1', 'p2']);
    expect(db.capStamp.length).toBe(1);
    expect(db.capStamp[0].photo_cap_reached_at).toBeTruthy();
  });

  it('GRANDFATHERS — photos created before plan_changed_at do not count', async () => {
    // 400 old photos + 2 new ones. Cap 500. Without the grandfather line this
    // would count 402 (still under), so make it decisive: 600 old + 3 new.
    const old = Array.from({ length: 600 }, (_, i) => ({
      id: `old${i}`,
      captured_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
    }));
    const fresh = Array.from({ length: 3 }, (_, i) => ({
      id: `new${i}`,
      captured_at: '2026-06-01T00:00:00Z',
      created_at: '2026-06-01T00:00:00Z',
    }));
    const db = fakePhotoSupabase({
      plan: 'basic',
      planChangedAt: '2026-01-01T00:00:00Z',
      photos: [...old, ...fresh],
    });
    const r = await enforcePhotoCap(db, 's1');
    // Only the 3 post-plan-change photos count — the 600-photo legacy library
    // is untouchable. Nothing is archived.
    expect(r.counted).toBe(3);
    expect(r.archived).toBe(0);
    expect(db.archived).toEqual([]);
  });

  it('counts the WHOLE library when plan_changed_at is unknown (pre-migration)', async () => {
    const db = fakePhotoSupabase({
      plan: 'basic',
      planChangedAt: null,
      photos: Array.from({ length: 501 }, (_, i) => photo(i, '2026-01-01')),
    });
    const r = await enforcePhotoCap(db, 's1');
    expect(r.counted).toBe(501);
    expect(r.archived).toBe(1);
    expect(db.archived.flat()).toEqual(['p0']);
  });

  it('never throws, and never blocks an upload, when the plan lookup explodes', async () => {
    const boom = {
      from() {
        throw new Error('db down');
      },
    };
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await enforcePhotoCap(boom, 's1');
    expect(r.applied).toBe(false);
    expect(r.archived).toBe(0);
    spy.mockRestore();
  });

  it('does nothing without a schoolId', async () => {
    const r = await enforcePhotoCap(fakePhotoSupabase({ plan: 'basic', photos: [] }), '');
    expect(r.applied).toBe(false);
  });
});

describe('countCappedPhotos', () => {
  it('returns null (rather than 0) when the count query fails, so the caller skips', async () => {
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => ({
              then: (resolve: (v: unknown) => void) =>
                resolve({ count: null, error: { code: '42703', message: 'archived_at does not exist' } }),
            }),
          }),
        }),
      }),
    };
    expect(await countCappedPhotos(db, 's1', null)).toBeNull();
  });
});
