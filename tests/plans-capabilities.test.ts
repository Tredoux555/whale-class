// tests/plans-capabilities.test.ts
//
// WP-A verification for the capability matrix.
// Plan: docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md §0/§9.
//
// The matrix is pinned CELL BY CELL against the locked table in §0 — this is
// the file that fails when someone "helpfully" grants montages to Lite.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PLAN_CAPABILITIES,
  CAPABILITY_FEATURE_KEYS,
  planGrants,
  hasCapability,
  invalidatePlanCache,
} from '@/lib/montree/plans/capabilities';
import { ALL_CAPABILITIES, ALL_PLANS } from '@/lib/montree/plans/types';
import type { Capability } from '@/lib/montree/plans/types';

// The locked table, transcribed from plan §0. Do not "fix" a row here without
// changing the plan doc first.
const EXPECTED: Record<string, Record<Capability, boolean>> = {
  basic: {
    guru: false, astra: false, aiReports: false, photoRecognition: false, montages: false,
    parentMessaging: false, appointments: false, videoCalls: false, orgOnboarding: false, cmsBridge: false,
  },
  lite: {
    guru: true, astra: true, aiReports: true, photoRecognition: false, montages: false,
    parentMessaging: false, appointments: false, videoCalls: false, orgOnboarding: false, cmsBridge: false,
  },
  full: {
    guru: true, astra: true, aiReports: true, photoRecognition: true, montages: true,
    parentMessaging: true, appointments: true, videoCalls: true, orgOnboarding: true, cmsBridge: true,
  },
};

describe('PLAN_CAPABILITIES — the locked matrix', () => {
  for (const plan of ALL_PLANS) {
    for (const cap of ALL_CAPABILITIES) {
      it(`${plan}.${cap} === ${EXPECTED[plan][cap]}`, () => {
        expect(PLAN_CAPABILITIES[plan][cap]).toBe(EXPECTED[plan][cap]);
        expect(planGrants(plan, cap)).toBe(EXPECTED[plan][cap]);
      });
    }
  }

  it('is monotonic — full ⊇ lite ⊇ basic', () => {
    for (const cap of ALL_CAPABILITIES) {
      if (PLAN_CAPABILITIES.basic[cap]) expect(PLAN_CAPABILITIES.lite[cap]).toBe(true);
      if (PLAN_CAPABILITIES.lite[cap]) expect(PLAN_CAPABILITIES.full[cap]).toBe(true);
    }
  });

  it('carries the plan economics alongside the entitlements', () => {
    expect(PLAN_CAPABILITIES.basic.photoCap).toBe(500);
    expect(PLAN_CAPABILITIES.lite.photoCap).toBeNull();
    expect(PLAN_CAPABILITIES.full.photoCap).toBeNull();
    expect(PLAN_CAPABILITIES.basic.aiBudgetUsd).toBe(0);
    expect(PLAN_CAPABILITIES.lite.aiBudgetUsd).toBe(8);
    expect(PLAN_CAPABILITIES.full.aiBudgetUsd).toBe(9999);
  });
});

describe('CAPABILITY_FEATURE_KEYS', () => {
  it('has an entry for every capability', () => {
    for (const cap of ALL_CAPABILITIES) {
      expect(Array.isArray(CAPABILITY_FEATURE_KEYS[cap])).toBe(true);
    }
  });

  it('excludes the behavioural photo flags — they are not entitlements', () => {
    // photo_pipeline_v2 defaults ON and unified_photo_tagger is a UI switch;
    // honouring either as an override would hand Basic schools Full's photo
    // recognition. Deliberate deviation from plan §3.
    expect(CAPABILITY_FEATURE_KEYS.photoRecognition).not.toContain('photo_pipeline_v2');
    expect(CAPABILITY_FEATURE_KEYS.photoRecognition).not.toContain('unified_photo_tagger');
  });

  it('montages has no override key — plan grant only', () => {
    expect(CAPABILITY_FEATURE_KEYS.montages).toEqual([]);
  });
});

// ── hasCapability: plan grant OR an explicit per-school override ────────────

/**
 * Stub client. `planRow` feeds loadResolvedPlan; `explicitOn` is the set of
 * feature keys that have a real montree_school_features row with enabled=true.
 */
function fakeSupabase(plan: string, explicitOn: string[] = []) {
  return {
    from(table: string) {
      if (table === 'montree_schools') {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { plan, plan_source: 'stripe' }, error: null };
                  },
                };
              },
            };
          },
        };
      }
      // montree_school_features — the explicit-override probe.
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    in(_col: string, keys: string[]) {
                      void _col;
                      return {
                        async limit() {
                          const hit = keys.filter((k) => explicitOn.includes(k));
                          return { data: hit.map((feature_key) => ({ feature_key })), error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('hasCapability', () => {
  beforeEach(() => invalidatePlanCache());

  it('true when the plan grants it', async () => {
    expect(await hasCapability(fakeSupabase('full'), 's1', 'photoRecognition')).toBe(true);
    expect(await hasCapability(fakeSupabase('lite'), 's2', 'guru')).toBe(true);
  });

  it('false when the plan denies it and there is no override', async () => {
    expect(await hasCapability(fakeSupabase('basic'), 's3', 'guru')).toBe(false);
    expect(await hasCapability(fakeSupabase('lite'), 's4', 'photoRecognition')).toBe(false);
    expect(await hasCapability(fakeSupabase('lite'), 's5', 'montages')).toBe(false);
  });

  it('true when the plan denies but an explicit per-school override is ON', async () => {
    // Grandfathering: a school hand-granted `appointments` before this shipped
    // keeps appointments even on Basic.
    expect(await hasCapability(fakeSupabase('basic', ['appointments']), 's6', 'appointments')).toBe(
      true
    );
    expect(await hasCapability(fakeSupabase('basic', ['guru_advisor']), 's7', 'guru')).toBe(true);
  });

  it('an override never turns a plan-granted capability OFF', async () => {
    // There is no "off" path at all — the override set is additive by
    // construction, so a Full school keeps everything no matter what rows exist.
    expect(await hasCapability(fakeSupabase('full', []), 's8', 'montages')).toBe(true);
    expect(await hasCapability(fakeSupabase('full', []), 's9', 'videoCalls')).toBe(true);
  });

  it('an unrelated explicit flag does not leak a capability', async () => {
    expect(await hasCapability(fakeSupabase('basic', ['games', 'photo_audit']), 's10', 'guru')).toBe(
      false
    );
  });

  it('montages cannot be overridden on — it has no mapped key', async () => {
    expect(await hasCapability(fakeSupabase('basic', ['anything']), 's11', 'montages')).toBe(false);
  });

  it('fails closed to the plan grant when the override probe errors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = {
      from(table: string) {
        if (table === 'montree_schools') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan: 'basic' }, error: null }) }) }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({ limit: async () => ({ data: null, error: { message: 'boom' } }) }),
              }),
            }),
          }),
        };
      },
    };
    expect(await hasCapability(broken, 's12', 'appointments')).toBe(false);
    warn.mockRestore();
  });

  it('a locked school resolves basic and loses every plan-granted capability', async () => {
    const locked = {
      from(table: string) {
        if (table === 'montree_schools') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { plan: 'full', locked_at: '2026-09-01T00:00:00Z' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ in: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
          }),
        };
      },
    };
    expect(await hasCapability(locked, 's13', 'photoRecognition')).toBe(false);
    expect(await hasCapability(locked, 's14', 'guru')).toBe(false);
  });
});
