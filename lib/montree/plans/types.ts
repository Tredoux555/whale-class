// lib/montree/plans/types.ts
//
// 3-TIER PRICING (Sep 7 2026) — the shared vocabulary.
// Plan: docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md
//
//   basic — $12/year/school    · no AI      · 500 photos (grandfathered)
//   lite  — $20/month/school   · Haiku      · unlimited photos, manual tagging
//   full  — $3/active child/mo · Sonnet     · everything (min $30/mo = 10 children)
//
// This file is types + constants ONLY — no I/O, no imports from the rest of
// the app. Every other plans/* module and WP-B/WP-C import from here.

/** The three plans. Stored verbatim in montree_schools.plan / .plan_override. */
export type Plan = 'basic' | 'lite' | 'full';

/** Which Anthropic model family a plan may spend on. 'none' = no AI calls. */
export type PlanModel = 'none' | 'haiku' | 'sonnet';

/** Why a school ended up on the plan it has. Surfaced in super-admin. */
export type PlanSource =
  | 'locked'
  | 'override'
  | 'founding'
  | 'partner'
  | 'stripe'
  | 'legacy'
  | 'default';

/** Entitlements gated by plan. WP-B gates routes on these, never on raw flags. */
export type Capability =
  | 'guru'
  | 'astra'
  | 'aiReports'
  | 'photoRecognition'
  | 'montages'
  | 'parentMessaging'
  | 'appointments'
  | 'videoCalls'
  | 'orgOnboarding'
  | 'cmsBridge';

export const ALL_CAPABILITIES: readonly Capability[] = [
  'guru',
  'astra',
  'aiReports',
  'photoRecognition',
  'montages',
  'parentMessaging',
  'appointments',
  'videoCalls',
  'orgOnboarding',
  'cmsBridge',
] as const;

export const ALL_PLANS: readonly Plan[] = ['basic', 'lite', 'full'] as const;

/** Narrow an untrusted string (request body, DB column) to a Plan, or null. */
export function toPlan(value: unknown): Plan | null {
  return value === 'basic' || value === 'lite' || value === 'full' ? value : null;
}

/** Inputs to the pure resolver. Every field optional — callers pass what they have. */
export interface PlanInputs {
  /** montree_schools.locked_at — abuse lock. Beats everything. */
  lockedAt?: string | null;
  /** montree_schools.plan — written by Stripe/applyPlan. undefined = column missing. */
  planColumn?: Plan | null;
  /** montree_schools.plan_override — super-admin force. Beats Stripe AND founding. */
  planOverride?: Plan | null;
  /** montree_schools.founding_member — Founding 100 → Full for life. */
  foundingMember?: boolean | null;
  /** montree_schools.billing_override_usd — 0 = partner free-for-life → Full. */
  billingOverrideUsd?: number | string | null;
  /** montree_schools.subscription_status — legacy fallback only. */
  subscriptionStatus?: string | null;
  /** ai_tier_sonnet feature flag — legacy fallback only. */
  legacySonnetFlag?: boolean;
  /** ai_tier_haiku feature flag — legacy fallback only. */
  legacyHaikuFlag?: boolean;
  /** montree_schools.plan_changed_at — grandfather line for the photo cap. */
  planChangedAt?: string | null;
}

export interface ResolvedPlan {
  plan: Plan;
  model: PlanModel;
  source: PlanSource;
  /** True when the school is abuse-locked (locked_at set). */
  locked: boolean;
  /** monthly_ai_budget_usd this plan implies. */
  aiBudgetUsd: number;
  /** Max photos, or null for unlimited. */
  photoCap: number | null;
  /**
   * montree_schools.plan_changed_at — the grandfather line. The photo cap
   * counts only montree_media rows created at/after this instant. null when
   * unknown (pre-migration) → callers count the whole library.
   */
  planChangedAt: string | null;
}

// ── Pricing constants (single source of truth for copy + Stripe quantity) ──

/** Basic: one annual charge per school. */
export const BASIC_PRICE_USD_PER_YEAR = 12;
/** Lite: flat monthly per school. */
export const LITE_PRICE_USD_PER_MONTH = 20;
/** Full: per ACTIVE child per month. */
export const FULL_PRICE_USD_PER_CHILD_MONTH = 3;
/**
 * Full has a $30/month floor. Stripe has no native minimum-charge on a
 * per-seat price, so the floor is expressed as a quantity floor of 10 on the
 * $3 unit price — exactly $30, prorates correctly, honest on the invoice.
 * Founding schools are subject to the floor too (director decision, Sep 7).
 */
export const FULL_MIN_CHILDREN = 10;
export const FULL_MIN_USD_PER_MONTH = FULL_PRICE_USD_PER_CHILD_MONTH * FULL_MIN_CHILDREN; // 30

/** Basic photo cap (grandfathered — see ResolvedPlan.planChangedAt). */
export const BASIC_PHOTO_CAP = 500;

/**
 * Per-plan economics — the AI budget written to montree_schools and the photo
 * cap. Lives HERE (not in capabilities.ts) so resolve-plan.ts can read it
 * without importing capabilities.ts, which imports resolve-plan.ts back.
 * PLAN_CAPABILITIES spreads these in, so there is still exactly one source.
 */
export const PLAN_ECONOMICS: Record<
  Plan,
  { aiBudgetUsd: number; aiBudgetAction: 'hard_limit' | 'soft_limit' | 'warn'; photoCap: number | null }
> = {
  basic: { aiBudgetUsd: 0, aiBudgetAction: 'hard_limit', photoCap: BASIC_PHOTO_CAP },
  // Lite's $8 allowance is a HARD limit — it is the product promise ("a
  // monthly AI allowance is included"), not a warning threshold.
  lite: { aiBudgetUsd: 8, aiBudgetAction: 'hard_limit', photoCap: null },
  full: { aiBudgetUsd: 9999, aiBudgetAction: 'warn', photoCap: null },
};

/**
 * Stripe subscription quantity for a Full school. THE floor lives here —
 * checkout, change-plan and sync-quantity all call this so they can never
 * drift and silently drop a school below $30.
 */
export function fullPlanQuantity(activeChildren: number): number {
  const n = Number.isFinite(activeChildren) ? Math.floor(activeChildren) : 0;
  return Math.max(FULL_MIN_CHILDREN, Math.max(0, n));
}
