// lib/story/coach/entitlement.ts
//
// Lyf Coach billing entitlement + cloud-prompt meter — Phase A foundation.
// READ-ONLY here: nothing in this file gates the coach yet. Phase D wires the
// Sonnet→Haiku model selection on top of these reads.
//
// Identity model (see docs/handoffs/LYF_COACH_PAYMENTS_PLAN.md):
//   • The individual coach user = ONE row in story_admin_users, keyed by `space`.
//   • Billing/entitlement columns live on that row (migration 269).
//   • Owner space ('tredoux') is comped — always entitled, never billed/metered.
//   • The product NEVER hard-stops: entitlement selects MODEL DEPTH, not access.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { OWNER_SPACE } from '@/lib/story-db';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Free / post-trial monthly Sonnet allowance before the silent Haiku fallback. */
export const COACH_SONNET_CAP_FREE = 200;

/** Paid ($14.99/mo) monthly Sonnet allowance before the silent Haiku fallback. */
export const COACH_SONNET_CAP_PAID = 500;

/**
 * Show the "near your cloud limit" copy this many Sonnet turns BEFORE the cap.
 * Cap-relative so it fires correctly for both tiers (free 200 → warn at 180;
 * paid 500 → warn at 480), matching the spec's "~180" intent on the free tier.
 */
export const COACH_SONNET_WARN_MARGIN = 20;

/**
 * Anti-abuse overshoot ceiling. The model is pinned per conversation, so a
 * conversation that started on Sonnet stays on Sonnet even past the cap — but
 * only up to `cap + COACH_SONNET_OVERSHOOT`. Beyond that a still-open thread is
 * hard-dropped to the quieter model mid-conversation, so one never-closed
 * conversation can't farm unlimited Sonnet. Overshoot cost is accepted; tone
 * consistency within a sitting is the priority.
 */
export const COACH_SONNET_OVERSHOOT = 100;

/** The applicable monthly Sonnet cap for an entitlement (paid vs free). */
export function sonnetCapFor(entitlement: { entitled: boolean }): number {
  return entitlement.entitled ? COACH_SONNET_CAP_PAID : COACH_SONNET_CAP_FREE;
}

// Statuses that grant the full (paid/trial) experience. past_due kept in grace
// per the brand's gentle posture — a failed card never locks someone out
// mid-relationship; the real lever is Sonnet-vs-Haiku, not access-vs-none.
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

/** PostgREST "column / relation does not exist" — migration 269 not run yet. */
function isMissingSchema(err: { code?: string } | null | undefined): boolean {
  return err?.code === '42703' || err?.code === '42P01';
}

/** Current billing period as 'YYYY-MM' (UTC). */
export function currentPeriodMonth(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ── Entitlement ────────────────────────────────────────────────────────────────

export interface CoachEntitlement {
  /** True if on full-depth experience (trial / active / grace). Owner always true. */
  entitled: boolean;
  /** 'sealed_individual' | 'family' | null */
  plan: string | null;
  /** Stripe-ish status string, or 'comped' for the owner. */
  status: string | null;
  /** ISO period end, or null. */
  periodEnd: string | null;
  /** Owner / comped space — never billed, never metered. */
  isComped: boolean;
}

const COMPED: CoachEntitlement = {
  entitled: true,
  plan: 'sealed_individual',
  status: 'comped',
  periodEnd: null,
  isComped: true,
};

/**
 * Entitlement for a space. Tolerant: owner is comped without touching billing
 * columns; if migration 269 hasn't run (columns absent) or the row is missing,
 * a non-owner resolves to free (entitled:false) — never throws.
 *
 * NOTE: this does NOT block coach access. The coach is always available; this
 * read only informs which model depth (Sonnet vs Haiku) the caller gets.
 */
export async function getEntitlement(
  supabase: SupabaseClient,
  space: string,
): Promise<CoachEntitlement> {
  // Owner (and future linked family members under a captain's family plan) are
  // comped. Short-circuit BEFORE reading billing columns so it works pre-migration.
  if (space === OWNER_SPACE) return { ...COMPED };
  // TODO(Family): when the Family plan ships, also comp spaces linked as a
  // child/partner under a captain whose plan='family' (story_coach_context_links).

  const { data, error } = await supabase
    .from('story_admin_users')
    .select('plan, subscription_status, current_period_end')
    .eq('space', space)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!isMissingSchema(error)) console.warn('[coach/entitlement] lookup error:', error.message);
    return { entitled: false, plan: null, status: null, periodEnd: null, isComped: false };
  }

  const plan = (data?.plan as string | null) ?? null;
  const status = (data?.subscription_status as string | null) ?? null;
  const periodEnd = (data?.current_period_end as string | null) ?? null;

  // Entitled if status grants it AND (no period end OR it's still in the future).
  const periodOk = !periodEnd || Date.parse(periodEnd) > Date.now();
  const entitled = !!status && ENTITLED_STATUSES.has(status) && periodOk;

  return { entitled, plan, status, periodEnd, isComped: false };
}

// ── Cloud-prompt meter (per space, per month) ──────────────────────────────────

/** Sonnet turns served this cycle for a space. 0 if none / pre-migration. */
export async function getMonthlySonnetCount(
  supabase: SupabaseClient,
  space: string,
  periodMonth: string = currentPeriodMonth(),
): Promise<number> {
  const { data, error } = await supabase
    .from('story_coach_usage')
    .select('sonnet_count')
    .eq('space', space)
    .eq('period_month', periodMonth)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (!isMissingSchema(error)) console.warn('[coach/entitlement] usage read error:', error.message);
    return 0;
  }
  return Number(data?.sonnet_count) || 0;
}

/**
 * Increment the Sonnet meter for a space by one. Best-effort, never throws.
 * Read-then-write is safe here because coach turns are sequential per user
 * (one SSE stream at a time). No-op on the comped owner is the caller's job.
 * Returns the new count (or the pre-increment count on failure).
 */
export async function incrementSonnetCount(
  supabase: SupabaseClient,
  space: string,
  periodMonth: string = currentPeriodMonth(),
): Promise<number> {
  const current = await getMonthlySonnetCount(supabase, space, periodMonth);
  const next = current + 1;
  const { error } = await supabase
    .from('story_coach_usage')
    .upsert(
      { space, period_month: periodMonth, sonnet_count: next, updated_at: new Date().toISOString() },
      { onConflict: 'space,period_month' },
    );
  if (error) {
    if (!isMissingSchema(error)) console.warn('[coach/entitlement] usage write error:', error.message);
    return current;
  }
  return next;
}
