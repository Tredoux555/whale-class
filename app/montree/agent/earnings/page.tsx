'use client';

// app/montree/agent/earnings/page.tsx
//
// Phase 7c — Full earnings ledger. ESTIMATES mode until Phases 4-5 ship.
// Shows the same numbers the dashboard summarizes, but per-school + with
// the math broken out so the agent can audit the calculation.

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PerSchool {
  school_id: string;
  school_name: string | null;
  student_count: number;
  revenue_share_pct: number;
  revenue_share_active: boolean;
  gross_estimate_usd: number;
  stripe_fee_estimate_usd: number;
  api_cost_usd: number;
  net_estimate_usd: number;
  estimated_share_usd: number;
}

interface EarningsResponse {
  estimated_this_month_usd: number;
  paid_to_date_usd: number;
  is_estimate: boolean;
  per_school: PerSchool[];
  formula_explanation?: string;
}

const USD = (n: number): string =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function AgentEarningsPage() {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/montree/agent/earnings')
      .then(async r => {
        if (!r.ok) {
          if ((r.status === 401 || r.status === 403)) {
            window.location.href = '/montree/login-select';
            return null;
          }
          const t = await r.text();
          throw new Error(t.slice(0, 200));
        }
        return r.json();
      })
      .then((d: EarningsResponse | null) => {
        if (cancelled || !d) return;
        setData(d);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link href="/montree/agent/dashboard" className="text-emerald-300/70 hover:text-emerald-200 text-xs">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-3xl sm:text-4xl font-light text-white tracking-tight">Earnings</h1>
      <p className="mt-2 text-emerald-200/60 text-sm">
        Estimated month-to-date based on current student counts. Confirmed numbers replace these once each month closes (Phase 5 is in build).
      </p>

      {error && (
        <div className="mt-6 bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-white/40 uppercase tracking-wider text-[10px] font-semibold">
                This month — estimated
              </p>
              <p className="mt-2 text-3xl font-light text-emerald-300 tabular-nums">
                {USD(data.estimated_this_month_usd)}
              </p>
              <p className="mt-2 text-white/50 text-xs">
                Across {data.per_school.length} {data.per_school.length === 1 ? 'school' : 'schools'}.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-white/40 uppercase tracking-wider text-[10px] font-semibold">
                Paid to date
              </p>
              <p className="mt-2 text-3xl font-light text-white tabular-nums">
                {USD(data.paid_to_date_usd)}
              </p>
              <p className="mt-2 text-white/50 text-xs">
                {data.paid_to_date_usd > 0
                  ? 'Confirmed via Stripe.'
                  : 'Once your first month closes, paid amounts appear here.'}
              </p>
            </div>
          </section>

          {data.formula_explanation && (
            <section className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-200 uppercase tracking-wider text-[10px] font-semibold mb-1">
                How we calculate
              </p>
              <p className="text-white/80 text-sm leading-relaxed">{data.formula_explanation}</p>
              <p className="mt-2 text-white/50 text-xs">
                When net is zero or negative, your share is $0 — no clawback, you simply don&apos;t accrue that month.
              </p>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-white text-lg font-light mb-3">Per school</h2>
            {data.per_school.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-emerald-200/60 text-sm">
                No referred schools yet.
              </div>
            ) : (
              <>
                {/* Desktop table — 8 columns wide. Hidden on mobile because
                    the columns squash the data unreadable below ~640px. */}
                <div className="hidden md:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-black/20 text-white/40 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-3 text-left">School</th>
                          <th className="px-3 py-3 text-right">Students</th>
                          <th className="px-3 py-3 text-right">Gross</th>
                          <th className="px-3 py-3 text-right">Fees</th>
                          <th className="px-3 py-3 text-right">Costs</th>
                          <th className="px-3 py-3 text-right">Net</th>
                          <th className="px-3 py-3 text-right">Your %</th>
                          <th className="px-3 py-3 text-right">Your share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.per_school.map(p => (
                          <tr key={p.school_id} className="hover:bg-white/5">
                            <td className="px-3 py-3 text-white">
                              <Link
                                href={`/montree/agent/schools/${p.school_id}`}
                                className="hover:text-emerald-300 transition-colors"
                              >
                                {p.school_name || 'Unnamed'}
                              </Link>
                              {!p.revenue_share_active && (
                                <span className="ml-2 text-[10px] uppercase text-amber-300">Paused</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right text-white tabular-nums">{p.student_count}</td>
                            <td className="px-3 py-3 text-right text-white/70 tabular-nums">{USD(p.gross_estimate_usd)}</td>
                            <td className="px-3 py-3 text-right text-white/40 tabular-nums">−{USD(p.stripe_fee_estimate_usd)}</td>
                            <td className="px-3 py-3 text-right text-white/40 tabular-nums">−{USD(p.api_cost_usd)}</td>
                            <td className="px-3 py-3 text-right text-white tabular-nums">{USD(p.net_estimate_usd)}</td>
                            <td className="px-3 py-3 text-right text-amber-300 tabular-nums">{p.revenue_share_pct}%</td>
                            <td className="px-3 py-3 text-right text-emerald-300 font-medium tabular-nums">{USD(p.estimated_share_usd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile card view — same data, single column. Shows the
                    headline figure (your share) prominently with the math
                    in a smaller grid below for transparency. Tap the school
                    name to drill into the per-school page. */}
                <div className="md:hidden space-y-3">
                  {data.per_school.map(p => (
                    <Link
                      key={p.school_id}
                      href={`/montree/agent/schools/${p.school_id}`}
                      className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium truncate">{p.school_name || 'Unnamed'}</p>
                          <p className="text-emerald-200/60 text-xs mt-0.5">
                            {p.student_count} {p.student_count === 1 ? 'student' : 'students'} · <span className="text-amber-300">{p.revenue_share_pct}%</span> your share
                            {!p.revenue_share_active && (
                              <span className="ml-2 text-[10px] uppercase text-amber-300">Paused</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-emerald-300 font-medium tabular-nums text-lg">
                            {USD(p.estimated_share_usd)}
                          </p>
                          <p className="text-white/40 text-[10px] mt-0.5">/ mo est.</p>
                        </div>
                      </div>
                      {/* Math breakdown — small numbers so it doesn't dominate */}
                      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] tabular-nums">
                        <span className="text-white/40">Gross</span>
                        <span className="text-white/70 text-right">{USD(p.gross_estimate_usd)}</span>
                        <span className="text-white/40">Fees</span>
                        <span className="text-white/50 text-right">−{USD(p.stripe_fee_estimate_usd)}</span>
                        <span className="text-white/40">Costs</span>
                        <span className="text-white/50 text-right">−{USD(p.api_cost_usd)}</span>
                        <span className="text-white/40">Net</span>
                        <span className="text-white/80 text-right">{USD(p.net_estimate_usd)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
