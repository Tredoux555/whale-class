// lib/montree/billing/apply-ai-tier.ts
//
// THE single grant mechanic for a school's AI tier: the two feature flags
// (ai_tier_haiku / ai_tier_sonnet) + the monthly AI budget fields. Extracted
// so the super-admin schools PATCH (`ai_tier` change) AND the Partner Program
// free-for-life redemption apply the EXACT same grant and can never drift.
//
// Tier → flags + budget (mirrors resolveReportModel precedence: sonnet wins):
//   free   → both flags OFF · $0 / hard_limit    (no AI; template fallback)
//   haiku  → ai_tier_haiku ON only · $50 / soft_limit
//   sonnet → BOTH flags ON · $9999 / warn        (Premium; sonnet is a strict
//            superset so any independent 'requires-haiku' gate still passes)
//
// NOTE: lib/montree/billing.ts::setSchoolAiTier is a parallel copy used by the
// Stripe webhook path (tier vocabulary 'free'|'haiku'|'premium'). It uses the
// identical net mapping; it is deliberately NOT refactored here to avoid
// touching the hot webhook handler. This function is the canonical grant for
// the super-admin + redemption paths.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { clearBudgetCache } from '@/lib/montree/api-usage';

export type AiTier = 'free' | 'haiku' | 'sonnet';

export interface ApplyAiTierResult {
  ok: boolean;
  error?: string;
}

export async function applyAiTier(
  supabase: SupabaseClient,
  schoolId: string,
  tier: AiTier,
  enabledBy: string = 'super_admin_tier_change'
): Promise<ApplyAiTierResult> {
  const haikuEnabled = tier === 'haiku' || tier === 'sonnet';
  const sonnetEnabled = tier === 'sonnet';

  // Upsert both feature flags. A flag failure is fatal — the flags ARE the tier
  // signal resolveReportModel reads; a partial write must surface, not silently
  // half-grant.
  for (const [key, enabled] of [['ai_tier_haiku', haikuEnabled], ['ai_tier_sonnet', sonnetEnabled]] as const) {
    const { error: flagErr } = await supabase
      .from('montree_school_features')
      .upsert(
        { school_id: schoolId, feature_key: key, enabled, enabled_by: enabledBy },
        { onConflict: 'school_id,feature_key' }
      );
    if (flagErr) {
      console.error(`[applyAiTier] failed to set ${key} for ${schoolId}:`, flagErr.message);
      return { ok: false, error: `Failed to set feature flag ${key}` };
    }
  }

  // Budget: free=$0/hard_limit, haiku=$50/soft_limit, sonnet=$9999/warn.
  const budget = tier === 'free' ? 0 : tier === 'haiku' ? 50 : 9999;
  const action = tier === 'free' ? 'hard_limit' : tier === 'haiku' ? 'soft_limit' : 'warn';
  const { error: budgetErr } = await supabase
    .from('montree_schools')
    .update({ monthly_ai_budget_usd: budget, ai_budget_action: action })
    .eq('id', schoolId);
  if (budgetErr) {
    // Non-fatal (matches the pre-refactor super-admin behaviour): flags are the
    // tier signal; a budget-field write failure is logged, not surfaced.
    console.error(`[applyAiTier] failed to set budget for ${schoolId}:`, budgetErr.message);
  }

  clearBudgetCache(schoolId);
  return { ok: true };
}
