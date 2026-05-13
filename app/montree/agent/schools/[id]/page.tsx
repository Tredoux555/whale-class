'use client';

// app/montree/agent/schools/[id]/page.tsx
//
// Phase 7c — Per-school detail. The 'detail' here is intentionally limited:
// agents see what they've earned and the school's headline activity, but NOT
// any internal classroom data (children, teachers, observations) — that's
// the school's private data.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SchoolDetail {
  id: string;
  name: string | null;
  created_at: string;
  primary_locale: string | null;
  revenue_share_pct: number;
  revenue_share_active: boolean;
  referral_code_used: string | null;
  student_count: number;
  classroom_count: number;
  estimate: {
    gross_estimate_usd: number;
    stripe_fee_estimate_usd: number;
    api_cost_usd: number;
    net_estimate_usd: number;
    estimated_share_usd: number;
    is_estimate: boolean;
  };
}

const fmtDate = (d: string): string =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const USD = (n: number): string =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function AgentSchoolDetailPage() {
  const params = useParams<{ id: string }>();
  const schoolId = params?.id;
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    fetch(`/api/montree/agent/schools/${schoolId}`)
      .then(async r => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
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
      .then((data) => {
        if (cancelled || !data) return;
        setSchool(data);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [schoolId]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-white/80 mb-2">Couldn&apos;t find that school.</p>
        <p className="text-emerald-200/60 text-sm mb-4">
          It may not be one of yours, or the link is wrong.
        </p>
        <Link
          href="/montree/agent/schools"
          className="text-emerald-300 hover:text-emerald-200 text-sm"
        >
          ← Back to schools
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link href="/montree/agent/schools" className="text-emerald-300/70 hover:text-emerald-200 text-xs">
        ← Back to schools
      </Link>

      {error && (
        <div className="mt-4 bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      {school && (
        <>
          <header className="mt-3 mb-8">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
                {school.name || 'Unnamed school'}
              </h1>
              {!school.revenue_share_active && (
                <span className="shrink-0 mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-600">
                  Revenue share paused
                </span>
              )}
            </div>
            <p className="mt-2 text-emerald-200/60 text-sm">
              Linked {fmtDate(school.created_at)}
              {school.referral_code_used && (
                <> · via <code className="text-emerald-300 font-mono text-xs">{school.referral_code_used}</code></>
              )}
              {school.primary_locale && school.primary_locale !== 'en' && (
                <> · {school.primary_locale.toUpperCase()}</>
              )}
            </p>
          </header>

          {/* Snapshot tiles */}
          <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <Tile label="Students" value={String(school.student_count)} />
            <Tile label="Classrooms" value={String(school.classroom_count)} />
            <Tile label="Your share" value={`${school.revenue_share_pct}%`} accent />
          </section>

          {/* Estimate card */}
          <section className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6 mb-6">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h2 className="text-white text-lg font-light">This month — estimated</h2>
              <span className="text-amber-200/70 text-[10px] uppercase tracking-wider">Estimate</span>
            </div>
            <p className="text-emerald-200/60 text-xs mt-1">
              Final number locks at month end.
            </p>

            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Subscription gross (students × $7)" value={USD(school.estimate.gross_estimate_usd)} />
              <Row label="Stripe fees (~2.9% + $0.30)" value={`− ${USD(school.estimate.stripe_fee_estimate_usd)}`} />
              <Row label="AI / API costs this month" value={`− ${USD(school.estimate.api_cost_usd)}`} />
              <div className="pt-2 mt-2 border-t border-white/10">
                <Row
                  label="Net estimate"
                  value={USD(school.estimate.net_estimate_usd)}
                  bold
                />
              </div>
              <div className="pt-2 mt-2 border-t border-white/10">
                <Row
                  label={`Your share at ${school.revenue_share_pct}%`}
                  value={USD(school.estimate.estimated_share_usd)}
                  emerald
                  bold
                />
              </div>
            </dl>

            {school.estimate.net_estimate_usd <= 0 && (
              <p className="mt-4 text-amber-200/70 text-xs leading-relaxed">
                Net is currently zero or negative because of API costs and Stripe fees. Your share is $0 until students grow enough to cover costs. There&apos;s no clawback — you simply don&apos;t accrue this month.
              </p>
            )}
            {!school.revenue_share_active && (
              <p className="mt-4 text-amber-200/70 text-xs leading-relaxed">
                Revenue share is paused on this school. Reach out to Tredoux if you think this is a mistake.
              </p>
            )}
          </section>

          <p className="text-white/40 text-xs leading-relaxed">
            We deliberately don&apos;t show classroom or child data — that&apos;s the school&apos;s private space. You can see growth via the student count headline above.
          </p>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/40 uppercase tracking-wider text-[10px] font-semibold">{label}</p>
      <p className={`mt-2 text-2xl font-light tabular-nums ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, bold, emerald }: { label: string; value: string; bold?: boolean; emerald?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className={`text-white/60 ${bold ? 'text-white' : ''}`}>{label}</dt>
      <dd className={`tabular-nums ${emerald ? 'text-emerald-300' : 'text-white'} ${bold ? 'font-medium text-base' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
