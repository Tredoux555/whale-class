'use client';

// components/montree/super-admin/OutreachCodesTab.tsx
// China outreach code tracker: every cold-email school has a unique code
// (CN-ETON-001). This tab shows who was emailed, who clicked their
// /welcome/{code} link, and who registered. Backed by
// /api/montree/super-admin/outreach-codes (table: montree_outreach_schools).
//
// Internal operator tool — English-only strings by design (matches other
// operator-only super-admin surfaces).

import { useCallback, useEffect, useMemo, useState } from 'react';

interface OutreachRow {
  id: string;
  outreach_code: string;
  school_name: string;
  city: string | null;
  network: string | null;
  list_tier: string | null;
  status: 'not_contacted' | 'emailed' | 'visited' | 'registered';
  visit_count: number;
  first_visited_at: string | null;
  emailed_at: string | null;
  registered_at: string | null;
  registered_school_id: string | null;
  contact_email: string | null;
  contact_name: string | null;
  notes: string | null;
}

interface Counts {
  total: number;
  not_contacted: number;
  emailed: number;
  visited: number;
  registered: number;
  total_visits: number;
}

type StatusFilter = 'all' | OutreachRow['status'];

const STATUS_META: Record<OutreachRow['status'], { label: string; cls: string }> = {
  not_contacted: { label: 'Not contacted', cls: 'bg-slate-700/40 border-slate-600 text-slate-300' },
  emailed: { label: 'Emailed', cls: 'bg-sky-500/15 border-sky-500/30 text-sky-300' },
  visited: { label: 'Visited', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
  registered: { label: 'Registered 🎉', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
};

// Sort: hottest signal first.
const STATUS_RANK: Record<OutreachRow['status'], number> = {
  registered: 0,
  visited: 1,
  emailed: 2,
  not_contacted: 3,
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function OutreachCodesTab({ sessionToken }: { sessionToken: string }) {
  const [rows, setRows] = useState<OutreachRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/outreach-codes', {
        headers: { 'x-super-admin-token': sessionToken },
      });
      const j = await res.json().catch(() => ({}));
      if (j.migration_pending) {
        setMigrationPending(true);
        setRows([]);
        return;
      }
      if (!res.ok) {
        setError(j.error || `HTTP ${res.status}`);
        return;
      }
      setMigrationPending(false);
      setRows(j.rows || []);
      setCounts(j.counts || null);
    } catch (err) {
      console.error('[OutreachCodesTab] fetch', err);
      setError('Could not load outreach codes.');
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const markEmailed = useCallback(
    async (id: string) => {
      setBusyId(id);
      setError(null);
      try {
        const res = await fetch('/api/montree/super-admin/outreach-codes', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': sessionToken,
          },
          body: JSON.stringify({ id, action: 'mark_emailed' }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error || `HTTP ${res.status}`);
          return;
        }
        await fetchRows();
      } catch (err) {
        console.error('[OutreachCodesTab] mark_emailed', err);
        setError('Could not mark as emailed.');
      } finally {
        setBusyId(null);
      }
    },
    [sessionToken, fetchRows]
  );

  const copyLink = useCallback((row: OutreachRow) => {
    const link = `https://montree.xyz/welcome/${row.outreach_code}`;
    try {
      void navigator.clipboard.writeText(link);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((cur) => (cur === row.id ? null : cur)), 1400);
    } catch {
      // Clipboard unavailable — the link is visible in the expanded row.
    }
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter(
        (r) =>
          !q ||
          r.outreach_code.toLowerCase().includes(q) ||
          r.school_name.toLowerCase().includes(q) ||
          (r.city || '').toLowerCase().includes(q) ||
          (r.network || '').toLowerCase().includes(q) ||
          (r.contact_email || '').toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          b.visit_count - a.visit_count ||
          a.outreach_code.localeCompare(b.outreach_code)
      );
  }, [rows, statusFilter, query]);

  if (migrationPending) {
    return (
      <div className="p-8 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <p className="text-amber-300 font-semibold text-sm">Migration 279 hasn&apos;t been run yet.</p>
        <p className="text-slate-400 text-sm mt-2">
          Run <code className="text-amber-200">migrations/279_outreach_schools.sql</code> then{' '}
          <code className="text-amber-200">279b_seed_outreach_china.sql</code> in the Supabase SQL
          Editor, then reload this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">🎯 Outreach codes — China</h2>
          <p className="text-xs text-slate-400 mt-1">
            {counts
              ? `${counts.total} schools · ${counts.registered} registered · ${counts.visited} visited · ${counts.emailed} emailed · ${counts.total_visits} total visits`
              : 'Per-school codes for the cold-email campaign.'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'registered', 'visited', 'emailed', 'not_contacted'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_META[s].label.replace(' 🎉', '')}
            </button>
          ))}
          <button
            onClick={() => void fetchRows()}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium disabled:opacity-50"
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search code, school, city, network, email…"
        className="w-full p-3 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none"
        style={{ fontSize: 16 }}
      />

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
          <p className="text-slate-400 text-sm">No schools match.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((row) => {
            const meta = STATUS_META[row.status];
            const isExpanded = expandedId === row.id;
            return (
              <div key={row.id} className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  className="w-full text-left p-3 flex items-center gap-3 flex-wrap hover:bg-slate-800/30 transition-colors"
                >
                  <span className="font-mono text-xs text-emerald-300 shrink-0 w-28">{row.outreach_code}</span>
                  <span className="flex-1 min-w-[180px]">
                    <span className="text-sm text-white font-medium">{row.school_name}</span>
                    <span className="text-xs text-slate-500 block">
                      {[row.city, row.network && row.network !== 'Independent' ? row.network : null]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium shrink-0 ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0 w-16 text-right" title="Visits">
                    👁 {row.visit_count}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0 w-24 text-right" title="Emailed / Registered">
                    ✉️ {fmtDate(row.emailed_at)} · 🎉 {fmtDate(row.registered_at)}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-slate-400">
                        {row.contact_email ? (
                          <>
                            📧 <span className="text-sky-300 select-all">{row.contact_email}</span>
                            {row.contact_name ? <span className="text-slate-500"> · {row.contact_name}</span> : null}
                          </>
                        ) : (
                          <span className="text-slate-500">No email on file — see notes for alternatives.</span>
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      🔗{' '}
                      <span className="font-mono select-all text-slate-300">
                        https://montree.xyz/welcome/{row.outreach_code}
                      </span>
                    </div>
                    {row.notes && <p className="text-xs text-slate-500 leading-relaxed">{row.notes}</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => copyLink(row)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700/60"
                      >
                        {copiedId === row.id ? '✓ Copied' : '📋 Copy link'}
                      </button>
                      {row.status !== 'registered' && (
                        <button
                          onClick={() => void markEmailed(row.id)}
                          disabled={busyId === row.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-sky-500/15 border-sky-500/30 text-sky-300 hover:bg-sky-500/25 disabled:opacity-50"
                        >
                          {busyId === row.id ? '⏳' : row.emailed_at ? '✉️ Emailed again' : '✉️ Mark emailed'}
                        </button>
                      )}
                    </div>
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
