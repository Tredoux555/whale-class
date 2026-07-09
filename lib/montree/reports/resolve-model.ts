// lib/montree/reports/resolve-model.ts
// Three-tier AI model resolver for weekly reports + every school-scoped AI
// surface (Guru, Astra, photo Sonnet fallback).
//
// Tiers:
//   free    — no AI calls, callers must use template fallback OR 402 (model: null)
//   haiku   — claude-haiku-4-5 (Starter $3 / active-safety-floor / trial-NULL floor)
//   sonnet  — claude-sonnet-4-6 (Premium $7 / Premium trial with an unexpired trial_ends_at)
//
// 🚨 LAUNCH PRICING (Jul 6 2026) — resolution order (highest wins):
//   1. locked_at set → { tier:'free', model:null }
//      Abuse-locked schools resolve free so NO AI spend can occur for them.
//   2. ai_tier_sonnet feature flag on school → sonnet
//   3. ai_tier_haiku feature flag on school → haiku
//   4. subscription_status === 'trialing' (THREE-WAY, per plan amendment A1):
//        - trial_ends_at in the FUTURE → sonnet  (the Premium trial — this is
//          how a trial school "tastes Premium" before it must choose a plan)
//        - trial_ends_at in the PAST   → free    (trial over → every AI route
//          402s with the UpgradeCard UX; THIS IS the decision moment)
//        - trial_ends_at NULL          → haiku   (legacy floor — never brick a
//          legit school, never grant free-Sonnet-forever. A1: any signup path
//          that sets 'trialing' without trial_ends_at is a bug and is fixed at
//          the source; this NULL branch is the safety net for pre-fix rows.)
//   5. subscription_status === 'active' → haiku floor (safety net; the Stripe
//      webhook normally sets explicit ai_tier_* flags on the school, but if a
//      race left an active school flagless, Haiku keeps AI working rather than
//      402-ing a paying customer).
//   6. else → free.
//
// Fail-closed: any error returns 'free' tier.
//
// 🚨 DEPLOY-ORDER HAZARD: this resolver now SELECTs `locked_at` +
// `trial_ends_at`. Migration 286 (which adds `locked_at`) MUST be run in
// Supabase BEFORE the git push, or the SELECT throws 42703 → the fail-closed
// catch returns 'free' → EVERY school 402s. `trial_ends_at` already exists.

import { HAIKU_MODEL, AI_MODEL } from '@/lib/ai/anthropic';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export type ReportTier = 'free' | 'haiku' | 'sonnet';

export interface ResolvedReportModel {
  tier: ReportTier;
  /** Anthropic model string, or null if tier === 'free' (callers must skip AI / 402) */
  model: string | null;
}

export interface TierInputs {
  lockedAt?: string | null;
  sonnetFlag: boolean;
  haikuFlag: boolean;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
}

/**
 * 🚨 THE SINGLE SOURCE OF TRUTH for the free/haiku/sonnet precedence.
 *
 * Jul 9 2026: extracted out of resolveReportModel so every display/reporting
 * surface (super-admin schools list, Mira's school_health tool, anywhere else
 * that needs "what tier is this school really on") can derive the SAME answer
 * from data it already has in hand, instead of re-implementing (and drifting
 * from) the precedence by hand. Two call sites (app/api/montree/super-admin/
 * schools/route.ts, lib/montree/mira/tool-executor.ts) were independently
 * reading the raw ai_tier_* flags and skipping the trialing/trial_ends_at
 * branch entirely — so a school on an active Sonnet trial with no explicit
 * flag written yet showed up as "free" in those two places even though every
 * real AI-serving route (via resolveReportModel) correctly served it Sonnet.
 * Pure + synchronous by design: no DB access, so it can't drift from its
 * inputs and callers control their own query shape/cost.
 */
export function deriveTier(input: TierInputs): ReportTier {
  // 1. Locked schools resolve free — no AI spend possible while locked.
  if (input.lockedAt) {
    return 'free';
  }

  // 2. Sonnet wins if enabled.
  if (input.sonnetFlag) {
    return 'sonnet';
  }

  // 3. Haiku flag.
  if (input.haikuFlag) {
    return 'haiku';
  }

  // 4. Trialing — three-way on trial_ends_at (plan amendment A1).
  if (input.subscriptionStatus === 'trialing') {
    if (input.trialEndsAt) {
      const trialEndMs = new Date(input.trialEndsAt).getTime();
      if (!Number.isNaN(trialEndMs) && trialEndMs > Date.now()) {
        // Premium trial still running → Sonnet ("taste Premium").
        return 'sonnet';
      }
      // Trial ended (or an unparseable date treated as ended) → free.
      // This is the decision moment: every AI route 402s with the
      // UpgradeCard, prompting the school to pick Starter or Premium.
      return 'free';
    }
    // trialing with NO trial_ends_at → legacy floor. Never free-Sonnet-
    // forever, never brick a legit school. The signup paths are patched
    // (A1) to always write trial_ends_at; this catches pre-fix rows.
    return 'haiku';
  }

  // 5. Active safety floor — a paying school with no explicit flag still
  // gets Haiku rather than a 402 (webhook normally sets flags; this covers
  // the race window).
  if (input.subscriptionStatus === 'active') {
    return 'haiku';
  }

  return 'free';
}

function tierToModel(tier: ReportTier): string | null {
  if (tier === 'sonnet') return AI_MODEL;
  if (tier === 'haiku') return HAIKU_MODEL;
  return null;
}

/**
 * Resolve which Anthropic model (if any) to use for this school's AI surfaces.
 * Sonnet takes precedence over Haiku if both flags are somehow enabled.
 */
export async function resolveReportModel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared helper takes the untyped service-role client (matches isFeatureEnabled). Jul 6 2026 launch-pricing review: silence the pre-existing warning so the touched file passes --max-warnings=0.
  supabase: any,
  schoolId: string
): Promise<ResolvedReportModel> {
  try {
    // Widened SELECT (launch pricing) — locked_at kills AI spend for abuse-
    // locked schools; trial_ends_at drives the three-way trialing branch.
    const { data: school } = await supabase
      .from('montree_schools')
      .select('subscription_status, trial_ends_at, locked_at')
      .eq('id', schoolId)
      .maybeSingle();

    const [sonnet, haiku] = await Promise.all([
      isFeatureEnabled(supabase, schoolId, 'ai_tier_sonnet'),
      isFeatureEnabled(supabase, schoolId, 'ai_tier_haiku'),
    ]);

    const tier = deriveTier({
      lockedAt: school?.locked_at ?? null,
      sonnetFlag: sonnet,
      haikuFlag: haiku,
      subscriptionStatus: school?.subscription_status ?? null,
      trialEndsAt: school?.trial_ends_at ?? null,
    });

    return { tier, model: tierToModel(tier) };
  } catch (err) {
    console.error('[resolveReportModel] error:', err);
    return { tier: 'free', model: null };
  }
}
