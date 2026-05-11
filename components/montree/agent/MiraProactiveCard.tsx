'use client';

// components/montree/agent/MiraProactiveCard.tsx
// Surfaces high-signal school snapshots on the agent dashboard.
// Shows 'growing' and 'silent' schools first — these are where Mira can help most.

import { useCallback, useEffect, useState } from 'react';

interface Snapshot {
  school_id: string;
  school_name: string | null;
  active_students: number;
  students_added_7d: number;
  photos_30d: number;
  signal: 'growing' | 'active' | 'quiet' | 'silent';
  suggested_action: string | null;
}

interface SnapshotResponse {
  snapshots: Snapshot[];
  summary: { total_schools: number; total_active_students: number; total_growth_7d: number };
}

export default function MiraProactiveCard() {
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/agent/snapshot', { credentials: 'include' });
      if (!res.ok) return;
      const j = (await res.json()) as SnapshotResponse;
      setData(j);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || dismissed || !data) return null;

  // Only surface schools with an actionable suggestion.
  const actionable = data.snapshots.filter((s) => s.suggested_action);
  if (actionable.length === 0) return null;

  return (
    <div className="my-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/8">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-amber-300 font-semibold">
            🤝 Mira&rsquo;s snapshot
          </p>
          <p className="text-sm text-white mt-1">
            {data.summary.total_growth_7d > 0 ? (
              <>
                <strong>{data.summary.total_growth_7d} new students</strong> this week across your{' '}
                {data.summary.total_schools} schools.
              </>
            ) : (
              <>
                {actionable.length} school{actionable.length === 1 ? '' : 's'} need
                {actionable.length === 1 ? 's' : ''} attention.
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-slate-400 hover:text-white text-lg leading-none px-2 py-0.5"
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        {actionable.slice(0, 5).map((s) => (
          <div
            key={s.school_id}
            className={`p-3 rounded-lg border ${
              s.signal === 'growing'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : s.signal === 'silent'
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-slate-700 bg-slate-900/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-white font-medium text-sm">{s.school_name || 'School'}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                  s.signal === 'growing'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : s.signal === 'silent'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-slate-700/40 text-slate-300 border border-slate-700'
                }`}
              >
                {s.signal}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-1">{s.suggested_action}</p>
            <p className="text-[11px] text-slate-500">
              {s.active_students} active · +{s.students_added_7d} this week · {s.photos_30d} photos in 30d
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
