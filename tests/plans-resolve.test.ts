// tests/plans-resolve.test.ts
//
// WP-A verification for the 3-tier plan resolver.
// Plan: docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md §9.
//
// Covers: the full precedence ladder, the plan→model/budget/photoCap mapping,
// the legacy fallback, the deriveTier compat wrapper, the Full quantity floor,
// and — the load-bearing one — loadResolvedPlan against a mocked Postgres
// 42703, which is what makes deploy-before-migration safe.

import { describe, it, expect, vi } from 'vitest';
import { resolvePlan, loadResolvedPlan } from '@/lib/montree/plans/resolve-plan';
import { fullPlanQuantity, toPlan, PLAN_ECONOMICS } from '@/lib/montree/plans/types';
import { deriveTier, PLAN_TO_TIER, TIER_TO_PLAN } from '@/lib/montree/reports/resolve-model';

describe('resolvePlan — precedence', () => {
  it('locked beats everything, including founding and an explicit full plan', () => {
    const r = resolvePlan({
      lockedAt: '2026-09-01T00:00:00Z',
      planColumn: 'full',
      planOverride: 'full',
      foundingMember: true,
      billingOverrideUsd: 0,
    });
    expect(r.plan).toBe('basic');
    expect(r.model).toBe('none');
    expect(r.locked).toBe(true);
    expect(r.source).toBe('locked');
    expect(r.aiBudgetUsd).toBe(0);
  });

  it('override beats founding, partner, stripe and legacy', () => {
    const r = resolvePlan({
      planOverride: 'lite',
      planColumn: 'full',
      foundingMember: true,
      billingOverrideUsd: 0,
      legacySonnetFlag: true,
    });
    expect(r.plan).toBe('lite');
    expect(r.source).toBe('override');
  });

  it('founding beats partner, stripe and legacy', () => {
    const r = resolvePlan({
      foundingMember: true,
      billingOverrideUsd: 0,
      planColumn: 'basic',
      legacyHaikuFlag: true,
    });
    expect(r.plan).toBe('full');
    expect(r.source).toBe('founding');
  });

  it('partner ($0 override) beats stripe and legacy', () => {
    const r = resolvePlan({ billingOverrideUsd: 0, planColumn: 'basic', legacyHaikuFlag: true });
    expect(r.plan).toBe('full');
    expect(r.source).toBe('partner');
  });

  it('a non-zero billing override is NOT a partner grant', () => {
    // Founding 100 carries billing_override_usd = 3 — that must not be read as
    // free-for-life. Without founding_member it falls through to the column.
    const r = resolvePlan({ billingOverrideUsd: 3, planColumn: 'lite' });
    expect(r.plan).toBe('lite');
    expect(r.source).toBe('stripe');
  });

  it('handles a string-typed numeric billing override (Postgres DECIMAL)', () => {
    expect(resolvePlan({ billingOverrideUsd: '0' }).plan).toBe('full');
    expect(resolvePlan({ billingOverrideUsd: '0.00' }).source).toBe('partner');
  });

  it('the plan column beats legacy flags', () => {
    const r = resolvePlan({ planColumn: 'basic', legacySonnetFlag: true });
    expect(r.plan).toBe('basic');
    expect(r.source).toBe('stripe');
  });

  it('ignores a garbage plan column and falls through', () => {
    const r = resolvePlan({ planColumn: 'premium' as never, legacyHaikuFlag: true });
    expect(r.plan).toBe('lite');
    expect(r.source).toBe('legacy');
  });
});

describe('resolvePlan — legacy fallback (rule 6)', () => {
  it('sonnet flag → full', () => {
    const r = resolvePlan({ legacySonnetFlag: true });
    expect(r.plan).toBe('full');
    expect(r.source).toBe('legacy');
  });

  it('haiku flag → lite', () => {
    expect(resolvePlan({ legacyHaikuFlag: true }).plan).toBe('lite');
  });

  it('sonnet wins when both legacy flags are on', () => {
    expect(resolvePlan({ legacySonnetFlag: true, legacyHaikuFlag: true }).plan).toBe('full');
  });

  it('active subscription with no flags → lite', () => {
    const r = resolvePlan({ subscriptionStatus: 'active' });
    expect(r.plan).toBe('lite');
    expect(r.source).toBe('legacy');
  });

  it('trialing no longer grants anything — trials are retired', () => {
    const r = resolvePlan({ subscriptionStatus: 'trialing' });
    expect(r.plan).toBe('basic');
    expect(r.source).toBe('default');
  });

  it('nothing at all → basic/default, never "no product"', () => {
    const r = resolvePlan({});
    expect(r.plan).toBe('basic');
    expect(r.source).toBe('default');
    expect(r.locked).toBe(false);
  });
});

describe('resolvePlan — economics per plan', () => {
  it('basic: no model, $0 budget, 500-photo cap', () => {
    const r = resolvePlan({ planColumn: 'basic' });
    expect(r.model).toBe('none');
    expect(r.aiBudgetUsd).toBe(0);
    expect(r.photoCap).toBe(500);
  });

  it('lite: haiku, $8 budget, unlimited photos', () => {
    const r = resolvePlan({ planColumn: 'lite' });
    expect(r.model).toBe('haiku');
    expect(r.aiBudgetUsd).toBe(8);
    expect(r.photoCap).toBeNull();
  });

  it('full: sonnet, $9999 budget, unlimited photos', () => {
    const r = resolvePlan({ planColumn: 'full' });
    expect(r.model).toBe('sonnet');
    expect(r.aiBudgetUsd).toBe(9999);
    expect(r.photoCap).toBeNull();
  });

  it('economics come from the one PLAN_ECONOMICS table', () => {
    for (const plan of ['basic', 'lite', 'full'] as const) {
      const r = resolvePlan({ planColumn: plan });
      expect(r.aiBudgetUsd).toBe(PLAN_ECONOMICS[plan].aiBudgetUsd);
      expect(r.photoCap).toBe(PLAN_ECONOMICS[plan].photoCap);
    }
  });

  it('carries plan_changed_at through — the photo-cap grandfather line', () => {
    const iso = '2026-09-07T12:00:00.000Z';
    expect(resolvePlan({ planColumn: 'basic', planChangedAt: iso }).planChangedAt).toBe(iso);
    expect(resolvePlan({ planColumn: 'basic' }).planChangedAt).toBeNull();
  });
});

describe('toPlan', () => {
  it('accepts only the three plans', () => {
    expect(toPlan('basic')).toBe('basic');
    expect(toPlan('lite')).toBe('lite');
    expect(toPlan('full')).toBe('full');
    for (const bad of ['premium', 'starter', 'BASIC', '', null, undefined, 7, {}]) {
      expect(toPlan(bad)).toBeNull();
    }
  });
});

describe('fullPlanQuantity — the $30/month floor', () => {
  it('floors at 10 children', () => {
    expect(fullPlanQuantity(0)).toBe(10);
    expect(fullPlanQuantity(1)).toBe(10);
    expect(fullPlanQuantity(9)).toBe(10);
    expect(fullPlanQuantity(10)).toBe(10);
  });

  it('passes headcount through above the floor', () => {
    expect(fullPlanQuantity(11)).toBe(11);
    expect(fullPlanQuantity(15)).toBe(15);
    expect(fullPlanQuantity(120)).toBe(120);
  });

  it('is safe against nonsense input', () => {
    expect(fullPlanQuantity(-5)).toBe(10);
    expect(fullPlanQuantity(NaN)).toBe(10);
    expect(fullPlanQuantity(12.7)).toBe(12);
  });

  it('invoices $30 at 4 children and $45 at 15 (plan §9)', () => {
    expect(fullPlanQuantity(4) * 3).toBe(30);
    expect(fullPlanQuantity(15) * 3).toBe(45);
  });
});

describe('deriveTier — compatibility wrapper', () => {
  it('maps every plan onto the legacy tier vocabulary', () => {
    expect(PLAN_TO_TIER).toEqual({ basic: 'free', lite: 'haiku', full: 'sonnet' });
    expect(TIER_TO_PLAN).toEqual({ free: 'basic', haiku: 'lite', sonnet: 'full' });
  });

  it('locked → free', () => {
    expect(deriveTier({ lockedAt: 'x', sonnetFlag: true, haikuFlag: true })).toBe('free');
  });

  it('sonnet flag → sonnet, haiku flag → haiku, neither → free', () => {
    expect(deriveTier({ sonnetFlag: true, haikuFlag: false })).toBe('sonnet');
    expect(deriveTier({ sonnetFlag: false, haikuFlag: true })).toBe('haiku');
    expect(deriveTier({ sonnetFlag: false, haikuFlag: false })).toBe('free');
  });

  it('active with no flags still floors at haiku', () => {
    expect(deriveTier({ sonnetFlag: false, haikuFlag: false, subscriptionStatus: 'active' })).toBe(
      'haiku'
    );
  });

  it('honours the new plan fields when supplied', () => {
    expect(deriveTier({ sonnetFlag: false, haikuFlag: false, plan: 'full' })).toBe('sonnet');
    expect(deriveTier({ sonnetFlag: true, haikuFlag: true, planOverride: 'basic' })).toBe('free');
    expect(deriveTier({ sonnetFlag: false, haikuFlag: false, foundingMember: true })).toBe('sonnet');
  });
});

// ── loadResolvedPlan: the 42703 fallback ────────────────────────────────────

interface FakeRow {
  subscription_status?: string | null;
  locked_at?: string | null;
  founding_member?: boolean | null;
  billing_override_usd?: number | string | null;
  plan?: string | null;
  plan_override?: string | null;
  plan_changed_at?: string | null;
}

/**
 * Minimal supabase stub. `planColumnsExist=false` makes any select naming the
 * migration-349 columns answer with Postgres 42703, exactly as an un-migrated
 * database does.
 */
function fakeSupabase(row: FakeRow | null, planColumnsExist: boolean, features: Record<string, boolean> = {}) {
  return {
    from(table: string) {
      if (table === 'montree_schools') {
        return {
          select(cols: string) {
            const wantsPlanColumns = cols.includes('plan');
            return {
              eq() {
                return {
                  async maybeSingle() {
                    if (wantsPlanColumns && !planColumnsExist) {
                      return {
                        data: null,
                        error: { code: '42703', message: 'column montree_schools.plan does not exist' },
                      };
                    }
                    return { data: row, error: null };
                  },
                };
              },
            };
          },
        };
      }
      // montree_school_features / montree_feature_definitions, for isFeatureEnabled
      return {
        select() {
          return {
            eq(_c: string, _v: string) {
              void _c;
              void _v;
              return {
                eq(_c2: string, key: string) {
                  void _c2;
                  return {
                    async maybeSingle() {
                      return key in features
                        ? { data: { enabled: features[key] }, error: null }
                        : { data: null, error: null };
                    },
                  };
                },
                async maybeSingle() {
                  return { data: null, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('loadResolvedPlan — deploy-before-migration safety', () => {
  it('reads the plan column when migration 349 has run', async () => {
    const supabase = fakeSupabase(
      { plan: 'lite', plan_source: 'stripe', plan_changed_at: '2026-09-07T00:00:00Z' } as FakeRow,
      true
    );
    const r = await loadResolvedPlan(supabase, 'school-1');
    expect(r.plan).toBe('lite');
    expect(r.source).toBe('stripe');
    expect(r.planChangedAt).toBe('2026-09-07T00:00:00Z');
  });

  it('falls back to the legacy ai_tier derivation on 42703 — never throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const supabase = fakeSupabase({ subscription_status: null }, false, {
      ai_tier_sonnet: true,
      ai_tier_haiku: true,
    });
    const r = await loadResolvedPlan(supabase, 'school-2');
    expect(r.plan).toBe('full');
    expect(r.source).toBe('legacy');
    expect(r.planChangedAt).toBeNull();
    warn.mockRestore();
  });

  it('42703 + haiku flag only → lite', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // NB: distinct schoolId per test — isFeatureEnabled has a 30s process-local
    // cache keyed on (schoolId, featureKey), so reusing an id leaks flags.
    const supabase = fakeSupabase({}, false, { ai_tier_sonnet: false, ai_tier_haiku: true });
    expect((await loadResolvedPlan(supabase, 'school-3')).plan).toBe('lite');
    warn.mockRestore();
  });

  it('42703 + no flags at all → basic, and NEVER "no product"', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const supabase = fakeSupabase({}, false, { ai_tier_sonnet: false, ai_tier_haiku: false });
    const r = await loadResolvedPlan(supabase, 'school-4');
    expect(r.plan).toBe('basic');
    expect(r.model).toBe('none');
    warn.mockRestore();
  });

  it('42703 still honours founding_member (the column predates 349)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const supabase = fakeSupabase({ founding_member: true }, false);
    const r = await loadResolvedPlan(supabase, 'school-5');
    expect(r.plan).toBe('full');
    expect(r.source).toBe('founding');
    warn.mockRestore();
  });

  it('a totally broken client resolves basic instead of throwing', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = {
      from() {
        throw new Error('connection refused');
      },
    };
    const r = await loadResolvedPlan(broken, 'school-6');
    expect(r.plan).toBe('basic');
    expect(r.source).toBe('default');
    err.mockRestore();
  });

  it('an unknown school (no row) resolves basic', async () => {
    const supabase = fakeSupabase(null, true, { ai_tier_sonnet: false, ai_tier_haiku: false });
    expect((await loadResolvedPlan(supabase, 'nope')).plan).toBe('basic');
  });
});
