'use client';

// components/montree/super-admin/MoneyLedgerView.tsx
// Phase 6.5 — Money tab sub-views for income, direct costs, commissions,
// op-expenses. Each is a filtered view of montree_finance_transactions.
//
// Renders a row list + per-month P&L summary card. Op-expenses tab also
// has a "+ Add expense" form (the only writeable surface here).

import { useCallback, useEffect, useMemo, useState } from 'react';
import RecurringOpExpensePanel from './RecurringOpExpensePanel';

interface LedgerRow {
  id: string;
  occurred_at: string;
  type: 'income' | 'direct_cost' | 'commission' | 'op_expense' | 'fx_adjustment';
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

interface PnlSummary {
  income: number;
  direct_cost: number;
  commission: number;
  op_expense: number;
  fx_adjustment: number;
  margin: number;
}

interface MoneyLedgerViewProps {
  sessionToken: string;
  view: 'revenue' | 'direct_costs' | 'commissions' | 'op_expenses' | 'fx_adjustments';
  periodMonth: string;
}

const VIEW_CONFIG: Record<
  MoneyLedgerViewProps['view'],
  { typeFilter: string; title: string; emptyMsg: string; allowAdd: boolean }
> = {
  revenue: {
    typeFilter: 'income',
    title: 'Revenue',
    emptyMsg: 'No income rows for this period. Stripe invoice.paid webhooks land here automatically.',
    allowAdd: false,
  },
  direct_costs: {
    typeFilter: 'direct_cost',
    title: 'Direct costs',
    emptyMsg: 'No direct cost rows yet. Stripe fees + aggregated AI costs land here.',
    allowAdd: false,
  },
  commissions: {
    typeFilter: 'commission',
    title: 'Commissions paid',
    emptyMsg: 'No commission rows. Wired payouts via Stripe Connect land here as audit trail.',
    allowAdd: false,
  },
  op_expenses: {
    typeFilter: 'op_expense',
    title: 'Operating expenses',
    emptyMsg: 'No op-expense rows yet. Add hosting / tooling / marketing / professional fees here.',
    allowAdd: true,
  },
  fx_adjustments: {
    typeFilter: 'fx_adjustment',
    title: 'FX adjustments',
    emptyMsg: 'No FX adjustment rows yet. Add when Stripe USD → Airwallex HKD differs from spot.',
    allowAdd: true,
  },
};

const OP_EXPENSE_CATEGORIES = [
  { value: 'hosting', label: 'Hosting (Railway, Supabase compute)' },
  { value: 'domain', label: 'Domain registration' },
  { value: 'email_service', label: 'Email service (Resend)' },
  { value: 'supabase', label: 'Supabase plan' },
  { value: 'design_tools', label: 'Design tools (Canva, Figma)' },
  { value: 'ai_tooling', label: 'AI tooling (Cursor, agents)' },
  { value: 'corporate_sec', label: 'Corporate secretary (Richful)' },
  { value: 'marketing', label: 'Marketing spend' },
  { value: 'professional_fees', label: 'Accountant / legal fees' },
  { value: 'other_op_expense', label: 'Other' },
];

const FX_ADJUSTMENT_CATEGORIES = [
  { value: 'wire_fx_delta', label: 'Wire FX delta (USD→HKD wire vs spot)' },
  { value: 'rate_revaluation', label: 'Rate revaluation (month-end)' },
  { value: 'other_fx_adjustment', label: 'Other FX adjustment' },
];

function fmtUsd(n: number | null | undefined): string {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function MoneyLedgerView({ sessionToken, view, periodMonth }: MoneyLedgerViewProps) {
  const config = VIEW_CONFIG[view];
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [pnl, setPnl] = useState<PnlSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Add-row form state (used for both op_expense and fx_adjustment views)
  const [showAdd, setShowAdd] = useState(false);
  const isFx = view === 'fx_adjustments';
  const categoryOptions = isFx ? FX_ADJUSTMENT_CATEGORIES : OP_EXPENSE_CATEGORIES;
  const [newCategory, setNewCategory] = useState<string>(categoryOptions[0].value);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState('');

  // Reset category when view changes so the dropdown matches the available
  // categories for this type.
  useEffect(() => {
    setNewCategory(categoryOptions[0].value);
    // intentionally NOT including categoryOptions to avoid recomputation
    // every render — the value only meaningfully changes when view changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        type: config.typeFilter,
        period_month: periodMonth,
      });
      const res = await fetch(`/api/montree/super-admin/finance/ledger?${qs.toString()}`, {
        headers: { 'x-super-admin-token': sessionToken },
      });
      if (!res.ok) {
        setError(`Failed to load (HTTP ${res.status})`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRows((data.rows || []) as LedgerRow[]);
      setPnl((data.pnl || null) as PnlSummary | null);
    } catch (err) {
      console.error('[MoneyLedgerView] fetch', err);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [config.typeFilter, periodMonth, sessionToken]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleAdd = useCallback(async () => {
    const amount = Number(newAmount);
    // op_expense MUST be positive. fx_adjustment can be negative (FX loss) or
    // positive (FX gain) but never zero.
    if (!newDescription.trim() || Number.isNaN(amount)) {
      setError('Description + numeric USD amount required');
      return;
    }
    if (isFx) {
      if (amount === 0) {
        setError('FX adjustment must be non-zero (negative for loss, positive for gain)');
        return;
      }
    } else {
      if (amount <= 0) {
        setError('Op-expense USD amount must be positive');
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/finance/ledger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: JSON.stringify({
          type: isFx ? 'fx_adjustment' : 'op_expense',
          category: newCategory,
          description: newDescription.trim(),
          usd_amount: amount,
          occurred_at: newDate ? new Date(newDate).toISOString() : undefined,
          notes: newNotes.trim() || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || `HTTP ${res.status}`);
        return;
      }
      // Reset form + refresh
      setShowAdd(false);
      setNewDescription('');
      setNewAmount('');
      setNewNotes('');
      setNewDate('');
      await fetchLedger();
    } catch (err) {
      console.error('[MoneyLedgerView] add', err);
      setError('Add failed');
    } finally {
      setBusy(false);
    }
  }, [isFx, newCategory, newDescription, newAmount, newDate, newNotes, sessionToken, fetchLedger]);

  const handleDelete = useCallback(
    async (rowId: string) => {
      if (!window.confirm('Delete this op-expense row? Cannot undo.')) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/montree/super-admin/finance/ledger?id=${encodeURIComponent(rowId)}`, {
          method: 'DELETE',
          headers: { 'x-super-admin-token': sessionToken },
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error || `HTTP ${res.status}`);
          return;
        }
        await fetchLedger();
      } catch (err) {
        console.error('[MoneyLedgerView] delete', err);
        setError('Delete failed');
      } finally {
        setBusy(false);
      }
    },
    [sessionToken, fetchLedger]
  );

  // Compute the right total for THIS view from the PnL summary.
  const totalForView = useMemo(() => {
    if (!pnl) return 0;
    if (view === 'revenue') return pnl.income;
    if (view === 'direct_costs') return pnl.direct_cost;
    if (view === 'commissions') return pnl.commission;
    if (view === 'op_expenses') return pnl.op_expense;
    return 0;
  }, [pnl, view]);

  return (
    <div className="space-y-4">
      {/* Total card for this view */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/55 border border-slate-800">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{config.title} · {periodMonth}</p>
          <p className="text-2xl font-bold text-white mt-1">{fmtUsd(totalForView)}</p>
          {rows.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">{rows.length} row{rows.length === 1 ? '' : 's'}</p>
          )}
        </div>
        {config.allowAdd && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm font-medium"
          >
            + Add expense
          </button>
        )}
      </div>

      {/* Add op_expense form */}
      {config.allowAdd && showAdd && (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              >
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                USD {isFx && <span className="text-slate-500 normal-case">(± allowed)</span>}
              </label>
              <input
                type="number"
                step="0.01"
                {...(isFx ? {} : { min: '0' })}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder={isFx ? '-5.00 for loss' : '0.00'}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
            <div className="w-full md:w-44">
              <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Date (optional)</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Description</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g. Railway hosting — May 2026"
              maxLength={500}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Notes (optional)</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Invoice reference, vendor, etc."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={busy}
              className="px-3 py-1.5 bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-200 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {busy ? '⏳ Adding…' : '✓ Add expense'}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setNewDescription('');
                setNewAmount('');
                setNewNotes('');
                setNewDate('');
                setError(null);
              }}
              className="px-3 py-1.5 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recurring templates panel — only on the Op-expenses view */}
      {view === 'op_expenses' && (
        <RecurringOpExpensePanel sessionToken={sessionToken} />
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
          <p className="text-slate-400 text-sm">{config.emptyMsg}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isManual = row.source === 'manual_entry';
            return (
              <div
                key={row.id}
                className="p-3 rounded-lg bg-slate-900/55 border border-slate-800 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white text-sm font-medium">{row.description}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/40 text-slate-400 border border-slate-700/50">
                      {row.category}
                    </span>
                    {isManual && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        manual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {fmtDate(row.occurred_at)} · {row.source}
                    {row.stripe_invoice_id && <span> · 🧾 {row.stripe_invoice_id}</span>}
                    {row.stripe_transfer_id && <span> · 💸 {row.stripe_transfer_id}</span>}
                  </p>
                  {row.notes && (
                    <p className="text-xs italic text-slate-500 mt-1">📝 {row.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-base font-bold leading-tight ${
                      view === 'revenue' ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    {fmtUsd(row.usd_amount)}
                  </p>
                  {isManual && config.allowAdd && (
                    <button
                      onClick={() => handleDelete(row.id)}
                      disabled={busy}
                      className="text-[10px] text-slate-500 hover:text-red-400 mt-1 disabled:opacity-50"
                      title="Delete this manual entry"
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
