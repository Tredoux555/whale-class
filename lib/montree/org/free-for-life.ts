// lib/montree/org/free-for-life.ts
//
// THE single definition of "a school inside an organisation is free for life".
//
// Two doors create an organisation school and both must produce byte-identical billing:
//   • /api/montree/org/register-school — a principal redeeming their director's invite link.
//   • /api/montree/super-admin/organizations POST { action: 'create_school' } — the founder
//     creating the school and its principal outright, then handing over the code.
// Extracted for the same reason lib/montree/billing/apply-ai-tier.ts was: two copies of a
// grant drift, and the drift only shows up as a partner school getting billed.
//
// WHY free for life at all: every organisation on Montree today is a non-profit validation
// partner the founder onboarded by hand. They never pay. Putting them on a trial clock would
// mean a 402 in the middle of a school term and an "upgrade" banner in front of a director
// who was invited personally — the exact opposite of the relationship.
//
// The grant has two halves and they are NOT interchangeable:
//   1. The school row (below) — status, no trial, $0 override, a readable note. This is what
//      the billing surfaces and TrialExpiringBanner read.
//   2. The AI tier flags — applyAiTier(…, 'sonnet'). This is what resolveReportModel() reads;
//      deriveTier checks ai_tier_sonnet BEFORE it ever looks at subscription state, so the
//      flags are what actually keep the AI on. A school with half the grant looks paid-for
//      and behaves free, or vice versa.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { applyAiTier } from '@/lib/montree/billing/apply-ai-tier';
import { invalidateFeatureCache } from '@/lib/montree/features/server';

/**
 * The billing columns every organisation school carries, spread straight into the
 * montree_schools insert (or update, for the migration-322 backfill's runtime twin).
 *
 * 'active' rather than 'trialing' on purpose: TrialExpiringBanner and the trial-expiry
 * sweeps only look at 'trialing' schools, so 'active' + trial_ends_at NULL is what makes an
 * organisation school invisible to every countdown in the product.
 */
export const ORG_SCHOOL_GRANT = {
  subscription_status: 'active',
  trial_ends_at: null,
  billing_override_usd: 0,
  billing_override_note: 'Organization school — free for life',
} as const;

/**
 * Apply the second half of the grant: permanent Premium (Sonnet) via the shared feature-flag
 * mechanic.
 *
 * 🚨 NEVER fatal. A school with the billing half but not the flags is a school whose AI is
 * off — annoying, fixable from the super-admin schools PATCH in one click. A signup that 500s
 * because a feature-flag upsert failed is a principal who cannot get into the product at all.
 * Log loudly, return the outcome, let the caller decide (both callers carry on).
 */
export async function applyOrgSchoolGrant(
  supabase: SupabaseClient,
  schoolId: string,
  enabledBy: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await applyAiTier(supabase, schoolId, 'sonnet', enabledBy);
    if (!result.ok) {
      console.error('[montree-org] free-for-life AI grant FAILED (non-fatal) for school', schoolId, ':', result.error);
    }
    // isFeatureEnabled caches (schoolId, featureKey) for 30s per process, and applyAiTier only
    // clears the BUDGET cache. For a brand-new school there is nothing cached yet, so this is
    // usually a no-op — but it costs nothing and it is what makes the grant instant on the one
    // path that matters: a school whose flags were read (and cached false) moments earlier,
    // e.g. a re-run of create_school after a partial failure, or a manual re-grant.
    invalidateFeatureCache(schoolId);
    return result;
  } catch (err) {
    // applyAiTier itself does not throw today, but a missing montree_school_features table on
    // a half-migrated database would surface here rather than as a returned error.
    console.error('[montree-org] free-for-life AI grant THREW (non-fatal) for school', schoolId, ':', err);
    return { ok: false, error: err instanceof Error ? err.message : 'AI tier grant failed' };
  }
}
