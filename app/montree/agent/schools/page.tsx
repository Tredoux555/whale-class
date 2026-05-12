'use client';

// app/montree/agent/schools/page.tsx
//
// Phase 7c — Full list of schools the agent has referred. Shown when there
// are more than fit on the dashboard's overview, but works as the canonical
// "all my schools" view at any count.

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface School {
  id: string;
  name: string | null;
  created_at: string;
  revenue_share_pct: number;
  revenue_share_active: boolean;
  primary_locale: string | null;
  student_count: number;
  gross_estimate_usd: number;
}

const fmtDate = (d: string): string =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const USD = (n: number): string =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function AgentSchoolsPage() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/montree/agent/schools')
      .then(async r => {
        if (!r.ok) {
          if (r.status === 401) {
            window.location.href = '/montree/login-select';
            return null;
          }
          const t = await r.text();
          throw new Error(t.slice(0, 200));
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setSchools(data.schools || []);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <Link href="/montree/agent/dashboard" className="text-emerald-300/70 hover:text-emerald-200 text-xs">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl sm:text-4xl font-light text-white tracking-tight">Your schools</h1>
        <p className="mt-2 text-emerald-200/60 text-sm">
          Every school that signed up using one of your codes.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      {schools === null && !error && (
        <p className="text-emerald-200/60 text-sm">Loading…</p>
      )}

      {schools !== null && schools.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">🌱</div>
          <p className="text-white/80 mb-2">No referred schools yet.</p>
          <p className="text-emerald-200/60 text-sm mb-4">
            Generate a code, give it to a school, and they&apos;ll appear here when they sign up.
          </p>
          <Link
            href="/montree/agent/codes"
            className="inline-block px-4 py-3 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-base sm:text-sm transition-colors"
          >
            Generate your first code →
          </Link>
        </div>
      )}

      {schools !== null && schools.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {schools.map(s => (
            <Link
              key={s.id}
              href={`/montree/agent/schools/${s.id}`}
              className="block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-white text-lg font-light">{s.name || 'Unnamed school'}</h2>
                {!s.revenue_share_active && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-emerald-200/60 text-xs mt-1">
                Linked {fmtDate(s.created_at)} · {s.revenue_share_pct}% share
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider">Students</p>
                  <p className="text-white text-xl mt-0.5 tabular-nums">{s.student_count}</p>
                </div>
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider">Gross / mo (est.)</p>
                  <p className="text-emerald-300 text-xl mt-0.5 tabular-nums">{USD(s.gross_estimate_usd)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
