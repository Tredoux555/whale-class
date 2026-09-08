// lib/montree/billing/apply-ai-tier.ts
//
// 🚨 COMPATIBILITY WRAPPER (Sep 7 2026, 3-tier pricing restructure).
//
// This used to be one of TWO divergent grant mechanics (the other being
// billing.ts::setSchoolAiTier). Both are now thin wrappers over
// lib/montree/plans/apply-plan::applyPlan, so the super-admin path, the
// founding/partner redemption path and the Stripe webhook path finally share
// ONE implementation and can never drift again.
//
// Tier → plan:  free → basic · haiku → lite · sonnet → full
//
// Existing callers (super-admin schools PATCH, try/instant founding+partner
// redemption, super-admin founding direct grant, org free-for-life) compile
// and behave unchanged. New code should call applyPlan directly.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { applyPlan } from '@/lib/montree/plans/apply-plan';
import { TIER_TO_PLAN } from '@/lib/montree/reports/resolve-model';
import type { PlanSource } from '@/lib/montree/plans/types';

export type AiTier = 'free' | 'haiku' | 'sonnet';

export interface ApplyAiTierResult {
  ok: boolean;
  error?: string;
}

/**
 * Infer the plan_source from the caller's `enabledBy` label so a founding /
 * partner grant is recorded as such (and therefore survives a later Stripe
 * webhook, which must never overwrite founding/override). Anything we don't
 * recognise is an operator action → 'override'.
 */
function sourceFor(enabledBy: string): PlanSource {
  const s = enabledBy.toLowerCase();
  if (s.includes('partner')) return 'partner';
  if (s.includes('founding')) return 'founding';
  if (s.includes('stripe') || s.includes('webhook')) return 'stripe';
  return 'override';
}

export async function applyAiTier(
  supabase: SupabaseClient,
  schoolId: string,
  tier: AiTier,
  enabledBy: string = 'super_admin_tier_change'
): Promise<ApplyAiTierResult> {
  const plan = TIER_TO_PLAN[tier];
  const source = sourceFor(enabledBy);
  // Deliberately does NOT write plan_override: this wrapper's historical
  // callers (founding/partner grants, org free-for-life) are entitlement
  // grants, not super-admin force-overrides. The super-admin plan picker
  // calls applyPlan directly with { overrideColumn }.
  const result = await applyPlan(supabase, schoolId, plan, source, enabledBy);
  return { ok: result.ok, ...(result.error ? { error: result.error } : {}) };
}
