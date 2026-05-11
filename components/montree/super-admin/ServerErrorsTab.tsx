'use client';

// components/montree/super-admin/ServerErrorsTab.tsx
// Lightweight error log viewer (sentry-lite).

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/lib/montree/i18n';

interface ErrorRow {
  id: string;
  origin: string;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  severity: 'warn' | 'error' | 'fatal';
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_notes: string | null;
  created_at: string;
}

interface Props {
  sessionToken: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ServerErrorsTab({ sessionToken }: Props) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [originCounts, setOriginCounts] = useState<Record<string, number>>({});
  const [stateFilter, setStateFilter] = useState<'unresolved' | 'resolved' | 'all'>('unresolved');
  const [originFilter, setOriginFilter] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ state: stateFilter });
      if (originFilter) qs.set('origin', originFilter);
      if (severityFilter) qs.set('severity', severityFilter);
      const res = await fetch(`/api/montree/super-admin/server-errors?${qs.toString()}`, {
        headers: { 'x-super-admin-token': sessionToken },
      });
      if (!res.ok) {
        setError(t('serverErrors.failedHttp', { code: res.status }));
        return;
      }
      const data = await res.json();
      setRows((data.rows || []) as ErrorRow[]);
      setUnresolvedCount(data.unresolved_count || 0);
      setOriginCounts(data.origin_counts || {});
    } catch (err) {
      console.error('[ServerErrorsTab] fetch', err);
      setError(t('serverErrors.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [stateFilter, originFilter, severityFilter, sessionToken, t]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleResolve = async (id: string) => {
    const notes = window.prompt(t('serverErrors.resolvePrompt'));
    if (notes === null) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/montree/super-admin/server-errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': sessionToken },
        body: JSON.stringify({ id, resolved_notes: notes || null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || t('serverErrors.httpError', { code: res.status }));
        return;
      }
      await fetchRows();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('serverErrors.deleteConfirm'))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/montree/super-admin/server-errors?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-super-admin-token': sessionToken },
      });
      if (!res.ok) {
        setError(t('serverErrors.deleteFailedHttp', { code: res.status }));
        return;
      }
      await fetchRows();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{t('serverErrors.title')}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {t('serverErrors.subtitlePrefix')}{' '}
            <code className="text-emerald-300">logServerError()</code>.{' '}
            {unresolvedCount > 0 ? (
              <span className="text-amber-300 font-semibold">{t('serverErrors.unresolvedCount', { count: unresolvedCount })}</span>
            ) : (
              <span className="text-emerald-400">{t('serverErrors.noneUnresolved')}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchRows}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium disabled:opacity-50"
        >
          {loading ? '⏳' : '🔄'} {t('common.refresh')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {(['unresolved', 'resolved', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStateFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              stateFilter === s
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t(`serverErrors.state.${s}` as Parameters<typeof t>[0])}
          </button>
        ))}
        <span className="text-slate-600 mx-2">·</span>
        {(['warn', 'error', 'fatal'] as const).map((sv) => (
          <button
            key={sv}
            onClick={() => setSeverityFilter(severityFilter === sv ? null : sv)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
              severityFilter === sv
                ? sv === 'fatal' ? 'bg-red-500/20 border-red-500/40 text-red-300'
                  : sv === 'warn' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            {t(`serverErrors.severity.${sv}` as Parameters<typeof t>[0])}
          </button>
        ))}
        {Object.keys(originCounts).length > 0 && (
          <>
            <span className="text-slate-600 mx-2">·</span>
            <select
              value={originFilter || ''}
              onChange={(e) => setOriginFilter(e.target.value || null)}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
            >
              <option value="">{t('serverErrors.allOrigins')}</option>
              {Object.entries(originCounts).map(([o, c]) => (
                <option key={o} value={o}>{o} ({c})</option>
              ))}
            </select>
          </>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
          <p className="text-slate-400 text-sm">
            {stateFilter === 'unresolved' ? t('serverErrors.emptyClean') : t('serverErrors.emptyFiltered')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const sevColor = row.severity === 'fatal'
              ? 'bg-red-500/15 border-red-500/30 text-red-300'
              : row.severity === 'warn'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-orange-500/15 border-orange-500/30 text-orange-300';
            const isExpanded = expandedId === row.id;
            return (
              <div key={row.id} className="p-3 rounded-xl bg-slate-900/55 border border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${sevColor}`}>
                        {t(`serverErrors.severity.${row.severity}` as Parameters<typeof t>[0])}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-300 text-[10px] font-medium">
                        {row.origin}
                      </span>
                      {row.resolved_at && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px]">
                          {t('serverErrors.resolvedTag')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white break-words font-mono">
                      {row.message.length > 240 && !isExpanded
                        ? row.message.slice(0, 240) + '…'
                        : row.message}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">{fmtDate(row.created_at)}</p>
                    {row.resolved_at && (
                      <p className="text-[11px] text-emerald-400 mt-0.5">
                        {t('serverErrors.resolvedAt', { date: fmtDate(row.resolved_at) })}{row.resolved_notes && ` — ${row.resolved_notes}`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      className="px-2 py-1 bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-[11px]"
                    >
                      {isExpanded ? t('serverErrors.hide') : t('serverErrors.details')}
                    </button>
                    {!row.resolved_at && (
                      <button
                        onClick={() => handleResolve(row.id)}
                        disabled={busyId === row.id}
                        className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded text-[11px] font-medium disabled:opacity-50"
                      >
                        ✓ {t('serverErrors.resolve')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(row.id)}
                      disabled={busyId === row.id}
                      className="px-2 py-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded text-[11px] disabled:opacity-50"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    {row.stack && (
                      <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-300 overflow-x-auto max-h-[40vh]">
                        {row.stack}
                      </pre>
                    )}
                    {row.context && (
                      <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-300 overflow-x-auto max-h-[20vh]">
                        {JSON.stringify(row.context, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
