// lib/montree/plans/resolve-plan.ts
//
// 🚨 THE ONE SOURCE OF TRUTH for "what plan is this school on".
// Plan: docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md §2.
//
// PRECEDENCE (highest wins):
//   1. locked_at set           → basic / none / locked   (abuse lock kills AI spend)
//   2. plan_override non-null  → that plan, source 'override'  (super-admin beats Stripe AND founding)
//   3. founding_member === true→ full,  source 'founding'
//   4. billing_override_usd 0  → full,  source 'partner'
//   5. plan column non-null    → that plan, source 'stripe'
//   6. legacy fallback         → sonnetFlag→full · haikuFlag→lite · active→lite · else basic
//   7. default                 → basic
//
// 🚨 DEPLOY-BEFORE-MIGRATION SAFETY — the single most important thing in this
// file. loadResolvedPlan SELECTs the migration-349 columns; if Postgres answers
// 42703 (undefined_column) it RETRIES with the legacy column set and falls
// through to rule 6, so a code deploy that lands before migration 349 degrades
// to exact Jul-6 behaviour. It NEVER fails closed to "no product": the worst
// case is Basic, which is the cheap, safe direction (zero AI spend), never a
// bricked school.

// 🚨 This module must NOT import ./capabilities — capabilities.ts imports
// loadResolvedPlan from here. The economics (budget + photo cap) therefore
// live in ./types (PLAN_ECONOMICS), which PLAN_CAPABILITIES spreads in, so
// there is one source of truth and no import cycle.
import type { Plan, PlanInputs, PlanModel, ResolvedPlan } from './types';
import { toPlan, PLAN_ECONOMICS } from './types';
import { isFeatureEnabled } from '@/lib/montree/features/server';

const PLAN_MODEL: Record<Plan, PlanModel> = {
  basic: 'none',
  lite: 'haiku',
  full: 'sonnet',
};

function shape(
  plan: Plan,
  source: ResolvedPlan['source'],
  locked: boolean,
  planChangedAt: string | null
): ResolvedPlan {
  const econ = PLAN_ECONOMICS[plan];
  return {
    plan,
    model: PLAN_MODEL[plan],
    source,
    locked,
    aiBudgetUsd: econ.aiBudgetUsd,
    photoCap: econ.photoCap,
    planChangedAt,
  };
}

/**
 * Pure, synchronous plan resolution. No DB access — callers control their own
 * query shape and cost, exactly like the old deriveTier().
 */
export function resolvePlan(input: PlanInputs): ResolvedPlan {
  const changedAt = input.planChangedAt ?? null;

  // 1. Abuse lock — no AI spend is possible while locked.
  if (input.lockedAt) {
    return shape('basic', 'locked', true, changedAt);
  }

  // 2. Super-admin override beats every commercial signal, including founding.
  const override = toPlan(input.planOverride);
  if (override) {
    return shape(override, 'override', false, changedAt);
  }

  // 3. Founding 100 — Full for life (they still pay $3/child, floor applies).
  if (input.foundingMember === true) {
    return shape('full', 'founding', false, changedAt);
  }

  // 4. Partner free-for-life — $0 override → Full at no charge.
  if (
    input.billingOverrideUsd !== null &&
    input.billingOverrideUsd !== undefined &&
    Number(input.billingOverrideUsd) === 0
  ) {
    return shape('full', 'partner', false, changedAt);
  }

  // 5. The plan column — what Stripe (or applyPlan) last wrote.
  const column = toPlan(input.planColumn);
  if (column) {
    return shape(column, 'stripe', false, changedAt);
  }

  // 6. Legacy fallback — used when migration 349 hasn't run (column missing)
  //    or the column is somehow null. Mirrors the Jul-6 tier precedence.
  if (input.legacySonnetFlag) return shape('full', 'legacy', false, changedAt);
  if (input.legacyHaikuFlag) return shape('lite', 'legacy', false, changedAt);
  if (input.subscriptionStatus === 'active') return shape('lite', 'legacy', false, changedAt);

  // 7. Nothing said otherwise → Basic. Never "no product".
  return shape('basic', 'default', false, changedAt);
}

interface SchoolPlanRow {
  locked_at?: string | null;
  plan?: string | null;
  plan_override?: string | null;
  plan_changed_at?: string | null;
  founding_member?: boolean | null;
  billing_override_usd?: number | string | null;
  subscription_status?: string | null;
}

const NEW_COLUMNS =
  'subscription_status, locked_at, founding_member, billing_override_usd, plan, plan_override, plan_changed_at';
const LEGACY_COLUMNS =
  'subscription_status, locked_at, founding_member, billing_override_usd';

/** Postgres "column does not exist" — migration 349 not run yet. */
function isUndefinedColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === '42703') return true;
  const msg = (e.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('column');
}

/**
 * Async plan resolution for a school. 42703-safe (see file header).
 *
 * Cost: one school SELECT, plus TWO feature-flag reads ONLY on the legacy
 * fallback path (they are what rule 6 needs). Once migration 349 has run and
 * the plan column is populated, the flag reads are skipped entirely.
 */
export async function loadResolvedPlan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client, matches isFeatureEnabled
  supabase: any,
  schoolId: string
): Promise<ResolvedPlan> {
  try {
    let row: SchoolPlanRow | null = null;
    let planColumnsAvailable = true;

    const first = await supabase
      .from('montree_schools')
      .select(NEW_COLUMNS)
      .eq('id', schoolId)
      .maybeSingle();

    if (first.error) {
      if (!isUndefinedColumn(first.error)) throw first.error;
      // 🚨 Migration 349 hasn't run. Retry with the legacy column set and let
      // rule 6 decide. This is the deploy-before-migration escape hatch.
      console.warn(
        '[plans] plan columns missing (run migration 349) — falling back to legacy ai_tier derivation'
      );
      planColumnsAvailable = false;
      const retry = await supabase
        .from('montree_schools')
        .select(LEGACY_COLUMNS)
        .eq('id', schoolId)
        .maybeSingle();
      if (retry.error) throw retry.error;
      row = (retry.data as SchoolPlanRow | null) ?? null;
    } else {
      row = (first.data as SchoolPlanRow | null) ?? null;
    }

    const planColumn = planColumnsAvailable ? toPlan(row?.plan) : null;
    const planOverride = planColumnsAvailable ? toPlan(row?.plan_override) : null;

    // The legacy flags are only consulted by rule 6, so only pay for them when
    // no higher rule can already decide.
    const higherRuleDecides =
      !!row?.locked_at ||
      !!planOverride ||
      row?.founding_member === true ||
      (row?.billing_override_usd !== null &&
        row?.billing_override_usd !== undefined &&
        Number(row.billing_override_usd) === 0) ||
      !!planColumn;

    let legacySonnetFlag = false;
    let legacyHaikuFlag = false;
    if (!higherRuleDecides) {
      [legacySonnetFlag, legacyHaikuFlag] = await Promise.all([
        isFeatureEnabled(supabase, schoolId, 'ai_tier_sonnet'),
        isFeatureEnabled(supabase, schoolId, 'ai_tier_haiku'),
      ]);
    }

    return resolvePlan({
      lockedAt: row?.locked_at ?? null,
      planColumn,
      planOverride,
      planChangedAt: planColumnsAvailable ? row?.plan_changed_at ?? null : null,
      foundingMember: row?.founding_member ?? null,
      billingOverrideUsd: row?.billing_override_usd ?? null,
      subscriptionStatus: row?.subscription_status ?? null,
      legacySonnetFlag,
      legacyHaikuFlag,
    });
  } catch (err) {
    // Never throw at a gate. Basic = product works, no AI spend.
    console.error('[plans] loadResolvedPlan failed for', schoolId, err);
    return shape('basic', 'default', false, null);
  }
}
