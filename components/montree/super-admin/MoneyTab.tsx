'use client';

// components/montree/super-admin/MoneyTab.tsx
// Phase 6 — Super-admin Money tab.
//
// What it shows:
//   - Period selector (current month, prior months, custom YYYY-MM)
//   - Period totals header (total payout / pending / paid / cancelled / failed)
//   - "Calculate now" trigger → fires /api/montree/super-admin/payouts/calculate
//   - Per-school payout cards with full math + state actions
//
// State actions:
//   - Mark paid (stripe_transfer_id + paid_by_method)
//   - Cancel (notes)
//   - Manual override (payout_usd + lock against future recalcs)
//   - Clear override (unlocks for next calc)

import { useCallback, useEffect, useMemo, useState } from 'react';
import MoneyLedgerView from './MoneyLedgerView';

interface PayoutRow {
  id: string;
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
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  stripe_transfer_id: string | null;
  paid_at: string | null;
  paid_by_method: string | null;
  payout_currency: string | null;
  fx_rate_used: number | null;
  source_tx_count: number;
  is_manual_override: boolean;
  notes: string | null;
  calculated_at: string;
  created_at: string;
  updated_at: string;
  // Stripe Connect status (joined from agent row at GET time).
  agent_stripe_connect_status: string | null;
  agent_payouts_enabled: boolean;
  agent_charges_enabled: boolean;
  agent_has_connect_account: boolean;
}

interface PeriodTotal {
  period_month: string;
  total_payout_usd: number;
  pending_usd: number;
  paid_usd: number;
  cancelled_usd: number;
  failed_usd: number;
  row_count: number;
}

interface MoneyTabProps {
  sessionToken: string;
}

// Build a list of the last 12 YYYY-MM values (current month + 11 prior).
function recentMonths(count = 12): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    out.push(`${y}-${m}`);
  }
  return out;
}

function fmtUsd(n: number | null | undefined): string {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

type SubView = 'payouts' | 'revenue' | 'direct_costs' | 'commissions' | 'op_expenses' | 'fx_adjustments';

export default function MoneyTab({ sessionToken }: MoneyTabProps) {
  const months = useMemo(() => recentMonths(12), []);
  const [periodMonth, setPeriodMonth] = useState<string>(months[0]);
  const [subView, setSubView] = useState<SubView>('payouts');
  // P&L summary for the current period — fetched whenever periodMonth changes.
  const [pnlSummary, setPnlSummary] = useState<{
    income: number;
    direct_cost: number;
    commission: number;
    op_expense: number;
    fx_adjustment: number;
    margin: number;
  } | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [periodTotals, setPeriodTotals] = useState<PeriodTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOverrideFor, setShowOverrideFor] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [showPaidFor, setShowPaidFor] = useState<string | null>(null);
  const [paidTransferId, setPaidTransferId] = useState<string>('');
  const [paidMethod, setPaidMethod] = useState<'stripe_connect' | 'manual_wire' | 'other'>('stripe_connect');

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const url = `/api/montree/super-admin/payouts?period_month=${encodeURIComponent(periodMonth)}`;
      const res = await fetch(url, { headers: { 'x-super-admin-token': sessionToken } });
      if (!res.ok) {
        setErrorMessage(`Failed to load payouts (HTTP ${res.status})`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPayouts((data.payouts || []) as PayoutRow[]);
      setPeriodTotals((data.period_totals || []) as PeriodTotal[]);
    } catch (err) {
      console.error('[MoneyTab] fetch failed', err);
      setErrorMessage('Could not load payouts');
    } finally {
      setLoading(false);
    }
  }, [periodMonth, sessionToken]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // Fetch the P&L summary alongside payouts so the header card stays accurate.
  const fetchPnl = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/montree/super-admin/finance/ledger?period_month=${encodeURIComponent(periodMonth)}`,
        { headers: { 'x-super-admin-token': sessionToken } }
      );
      if (!res.ok) return;
      const data = await res.json();
      setPnlSummary(data.pnl || null);
    } catch {
      /* non-fatal — the header just shows null */
    }
  }, [periodMonth, sessionToken]);

  useEffect(() => {
    fetchPnl();
  }, [fetchPnl]);

  const calculate = useCallback(async () => {
    if (calculating) return;
    setCalculating(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/montree/super-admin/payouts/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: JSON.stringify({ period_month: periodMonth }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErrorMessage(j.error || `Calculation failed (HTTP ${res.status})`);
        return;
      }
      await fetchPayouts();
    } catch (err) {
      console.error('[MoneyTab] calculate failed', err);
      setErrorMessage('Could not calculate payouts');
    } finally {
      setCalculating(false);
    }
  }, [calculating, periodMonth, sessionToken, fetchPayouts]);

  const wirePayout = useCallback(
    async (row: PayoutRow) => {
      if (actionBusy === row.id) return;
      if (!row.agent_has_connect_account) {
        setErrorMessage(
          `${row.agent_name || 'Agent'} hasn't set up Stripe Connect yet. Send them an onboarding link first.`
        );
        return;
      }
      if (!row.agent_payouts_enabled) {
        setErrorMessage(
          `${row.agent_name || 'Agent'}'s Stripe Connect isn't payout-ready yet (${
            row.agent_stripe_connect_status || 'unknown'
          }). Tell them to finish onboarding.`
        );
        return;
      }
      const confirmed = window.confirm(
        `Wire $${row.payout_usd.toFixed(2)} to ${row.agent_name || 'agent'} via Stripe Connect?\n\nThis IS a real money movement. Status will auto-flip to paid.`
      );
      if (!confirmed) return;
      setActionBusy(row.id);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/montree/super-admin/payouts/${row.id}/wire`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': sessionToken,
          },
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMessage(j.error || `Wire failed (HTTP ${res.status})`);
          return;
        }
        await fetchPayouts();
      } catch (err) {
        console.error('[MoneyTab] wire failed', err);
        setErrorMessage('Wire request failed');
      } finally {
        setActionBusy(null);
      }
    },
    [actionBusy, sessionToken, fetchPayouts]
  );

  const doPatch = useCallback(
    async (
      payoutId: string,
      action: 'mark_paid' | 'mark_failed' | 'cancel' | 'manual_override' | 'clear_override',
      extra: Record<string, unknown> = {}
    ) => {
      setActionBusy(payoutId);
      setErrorMessage(null);
      try {
        const res = await fetch('/api/montree/super-admin/payouts', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': sessionToken,
          },
          body: JSON.stringify({ payout_id: payoutId, action, ...extra }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setErrorMessage(j.error || `Action failed (HTTP ${res.status})`);
          return false;
        }
        await fetchPayouts();
        return true;
      } catch (err) {
        console.error('[MoneyTab] patch failed', err);
        setErrorMessage('Action failed');
        return false;
      } finally {
        setActionBusy(null);
      }
    },
    [sessionToken, fetchPayouts]
  );

  const currentTotal = useMemo(
    () => periodTotals.find((t) => t.period_month === periodMonth),
    [periodTotals, periodMonth]
  );

  return (
    <div className="space-y-5">
      {/* Header — period selector + calculate trigger */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400">Period</span>
          <select
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/70 border border-slate-700 rounded-lg text-sm text-white"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={calculate}
          disabled={calculating}
          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm font-medium disabled:opacity-50"
          title="Recalculate payouts for the selected month from montree_finance_transactions. Already-paid rows are immutable; manually-overridden rows are skipped."
        >
          {calculating ? '⏳ Calculating…' : '⚙️ Calculate now'}
        </button>
        <button
          onClick={fetchPayouts}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
        {/* Accountant pack — CSV download for the period. Token goes in the URL
            via a temporary form POST trick so the browser triggers the download
            with proper Content-Disposition. Easier: just hit the URL with the
            header via JS and create a blob. */}
        <button
          onClick={async () => {
            try {
              const res = await fetch(
                `/api/montree/super-admin/finance/export?period_month=${encodeURIComponent(periodMonth)}&format=csv`,
                { headers: { 'x-super-admin-token': sessionToken } }
              );
              if (!res.ok) {
                setErrorMessage(`Export failed (HTTP ${res.status})`);
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `montree-finance-${periodMonth}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (err) {
              console.error('[MoneyTab export]', err);
              setErrorMessage('Export failed');
            }
          }}
          className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 rounded-lg text-sm font-medium"
          title="Download the monthly accountant pack: P&L + per-school revenue + per-agent commission + Stripe reconciliation + full ledger backup (CSV, multi-section)."
        >
          📥 Accountant pack (CSV)
        </button>
        <button
          onClick={() => {
            const url = `/api/montree/super-admin/finance/export/print?period_month=${encodeURIComponent(periodMonth)}&token=${encodeURIComponent(sessionToken)}`;
            window.open(url, '_blank', 'noopener');
          }}
          className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded-lg text-sm font-medium"
          title="Open a printable HTML version. Cmd+P to save as PDF."
        >
          🖨 Print / PDF
        </button>
      </div>

      {/* P&L summary header — the four columns of the monthly accounting story */}
      {pnlSummary && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/70 to-slate-900/40 border border-slate-800">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">
            P&amp;L · {periodMonth}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Tile label="Revenue" value={fmtUsd(pnlSummary.income)} accent="emerald" />
            <Tile label="− Direct costs" value={fmtUsd(pnlSummary.direct_cost)} accent="slate" />
            <Tile label="− Commissions" value={fmtUsd(pnlSummary.commission)} accent="slate" />
            <Tile label="− Op-expenses" value={fmtUsd(pnlSummary.op_expense)} accent="slate" />
            <Tile
              label="= Margin"
              value={fmtUsd(pnlSummary.margin)}
              accent={pnlSummary.margin >= 0 ? 'white' : 'red'}
            />
          </div>
        </div>
      )}

      {/* Sub-view nav */}
      <div
        className="flex gap-1 overflow-x-auto pb-1"
        style={{ borderBottom: '1px solid rgba(52,211,153,0.18)' }}
      >
        <SubViewPill active={subView === 'payouts'} onClick={() => setSubView('payouts')} label="💸 Payouts" />
        <SubViewPill active={subView === 'revenue'} onClick={() => setSubView('revenue')} label="📈 Revenue" />
        <SubViewPill active={subView === 'direct_costs'} onClick={() => setSubView('direct_costs')} label="📉 Direct costs" />
        <SubViewPill active={subView === 'commissions'} onClick={() => setSubView('commissions')} label="🤝 Commissions" />
        <SubViewPill active={subView === 'op_expenses'} onClick={() => setSubView('op_expenses')} label="🧾 Op-expenses" />
        <SubViewPill active={subView === 'fx_adjustments'} onClick={() => setSubView('fx_adjustments')} label="💱 FX" />
      </div>

      {/* Payouts period totals — only shown in payouts view */}
      {subView === 'payouts' && currentTotal && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <Tile label="Total" value={fmtUsd(currentTotal.total_payout_usd)} accent="white" />
          <Tile label="Pending" value={fmtUsd(currentTotal.pending_usd)} accent="amber" />
          <Tile label="Paid" value={fmtUsd(currentTotal.paid_usd)} accent="emerald" />
          <Tile label="Cancelled" value={fmtUsd(currentTotal.cancelled_usd)} accent="slate" />
          <Tile label="Failed" value={fmtUsd(currentTotal.failed_usd)} accent="red" />
        </div>
      )}

      {/* Ledger views render their own everything */}
      {subView !== 'payouts' && (
        <MoneyLedgerView sessionToken={sessionToken} view={subView} periodMonth={periodMonth} />
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Payouts list — only render in payouts sub-view */}
      {subView === 'payouts' && (
        loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">Loading payouts…</div>
      ) : payouts.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
          <p className="text-slate-300 text-sm font-medium mb-1">No payouts for {periodMonth} yet.</p>
          <p className="text-slate-500 text-xs">
            Tap <span className="text-emerald-400">⚙️ Calculate now</span> to aggregate finance transactions for this month.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((row) => {
            const isOverrideMode = showOverrideFor === row.id;
            const isPaidMode = showPaidFor === row.id;
            const statusColor =
              row.status === 'paid'
                ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                : row.status === 'pending'
                  ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                  : row.status === 'cancelled'
                    ? 'text-slate-400 bg-slate-700/30 border-slate-700'
                    : 'text-red-400 bg-red-500/15 border-red-500/30';
            return (
              <div
                key={row.id}
                className="p-4 rounded-xl bg-slate-900/55 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-semibold text-sm">{row.school_name || 'Unknown school'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${statusColor}`}>
                        {row.status}
                      </span>
                      {row.is_manual_override && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-purple-500/40 bg-purple-500/15 text-purple-300">
                          override
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      🤝 {row.agent_name || 'Unknown agent'} · {row.revenue_share_pct}% share ·{' '}
                      <span className="text-slate-500">{row.source_tx_count} tx</span>
                    </p>
                    {/* Stripe Connect status pill — surfaces wire-readiness inline so super-admin
                        doesn't try to wire to an agent who hasn't onboarded yet. */}
                    <p className="text-[11px] mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500">Stripe Connect:</span>
                      {!row.agent_has_connect_account ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/40 text-slate-400 border border-slate-700">
                          Not set up
                        </span>
                      ) : row.agent_payouts_enabled ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          ✓ Ready to wire
                        </span>
                      ) : row.agent_stripe_connect_status === 'restricted' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-300 border border-red-500/30">
                          Restricted
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {row.agent_stripe_connect_status || 'Onboarding'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-emerald-400 text-lg font-bold leading-tight">{fmtUsd(row.payout_usd)}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">payout</p>
                  </div>
                </div>

                {/* Math line */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3 text-xs">
                  <Stat label="Gross" value={fmtUsd(row.gross_revenue_usd)} color="text-emerald-300" />
                  <Stat label="Stripe fee" value={`-${fmtUsd(row.stripe_fee_usd)}`} color="text-slate-400" />
                  <Stat label="Anthropic" value={`-${fmtUsd(row.anthropic_cost_usd)}`} color="text-slate-400" />
                  <Stat label="OpenAI" value={`-${fmtUsd(row.openai_cost_usd)}`} color="text-slate-400" />
                  <Stat label="Other cost" value={`-${fmtUsd(row.other_direct_cost_usd)}`} color="text-slate-400" />
                  <Stat
                    label="Net"
                    value={fmtUsd(row.net_usd)}
                    color={row.net_usd < 0 ? 'text-red-400' : 'text-white'}
                  />
                </div>

                {/* Paid details (if paid) */}
                {row.status === 'paid' && (
                  <div className="text-xs text-slate-400 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>💸 paid {fmtDate(row.paid_at)}</span>
                    {row.paid_by_method && <span>· {row.paid_by_method.replace('_', ' ')}</span>}
                    {row.stripe_transfer_id && (
                      <a
                        href={`https://dashboard.stripe.com/connect/transfers/${row.stripe_transfer_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-400 hover:text-blue-300 underline"
                        title="Open in Stripe Dashboard"
                      >
                        · 🔗 {row.stripe_transfer_id}
                      </a>
                    )}
                  </div>
                )}

                {/* Notes */}
                {row.notes && (
                  <p className="text-xs italic text-slate-500 mb-3">📝 {row.notes}</p>
                )}

                {/* Action row */}
                <div className="flex flex-wrap gap-2">
                  {row.status === 'pending' && !isPaidMode && !isOverrideMode && (
                    <>
                      {/* Wire via Stripe Connect — gated on agent.payouts_enabled.
                          When ready, this is the one-click path that moves real money
                          + auto-flips the row. Falls back to manual Mark paid below. */}
                      <button
                        onClick={() => wirePayout(row)}
                        disabled={
                          actionBusy === row.id ||
                          !row.agent_has_connect_account ||
                          !row.agent_payouts_enabled
                        }
                        title={
                          !row.agent_has_connect_account
                            ? 'Agent has no Stripe Connect account yet.'
                            : !row.agent_payouts_enabled
                              ? 'Stripe Connect not payout-ready yet.'
                              : 'Wire via Stripe Connect (real money movement)'
                        }
                        className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ⚡ Wire via Stripe
                      </button>
                      <button
                        onClick={() => {
                          setShowPaidFor(row.id);
                          setPaidTransferId('');
                          setPaidMethod('stripe_connect');
                        }}
                        disabled={actionBusy === row.id}
                        className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded text-xs font-medium disabled:opacity-50"
                        title="Manually mark paid — use if you wired outside Stripe Connect (manual bank wire, etc.)"
                      >
                        💸 Mark paid
                      </button>
                      <button
                        onClick={() => {
                          const note = window.prompt('Cancel this payout — optional note:');
                          if (note === null) return;
                          doPatch(row.id, 'cancel', { notes: note || null });
                        }}
                        disabled={actionBusy === row.id}
                        className="px-2.5 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs font-medium disabled:opacity-50"
                      >
                        ✕ Cancel
                      </button>
                      <button
                        onClick={() => {
                          setShowOverrideFor(row.id);
                          setOverrideValue(String(row.payout_usd));
                        }}
                        disabled={actionBusy === row.id}
                        className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded text-xs font-medium disabled:opacity-50"
                      >
                        ✏️ Override
                      </button>
                      <button
                        onClick={() => {
                          const note = window.prompt(
                            'Mark failed — optional note describing the failure (Stripe error, bank rejection, etc.):'
                          );
                          if (note === null) return;
                          doPatch(row.id, 'mark_failed', { notes: note || null });
                        }}
                        disabled={actionBusy === row.id}
                        className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded text-xs font-medium disabled:opacity-50"
                        title="Mark as failed (e.g. Stripe transfer rejected). Doesn't move money; just flags for follow-up."
                      >
                        ⚠ Mark failed
                      </button>
                    </>
                  )}
                  {row.is_manual_override && !isOverrideMode && row.status !== 'paid' && (
                    <button
                      onClick={() => doPatch(row.id, 'clear_override')}
                      disabled={actionBusy === row.id}
                      className="px-2.5 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs font-medium disabled:opacity-50"
                    >
                      ↩️ Clear override
                    </button>
                  )}
                </div>

                {/* Paid input row (inline) */}
                {isPaidMode && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/25 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="text-xs text-slate-400">Method:</label>
                      <select
                        value={paidMethod}
                        onChange={(e) => setPaidMethod(e.target.value as typeof paidMethod)}
                        className="px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="stripe_connect">Stripe Connect</option>
                        <option value="manual_wire">Manual wire</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="text"
                        value={paidTransferId}
                        onChange={(e) => setPaidTransferId(e.target.value)}
                        placeholder="stripe_transfer_id (optional)"
                        className="flex-1 min-w-[160px] px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white font-mono placeholder:text-slate-600"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const ok = await doPatch(row.id, 'mark_paid', {
                            stripe_transfer_id: paidTransferId.trim() || undefined,
                            paid_by_method: paidMethod,
                          });
                          if (ok) {
                            setShowPaidFor(null);
                            setPaidTransferId('');
                          }
                        }}
                        disabled={actionBusy === row.id}
                        className="px-3 py-1 bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-200 rounded text-xs font-semibold disabled:opacity-50"
                      >
                        ✓ Confirm paid
                      </button>
                      <button
                        onClick={() => setShowPaidFor(null)}
                        className="px-3 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Override input row (inline) */}
                {isOverrideMode && (
                  <div className="mt-3 p-3 rounded-lg bg-purple-500/8 border border-purple-500/25 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="text-xs text-slate-400">New payout (USD):</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={overrideValue}
                        onChange={(e) => setOverrideValue(e.target.value)}
                        className="px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white w-32"
                      />
                      <span className="text-xs text-slate-500">
                        Locks against future recalcs until cleared.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const v = Number(overrideValue);
                          if (Number.isNaN(v) || v < 0) {
                            setErrorMessage('Payout must be a non-negative number');
                            return;
                          }
                          const note = window.prompt('Optional override note:') || null;
                          const ok = await doPatch(row.id, 'manual_override', {
                            payout_usd: v,
                            notes: note,
                          });
                          if (ok) setShowOverrideFor(null);
                        }}
                        disabled={actionBusy === row.id}
                        className="px-3 py-1 bg-purple-500/25 hover:bg-purple-500/40 border border-purple-500/40 text-purple-200 rounded text-xs font-semibold disabled:opacity-50"
                      >
                        ✓ Save override
                      </button>
                      <button
                        onClick={() => setShowOverrideFor(null)}
                        className="px-3 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Small atoms ────────────────────────────────────────────────────────────

function SubViewPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 text-sm font-medium rounded-t-lg transition-colors ${
        active
          ? 'text-emerald-300 bg-emerald-500/15 border-b-2 border-emerald-400'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
      }`}
    >
      {label}
    </button>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent: 'white' | 'amber' | 'emerald' | 'slate' | 'red' }) {
  const colorMap: Record<string, string> = {
    white: 'text-white',
    amber: 'text-amber-300',
    emerald: 'text-emerald-400',
    slate: 'text-slate-400',
    red: 'text-red-400',
  };
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${colorMap[accent]}`}>{value}</p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">{label}</p>
      <p className={`text-xs font-mono ${color}`}>{value}</p>
    </div>
  );
}
