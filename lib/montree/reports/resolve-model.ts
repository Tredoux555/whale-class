// lib/montree/reports/resolve-model.ts
//
// 🚨 COMPATIBILITY LAYER (Sep 7 2026, 3-tier pricing restructure).
//
// This file used to BE the tier resolver. It is now a thin wrapper over
// lib/montree/plans — the single source of truth — so that the ~90 existing
// call sites keep compiling and behaving while WP-B repoints them onto
// capabilities one area at a time.
//
//   plan 'basic' → tier 'free'   → model null    (no AI; 402 or template)
//   plan 'lite'  → tier 'haiku'  → HAIKU_MODEL
//   plan 'full'  → tier 'sonnet' → AI_MODEL
//
// New code should call loadResolvedPlan() / hasCapability() directly. This
// module exists so nothing had to change on the day the plans landed.
//
// Deploy safety: loadResolvedPlan catches Postgres 42703 and falls back to the
// legacy ai_tier_* derivation, so this file is safe to ship BEFORE migration
// 349 runs (unlike the Jul-6 version, which fail-closed every school to free).

import { HAIKU_MODEL, AI_MODEL } from '@/lib/ai/anthropic';
import type { Plan, PlanInputs } from '@/lib/montree/plans/types';
import { resolvePlan, loadResolvedPlan } from '@/lib/montree/plans/resolve-plan';

export type ReportTier = 'free' | 'haiku' | 'sonnet';

export interface ResolvedReportModel {
  tier: ReportTier;
  /** Anthropic model string, or null if tier === 'free' (callers must skip AI / 402) */
  model: string | null;
}

/** The legacy tier vocabulary, mapped from the plan vocabulary. */
export const PLAN_TO_TIER: Record<Plan, ReportTier> = {
  basic: 'free',
  lite: 'haiku',
  full: 'sonnet',
};

/** The inverse — used by the applyAiTier / setSchoolAiTier wrappers. */
export const TIER_TO_PLAN: Record<ReportTier, Plan> = {
  free: 'basic',
  haiku: 'lite',
  sonnet: 'full',
};

/**
 * Inputs to the deprecated deriveTier(). The four plan-era fields are optional
 * so existing callers compile unchanged; pass them when you have them.
 */
export interface TierInputs {
  lockedAt?: string | null;
  sonnetFlag: boolean;
  haikuFlag: boolean;
  subscriptionStatus?: string | null;
  /** @deprecated Trials retired Sep 7 2026 — read but no longer decides tier. */
  trialEndsAt?: string | null;
  plan?: Plan | null;
  planOverride?: Plan | null;
  foundingMember?: boolean | null;
  billingOverrideUsd?: number | string | null;
}

/**
 * @deprecated Use `resolvePlan` from '@/lib/montree/plans'. Kept so the
 * super-admin schools list and Mira's school_health tool keep compiling.
 *
 * NOTE the deliberate behaviour change: the old trialing three-way is GONE.
 * Trials were retired with the 3-tier restructure (the columns stay, they are
 * simply never read for entitlement), so `subscription_status === 'trialing'`
 * no longer grants Sonnet. An active subscription still floors at haiku/lite.
 */
export function deriveTier(input: TierInputs): ReportTier {
  const mapped: PlanInputs = {
    lockedAt: input.lockedAt ?? null,
    planColumn: input.plan ?? null,
    planOverride: input.planOverride ?? null,
    foundingMember: input.foundingMember ?? null,
    billingOverrideUsd: input.billingOverrideUsd ?? null,
    subscriptionStatus: input.subscriptionStatus ?? null,
    legacySonnetFlag: input.sonnetFlag,
    legacyHaikuFlag: input.haikuFlag,
  };
  return PLAN_TO_TIER[resolvePlan(mapped).plan];
}

function tierToModel(tier: ReportTier): string | null {
  if (tier === 'sonnet') return AI_MODEL;
  if (tier === 'haiku') return HAIKU_MODEL;
  return null;
}

/**
 * Resolve which Anthropic model (if any) this school's AI surfaces may use.
 * Thin wrapper over loadResolvedPlan — see the file header.
 */
export async function resolveReportModel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared helper takes the untyped service-role client
  supabase: any,
  schoolId: string
): Promise<ResolvedReportModel> {
  const resolved = await loadResolvedPlan(supabase, schoolId);
  const tier = PLAN_TO_TIER[resolved.plan];
  return { tier, model: tierToModel(tier) };
}
