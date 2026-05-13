// /api/montree/super-admin/agents/[id]/annual-statement
//
// Phase B2 — Annual agent statement.
//
// Per-agent year-end summary the agent can hand to their tax authority or to
// their receiving bank for source-of-funds documentation. Reads paid payouts
// from montree_agent_payouts (canonical "what we paid them" record per rule
// #64) within the calendar year.
//
// Output formats:
//   ?format=csv  — machine-readable CSV (default)
//   ?format=html — printable HTML (browser Print → Save as PDF)
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

interface PaidPayoutRow {
  id: string;
  school_id: string;
  period_month: string;
  gross_revenue_usd: number;
  net_usd: number;
  revenue_share_pct: number;
  payout_usd: number;
  paid_at: string;
  paid_by_method: string | null;
  stripe_transfer_id: string | null;
  payout_currency: string | null;
  fx_rate_used: number | null;
  notes: string | null;
}

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  payout_method: string | null;
  is_agent: boolean | null;
  manual_payout_details: Record<string, unknown> | null;
}

interface SchoolRow {
  id: string;
  name: string | null;
  country: string | null;
}

function csvEscape(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  const str = String(s);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperAdminAuth(request.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: agentId } = await params;
  const url = new URL(request.url);
  const yearStr = url.searchParams.get('year') || String(new Date().getUTCFullYear());
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: 'year must be between 2020 and 2100' }, { status: 400 });
  }
  const format = (url.searchParams.get('format') || 'csv').toLowerCase();
  if (format !== 'csv' && format !== 'html') {
    return NextResponse.json({ error: "format must be 'csv' or 'html'" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Agent
  const { data: agentRaw } = await supabase
    .from('montree_teachers')
    .select('id, name, email, payout_method, is_agent, manual_payout_details')
    .eq('id', agentId)
    .maybeSingle();
  const agent = agentRaw as AgentRow | null;
  if (!agent || !agent.is_agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Paid payouts in calendar year (UTC bounds)
  const yearStart = `${year}-01-01T00:00:00Z`;
  const yearEnd = `${year + 1}-01-01T00:00:00Z`;
  const { data: payoutsRaw } = await supabase
    .from('montree_agent_payouts')
    .select(
      'id, school_id, period_month, gross_revenue_usd, net_usd, revenue_share_pct, payout_usd, paid_at, paid_by_method, stripe_transfer_id, payout_currency, fx_rate_used, notes'
    )
    .eq('agent_id', agentId)
    .eq('status', 'paid')
    .gte('paid_at', yearStart)
    .lt('paid_at', yearEnd)
    .order('paid_at', { ascending: true });

  const payouts = (payoutsRaw as PaidPayoutRow[] | null) || [];

  // School names
  const schoolIds = Array.from(new Set(payouts.map((p) => p.school_id).filter(Boolean)));
  const schoolNameById = new Map<string, string>();
  const schoolCountryById = new Map<string, string>();
  if (schoolIds.length > 0) {
    const { data: schoolsRaw } = await supabase
      .from('montree_schools')
      .select('id, name, country')
      .in('id', schoolIds);
    for (const s of ((schoolsRaw as SchoolRow[] | null) || [])) {
      if (s.name) schoolNameById.set(s.id, s.name);
      if (s.country) schoolCountryById.set(s.id, s.country);
    }
  }

  const totalUsd = payouts.reduce((sum, p) => sum + (Number(p.payout_usd) || 0), 0);
  const totalGross = payouts.reduce((sum, p) => sum + (Number(p.gross_revenue_usd) || 0), 0);
  const totalNet = payouts.reduce((sum, p) => sum + (Number(p.net_usd) || 0), 0);

  if (format === 'csv') {
    const lines: string[] = [];
    // Header block
    lines.push(`Montree Agent Annual Statement,${year}`);
    lines.push(`Generated,${new Date().toISOString()}`);
    lines.push('');
    lines.push('Paying entity,Montree Limited');
    lines.push('Jurisdiction,Hong Kong SAR');
    lines.push('Company registration,80261361');
    lines.push('Registered address,(see Statrys / Wallex records on file)');
    lines.push('');
    lines.push(`Agent name,${csvEscape(agent.name)}`);
    lines.push(`Agent email,${csvEscape(agent.email)}`);
    lines.push(`Payout method,${csvEscape(agent.payout_method || 'stripe_connect')}`);
    lines.push('');
    lines.push(`Total paid in ${year} (USD),${totalUsd.toFixed(2)}`);
    lines.push(`Number of payouts,${payouts.length}`);
    lines.push(`Total gross revenue attributed to this agent (USD),${totalGross.toFixed(2)}`);
    lines.push(`Total net (after costs) attributed (USD),${totalNet.toFixed(2)}`);
    lines.push('');
    // Detail rows
    lines.push('Paid on,Period,School,Country,Gross USD,Net USD,Share %,Payout USD,Currency,FX rate,Local amount,Method,Reference,Notes');
    for (const p of payouts) {
      const schoolName = schoolNameById.get(p.school_id) || '(unknown)';
      const country = schoolCountryById.get(p.school_id) || '';
      const localAmount =
        p.fx_rate_used && p.fx_rate_used !== 1
          ? (Number(p.payout_usd) * Number(p.fx_rate_used)).toFixed(2)
          : '';
      const ref = p.stripe_transfer_id || (p.notes ? p.notes.replace(/^.*ref /, '').split(' ')[0] : '');
      lines.push(
        [
          fmtDate(p.paid_at),
          p.period_month,
          csvEscape(schoolName),
          csvEscape(country),
          (Number(p.gross_revenue_usd) || 0).toFixed(2),
          (Number(p.net_usd) || 0).toFixed(2),
          (Number(p.revenue_share_pct) || 0).toFixed(2),
          (Number(p.payout_usd) || 0).toFixed(2),
          csvEscape(p.payout_currency || 'USD'),
          p.fx_rate_used ? Number(p.fx_rate_used).toFixed(6) : '1.000000',
          localAmount,
          csvEscape(p.paid_by_method),
          csvEscape(ref),
          csvEscape(p.notes),
        ].join(',')
      );
    }

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="montree_agent_statement_${agentId}_${year}.csv"`,
      },
    });
  }

  // HTML format — printable. Lora serif title, clean table. Browser Print →
  // Save as PDF gives a perfectly serviceable statement.
  const rowsHtml = payouts
    .map((p) => {
      const schoolName = schoolNameById.get(p.school_id) || '(unknown)';
      const country = schoolCountryById.get(p.school_id) || '';
      const localAmount =
        p.fx_rate_used && p.fx_rate_used !== 1
          ? `${(Number(p.payout_usd) * Number(p.fx_rate_used)).toFixed(2)} ${escapeHtml(p.payout_currency || '')}`
          : '—';
      const ref = p.stripe_transfer_id || (p.notes ? p.notes.replace(/^.*ref /, '').split(' ')[0] : '—');
      return `<tr>
        <td>${escapeHtml(fmtDate(p.paid_at))}</td>
        <td><code>${escapeHtml(p.period_month)}</code></td>
        <td>${escapeHtml(schoolName)}${country ? ` <small>${escapeHtml(country)}</small>` : ''}</td>
        <td class="num">${fmtUsd(Number(p.payout_usd) || 0)}</td>
        <td>${localAmount}</td>
        <td><code>${escapeHtml(p.paid_by_method || '—')}</code></td>
        <td><code>${escapeHtml(ref)}</code></td>
      </tr>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>Montree Agent Annual Statement — ${year} — ${escapeHtml(agent.name || agent.email || agentId)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0a1a0f; max-width: 900px; margin: 0 auto; padding: 24px; line-height: 1.45; }
  .toolbar { background: #f0f4f0; border: 1px solid #d0e0d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: flex; gap: 12px; align-items: center; }
  .toolbar button { padding: 8px 14px; background: #1f6b48; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
  h1 { font-family: 'Lora', Georgia, serif; font-weight: 500; font-size: 32px; margin: 0 0 4px; }
  .subtitle { color: #5b6b73; font-size: 14px; margin-bottom: 24px; }
  .panel { background: #fafbfa; border: 1px solid #e0e5e0; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; }
  .panel h2 { font-family: 'Lora', Georgia, serif; font-weight: 500; font-size: 16px; margin: 0 0 12px; color: #1f6b48; text-transform: uppercase; letter-spacing: 0.08em; }
  .grid { display: grid; grid-template-columns: 200px 1fr; gap: 4px 16px; font-size: 13px; }
  .grid .label { color: #5b6b73; }
  .grid .val { color: #0a1a0f; }
  .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
  .total-card { background: #1f6b48; color: white; padding: 16px 18px; border-radius: 8px; }
  .total-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.8; }
  .total-card .val { font-family: 'Lora', Georgia, serif; font-size: 24px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th, td { padding: 8px 6px; text-align: left; border-bottom: 1px solid #e8ecea; }
  th { background: #f0f4f0; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #5b6b73; }
  td.num { font-family: ui-monospace, Menlo, monospace; text-align: right; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 11px; background: #f0f4f0; padding: 1px 4px; border-radius: 3px; }
  small { color: #5b6b73; }
  .footer { margin-top: 32px; font-size: 11px; color: #5b6b73; line-height: 1.6; border-top: 1px solid #e0e5e0; padding-top: 16px; }
  @media print { .toolbar { display: none; } }
</style>
</head><body>

<div class="toolbar">
  <button onclick="window.print()">🖨 Print / Save as PDF</button>
  <a href="?year=${year}&format=csv" style="font-size:13px;color:#1f6b48;">Download CSV</a>
</div>

<h1>Agent Annual Statement</h1>
<div class="subtitle">Calendar year ${year} · Generated ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

<div class="panel">
  <h2>Paying entity</h2>
  <div class="grid">
    <div class="label">Company</div><div class="val">Montree Limited</div>
    <div class="label">Jurisdiction</div><div class="val">Hong Kong SAR</div>
    <div class="label">Company registration</div><div class="val">CR 80261361</div>
    <div class="label">Business activity</div><div class="val">Software as a Service — classroom management for Montessori schools</div>
  </div>
</div>

<div class="panel">
  <h2>Recipient (agent)</h2>
  <div class="grid">
    <div class="label">Name</div><div class="val">${escapeHtml(agent.name || '—')}</div>
    <div class="label">Email</div><div class="val">${escapeHtml(agent.email || '—')}</div>
    <div class="label">Payout method</div><div class="val">${escapeHtml(agent.payout_method || 'stripe_connect')}</div>
  </div>
</div>

<div class="totals">
  <div class="total-card">
    <div class="label">Total paid in ${year}</div>
    <div class="val">${fmtUsd(totalUsd)}</div>
  </div>
  <div class="total-card" style="background:#0a1a0f;">
    <div class="label">Number of payouts</div>
    <div class="val">${payouts.length}</div>
  </div>
  <div class="total-card" style="background:#5b6b73;">
    <div class="label">Gross revenue attributed</div>
    <div class="val">${fmtUsd(totalGross)}</div>
  </div>
</div>

<div class="panel">
  <h2>Payments</h2>
  ${payouts.length === 0
    ? '<p style="color:#5b6b73;font-size:13px;">No paid payouts in this calendar year.</p>'
    : `<table>
        <thead><tr>
          <th>Paid on</th>
          <th>Period</th>
          <th>School</th>
          <th class="num">Amount USD</th>
          <th>Local amount</th>
          <th>Method</th>
          <th>Reference</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`}
</div>

<div class="footer">
  <strong>For the recipient's records.</strong> This document summarises the payments Montree Limited (a company incorporated in Hong Kong SAR) made to the named agent during the calendar year ${year}. The agent acted as an independent contractor / referral partner. Montree Limited has not withheld tax on these payments — the agent is responsible for declaring this income to their own tax authority under the laws of their jurisdiction of residence.
  <br/><br/>
  If your receiving bank requires source-of-funds documentation, this statement plus the wire references listed above should be sufficient. For additional documentation (such as a notarised version of this statement or a tax invoice in your jurisdiction's format), contact tredoux555@gmail.com.
</div>

</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
