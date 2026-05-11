'use client';

// components/montree/super-admin/WebhookDLQTab.tsx
// Read + resolve dead-letter webhook events.

import { useCallback, useEffect, useState } from 'react';

interface DLQRow {
  id: string;
  source: string;
  stripe_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  error_message: string;
  error_stack: string | null;
  status: 'pending' | 'resolved' | 'ignored';
  retry_count: number;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_notes: string | null;
  created_at: string;
}

interface WebhookDLQTabProps {
  sessionToken: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function WebhookDLQTab({ sessionToken }: WebhookDLQTabProps) {
  const [rows, setRows] = useState<DLQRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'ignored' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDLQ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/montree/super-admin/webhook-deadletter?status=${statusFilter}`, {
        headers: { 'x-super-admin-token': sessionToken },
      });
      if (!res.ok) {
        setError(`Failed to load (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setRows((data.rows || []) as DLQRow[]);
      setPendingCount(data.pending_count || 0);
    } catch (err) {
      console.error('[WebhookDLQTab] fetch', err);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sessionToken]);

  useEffect(() => {
    fetchDLQ();
  }, [fetchDLQ]);

  const doAction = useCallback(
    async (id: string, action: 'mark_resolved' | 'mark_ignored') => {
      const note = window.prompt(
        action === 'mark_resolved'
          ? 'Notes on how this was resolved (optional):'
          : 'Notes on why ignored (optional):'
      );
      if (note === null) return; // user cancelled
      setBusyId(id);
      try {
        const res = await fetch('/api/montree/super-admin/webhook-deadletter', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': sessionToken,
          },
          body: JSON.stringify({ id, action, notes: note || null }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error || `HTTP ${res.status}`);
          return;
        }
        await fetchDLQ();
      } catch (err) {
        console.error('[WebhookDLQTab] action', err);
        setError('Action failed');
      } finally {
        setBusyId(null);
      }
    },
    [sessionToken, fetchDLQ]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Webhook dead-letter queue</h2>
          <p className="text-xs text-slate-400 mt-1">
            Stripe events that failed to process. {pendingCount > 0 ? (
              <span className="text-amber-300 font-semibold">{pendingCount} pending</span>
            ) : (
              <span className="text-emerald-400">No pending events.</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {(['pending', 'resolved', 'ignored', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={fetchDLQ}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium disabled:opacity-50"
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
          <p className="text-slate-400 text-sm">
            {statusFilter === 'pending'
              ? 'No pending failed webhook events. System is healthy.'
              : `No ${statusFilter} events.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isExpanded = expandedRow === row.id;
            const statusColor =
              row.status === 'pending'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : row.status === 'resolved'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-700/30 border-slate-700 text-slate-400';
            return (
              <div
                key={row.id}
                className="p-4 rounded-xl bg-slate-900/55 border border-slate-800"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-slate-300">{row.event_type}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${statusColor}`}>
                        {row.status}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">{row.stripe_event_id}</span>
                    </div>
                    <p className="text-xs text-red-300 break-words" title={row.error_message}>
                      {row.error_message.length > 200
                        ? row.error_message.slice(0, 200) + '…'
                        : row.error_message}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">{fmtDate(row.created_at)}</p>
                    {row.resolved_at && (
                      <p className="text-[11px] text-emerald-400 mt-0.5">
                        {row.status === 'resolved' ? '✓ Resolved' : '⊘ Ignored'} {fmtDate(row.resolved_at)}
                        {row.resolved_notes && ` — ${row.resolved_notes}`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                      className="px-2 py-1 bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded text-[11px]"
                    >
                      {isExpanded ? 'Hide' : 'Show payload'}
                    </button>
                    {row.status === 'pending' && (
                      <>
                        <button
                          onClick={() => doAction(row.id, 'mark_resolved')}
                          disabled={busyId === row.id}
                          className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded text-[11px] font-medium disabled:opacity-50"
                        >
                          ✓ Resolve
                        </button>
                        <button
                          onClick={() => doAction(row.id, 'mark_ignored')}
                          disabled={busyId === row.id}
                          className="px-2 py-1 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-700 text-slate-400 rounded text-[11px]"
                        >
                          ⊘ Ignore
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <pre className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-300 overflow-x-auto max-h-[40vh]">
                    {JSON.stringify(row.payload, null, 2)}
                  </pre>
                )}
                {isExpanded && row.error_stack && (
                  <pre className="mt-2 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-[10px] text-red-200 overflow-x-auto max-h-[20vh]">
                    {row.error_stack}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
