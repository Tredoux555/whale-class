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
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

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
  agent_stripe_connect_account_id: string | null;
  agent_payouts_enabled: boolean;
  agent_charges_enabled: boolean;
  agent_has_connect_account: boolean;
  // Session 109 — payout_method drives the wire-button branch.
  agent_payout_method: 'stripe_connect' | 'manual_wire';
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

type SubView = 'payouts' | 'revenue' | 'direct_costs' | 'commissions' | 'op_expenses' | 'fx_adjustments';

export default function MoneyTab({ sessionToken }: MoneyTabProps) {
  const { t, locale } = useI18n();
  const fmtDate = useCallback((iso: string | null): string => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(getIntlLocale(locale), { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  }, [locale]);
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

  // Session 109 — manual wire recording modal (for manual_wire agents). Mirrors
  // the showOverrideFor / showPaidFor modal pattern but captures wire ref +
  // FX details + local-currency amount so the ledger entry is complete.
  const [showManualWireFor, setShowManualWireFor] = useState<string | null>(null);
  const [mwWireRef, setMwWireRef] = useState<string>('');
  const [mwPaidAt, setMwPaidAt] = useState<string>(''); // ISO date input
  const [mwCurrency, setMwCurrency] = useState<string>('USD');
  const [mwFxRate, setMwFxRate] = useState<string>('1.0');
  const [mwLocalAmount, setMwLocalAmount] = useState<string>('');
  const [mwNotes, setMwNotes] = useState<string>('');

  // Session 109 Phase B3 — period locks. Map of period_month → closed_at.
  const [periodLocks, setPeriodLocks] = useState<Map<string, string>>(new Map());
  const isCurrentPeriodClosed = periodLocks.has(periodMonth);
  const [lockBusy, setLockBusy] = useState(false);

  // Session 109 Phase B4 — reconciliation report. Auto-fetches per period.
  interface ReconReport {
    period_month: string;
    stripe_side: {
      gross_revenue_usd: number;
      stripe_fees_usd: number;
      net_received_usd: number;
    };
    internal_ledger: {
      total_rows: number;
      breakdown: {
        commissions_paid: number;
        api_anthropic: number;
        api_openai: number;
      };
    };
    billing_history_cross_check: {
      paid_invoices_count: number;
      paid_total_usd: number;
      diff_vs_stripe_side_usd: number;
    };
    bank_side: { total_usd: number | null; diff_vs_stripe_net_usd: number | null } | null;
    findings: string[];
  }
  const [recon, setRecon] = useState<ReconReport | null>(null);
  const [reconLoading, setReconLoading] = useState(false);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const url = `/api/montree/super-admin/payouts?period_month=${encodeURIComponent(periodMonth)}`;
      const res = await fetch(url, { headers: { 'x-super-admin-token': sessionToken } });
      if (!res.ok) {
        setErrorMessage(t('money.failedLoadHttp', { code: res.status }));
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPayouts((data.payouts || []) as PayoutRow[]);
      setPeriodTotals((data.period_totals || []) as PeriodTotal[]);
    } catch (err) {
      console.error('[MoneyTab] fetch failed', err);
      setErrorMessage(t('money.couldNotLoad'));
    } finally {
      setLoading(false);
    }
  }, [periodMonth, sessionToken, t]);

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
        setErrorMessage(j.error || t('money.calcFailedHttp', { code: res.status }));
        return;
      }
      await fetchPayouts();
    } catch (err) {
      console.error('[MoneyTab] calculate failed', err);
      setErrorMessage(t('money.couldNotCalculate'));
    } finally {
      setCalculating(false);
    }
  }, [calculating, periodMonth, sessionToken, fetchPayouts, t]);

  // Session 109 B3 — fetch all period locks (cheap query, fires alongside payouts).
  const fetchPeriodLocks = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/super-admin/finance/period-locks', {
        headers: { 'x-super-admin-token': sessionToken },
      });
      if (!res.ok) return;
      const data = await res.json();
      const m = new Map<string, string>();
      for (const lock of data.locks || []) {
        if (lock.closed_at) m.set(lock.period_month, lock.closed_at);
      }
      setPeriodLocks(m);
    } catch (err) {
      console.error('[MoneyTab] period-locks fetch failed', err);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchPeriodLocks();
  }, [fetchPeriodLocks]);

  // Session 109 B4 — reconciliation report fetcher.
  const fetchReconciliation = useCallback(async () => {
    setReconLoading(true);
    try {
      const res = await fetch(
        `/api/montree/super-admin/finance/reconciliation?period_month=${encodeURIComponent(periodMonth)}`,
        { headers: { 'x-super-admin-token': sessionToken } }
      );
      if (!res.ok) {
        setRecon(null);
        return;
      }
      const data = await res.json();
      setRecon(data);
    } catch (err) {
      console.error('[MoneyTab] reconciliation fetch failed', err);
      setRecon(null);
    } finally {
      setReconLoading(false);
    }
  }, [periodMonth, sessionToken]);

  useEffect(() => {
    fetchReconciliation();
  }, [fetchReconciliation]);

  const closePeriod = useCallback(async () => {
    if (lockBusy) return;
    const notes = window.prompt(
      `Close period ${periodMonth}?\n\nOnce closed, mutations to payouts and finance_transactions for this period will be refused. Enter notes (optional):`,
      ''
    );
    if (notes === null) return;
    setLockBusy(true);
    try {
      const res = await fetch('/api/montree/super-admin/finance/period-locks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: JSON.stringify({ period_month: periodMonth, notes: notes.trim() || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(j.error || `Close failed (HTTP ${res.status})`);
        return;
      }
      await fetchPeriodLocks();
    } catch (err) {
      console.error('[MoneyTab] close period failed', err);
      setErrorMessage('Network error closing period.');
    } finally {
      setLockBusy(false);
    }
  }, [periodMonth, sessionToken, fetchPeriodLocks, lockBusy]);

  const reopenPeriod = useCallback(async () => {
    if (lockBusy) return;
    const notes = window.prompt(
      `Reopen period ${periodMonth}?\n\nAudit trail requires a reason — why are you reopening?`,
      ''
    );
    if (notes === null) return;
    if (!notes.trim()) {
      setErrorMessage('Notes required when reopening a period (audit trail).');
      return;
    }
    setLockBusy(true);
    try {
      const res = await fetch('/api/montree/super-admin/finance/period-locks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: JSON.stringify({ period_month: periodMonth, notes: notes.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(j.error || `Reopen failed (HTTP ${res.status})`);
        return;
      }
      await fetchPeriodLocks();
    } catch (err) {
      console.error('[MoneyTab] reopen period failed', err);
      setErrorMessage('Network error reopening period.');
    } finally {
      setLockBusy(false);
    }
  }, [periodMonth, sessionToken, fetchPeriodLocks, lockBusy]);

  // Session 109 — opens the manual-wire-record modal pre-populated with sensible
  // defaults (today's date, USD, FX rate 1.0). Submit POSTs to the new route.
  const openManualWireModal = useCallback((row: PayoutRow) => {
    setShowManualWireFor(row.id);
    setMwWireRef('');
    // YYYY-MM-DD for the <input type="date">
    setMwPaidAt(new Date().toISOString().slice(0, 10));
    setMwCurrency('USD');
    setMwFxRate('1.0');
    setMwLocalAmount(row.payout_usd.toFixed(2));
    setMwNotes('');
  }, []);

  const submitManualWire = useCallback(
    async (row: PayoutRow) => {
      if (actionBusy === row.id) return;
      const wireRef = mwWireRef.trim();
      if (!wireRef) {
        setErrorMessage('Wire reference is required (Wise ID, SWIFT ref, etc.)');
        return;
      }
      setActionBusy(row.id);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/montree/super-admin/payouts/${row.id}/record-wire`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': sessionToken,
          },
          body: JSON.stringify({
            wire_ref: wireRef,
            paid_at: mwPaidAt ? new Date(mwPaidAt).toISOString() : undefined,
            payout_currency: mwCurrency.trim().toUpperCase() || 'USD',
            fx_rate_used: Number(mwFxRate) || 1.0,
            payout_local_amount: mwLocalAmount ? Number(mwLocalAmount) : undefined,
            notes: mwNotes.trim() || undefined,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMessage(j.detail || j.error || `Record-wire failed (HTTP ${res.status})`);
          return;
        }
        setShowManualWireFor(null);
        await fetchPayouts();
      } catch (err) {
        console.error('[MoneyTab] record-wire failed', err);
        setErrorMessage('Network error recording wire.');
      } finally {
        setActionBusy(null);
      }
    },
    [actionBusy, sessionToken, fetchPayouts, mwWireRef, mwPaidAt, mwCurrency, mwFxRate, mwLocalAmount, mwNotes]
  );

  const wirePayout = useCallback(
    async (row: PayoutRow) => {
      if (actionBusy === row.id) return;
      // Session 109 — block Stripe wire on manual_wire agents; surface the
      // manual-wire modal instead.
      if (row.agent_payout_method === 'manual_wire') {
        openManualWireModal(row);
        return;
      }
      if (!row.agent_has_connect_account) {
        setErrorMessage(
          t('money.errNoConnect', { name: row.agent_name || t('money.agentFallback') })
        );
        return;
      }
      if (!row.agent_payouts_enabled) {
        setErrorMessage(
          t('money.errNotReady', {
            name: row.agent_name || t('money.agentFallback'),
            status: row.agent_stripe_connect_status || t('money.unknown'),
          })
        );
        return;
      }
      const confirmed = window.confirm(
        t('money.confirmWire', {
          amount: row.payout_usd.toFixed(2),
          name: row.agent_name || t('money.agentFallbackLower'),
        })
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
          setErrorMessage(j.error || t('money.wireFailedHttp', { code: res.status }));
          return;
        }
        await fetchPayouts();
      } catch (err) {
        console.error('[MoneyTab] wire failed', err);
        setErrorMessage(t('money.wireRequestFailed'));
      } finally {
        setActionBusy(null);
      }
    },
    [actionBusy, sessionToken, fetchPayouts, t]
  );

  const doPatch = useCallback(
    async (
      payoutId: string,
      action: 'mark_paid' | 'mark_failed' | 'cancel' | 'manual_override' | 'clear_override' | 'reset_failed',
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
          setErrorMessage(j.error || t('money.actionFailedHttp', { code: res.status }));
          return false;
        }
        await fetchPayouts();
        return true;
      } catch (err) {
        console.error('[MoneyTab] patch failed', err);
        setErrorMessage(t('money.actionFailed'));
        return false;
      } finally {
        setActionBusy(null);
      }
    },
    [sessionToken, fetchPayouts, t]
  );

  const currentTotal = useMemo(
    () => periodTotals.find((row) => row.period_month === periodMonth),
    [periodTotals, periodMonth]
  );

  return (
    <div className="space-y-5">
      {/* Header — period selector + calculate trigger */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400">{t('money.period')}</span>
          <select
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/70 border border-slate-700 rounded-lg text-sm text-white"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}{periodLocks.has(m) ? ' 🔒' : ''}
              </option>
            ))}
          </select>
          {/* Session 109 B3 — period lock state + toggle. */}
          {isCurrentPeriodClosed ? (
            <button
              onClick={reopenPeriod}
              disabled={lockBusy}
              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded text-xs font-medium disabled:opacity-50"
              title={`Closed ${new Date(periodLocks.get(periodMonth) || '').toLocaleDateString()} — reopen to edit (audit-logged)`}
            >
              🔒 Reopen
            </button>
          ) : (
            <button
              onClick={closePeriod}
              disabled={lockBusy}
              className="px-2.5 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs disabled:opacity-50"
              title="Close this period so mutations are refused (audit-friendly immutability)"
            >
              🔓 Close month
            </button>
          )}
        </div>
        <button
          onClick={calculate}
          disabled={calculating}
          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm font-medium disabled:opacity-50"
          title={t('money.calculateNowTooltip')}
        >
          {calculating ? t('money.calculating') : t('money.calculateNow')}
        </button>
        <button
          onClick={fetchPayouts}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? '⏳' : '🔄'} {t('common.refresh')}
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
                setErrorMessage(t('money.exportFailedHttp', { code: res.status }));
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
              setErrorMessage(t('money.exportFailed'));
            }
          }}
          className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 rounded-lg text-sm font-medium"
          title={t('money.accountantPackTooltip')}
        >
          {t('money.accountantPack')}
        </button>
        <button
          onClick={() => {
            const url = `/api/montree/super-admin/finance/export/print?period_month=${encodeURIComponent(periodMonth)}&token=${encodeURIComponent(sessionToken)}`;
            window.open(url, '_blank', 'noopener');
          }}
          className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded-lg text-sm font-medium"
          title={t('money.printPdfTooltip')}
        >
          {t('money.printPdf')}
        </button>
      </div>

      {/* P&L summary header — the four columns of the monthly accounting story */}
      {pnlSummary && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/70 to-slate-900/40 border border-slate-800">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">
            {t('money.pnlLabel')} · {periodMonth}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Tile label={t('money.tileRevenue')} value={fmtUsd(pnlSummary.income)} accent="emerald" />
            <Tile label={t('money.tileDirectCosts')} value={fmtUsd(pnlSummary.direct_cost)} accent="slate" />
            <Tile label={t('money.tileCommissions')} value={fmtUsd(pnlSummary.commission)} accent="slate" />
            <Tile label={t('money.tileOpExpenses')} value={fmtUsd(pnlSummary.op_expense)} accent="slate" />
            <Tile
              label={t('money.tileMargin')}
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
        <SubViewPill active={subView === 'payouts'} onClick={() => setSubView('payouts')} label={t('money.subView.payouts')} />
        <SubViewPill active={subView === 'revenue'} onClick={() => setSubView('revenue')} label={t('money.subView.revenue')} />
        <SubViewPill active={subView === 'direct_costs'} onClick={() => setSubView('direct_costs')} label={t('money.subView.directCosts')} />
        <SubViewPill active={subView === 'commissions'} onClick={() => setSubView('commissions')} label={t('money.subView.commissions')} />
        <SubViewPill active={subView === 'op_expenses'} onClick={() => setSubView('op_expenses')} label={t('money.subView.opExpenses')} />
        <SubViewPill active={subView === 'fx_adjustments'} onClick={() => setSubView('fx_adjustments')} label={t('money.subView.fx')} />
      </div>

      {/* Payouts period totals — only shown in payouts view */}
      {subView === 'payouts' && currentTotal && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <Tile label={t('money.totalTile')} value={fmtUsd(currentTotal.total_payout_usd)} accent="white" />
          <Tile label={t('money.pendingTile')} value={fmtUsd(currentTotal.pending_usd)} accent="amber" />
          <Tile label={t('money.paidTile')} value={fmtUsd(currentTotal.paid_usd)} accent="emerald" />
          <Tile label={t('money.cancelledTile')} value={fmtUsd(currentTotal.cancelled_usd)} accent="slate" />
          <Tile label={t('money.failedTile')} value={fmtUsd(currentTotal.failed_usd)} accent="red" />
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

      {/* Session 109 B4 — Reconciliation panel. Shows Stripe-side ledger vs
          billing-history cross-check, surfaces findings (silent drift, missing
          bank statement). Only renders on the payouts sub-view. */}
      {subView === 'payouts' && recon && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-white text-sm font-semibold">🧮 Reconciliation — {periodMonth}</h3>
            <button
              onClick={fetchReconciliation}
              disabled={reconLoading}
              className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
            >
              {reconLoading ? '…' : '↻'} Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Stripe side (ledger)</div>
              <div className="text-white font-mono text-sm">${recon.stripe_side.gross_revenue_usd.toFixed(2)} gross</div>
              <div className="text-slate-500 text-xs">−${recon.stripe_side.stripe_fees_usd.toFixed(2)} fees</div>
              <div className="text-emerald-300 font-mono text-sm mt-1">= ${recon.stripe_side.net_received_usd.toFixed(2)} net</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Billing history</div>
              <div className="text-white font-mono text-sm">${recon.billing_history_cross_check.paid_total_usd.toFixed(2)} paid</div>
              <div className="text-slate-500 text-xs">{recon.billing_history_cross_check.paid_invoices_count} invoices</div>
              <div className={`font-mono text-sm mt-1 ${recon.billing_history_cross_check.diff_vs_stripe_side_usd > 1 ? 'text-red-300' : 'text-emerald-300'}`}>
                Δ ${recon.billing_history_cross_check.diff_vs_stripe_side_usd.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Bank side (Wallex)</div>
              {recon.bank_side ? (
                <>
                  <div className="text-white font-mono text-sm">${(recon.bank_side.total_usd || 0).toFixed(2)}</div>
                  <div className={`font-mono text-sm mt-1 ${(recon.bank_side.diff_vs_stripe_net_usd || 0) > 1 ? 'text-red-300' : 'text-emerald-300'}`}>
                    Δ ${(recon.bank_side.diff_vs_stripe_net_usd || 0).toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-xs italic">No statement uploaded</div>
              )}
            </div>
          </div>
          {recon.findings.length > 0 && (
            <ul className="space-y-1">
              {recon.findings.map((f, i) => (
                <li key={i} className="text-xs text-amber-300 bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1.5">
                  ⚠ {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Payouts list — only render in payouts sub-view */}
      {subView === 'payouts' && (
        loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">{t('money.loadingPayouts')}</div>
      ) : payouts.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
          <p className="text-slate-300 text-sm font-medium mb-1">{t('money.noPayouts', { period: periodMonth })}</p>
          <p className="text-slate-500 text-xs">
            {t('money.noPayoutsHintPrefix')} <span className="text-emerald-400">{t('money.calculateNow')}</span> {t('money.noPayoutsHintSuffix')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((row) => {
            const isOverrideMode = showOverrideFor === row.id;
            const isPaidMode = showPaidFor === row.id;
            const isManualWireMode = showManualWireFor === row.id;
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
                      <span className="text-white font-semibold text-sm">{row.school_name || t('money.unknownSchool')}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${statusColor}`}>
                        {t(`money.status.${row.status}` as Parameters<typeof t>[0])}
                      </span>
                      {row.is_manual_override && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-purple-500/40 bg-purple-500/15 text-purple-300">
                          {t('money.overrideTag')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      🤝 {row.agent_name || t('money.unknownAgent')} · {t('money.sharePct', { pct: row.revenue_share_pct })} ·{' '}
                      <span className="text-slate-500">{t('money.txCount', { count: row.source_tx_count })}</span>
                    </p>
                    {/* Stripe Connect status pill — surfaces wire-readiness inline so super-admin
                        doesn't try to wire to an agent who hasn't onboarded yet. */}
                    <p className="text-[11px] mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500">{t('money.stripeConnectLabel')}</span>
                      {!row.agent_has_connect_account ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/40 text-slate-400 border border-slate-700">
                          {t('money.connect.notSetUp')}
                        </span>
                      ) : row.agent_payouts_enabled ? (
                        <a
                          href={`https://dashboard.stripe.com/connect/accounts/${row.agent_stripe_connect_account_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('money.openConnectInStripe')}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:underline"
                        >
                          {t('money.connect.ready')}
                        </a>
                      ) : row.agent_stripe_connect_status === 'restricted' ? (
                        <a
                          href={`https://dashboard.stripe.com/connect/accounts/${row.agent_stripe_connect_account_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('money.openConnectInStripe')}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 hover:underline"
                        >
                          {t('money.connect.restricted')} 🔗
                        </a>
                      ) : (
                        <a
                          href={`https://dashboard.stripe.com/connect/accounts/${row.agent_stripe_connect_account_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('money.openConnectInStripe')}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 hover:underline"
                        >
                          {row.agent_stripe_connect_status || t('money.connect.onboarding')} 🔗
                        </a>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-emerald-400 text-lg font-bold leading-tight">{fmtUsd(row.payout_usd)}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('money.payoutLabel')}</p>
                  </div>
                </div>

                {/* Math line */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3 text-xs">
                  <Stat label={t('money.statGross')} value={fmtUsd(row.gross_revenue_usd)} color="text-emerald-300" />
                  <Stat label={t('money.statStripeFee')} value={`-${fmtUsd(row.stripe_fee_usd)}`} color="text-slate-400" />
                  <Stat label={t('money.statAnthropic')} value={`-${fmtUsd(row.anthropic_cost_usd)}`} color="text-slate-400" />
                  <Stat label={t('money.statOpenai')} value={`-${fmtUsd(row.openai_cost_usd)}`} color="text-slate-400" />
                  <Stat label={t('money.statOtherCost')} value={`-${fmtUsd(row.other_direct_cost_usd)}`} color="text-slate-400" />
                  <Stat
                    label={t('money.statNet')}
                    value={fmtUsd(row.net_usd)}
                    color={row.net_usd < 0 ? 'text-red-400' : 'text-white'}
                  />
                </div>

                {/* Paid details (if paid) */}
                {row.status === 'paid' && (
                  <div className="text-xs text-slate-400 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{t('money.paidOn', { date: fmtDate(row.paid_at) })}</span>
                    {row.paid_by_method && <span>· {row.paid_by_method.replace('_', ' ')}</span>}
                    {row.stripe_transfer_id && (
                      <a
                        href={`https://dashboard.stripe.com/connect/transfers/${row.stripe_transfer_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-400 hover:text-blue-300 underline"
                        title={t('money.openInStripe')}
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
                      {/* Wire button — Session 109 branches by payout_method:
                          - stripe_connect → ⚡ Wire via Stripe Connect (one-click, automated)
                          - manual_wire → ⚡ Record manual wire (you wire externally via Wise/SWIFT,
                            paste the ref here to mark paid + write the ledger row) */}
                      {row.agent_payout_method === 'manual_wire' ? (
                        <button
                          onClick={() => openManualWireModal(row)}
                          disabled={actionBusy === row.id}
                          title="You wire this manually (Wise / SWIFT). Click to record the wire reference and mark paid."
                          className="px-2.5 py-1 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-200 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ⚡ Record manual wire
                        </button>
                      ) : (
                        <button
                          onClick={() => wirePayout(row)}
                          disabled={
                            actionBusy === row.id ||
                            !row.agent_has_connect_account ||
                            !row.agent_payouts_enabled
                          }
                          title={
                            !row.agent_has_connect_account
                              ? t('money.wireTooltipNoAccount')
                              : !row.agent_payouts_enabled
                                ? t('money.wireTooltipNotReady')
                                : t('money.wireTooltipReady')
                          }
                          className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {t('money.wireBtn')}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowPaidFor(row.id);
                          setPaidTransferId('');
                          setPaidMethod('stripe_connect');
                        }}
                        disabled={actionBusy === row.id}
                        className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded text-xs font-medium disabled:opacity-50"
                        title={t('money.markPaidTooltip')}
                      >
                        {t('money.markPaidBtn')}
                      </button>
                      <button
                        onClick={() => {
                          const note = window.prompt(t('money.cancelPrompt'));
                          if (note === null) return;
                          doPatch(row.id, 'cancel', { notes: note || null });
                        }}
                        disabled={actionBusy === row.id}
                        className="px-2.5 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs font-medium disabled:opacity-50"
                      >
                        {t('money.cancelBtn')}
                      </button>
                      <button
                        onClick={() => {
                          setShowOverrideFor(row.id);
                          setOverrideValue(String(row.payout_usd));
                        }}
                        disabled={actionBusy === row.id}
                        className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded text-xs font-medium disabled:opacity-50"
                      >
                        {t('money.overrideBtn')}
                      </button>
                      <button
                        onClick={() => {
                          const note = window.prompt(t('money.markFailedPrompt'));
                          if (note === null) return;
                          doPatch(row.id, 'mark_failed', { notes: note || null });
                        }}
                        disabled={actionBusy === row.id}
                        className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded text-xs font-medium disabled:opacity-50"
                        title={t('money.markFailedTooltip')}
                      >
                        {t('money.markFailedBtn')}
                      </button>
                    </>
                  )}
                  {row.is_manual_override && !isOverrideMode && row.status !== 'paid' && (
                    <button
                      onClick={() => doPatch(row.id, 'clear_override')}
                      disabled={actionBusy === row.id}
                      className="px-2.5 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs font-medium disabled:opacity-50"
                    >
                      {t('money.clearOverrideBtn')}
                    </button>
                  )}
                  {row.status === 'failed' && (
                    <button
                      onClick={async () => {
                        const confirmed = window.confirm(t('money.resetFailedConfirm'));
                        if (!confirmed) return;
                        await doPatch(row.id, 'reset_failed');
                      }}
                      disabled={actionBusy === row.id}
                      className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 rounded text-xs font-medium disabled:opacity-50"
                      title={t('money.resetFailedTooltip')}
                    >
                      {t('money.resetFailedBtn')}
                    </button>
                  )}
                </div>

                {/* Paid input row (inline) */}
                {/* Session 109 — Manual wire recording inline form. Mirrors the
                    isPaidMode form but captures the structured fields we need
                    for the ledger row (wire ref, FX rate, local currency). */}
                {isManualWireMode && (
                  <div className="mt-3 p-3 rounded-lg bg-violet-500/8 border border-violet-500/25 space-y-3">
                    <div className="text-xs text-violet-200 font-medium">
                      Record manual wire for {row.agent_name || 'agent'} — ${row.payout_usd.toFixed(2)} USD
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          Wire reference *
                        </label>
                        <input
                          type="text"
                          value={mwWireRef}
                          onChange={(e) => setMwWireRef(e.target.value)}
                          placeholder="Wise ID / SWIFT ref / etc."
                          className="w-full px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white font-mono placeholder:text-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          Paid at
                        </label>
                        <input
                          type="date"
                          value={mwPaidAt}
                          onChange={(e) => setMwPaidAt(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          Payout currency
                        </label>
                        <input
                          type="text"
                          value={mwCurrency}
                          onChange={(e) => setMwCurrency(e.target.value)}
                          maxLength={3}
                          placeholder="ZAR / EUR / USD / etc."
                          className="w-full px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          FX rate used (USD → local)
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          min="0"
                          value={mwFxRate}
                          onChange={(e) => setMwFxRate(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          Local amount sent (optional — auto-computed from FX otherwise)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={mwLocalAmount}
                          onChange={(e) => setMwLocalAmount(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          Notes (optional)
                        </label>
                        <input
                          type="text"
                          value={mwNotes}
                          onChange={(e) => setMwNotes(e.target.value)}
                          placeholder="Anything else worth remembering"
                          className="w-full px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitManualWire(row)}
                        disabled={actionBusy === row.id || !mwWireRef.trim()}
                        className="px-3 py-1 bg-violet-500/25 hover:bg-violet-500/40 border border-violet-500/40 text-violet-200 rounded text-xs font-semibold disabled:opacity-40"
                      >
                        {actionBusy === row.id ? 'Recording…' : 'Confirm — mark paid'}
                      </button>
                      <button
                        onClick={() => setShowManualWireFor(null)}
                        className="px-3 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {isPaidMode && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/25 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="text-xs text-slate-400">{t('money.methodLabel')}</label>
                      <select
                        value={paidMethod}
                        onChange={(e) => setPaidMethod(e.target.value as typeof paidMethod)}
                        className="px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="stripe_connect">{t('money.methodStripeConnect')}</option>
                        <option value="manual_wire">{t('money.methodManualWire')}</option>
                        <option value="other">{t('money.methodOther')}</option>
                      </select>
                      <input
                        type="text"
                        value={paidTransferId}
                        onChange={(e) => setPaidTransferId(e.target.value)}
                        placeholder={t('money.transferIdPlaceholder')}
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
                        {t('money.confirmPaidBtn')}
                      </button>
                      <button
                        onClick={() => setShowPaidFor(null)}
                        className="px-3 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Override input row (inline) */}
                {isOverrideMode && (
                  <div className="mt-3 p-3 rounded-lg bg-purple-500/8 border border-purple-500/25 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="text-xs text-slate-400">{t('money.newPayoutLabel')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={overrideValue}
                        onChange={(e) => setOverrideValue(e.target.value)}
                        className="px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-white w-32"
                      />
                      <span className="text-xs text-slate-500">
                        {t('money.overrideLockNote')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const v = Number(overrideValue);
                          if (Number.isNaN(v) || v < 0) {
                            setErrorMessage(t('money.errPayoutNonNeg'));
                            return;
                          }
                          const note = window.prompt(t('money.overrideNotePrompt')) || null;
                          const ok = await doPatch(row.id, 'manual_override', {
                            payout_usd: v,
                            notes: note,
                          });
                          if (ok) setShowOverrideFor(null);
                        }}
                        disabled={actionBusy === row.id}
                        className="px-3 py-1 bg-purple-500/25 hover:bg-purple-500/40 border border-purple-500/40 text-purple-200 rounded text-xs font-semibold disabled:opacity-50"
                      >
                        {t('money.saveOverrideBtn')}
                      </button>
                      <button
                        onClick={() => setShowOverrideFor(null)}
                        className="px-3 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-xs"
                      >
                        {t('common.cancel')}
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
