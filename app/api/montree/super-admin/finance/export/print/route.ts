// /api/montree/super-admin/finance/export/print/route.ts
// Printable HTML version of the accountant pack. Same data as the CSV export,
// but rendered as a styled HTML document that prints cleanly. Tredoux opens
// in a browser tab → Cmd+P → Save as PDF → done.
//
// Why HTML-and-print vs server-side PDF: no puppeteer dependency, no extra
// bundle size, no headless Chrome on Railway. Quality of output identical
// after browser print pipeline. The user gets the same accountant pack with
// a one-click difference (Save as PDF vs Download CSV).
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

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtUsd(n: number): string {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

interface LedgerRow {
  id: string;
  occurred_at: string;
  type: string;
  category: string;
  description: string;
  school_id: string | null;
  agent_id: string | null;
  stripe_invoice_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  usd_amount: number;
  source: string;
  source_ref: string | null;
  notes: string | null;
}

interface PayoutRow {
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
    // Try header auth first (canonical). Fall back to ?token= query param
    // because window.open() can't set headers — this is a read-only print
    // surface so URL-passed tokens are an acceptable trade-off for super-admin
    // navigation flow.
    let valid = false;
    try {
      const headerAuth = await verifySuperAdminAuth(request.headers);
      valid = headerAuth.valid;
    } catch {
      valid = false;
    }
    if (!valid) {
      const { searchParams } = new URL(request.url);
      const queryToken = searchParams.get('token');
      if (queryToken) {
        // Re-build a Headers object that verifySuperAdminAuth will accept.
        const synthetic = new Headers({ 'x-super-admin-token': queryToken });
        try {
          const synthAuth = await verifySuperAdminAuth(synthetic);
          valid = synthAuth.valid;
        } catch {
          valid = false;
        }
      }
    }
    if (!valid) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const periodMonth = searchParams.get('period_month') || '';
    const range = monthRange(periodMonth);
    if (!range) return new NextResponse('period_month is required as YYYY-MM', { status: 400 });

    const supabase = getSupabase();

    // Load everything in parallel.
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

    // Hydrate names.
    const schoolIds = new Set<string>();
    const agentIds = new Set<string>();
    for (const r of ledger) {
      if (r.school_id) schoolIds.add(r.school_id);
      if (r.agent_id) agentIds.add(r.agent_id);
    }
    for (const p of payouts) {
      schoolIds.add(p.school_id);
      agentIds.add(p.agent_id);
    }
    const [schoolsRes, agentsRes] = await Promise.all([
      schoolIds.size
        ? supabase.from('montree_schools').select('id, name').in('id', Array.from(schoolIds))
        : Promise.resolve({ data: [] }),
      agentIds.size
        ? supabase.from('montree_teachers').select('id, name, email').in('id', Array.from(agentIds))
        : Promise.resolve({ data: [] }),
    ]);
    const schoolName = new Map<string, string>();
    for (const s of (schoolsRes.data || []) as Array<{ id: string; name: string | null }>) {
      schoolName.set(s.id, s.name || s.id);
    }
    const agentName = new Map<string, string>();
    for (const a of (agentsRes.data || []) as Array<{ id: string; name: string | null; email: string | null }>) {
      agentName.set(a.id, a.name || a.email || a.id);
    }

    // P&L totals.
    let income = 0, directCost = 0, commission = 0, opExpense = 0, fxAdj = 0;
    for (const r of ledger) {
      const amt = Number(r.usd_amount) || 0;
      if (r.type === 'income') income += amt;
      else if (r.type === 'direct_cost') directCost += amt;
      else if (r.type === 'commission') commission += amt;
      else if (r.type === 'op_expense') opExpense += amt;
      else if (r.type === 'fx_adjustment') fxAdj += amt;
    }
    const margin = income - directCost - commission - opExpense + fxAdj;

    // Per-school revenue.
    interface PerSchool {
      school_id: string;
      school_name: string;
      gross: number;
      fees: number;
      anthropic: number;
      openai: number;
      other: number;
      net: number;
    }
    const perSchool = new Map<string, PerSchool>();
    for (const r of ledger) {
      if (!r.school_id) continue;
      const ps = perSchool.get(r.school_id) || {
        school_id: r.school_id,
        school_name: schoolName.get(r.school_id) || r.school_id,
        gross: 0,
        fees: 0,
        anthropic: 0,
        openai: 0,
        other: 0,
        net: 0,
      };
      const amt = Number(r.usd_amount) || 0;
      if (r.type === 'income') ps.gross += amt;
      else if (r.type === 'direct_cost') {
        if (r.category === 'stripe_fee') ps.fees += amt;
        else if (r.category === 'api_anthropic') ps.anthropic += amt;
        else if (r.category === 'api_openai') ps.openai += amt;
        else ps.other += amt;
      }
      perSchool.set(r.school_id, ps);
    }
    for (const ps of perSchool.values()) {
      ps.net = ps.gross - ps.fees - ps.anthropic - ps.openai - ps.other;
    }
    const perSchoolSorted = Array.from(perSchool.values()).sort((a, b) =>
      a.school_name.localeCompare(b.school_name)
    );

    const generatedAt = new Date().toISOString();

    // Render printable HTML — clean, accountant-friendly, prints on A4.
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Montree — Finance Pack ${escapeHtml(periodMonth)}</title>
  <style>
    @page { size: A4; margin: 18mm 14mm 18mm 14mm; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #1a1f2e;
      background: #fff;
      line-height: 1.4;
    }
    .doc { max-width: 800px; margin: 0 auto; padding: 16px 24px 32px; }
    h1 { font-family: 'Lora', Georgia, serif; font-size: 26pt; margin: 0 0 4px; font-weight: 700; }
    h2 { font-family: 'Lora', Georgia, serif; font-size: 16pt; margin: 28px 0 8px; font-weight: 700; padding-bottom: 4px; border-bottom: 2px solid #34d399; }
    .meta { color: #5b6b73; font-size: 11pt; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 8px; }
    thead th { text-align: left; padding: 8px 6px; border-bottom: 2px solid #1a1f2e; font-weight: 700; }
    tbody td { padding: 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .right { text-align: right; }
    .mono { font-family: 'SF Mono', Menlo, monospace; font-size: 9pt; color: #475569; }
    .total-row td { font-weight: 700; border-top: 2px solid #1a1f2e; border-bottom: none; padding-top: 10px; }
    .emerald { color: #10b981; }
    .red { color: #dc2626; }
    .slate { color: #64748b; }
    .pnl { display: grid; grid-template-columns: 1fr auto; gap: 4px 24px; font-size: 11pt; margin: 12px 0; }
    .pnl .label { color: #475569; }
    .pnl .value { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
    .pnl .margin .label, .pnl .margin .value { font-weight: 700; border-top: 2px solid #1a1f2e; padding-top: 6px; margin-top: 6px; }
    .print-only { display: none; }
    .toolbar { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 10pt; }
    .toolbar button { background: #10b981; color: #fff; border: 0; padding: 6px 12px; border-radius: 6px; font-size: 10pt; cursor: pointer; margin-right: 8px; }
    @media print {
      .toolbar { display: none; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="doc">
    <div class="toolbar">
      💡 <strong>Save as PDF:</strong> Cmd+P (Mac) or Ctrl+P (Windows) → "Save as PDF". Layout is already optimised for A4 print.
      <button onclick="window.print()">Print / Save PDF</button>
    </div>

    <h1>Montree — Finance Pack</h1>
    <p class="meta">
      Period: <strong>${escapeHtml(periodMonth)}</strong> &nbsp;·&nbsp;
      Generated: ${escapeHtml(fmtDate(generatedAt))} &nbsp;·&nbsp;
      Currency: USD
    </p>

    <h2>P&amp;L Summary</h2>
    <div class="pnl">
      <div class="label">Revenue (subscriptions + refunds)</div>
      <div class="value emerald">${fmtUsd(income)}</div>
      <div class="label">− Direct costs (Stripe fees + AI APIs)</div>
      <div class="value">${fmtUsd(directCost)}</div>
      <div class="label">− Commissions paid to agents</div>
      <div class="value">${fmtUsd(commission)}</div>
      <div class="label">− Operating expenses</div>
      <div class="value">${fmtUsd(opExpense)}</div>
      <div class="label">+ FX adjustments</div>
      <div class="value">${fmtUsd(fxAdj)}</div>
      <div class="margin label">= Margin</div>
      <div class="margin value ${margin >= 0 ? 'emerald' : 'red'}">${fmtUsd(margin)}</div>
    </div>

    <h2>Per-school revenue</h2>
    ${perSchoolSorted.length === 0 ? '<p class="slate">No school revenue this period.</p>' : `
    <table>
      <thead>
        <tr>
          <th>School</th>
          <th class="right">Gross</th>
          <th class="right">Stripe fee</th>
          <th class="right">Anthropic</th>
          <th class="right">OpenAI</th>
          <th class="right">Other</th>
          <th class="right">Net</th>
        </tr>
      </thead>
      <tbody>
        ${perSchoolSorted.map((ps) => `
          <tr>
            <td>${escapeHtml(ps.school_name)}</td>
            <td class="right">${fmtUsd(ps.gross)}</td>
            <td class="right slate">−${fmtUsd(ps.fees)}</td>
            <td class="right slate">−${fmtUsd(ps.anthropic)}</td>
            <td class="right slate">−${fmtUsd(ps.openai)}</td>
            <td class="right slate">−${fmtUsd(ps.other)}</td>
            <td class="right"><strong>${fmtUsd(ps.net)}</strong></td>
          </tr>`).join('')}
      </tbody>
    </table>`}

    <h2>Agent commissions</h2>
    ${payouts.length === 0 ? '<p class="slate">No agent payouts this period.</p>' : `
    <table>
      <thead>
        <tr>
          <th>Agent</th>
          <th>School</th>
          <th class="right">Share %</th>
          <th class="right">Net (school)</th>
          <th class="right">Payout</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${payouts.map((p) => `
          <tr>
            <td>${escapeHtml(agentName.get(p.agent_id) || p.agent_id)}</td>
            <td>${escapeHtml(schoolName.get(p.school_id) || p.school_id)}</td>
            <td class="right">${p.revenue_share_pct}%</td>
            <td class="right">${fmtUsd(p.net_usd)}</td>
            <td class="right"><strong>${fmtUsd(p.payout_usd)}</strong></td>
            <td>${escapeHtml(p.status)}${p.stripe_transfer_id ? `<br/><span class="mono">${escapeHtml(p.stripe_transfer_id)}</span>` : ''}</td>
          </tr>`).join('')}
      </tbody>
    </table>`}

    <h2>Full ledger (${ledger.length} rows)</h2>
    ${ledger.length === 0 ? '<p class="slate">No ledger rows.</p>' : `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Category</th>
          <th>Description</th>
          <th>School / Agent</th>
          <th class="right">USD</th>
        </tr>
      </thead>
      <tbody>
        ${ledger.map((r) => {
          const partyParts: string[] = [];
          if (r.school_id) partyParts.push(schoolName.get(r.school_id) || r.school_id.slice(0, 8));
          if (r.agent_id) partyParts.push(agentName.get(r.agent_id) || r.agent_id.slice(0, 8));
          const party = partyParts.join(' / ');
          const amt = Number(r.usd_amount) || 0;
          const isNeg = r.type === 'direct_cost' || r.type === 'commission' || r.type === 'op_expense' || amt < 0;
          return `
          <tr>
            <td class="mono">${escapeHtml(fmtDate(r.occurred_at))}</td>
            <td>${escapeHtml(r.type)}</td>
            <td>${escapeHtml(r.category)}</td>
            <td>${escapeHtml(r.description.slice(0, 80))}${r.description.length > 80 ? '…' : ''}</td>
            <td>${escapeHtml(party)}</td>
            <td class="right ${isNeg ? 'slate' : 'emerald'}">${isNeg && amt > 0 ? '−' : ''}${fmtUsd(Math.abs(amt))}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`}

    <p class="meta" style="margin-top: 32px; font-size: 9pt;">
      Generated by Montree at ${escapeHtml(generatedAt)}. Every line traces back to <code>montree_finance_transactions</code> + <code>montree_agent_payouts</code> in Supabase. Stripe IDs are reconciliation references.
    </p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[finance export print]', err);
    return new NextResponse('Export failed', { status: 500 });
  }
}
