// lib/montree/payouts/calculator.ts
// Phase 5 — Payout calculator.
//
// Per (agent, school, period_month), aggregates rows from
// montree_finance_transactions into a single payout row in
// montree_agent_payouts. Idempotent via UPSERT on the unique index.
//
// The math (all USD):
//   gross_revenue   = SUM(usd_amount) where type='income'        (subscription revenue)
//   stripe_fee      = SUM(usd_amount) where category='stripe_fee'
//   anthropic_cost  = SUM(usd_amount) where category='api_anthropic'
//   openai_cost     = SUM(usd_amount) where category='api_openai'
//   other_cost      = SUM(usd_amount) where type='direct_cost' AND category NOT IN (...)
//   net             = gross - (stripe_fee + anthropic + openai + other)
//   payout          = MAX(0, net * pct / 100)
//
// Critical contracts:
//   - Negative net → payout = $0. Never clawback.
//   - revenue_share_pct is locked at calc time from the redeemed referral code.
//   - Manual overrides flagged via is_manual_override — calculator NEVER touches those rows.
//   - Recalculation refreshes pending rows only; paid rows are immutable history.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CalculatorOptions {
  periodMonth: string; // 'YYYY-MM'
  schoolId?: string;   // optional: scope to a single school
  agentId?: string;    // optional: scope to a single agent
  dryRun?: boolean;    // if true, return calc rows without writing
}

export interface CalculatorResult {
  period_month: string;
  rows_calculated: number;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  payouts: PayoutCalcRow[];
  errors: Array<{ school_id: string; error: string }>;
}

export interface PayoutCalcRow {
  agent_id: string;
  agent_name: string | null;
  school_id: string;
  school_name: string | null;
  period_month: string;
  gross_revenue_usd: number;
  stripe_fee_usd: number;
  anthropic_cost_usd: number;
  openai_cost_usd: number;
  other_direct_cost_usd: number;
  net_usd: number;
  revenue_share_pct: number;
  payout_usd: number;
  source_tx_count: number;
  action: 'inserted' | 'updated' | 'skipped_paid' | 'skipped_override';
}

// Categories that map to specific cost lines. Everything else under
// direct_cost falls into "other_direct_cost_usd".
const STRIPE_FEE_CATEGORY = 'stripe_fee';
const ANTHROPIC_CATEGORY = 'api_anthropic';
const OPENAI_CATEGORY = 'api_openai';

interface FinanceTxRow {
  id: string;
  type: 'income' | 'direct_cost' | 'commission' | 'op_expense' | 'fx_adjustment';
  category: string;
  school_id: string | null;
  usd_amount: number;
}

interface RedeemedReferralCode {
  code: string;
  agent_id: string | null;
  revenue_share_pct: number | null;
  status: string;
  redeemed_by_school_id: string | null;
}

/**
 * Parse 'YYYY-MM' into a half-open date range [start, end).
 * start = first day of that month at 00:00 UTC
 * end   = first day of the NEXT month at 00:00 UTC
 */
export function monthRange(periodMonth: string): { start: string; end: string } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(periodMonth);
  if (!match) {
    throw new Error(`Invalid period_month '${periodMonth}'. Expected YYYY-MM.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]); // 1-12
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Format a Date or string into 'YYYY-MM' (UTC).
 */
export function formatPeriod(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Resolve which (agent, school) pairs to calculate. Pulls every redeemed
 * referral code, optionally scoped.
 */
async function resolveSchoolAgentPairs(
  supabase: SupabaseClient,
  opts: CalculatorOptions
): Promise<Array<RedeemedReferralCode>> {
  let q = supabase
    .from('montree_referral_codes')
    .select('code, agent_id, revenue_share_pct, status, redeemed_by_school_id')
    .eq('status', 'redeemed')
    .not('redeemed_by_school_id', 'is', null)
    .not('agent_id', 'is', null);

  if (opts.schoolId) q = q.eq('redeemed_by_school_id', opts.schoolId);
  if (opts.agentId) q = q.eq('agent_id', opts.agentId);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as RedeemedReferralCode[];
}

/**
 * Pull all finance_transactions for a specific (school, month) tuple.
 */
async function loadFinanceTx(
  supabase: SupabaseClient,
  schoolId: string,
  periodMonth: string
): Promise<FinanceTxRow[]> {
  const { start, end } = monthRange(periodMonth);
  const { data, error } = await supabase
    .from('montree_finance_transactions')
    .select('id, type, category, school_id, usd_amount')
    .eq('school_id', schoolId)
    .gte('occurred_at', start)
    .lt('occurred_at', end);
  if (error) throw error;
  return (data || []) as FinanceTxRow[];
}

/**
 * Pull existing payout row (if any) for the (agent, school, month) tuple.
 */
async function loadExistingPayout(
  supabase: SupabaseClient,
  agentId: string,
  schoolId: string,
  periodMonth: string
): Promise<{
  id: string;
  status: string;
  is_manual_override: boolean;
} | null> {
  const { data } = await supabase
    .from('montree_agent_payouts')
    .select('id, status, is_manual_override')
    .eq('agent_id', agentId)
    .eq('school_id', schoolId)
    .eq('period_month', periodMonth)
    .maybeSingle();
  return (data as { id: string; status: string; is_manual_override: boolean } | null) || null;
}

/**
 * Round a USD amount to 4 decimal places (matches column scale).
 */
function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Compute payout math for a single (school, agent, month).
 */
function computeMath(
  txs: FinanceTxRow[],
  revenueSharePct: number
): {
  gross: number;
  stripeFee: number;
  anthropic: number;
  openai: number;
  other: number;
  net: number;
  payout: number;
} {
  let gross = 0;
  let stripeFee = 0;
  let anthropic = 0;
  let openai = 0;
  let other = 0;

  for (const tx of txs) {
    const amount = Number(tx.usd_amount) || 0;
    if (tx.type === 'income') {
      // Income includes positive (subscription_revenue) and negative (refund).
      gross += amount;
    } else if (tx.type === 'direct_cost') {
      // Direct costs land here. Costs are stored as POSITIVE values in the
      // ledger (the column is just an unsigned magnitude — the type tells
      // us it's a cost). We subtract from gross in the net calc below.
      if (tx.category === STRIPE_FEE_CATEGORY) stripeFee += amount;
      else if (tx.category === ANTHROPIC_CATEGORY) anthropic += amount;
      else if (tx.category === OPENAI_CATEGORY) openai += amount;
      else other += amount;
    }
    // commission, op_expense, fx_adjustment rows do NOT factor into per-school
    // payouts. commissions are the OUTPUT, op_expenses are platform-level,
    // fx_adjustments are a different reconciliation flow.
  }

  const net = gross - stripeFee - anthropic - openai - other;
  // Negative net → $0. Never clawback.
  const payout = Math.max(0, net * (revenueSharePct / 100));

  return {
    gross: r4(gross),
    stripeFee: r4(stripeFee),
    anthropic: r4(anthropic),
    openai: r4(openai),
    other: r4(other),
    net: r4(net),
    payout: r4(payout),
  };
}

/**
 * Main entry point. Calculate payouts for a month.
 *
 *   - Scopes to opts.schoolId / opts.agentId if provided
 *   - Skips already-paid rows (immutable history)
 *   - Skips manually-overridden rows (super-admin's wishes win)
 *   - UPSERTs pending rows with the latest math
 */
export async function calculatePayouts(
  supabase: SupabaseClient,
  opts: CalculatorOptions
): Promise<CalculatorResult> {
  const result: CalculatorResult = {
    period_month: opts.periodMonth,
    rows_calculated: 0,
    rows_inserted: 0,
    rows_updated: 0,
    rows_skipped: 0,
    payouts: [],
    errors: [],
  };

  // 1. Find every (agent, school) pair to consider.
  const pairs = await resolveSchoolAgentPairs(supabase, opts);
  if (!pairs.length) return result;

  // Pull agent + school name lookups once for the result rows.
  const agentIds = Array.from(new Set(pairs.map((p) => p.agent_id).filter(Boolean) as string[]));
  const schoolIds = Array.from(
    new Set(pairs.map((p) => p.redeemed_by_school_id).filter(Boolean) as string[])
  );
  const [agentsRes, schoolsRes] = await Promise.all([
    agentIds.length
      ? supabase.from('montree_teachers').select('id, name, email').in('id', agentIds)
      : Promise.resolve({ data: [] }),
    schoolIds.length
      ? supabase.from('montree_schools').select('id, name').in('id', schoolIds)
      : Promise.resolve({ data: [] }),
  ]);
  const agentNameById = new Map<string, string | null>();
  for (const a of (agentsRes.data || []) as Array<{ id: string; name: string | null; email: string | null }>) {
    agentNameById.set(a.id, a.name || a.email);
  }
  const schoolNameById = new Map<string, string | null>();
  for (const s of (schoolsRes.data || []) as Array<{ id: string; name: string | null }>) {
    schoolNameById.set(s.id, s.name);
  }

  // 2. Loop each pair. Per pair: load txs → math → upsert.
  for (const pair of pairs) {
    if (!pair.agent_id || !pair.redeemed_by_school_id) continue;
    const agentId = pair.agent_id;
    const schoolId = pair.redeemed_by_school_id;
    const pct = pair.revenue_share_pct ?? 0;

    try {
      const txs = await loadFinanceTx(supabase, schoolId, opts.periodMonth);
      const math = computeMath(txs, pct);
      const existing = await loadExistingPayout(supabase, agentId, schoolId, opts.periodMonth);

      let action: PayoutCalcRow['action'] = 'inserted';
      if (existing) {
        // Don't touch already-paid rows.
        if (existing.status === 'paid') {
          action = 'skipped_paid';
        } else if (existing.is_manual_override) {
          action = 'skipped_override';
        } else {
          action = 'updated';
        }
      }

      const calcRow: PayoutCalcRow = {
        agent_id: agentId,
        agent_name: agentNameById.get(agentId) ?? null,
        school_id: schoolId,
        school_name: schoolNameById.get(schoolId) ?? null,
        period_month: opts.periodMonth,
        gross_revenue_usd: math.gross,
        stripe_fee_usd: math.stripeFee,
        anthropic_cost_usd: math.anthropic,
        openai_cost_usd: math.openai,
        other_direct_cost_usd: math.other,
        net_usd: math.net,
        revenue_share_pct: pct,
        payout_usd: math.payout,
        source_tx_count: txs.length,
        action,
      };
      result.payouts.push(calcRow);
      result.rows_calculated += 1;

      // Skip writes for skipped/overridden rows.
      if (action === 'skipped_paid' || action === 'skipped_override') {
        result.rows_skipped += 1;
        continue;
      }

      if (opts.dryRun) continue;

      // UPSERT — only when no manual override and not paid.
      const upsertPayload = {
        agent_id: agentId,
        school_id: schoolId,
        period_month: opts.periodMonth,
        gross_revenue_usd: math.gross,
        stripe_fee_usd: math.stripeFee,
        anthropic_cost_usd: math.anthropic,
        openai_cost_usd: math.openai,
        other_direct_cost_usd: math.other,
        net_usd: math.net,
        revenue_share_pct: pct,
        payout_usd: math.payout,
        source_tx_count: txs.length,
        calculated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error: updErr } = await supabase
          .from('montree_agent_payouts')
          .update(upsertPayload)
          .eq('id', existing.id);
        if (updErr) {
          result.errors.push({ school_id: schoolId, error: updErr.message });
          continue;
        }
        result.rows_updated += 1;
      } else {
        // Race-safe: a concurrent calculator run might have inserted the row
        // between our loadExistingPayout call and this insert. On the unique
        // (agent_id, school_id, period_month) violation, fall back to UPDATE.
        const { error: insErr } = await supabase
          .from('montree_agent_payouts')
          .insert(upsertPayload);

        if (!insErr) {
          result.rows_inserted += 1;
        } else if ((insErr as { code?: string }).code === '23505') {
          // Conflict — the other run beat us. Re-read to honor paid /
          // override locks, then update if still mutable.
          const reread = await loadExistingPayout(supabase, agentId, schoolId, opts.periodMonth);
          if (!reread) {
            // Bizarre — conflict but no row. Surface the original error.
            result.errors.push({ school_id: schoolId, error: insErr.message });
            continue;
          }
          if (reread.status === 'paid' || reread.is_manual_override) {
            // Race-winner locked the row. Don't overwrite.
            result.rows_skipped += 1;
            continue;
          }
          const { error: updErr } = await supabase
            .from('montree_agent_payouts')
            .update(upsertPayload)
            .eq('id', reread.id);
          if (updErr) {
            result.errors.push({ school_id: schoolId, error: updErr.message });
            continue;
          }
          result.rows_updated += 1;
        } else {
          result.errors.push({ school_id: schoolId, error: insErr.message });
          continue;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ school_id: schoolId, error: msg });
    }
  }

  return result;
}
