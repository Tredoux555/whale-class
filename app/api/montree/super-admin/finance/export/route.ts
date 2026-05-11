// /api/montree/super-admin/finance/export/route.ts
// Monthly accountant export pack.
//
// GET ?period_month=YYYY-MM &format=csv|json
//
// format=json: returns a single object with all bundles (used by browser tab)
// format=csv:  returns a multi-section text/csv body — each section starts
//              with a marker line like "# === PER-SCHOOL REVENUE ===" so
//              Excel/Numbers can split it. (Alternative: ZIP — but a single
//              file is friendlier for the accountant's first email.)
//
// What's included (matches HK_FINANCIAL_ADVISOR_SUMMARY.md item 6):
//   1. P&L summary (income, direct costs, commissions, op-expenses, margin)
//   2. Per-school revenue (gross, fees, AI cost, net per school)
//   3. Per-agent commission (each agent, schools they refer, share earned, paid)
//   4. Stripe reconciliation (every Stripe invoice + fee + transfer in the period)
//   5. Full ledger backup (every montree_finance_transactions row for the period)
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function monthRange(periodMonth: string): { start: string; end: string } | null {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) return null;
  const [y, m] = periodMonth.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)).toISOString(),
    end: new Date(Date.UTC(y, m, 1)).toISOString(),
  };
}

// CSV cell escape — wraps in quotes if it contains comma / quote / newline.
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',');
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface LedgerRow {
  id: string;
  occurred_at: string;
  type: string;
  category: string;
  description: string;
  school_id: string | null;
  agent_id: string | null;
  agent_payout_id: string | null;
  stripe_charge_id: string | null;
  stripe_invoice_id: string | null;
  stripe_transfer_id: string | null;
  original_currency: string;
  original_amount: number;
  fx_rate: number;
  usd_amount: number;
  source: string;
  source_ref: string | null;
  notes: string | null;
}

interface PayoutRow {
  id: string;
  agent_id: string;
  school_id: string;
  period_month: string;
  gross_revenue_usd: number;
  stripe_fee_usd: number;
  anthropic_cost_usd: number;
  openai_cost_usd: number;
  other_direct_cost_usd: number;
  net_usd: number;
  revenue_share_pct: number;
  payout_usd: number;
  status: string;
  stripe_transfer_id: string | null;
  paid_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const periodMonth = searchParams.get('period_month') || '';
    const format = (searchParams.get('format') || 'csv').toLowerCase();

    const range = monthRange(periodMonth);
    if (!range) {
      return NextResponse.json(
        { error: 'period_month is required as YYYY-MM' },
        { status: 400 }
      );
    }
    if (format !== 'csv' && format !== 'json') {
      return NextResponse.json({ error: 'format must be csv or json' }, { status: 400 });
    }

    const supabase = getSupabase();

    // ── Load everything for the month in parallel ────────────────────────────
    const [ledgerRes, payoutsRes] = await Promise.all([
      supabase
        .from('montree_finance_transactions')
        .select('*')
        .gte('occurred_at', range.start)
        .lt('occurred_at', range.end)
        .order('occurred_at', { ascending: true }),
      supabase.from('montree_agent_payouts').select('*').eq('period_month', periodMonth),
    ]);

    const ledger = (ledgerRes.data || []) as LedgerRow[];
    const payouts = (payoutsRes.data || []) as PayoutRow[];

    // Hydrate names for schools + agents referenced.
    const schoolIdSet = new Set<string>();
    const agentIdSet = new Set<string>();
    for (const r of ledger) {
      if (r.school_id) schoolIdSet.add(r.school_id);
      if (r.agent_id) agentIdSet.add(r.agent_id);
    }
    for (const p of payouts) {
      schoolIdSet.add(p.school_id);
      agentIdSet.add(p.agent_id);
    }
    const [schoolsRes, agentsRes] = await Promise.all([
      schoolIdSet.size
        ? supabase.from('montree_schools').select('id, name').in('id', Array.from(schoolIdSet))
        : Promise.resolve({ data: [] }),
      agentIdSet.size
        ? supabase.from('montree_teachers').select('id, name, email').in('id', Array.from(agentIdSet))
        : Promise.resolve({ data: [] }),
    ]);
    const schoolNameById = new Map<string, string>();
    for (const s of (schoolsRes.data || []) as Array<{ id: string; name: string | null }>) {
      schoolNameById.set(s.id, s.name || s.id);
    }
    const agentNameById = new Map<string, string>();
    for (const a of (agentsRes.data || []) as Array<{ id: string; name: string | null; email: string | null }>) {
      agentNameById.set(a.id, a.name || a.email || a.id);
    }

    // ── 1. P&L summary ───────────────────────────────────────────────────────
    let income = 0,
      directCost = 0,
      commission = 0,
      opExpense = 0,
      fxAdj = 0;
    for (const r of ledger) {
      const amt = Number(r.usd_amount) || 0;
      if (r.type === 'income') income += amt;
      else if (r.type === 'direct_cost') directCost += amt;
      else if (r.type === 'commission') commission += amt;
      else if (r.type === 'op_expense') opExpense += amt;
      else if (r.type === 'fx_adjustment') fxAdj += amt;
    }
    const margin = income - directCost - commission - opExpense + fxAdj;
    const pnl = {
      period_month: periodMonth,
      income: r2(income),
      direct_cost: r2(directCost),
      commission: r2(commission),
      op_expense: r2(opExpense),
      fx_adjustment: r2(fxAdj),
      margin: r2(margin),
    };

    // ── 2. Per-school revenue (from ledger) ──────────────────────────────────
    interface PerSchool {
      school_id: string;
      school_name: string;
      gross_revenue_usd: number;
      stripe_fee_usd: number;
      anthropic_cost_usd: number;
      openai_cost_usd: number;
      other_direct_cost_usd: number;
      net_usd: number;
    }
    const perSchool = new Map<string, PerSchool>();
    for (const r of ledger) {
      if (!r.school_id) continue;
      const amt = Number(r.usd_amount) || 0;
      const ps = perSchool.get(r.school_id) || {
        school_id: r.school_id,
        school_name: schoolNameById.get(r.school_id) || r.school_id,
        gross_revenue_usd: 0,
        stripe_fee_usd: 0,
        anthropic_cost_usd: 0,
        openai_cost_usd: 0,
        other_direct_cost_usd: 0,
        net_usd: 0,
      };
      if (r.type === 'income') ps.gross_revenue_usd += amt;
      else if (r.type === 'direct_cost') {
        if (r.category === 'stripe_fee') ps.stripe_fee_usd += amt;
        else if (r.category === 'api_anthropic') ps.anthropic_cost_usd += amt;
        else if (r.category === 'api_openai') ps.openai_cost_usd += amt;
        else ps.other_direct_cost_usd += amt;
      }
      perSchool.set(r.school_id, ps);
    }
    for (const ps of perSchool.values()) {
      ps.net_usd = r2(
        ps.gross_revenue_usd - ps.stripe_fee_usd - ps.anthropic_cost_usd - ps.openai_cost_usd - ps.other_direct_cost_usd
      );
      ps.gross_revenue_usd = r2(ps.gross_revenue_usd);
      ps.stripe_fee_usd = r2(ps.stripe_fee_usd);
      ps.anthropic_cost_usd = r2(ps.anthropic_cost_usd);
      ps.openai_cost_usd = r2(ps.openai_cost_usd);
      ps.other_direct_cost_usd = r2(ps.other_direct_cost_usd);
    }
    const perSchoolArr = Array.from(perSchool.values()).sort((a, b) =>
      a.school_name.localeCompare(b.school_name)
    );

    // ── 3. Per-agent commission summary (from montree_agent_payouts) ─────────
    const perAgentRows = payouts.map((p) => ({
      agent_id: p.agent_id,
      agent_name: agentNameById.get(p.agent_id) || p.agent_id,
      school_id: p.school_id,
      school_name: schoolNameById.get(p.school_id) || p.school_id,
      revenue_share_pct: p.revenue_share_pct,
      gross_revenue_usd: r2(p.gross_revenue_usd),
      stripe_fee_usd: r2(p.stripe_fee_usd),
      anthropic_cost_usd: r2(p.anthropic_cost_usd),
      openai_cost_usd: r2(p.openai_cost_usd),
      other_direct_cost_usd: r2(p.other_direct_cost_usd),
      net_usd: r2(p.net_usd),
      payout_usd: r2(p.payout_usd),
      status: p.status,
      stripe_transfer_id: p.stripe_transfer_id || '',
      paid_at: p.paid_at || '',
    }));

    // ── 4. Stripe reconciliation (filter ledger to Stripe-origin rows) ──────
    const stripeRecon = ledger
      .filter((r) => r.source === 'stripe_webhook' || r.stripe_invoice_id || r.stripe_charge_id || r.stripe_transfer_id)
      .map((r) => ({
        occurred_at: r.occurred_at,
        type: r.type,
        category: r.category,
        description: r.description,
        school_name: r.school_id ? schoolNameById.get(r.school_id) || '' : '',
        agent_name: r.agent_id ? agentNameById.get(r.agent_id) || '' : '',
        usd_amount: r2(r.usd_amount),
        stripe_invoice_id: r.stripe_invoice_id || '',
        stripe_charge_id: r.stripe_charge_id || '',
        stripe_transfer_id: r.stripe_transfer_id || '',
        source_ref: r.source_ref || '',
      }));

    // ── 5. Full ledger backup (every row, untouched fields) ─────────────────
    const ledgerFull = ledger.map((r) => ({
      ...r,
      school_name: r.school_id ? schoolNameById.get(r.school_id) || '' : '',
      agent_name: r.agent_id ? agentNameById.get(r.agent_id) || '' : '',
    }));

    if (format === 'json') {
      return NextResponse.json({
        period_month: periodMonth,
        generated_at: new Date().toISOString(),
        pnl,
        per_school: perSchoolArr,
        per_agent: perAgentRows,
        stripe_reconciliation: stripeRecon,
        ledger_full: ledgerFull,
      });
    }

    // ── CSV — single file, multi-section ─────────────────────────────────────
    const lines: string[] = [];
    lines.push(`# Montree monthly accountant pack — ${periodMonth}`);
    lines.push(`# Generated ${new Date().toISOString()}`);
    lines.push('');

    // Section 1 — P&L
    lines.push('# === P&L SUMMARY ===');
    lines.push(csvRow(['period_month', 'income', 'direct_cost', 'commission', 'op_expense', 'fx_adjustment', 'margin']));
    lines.push(
      csvRow([pnl.period_month, pnl.income, pnl.direct_cost, pnl.commission, pnl.op_expense, pnl.fx_adjustment, pnl.margin])
    );
    lines.push('');

    // Section 2 — Per-school
    lines.push('# === PER-SCHOOL REVENUE ===');
    lines.push(
      csvRow([
        'school_id',
        'school_name',
        'gross_revenue_usd',
        'stripe_fee_usd',
        'anthropic_cost_usd',
        'openai_cost_usd',
        'other_direct_cost_usd',
        'net_usd',
      ])
    );
    for (const ps of perSchoolArr) {
      lines.push(
        csvRow([
          ps.school_id,
          ps.school_name,
          ps.gross_revenue_usd,
          ps.stripe_fee_usd,
          ps.anthropic_cost_usd,
          ps.openai_cost_usd,
          ps.other_direct_cost_usd,
          ps.net_usd,
        ])
      );
    }
    lines.push('');

    // Section 3 — Per-agent commission
    lines.push('# === PER-AGENT COMMISSION ===');
    lines.push(
      csvRow([
        'agent_name',
        'school_name',
        'revenue_share_pct',
        'gross_usd',
        'stripe_fee_usd',
        'anthropic_usd',
        'openai_usd',
        'other_direct_usd',
        'net_usd',
        'payout_usd',
        'status',
        'stripe_transfer_id',
        'paid_at',
      ])
    );
    for (const a of perAgentRows) {
      lines.push(
        csvRow([
          a.agent_name,
          a.school_name,
          a.revenue_share_pct,
          a.gross_revenue_usd,
          a.stripe_fee_usd,
          a.anthropic_cost_usd,
          a.openai_cost_usd,
          a.other_direct_cost_usd,
          a.net_usd,
          a.payout_usd,
          a.status,
          a.stripe_transfer_id,
          a.paid_at,
        ])
      );
    }
    lines.push('');

    // Section 4 — Stripe reconciliation
    lines.push('# === STRIPE RECONCILIATION ===');
    lines.push(
      csvRow([
        'occurred_at',
        'type',
        'category',
        'description',
        'school_name',
        'agent_name',
        'usd_amount',
        'stripe_invoice_id',
        'stripe_charge_id',
        'stripe_transfer_id',
        'source_ref',
      ])
    );
    for (const r of stripeRecon) {
      lines.push(
        csvRow([
          r.occurred_at,
          r.type,
          r.category,
          r.description,
          r.school_name,
          r.agent_name,
          r.usd_amount,
          r.stripe_invoice_id,
          r.stripe_charge_id,
          r.stripe_transfer_id,
          r.source_ref,
        ])
      );
    }
    lines.push('');

    // Section 5 — Full ledger (every row this month)
    lines.push('# === FULL LEDGER ===');
    lines.push(
      csvRow([
        'occurred_at',
        'type',
        'category',
        'description',
        'school_name',
        'agent_name',
        'original_currency',
        'original_amount',
        'fx_rate',
        'usd_amount',
        'source',
        'source_ref',
        'stripe_invoice_id',
        'stripe_charge_id',
        'stripe_transfer_id',
        'notes',
      ])
    );
    for (const r of ledgerFull) {
      lines.push(
        csvRow([
          r.occurred_at,
          r.type,
          r.category,
          r.description,
          r.school_name,
          r.agent_name,
          r.original_currency,
          r.original_amount,
          r.fx_rate,
          r.usd_amount,
          r.source,
          r.source_ref || '',
          r.stripe_invoice_id || '',
          r.stripe_charge_id || '',
          r.stripe_transfer_id || '',
          r.notes || '',
        ])
      );
    }

    const csvBody = lines.join('\n') + '\n';
    return new NextResponse(csvBody, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="montree-finance-${periodMonth}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[finance export]', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
