'use client';

// components/montree/super-admin/RecurringOpExpensePanel.tsx
// Lists + manages recurring op-expense templates. Renders inline at the top of
// the Op-expenses sub-tab in MoneyTab.
//
// CRUD via /api/montree/super-admin/finance/recurring.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/montree/i18n';

interface RecurringRow {
  id: string;
  category: string;
  description: string;
  usd_amount: number;
  day_of_month: number;
  last_fired_period_month: string | null;
  is_active: boolean;
  notes: string | null;
}

const OP_EXPENSE_CATEGORY_VALUES = [
  'hosting',
  'domain',
  'email_service',
  'supabase',
  'design_tools',
  'ai_tooling',
  'corporate_sec',
  'marketing',
  'professional_fees',
  'other_op_expense',
] as const;

interface Props {
  sessionToken: string;
}

export default function RecurringOpExpensePanel({ sessionToken }: Props) {
  const { t } = useI18n();
  const OP_EXPENSE_CATEGORIES = useMemo(
    () =>
      OP_EXPENSE_CATEGORY_VALUES.map((value) => ({
        value,
        label: t(`opExpense.category.${value}` as Parameters<typeof t>[0]),
      })),
    [t]
  );
  const [rows, setRows] = useState<RecurringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  // Add form
  const [newCategory, setNewCategory] = useState<string>(OP_EXPENSE_CATEGORY_VALUES[0]);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDay, setNewDay] = useState('1');
  const [newNotes, setNewNotes] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/finance/recurring', {
        headers: { 'x-super-admin-token': sessionToken },
      });
      if (!res.ok) {
        setError(t('recurring.failedHttp', { code: res.status }));
        return;
      }
      const data = await res.json();
      setRows((data.rows || []) as RecurringRow[]);
    } catch (err) {
      console.error('[RecurringOpExpensePanel] fetch', err);
      setError(t('recurring.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [sessionToken, t]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleAdd = async () => {
    const amount = Number(newAmount);
    const day = Number(newDay);
    if (!newDescription.trim() || Number.isNaN(amount) || amount <= 0) {
      setError(t('recurring.errDescAmount'));
      return;
    }
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      setError(t('recurring.errDayRange'));
      return;
    }
    setBusy('add');
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/finance/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': sessionToken },
        body: JSON.stringify({
          category: newCategory,
          description: newDescription.trim(),
          usd_amount: amount,
          day_of_month: day,
          notes: newNotes.trim() || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || t('recurring.httpError', { code: res.status }));
        return;
      }
      setShowAdd(false);
      setNewDescription('');
      setNewAmount('');
      setNewDay('1');
      setNewNotes('');
      await fetchRows();
    } catch (err) {
      console.error('[RecurringOpExpensePanel] add', err);
      setError(t('recurring.addFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleToggle = async (row: RecurringRow) => {
    setBusy(row.id);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/finance/recurring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': sessionToken },
        body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || t('recurring.httpError', { code: res.status }));
        return;
      }
      await fetchRows();
    } catch (err) {
      console.error('[RecurringOpExpensePanel] toggle', err);
      setError(t('recurring.toggleFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('recurring.deleteConfirm'))) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/montree/super-admin/finance/recurring?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-super-admin-token': sessionToken },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || t('recurring.httpError', { code: res.status }));
        return;
      }
      await fetchRows();
    } catch (err) {
      console.error('[RecurringOpExpensePanel] delete', err);
      setError(t('recurring.deleteFailed'));
    } finally {
      setBusy(null);
    }
  };

  const activeCount = rows.filter((r) => r.is_active).length;
  const monthlyTotal = rows.filter((r) => r.is_active).reduce((acc, r) => acc + Number(r.usd_amount), 0);

  return (
    <div className="p-4 rounded-xl bg-slate-900/55 border border-slate-800">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-semibold text-white">{t('recurring.title')}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('recurring.summary', { active: activeCount, total: monthlyTotal.toFixed(2) })}
          </p>
        </div>
        <span className="text-slate-500 text-sm">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-3">
          {error && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}
          {loading ? (
            <p className="text-xs text-slate-500 text-center py-4">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">{t('recurring.emptyState')}</p>
          ) : (
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs ${
                    r.is_active
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-slate-800/30 border-slate-700/40 opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{r.description}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 text-[10px] font-medium">
                        {t(`opExpense.category.${r.category}` as Parameters<typeof t>[0])}
                      </span>
                      {!r.is_active && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-500 text-[10px] uppercase">
                          {t('recurring.paused')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('recurring.rowMeta', { day: r.day_of_month, amount: Number(r.usd_amount).toFixed(2) })}
                      {r.last_fired_period_month && t('recurring.lastFiredSuffix', { period: r.last_fired_period_month })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(r)}
                      disabled={busy === r.id}
                      className={`px-2 py-1 rounded text-[10px] font-medium border ${
                        r.is_active
                          ? 'bg-slate-700/40 border-slate-700 text-slate-300 hover:bg-slate-700/60'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                      } disabled:opacity-50`}
                    >
                      {r.is_active ? t('recurring.pause') : t('recurring.resume')}
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={busy === r.id}
                      className="px-2 py-1 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] hover:bg-red-500/25 disabled:opacity-50"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAdd ? (
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/30 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                >
                  {OP_EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder={t('recurring.placeholderAmount')}
                  className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                />
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value)}
                  placeholder={t('recurring.placeholderDay')}
                  className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                />
              </div>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={t('recurring.placeholderDescription')}
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white"
              />
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder={t('recurring.placeholderNotes')}
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={busy === 'add'}
                  className="px-3 py-1.5 bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 rounded text-xs font-semibold disabled:opacity-50"
                >
                  {busy === 'add' ? '⏳' : t('recurring.addTemplate')}
                </button>
                <button
                  onClick={() => { setShowAdd(false); setError(null); }}
                  className="px-3 py-1.5 bg-slate-700/40 border border-slate-700 text-slate-300 rounded text-xs"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full px-3 py-2 bg-slate-800/40 hover:bg-slate-800/60 border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium"
            >
              {t('recurring.addTemplateBtn')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
