// /api/montree/super-admin/finance/reconciliation
//
// Phase B4 of FINANCIAL_ARCHITECTURE_PLAN.md.
//
// Three-way reconciliation for a given period:
//   1. Stripe side — sum of stripe-sourced finance_transactions
//   2. Internal ledger side — sum from montree_billing_history
//   3. Bank side — sum from an uploaded Wallex CSV (if any)
//
// Surfaces silent drift: if Stripe says we collected $X, our ledger has $Y,
// and Wallex received $Z, anything more than $1 of diff is a finding.
//
// GET: returns the diff report for ?period_month=YYYY-MM
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

interface FinanceTxRow {
  type: string;
  category: string;
  source: string;
  usd_amount: number;
  occurred_at: string;
}

interface BillingHistoryRow {
  // 🚨 Session 113 V2 Finance audit CRITICAL fix: schema columns are
  // amount_cents + created_at, not amount_paid_cents + paid_at. The
  // typo silently made billingPaidUsd always 0 and the drift detector
  // flagged 'Stripe-side ledger and billing history disagree' for every
  // period with revenue. See migration 189 lines 131-144.
  amount_cents: number | null;
  created_at: string | null;
  status: string | null;
}

interface BankStatementRow {
  period_month: string;
  source: string;
  total_usd: number | null;
  rows: number | null;
  uploaded_at: string;
}

export async function GET(req: NextRequest) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const periodMonth = url.searchParams.get('period_month') || '';
  if (!PERIOD_RE.test(periodMonth)) {
    return NextResponse.json({ error: 'period_month must be YYYY-MM' }, { status: 400 });
  }

  // Calculate UTC bounds for the period.
  const [yearStr, monthStr] = periodMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, month, 1)).toISOString(); // first day of next month, exclusive

  const supabase = getSupabase();

  // ── 1. Stripe-side: finance_transactions with source='stripe_webhook' ──
  const { data: txRaw } = await supabase
    .from('montree_finance_transactions')
    .select('type, category, source, usd_amount, occurred_at')
    .gte('occurred_at', start)
    .lt('occurred_at', end);

  const transactions = (txRaw as FinanceTxRow[] | null) || [];

  const ledger = {
    subscription_revenue: 0,
    refunds: 0,
    stripe_fees: 0,
    api_anthropic: 0,
    api_openai: 0,
    commissions_paid: 0,
    op_expenses: 0,
    fx_adjustments: 0,
    other_direct_costs: 0,
    by_source: {
      stripe_webhook: 0,
      api_usage_aggregate: 0,
      manual_entry: 0,
      other: 0,
    } as Record<string, number>,
    total_rows: transactions.length,
  };

  for (const t of transactions) {
    const amt = Number(t.usd_amount) || 0;
    // Per-source bucket
    if (t.source === 'stripe_webhook') ledger.by_source.stripe_webhook += amt;
    else if (t.source === 'api_usage_aggregate') ledger.by_source.api_usage_aggregate += amt;
    else if (t.source === 'manual_entry') ledger.by_source.manual_entry += amt;
    else ledger.by_source.other += amt;

    // Per-category bucket
    if (t.type === 'income' && t.category === 'subscription_revenue') ledger.subscription_revenue += amt;
    else if (t.type === 'income' && t.category === 'refund') ledger.refunds += amt;
    else if (t.type === 'direct_cost' && t.category === 'stripe_fee') ledger.stripe_fees += amt;
    else if (t.type === 'direct_cost' && t.category === 'api_anthropic') ledger.api_anthropic += amt;
    else if (t.type === 'direct_cost' && t.category === 'api_openai') ledger.api_openai += amt;
    else if (t.type === 'direct_cost') ledger.other_direct_costs += amt;
    else if (t.type === 'commission') ledger.commissions_paid += amt;
    else if (t.type === 'op_expense') ledger.op_expenses += amt;
    else if (t.type === 'fx_adjustment') ledger.fx_adjustments += amt;
  }

  // ── 2. Internal cross-check via montree_billing_history ──
  // billing_history is per-invoice — sums paid status only.
  //
  // 🚨 Session 113 V2 Finance audit CRITICAL fix: the real columns per
  // migration 189 are `amount_cents` and `created_at`. The previous
  // code queried non-existent `amount_paid_cents` + `paid_at`, so the
  // SELECT returned rows with all-undefined fields and billingPaidUsd
  // was ALWAYS 0 — making the drift detector report "Stripe vs billing
  // history disagree" for every period that had revenue. (`paid_at`
  // doesn't exist; `created_at` is the row-write timestamp which the
  // webhook handler stamps at payment-success time, so it's the right
  // column to match the finance_transactions occurred_at filter.)
  const { data: billingRaw } = await supabase
    .from('montree_billing_history')
    .select('amount_cents, created_at, status')
    .gte('created_at', start)
    .lt('created_at', end);

  const billing = (billingRaw as BillingHistoryRow[] | null) || [];
  const billingPaidUsd = billing
    .filter((b) => b.status === 'paid' && b.amount_cents != null)
    .reduce((sum, b) => sum + (Number(b.amount_cents) || 0), 0) / 100;
  const billingPaidCount = billing.filter((b) => b.status === 'paid').length;

  // ── 3. Bank-side from uploaded statement (if any) ──
  // We don't have a bank_statements table built yet — surface a placeholder
  // so the UI can prompt for upload.
  let bankSide: BankStatementRow | null = null;
  try {
    const { data: stmtRaw, error: stmtErr } = await supabase
      .from('montree_bank_statements')
      .select('period_month, source, total_usd, rows, uploaded_at')
      .eq('period_month', periodMonth)
      .maybeSingle();
    if (!stmtErr && stmtRaw) {
      bankSide = stmtRaw as BankStatementRow;
    }
  } catch {
    // Table doesn't exist yet — fine, surface null.
  }

  // ── 4. Diff calculations ──
  // The "Stripe should equal billing" check — both come from the same source
  // of truth (Stripe webhooks → billing_history; webhook also → finance_tx).
  // They should agree within rounding.
  const grossFromStripe = ledger.subscription_revenue + ledger.refunds;
  const stripeVsBillingDiff = Math.abs(grossFromStripe - billingPaidUsd);

  // The Stripe-net (what landed in our Stripe balance) = subscription_revenue
  // (we already subtract refunds in the ledger) minus stripe_fees.
  const netFromStripe = ledger.subscription_revenue + ledger.refunds + ledger.stripe_fees;
  // (stripe_fee rows are stored as positive direct_cost; so we ADD here is wrong —
  // actually direct_cost is positive USD value of the cost. The net the platform
  // RECEIVES = gross - fees. Let me redo:)
  const grossRevenueUsd = ledger.subscription_revenue + ledger.refunds; // refunds are stored as negative income amounts per convention
  const netReceivedFromStripe = grossRevenueUsd - ledger.stripe_fees;

  // Bank diff — if we have a bank statement.
  const bankVsStripeDiff = bankSide
    ? Math.abs((bankSide.total_usd || 0) - netReceivedFromStripe)
    : null;

  // Findings — anything > $1 of diff.
  const findings: string[] = [];
  if (stripeVsBillingDiff > 1) {
    findings.push(
      `Stripe-side ledger ($${grossFromStripe.toFixed(2)}) and billing history ($${billingPaidUsd.toFixed(2)}) disagree by $${stripeVsBillingDiff.toFixed(2)}. Investigate missed webhook events.`
    );
  }
  if (bankVsStripeDiff !== null && bankVsStripeDiff > 1) {
    findings.push(
      `Bank receipts ($${(bankSide?.total_usd || 0).toFixed(2)}) and net Stripe ($${netReceivedFromStripe.toFixed(2)}) disagree by $${bankVsStripeDiff.toFixed(2)}. Could be FX timing or pending Stripe payouts not yet landed.`
    );
  }
  if (bankSide === null) {
    findings.push(
      `No bank statement uploaded for ${periodMonth}. Upload Wallex CSV for full reconciliation.`
    );
  }

  return NextResponse.json({
    period_month: periodMonth,
    stripe_side: {
      gross_revenue_usd: grossRevenueUsd,
      stripe_fees_usd: ledger.stripe_fees,
      net_received_usd: netReceivedFromStripe,
      subscription_revenue_usd: ledger.subscription_revenue,
      refunds_usd: ledger.refunds,
    },
    internal_ledger: {
      total_rows: ledger.total_rows,
      by_source: ledger.by_source,
      breakdown: {
        subscription_revenue: ledger.subscription_revenue,
        refunds: ledger.refunds,
        stripe_fees: ledger.stripe_fees,
        api_anthropic: ledger.api_anthropic,
        api_openai: ledger.api_openai,
        commissions_paid: ledger.commissions_paid,
        op_expenses: ledger.op_expenses,
        fx_adjustments: ledger.fx_adjustments,
        other_direct_costs: ledger.other_direct_costs,
      },
    },
    billing_history_cross_check: {
      paid_invoices_count: billingPaidCount,
      paid_total_usd: billingPaidUsd,
      diff_vs_stripe_side_usd: stripeVsBillingDiff,
    },
    bank_side: bankSide
      ? {
          source: bankSide.source,
          total_usd: bankSide.total_usd,
          rows: bankSide.rows,
          uploaded_at: bankSide.uploaded_at,
          diff_vs_stripe_net_usd: bankVsStripeDiff,
        }
      : null,
    findings,
  });
}
