// lib/montree/plans/apply-plan.ts
//
// THE single grant mechanic for a school's plan. Every path that changes what
// a school is entitled to — Stripe webhook, super-admin, founding/partner
// redemption — goes through here, so the two historically-divergent copies
// (billing.ts::setSchoolAiTier and billing/apply-ai-tier.ts::applyAiTier) can
// never drift again: both are now thin wrappers over applyPlan.
//
// What one call writes:
//   1. montree_schools.plan / plan_source / plan_changed_at
//      (plus plan_override when source === 'override')
//   2. monthly_ai_budget_usd + ai_budget_action from PLAN_ECONOMICS
//   3. legacy ai_tier_haiku / ai_tier_sonnet flags, kept in sync so ANY
//      un-migrated reader still behaves (basic→both off, lite→haiku only,
//      full→both ON — sonnet is a strict superset, matching the old grant)
//   4. cache invalidation: budget, feature flags, capability overrides
//
// 🚨 plan_changed_at is stamped on EVERY plan write. It is the grandfather
// line for the Basic photo cap: only montree_media created at/after it counts
// toward the 500. A school that drops to Basic keeps its existing library.
//
// 🚨 BEST-EFFORT BY DESIGN. This runs inside the hot Stripe webhook path.
// A failure is logged and reported in the result; it never throws.

import type { Plan, PlanSource } from './types';
import { PLAN_ECONOMICS } from './types';
import { invalidatePlanCache } from './capabilities';
import { clearBudgetCache } from '@/lib/montree/api-usage';
import { invalidateFeatureCache } from '@/lib/montree/features/server';

export interface ApplyPlanOptions {
  /**
   * Write montree_schools.plan_override too. Only the super-admin path sets
   * this — it is what makes an override beat Stripe on the next webhook.
   * Pass null to CLEAR an existing override (the "Clear override" ✕).
   */
  overrideColumn?: Plan | null;
  /**
   * Un-archive the school's photos because the new plan has no cap.
   * Defaults to true when the target plan's photoCap is null.
   */
  unarchivePhotos?: boolean;
}

export interface ApplyPlanResult {
  ok: boolean;
  plan: Plan;
  error?: string;
  /** True when the plan columns are missing (migration 349 not run yet). */
  migrationPending?: boolean;
}

function isUndefinedColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === '42703') return true;
  return (e.message || '').toLowerCase().includes('does not exist');
}

export async function applyPlan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client, matches the rest of the billing stack
  supabase: any,
  schoolId: string,
  plan: Plan,
  source: PlanSource,
  enabledBy: string = 'system',
  options: ApplyPlanOptions = {}
): Promise<ApplyPlanResult> {
  const econ = PLAN_ECONOMICS[plan];
  const nowIso = new Date().toISOString();
  let migrationPending = false;
  let firstError: string | undefined;

  // ── 1 + 2: plan columns and budget, in ONE update. ─────────────────────
  const planPatch: Record<string, unknown> = {
    plan,
    plan_source: source,
    plan_changed_at: nowIso,
    monthly_ai_budget_usd: econ.aiBudgetUsd,
    ai_budget_action: econ.aiBudgetAction,
  };
  if (Object.prototype.hasOwnProperty.call(options, 'overrideColumn')) {
    planPatch.plan_override = options.overrideColumn ?? null;
  }

  const { error: planErr } = await supabase
    .from('montree_schools')
    .update(planPatch)
    .eq('id', schoolId);

  if (planErr) {
    if (isUndefinedColumn(planErr)) {
      // Migration 349 hasn't run. Still write the budget fields (they predate
      // this migration) so the school's spend cap is correct, and lean on the
      // legacy flags below for the entitlement. resolvePlan's 42703 fallback
      // will read those flags until the migration lands.
      migrationPending = true;
      console.warn(
        '[applyPlan] plan columns missing (run migration 349) — writing budget + legacy flags only'
      );
      const { error: budgetOnlyErr } = await supabase
        .from('montree_schools')
        .update({ monthly_ai_budget_usd: econ.aiBudgetUsd, ai_budget_action: econ.aiBudgetAction })
        .eq('id', schoolId);
      if (budgetOnlyErr) {
        firstError = budgetOnlyErr.message;
        console.error('[applyPlan] budget write failed for', schoolId, budgetOnlyErr.message);
      }
    } else {
      firstError = planErr.message;
      console.error('[applyPlan] plan write failed for', schoolId, planErr.message);
    }
  }

  // ── 3: legacy ai_tier_* flags, kept in lockstep. ──────────────────────
  // basic → both OFF · lite → haiku ON only · full → BOTH ON (sonnet is a
  // strict superset; any independent 'requires haiku' gate still passes).
  const haikuEnabled = plan === 'lite' || plan === 'full';
  const sonnetEnabled = plan === 'full';
  for (const [key, enabled] of [
    ['ai_tier_haiku', haikuEnabled],
    ['ai_tier_sonnet', sonnetEnabled],
  ] as const) {
    const { error: flagErr } = await supabase
      .from('montree_school_features')
      .upsert(
        { school_id: schoolId, feature_key: key, enabled, enabled_by: enabledBy },
        { onConflict: 'school_id,feature_key' }
      );
    if (flagErr) {
      // Best-effort — never throw inside a webhook handler. The flags are the
      // pre-349 entitlement signal, so a failure here matters most when the
      // migration hasn't run; it is reported, not raised.
      firstError = firstError || `Failed to set feature flag ${key}`;
      console.error(`[applyPlan] failed to set ${key} for ${schoolId}:`, flagErr.message);
    }
  }

  // ── Photo cap release: an uncapped plan brings every archived photo back. ──
  const shouldUnarchive = options.unarchivePhotos ?? econ.photoCap === null;
  if (shouldUnarchive) {
    const { error: unarchiveErr } = await supabase
      .from('montree_media')
      .update({ archived_at: null })
      .eq('school_id', schoolId)
      .not('archived_at', 'is', null);
    if (unarchiveErr && !isUndefinedColumn(unarchiveErr)) {
      console.error('[applyPlan] un-archive failed for', schoolId, unarchiveErr.message);
    }
    if (!migrationPending) {
      const { error: capErr } = await supabase
        .from('montree_schools')
        .update({ photo_cap_reached_at: null })
        .eq('id', schoolId);
      if (capErr) console.error('[applyPlan] clear photo_cap_reached_at:', capErr.message);
    }
  }

  // ── 4: caches. ────────────────────────────────────────────────────────
  clearBudgetCache(schoolId);
  invalidateFeatureCache(schoolId);
  invalidatePlanCache(schoolId);

  console.log(
    `[applyPlan] school ${schoolId} → plan=${plan} source=${source} via ${enabledBy}` +
      (migrationPending ? ' (migration 349 pending)' : '')
  );

  return { ok: !firstError, plan, error: firstError, ...(migrationPending ? { migrationPending } : {}) };
}
