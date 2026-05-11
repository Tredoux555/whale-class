'use client';

// app/montree/agent/dashboard/page.tsx
//
// Phase 7c — Agent dashboard home. Mobile-first, dark forest theme.
// Surfaces: header summary (greeting + KPI line), Stripe Connect banner,
// schools cards, earnings summary, recent codes.
//
// All numbers are ESTIMATES until Phases 4-5 ship — clearly labelled
// per AGENT_DASHBOARD_PLAN Section 6.5 ("Real numbers, no fluff").

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AgentFirstRunOverlay from '@/components/montree/agent/AgentFirstRunOverlay';
import AgentRedemptionBanner from '@/components/montree/agent/AgentRedemptionBanner';
import MiraProactiveCard from '@/components/montree/agent/MiraProactiveCard';
import ChangelogModal from '@/components/montree/ChangelogModal';

interface Agent {
  id: string;
  name: string | null;
  email: string | null;
  agent_default_share_pct: number | null;
  agent_login_set_at: string | null;
  agent_login_last_used_at: string | null;
}

interface School {
  id: string;
  name: string | null;
  created_at: string;
  revenue_share_pct: number | null;
  revenue_share_active: boolean;
  student_count: number;
}

interface MeResponse {
  agent: Agent;
  schools: School[];
  schools_error?: string;
}

interface EarningsResponse {
  estimated_this_month_usd: number;
  paid_to_date_usd: number;
  is_estimate: boolean;
  per_school: Array<{
    school_id: string;
    school_name: string | null;
    student_count: number;
    revenue_share_pct: number;
    estimated_share_usd: number;
  }>;
}

interface CodeRow {
  id: string;
  code: string;
  status: 'pending' | 'redeemed' | 'revoked' | 'expired';
  agent_pitch_label: string | null;
  redeemed_by_school_name: string | null;
  created_at: string;
  revenue_share_pct: number;
}

interface PayoutsResponse {
  stripe_connect_status:
    | 'pending'
    | 'onboarding'
    | 'verified'
    | 'restricted'
    | 'disabled'
    | null;
  stripe_connect_account_id: string | null;
}

const USD = (n: number): string =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const fmtDate = (d: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function AgentDashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [codes, setCodes] = useState<CodeRow[] | null>(null);
  const [payouts, setPayouts] = useState<PayoutsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, earningsRes, codesRes, payoutsRes] = await Promise.all([
        fetch('/api/montree/agent/me'),
        fetch('/api/montree/agent/earnings'),
        fetch('/api/montree/agent/codes?limit=5'),
        fetch('/api/montree/agent/payouts'),
      ]);
      if (!meRes.ok) {
        if (meRes.status === 401) {
          window.location.href = '/montree/login-select';
          return;
        }
        const txt = await meRes.text();
        setError(`Profile load failed: ${txt.slice(0, 200)}`);
        return;
      }
      setMe(await meRes.json());
      if (earningsRes.ok) setEarnings(await earningsRes.json());
      if (codesRes.ok) {
        const data = await codesRes.json();
        setCodes(data.codes || []);
      }
      if (payoutsRes.ok) setPayouts(await payoutsRes.json());
    } catch (e) {
      console.error('[agent dashboard] load error:', e);
      setError('Could not load your dashboard. Try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Up late';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (loading && !me) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-center text-emerald-200/60">
        Loading your dashboard…
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-5 text-red-200">
          {error}
        </div>
      </div>
    );
  }
  if (!me) {
    return null;
  }

  const firstName = (me.agent.name || me.agent.email || 'there').split(/\s+/)[0];
  const schoolsCount = me.schools.length;
  const studentTotal = me.schools.reduce((acc, s) => acc + (s.student_count || 0), 0);
  const stripeStatus = payouts?.stripe_connect_status || null;
  const showStripeBanner = stripeStatus !== 'verified';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* ── First-run overlay (once per device) ────────────────────────── */}
      <AgentFirstRunOverlay />

      {/* ── What's new since last visit (agent-scoped) ─────────────────── */}
      <ChangelogModal audience="agent" />

      {/* ── Mira proactive snapshot — actionable school signals ───────── */}
      <MiraProactiveCard />

      {/* ── Redemption celebration (when school count went up) ─────────── */}
      <AgentRedemptionBanner
        schoolCount={schoolsCount}
        newestSchoolName={me.schools[0]?.name || null}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
          {greeting}, {firstName}.
        </h1>
        <p className="mt-2 text-emerald-200/70 text-sm sm:text-base">
          {schoolsCount === 0 ? (
            <>No schools yet — once you pitch a school using one of your codes, they&apos;ll appear here.</>
          ) : (
            <>
              {schoolsCount} {schoolsCount === 1 ? 'school' : 'schools'} ·{' '}
              {studentTotal} {studentTotal === 1 ? 'student' : 'students'} ·{' '}
              {earnings ? (
                <>{USD(earnings.estimated_this_month_usd)} <span className="text-white/40">estimated this month</span></>
              ) : (
                <span className="text-white/40">estimating…</span>
              )}
            </>
          )}
        </p>
      </header>

      {/* ── Stripe Connect banner (hidden when verified) ───────────────── */}
      {showStripeBanner && (
        <StripeBanner status={stripeStatus} />
      )}

      {/* ── Schools cards ──────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-lg font-light text-white tracking-wide">Your schools</h2>
          {schoolsCount > 3 && (
            <Link href="/montree/agent/schools" className="text-emerald-300/80 hover:text-emerald-200 text-xs">
              See all →
            </Link>
          )}
        </div>
        {schoolsCount === 0 ? (
          <EmptySchools />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {me.schools.slice(0, 6).map(s => (
              <SchoolCard
                key={s.id}
                school={s}
                estimatedShare={
                  earnings?.per_school.find(p => p.school_id === s.id)?.estimated_share_usd ?? null
                }
              />
            ))}
          </div>
        )}
        {me.schools_error && (
          <p className="mt-2 text-amber-200/70 text-xs">{me.schools_error}</p>
        )}
      </section>

      {/* ── Earnings summary ───────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-lg font-light text-white tracking-wide">Earnings</h2>
          <Link href="/montree/agent/earnings" className="text-emerald-300/80 hover:text-emerald-200 text-xs">
            Full ledger →
          </Link>
        </div>
        {earnings ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <EarningsTile
              label="This month (estimated)"
              value={USD(earnings.estimated_this_month_usd)}
              hint="Based on current student counts. Final number locks at month end."
              tint="emerald"
            />
            <EarningsTile
              label="Paid to date"
              value={USD(earnings.paid_to_date_usd)}
              hint={earnings.paid_to_date_usd > 0 ? 'Confirmed via Stripe' : 'Once your first month closes, paid amounts appear here.'}
              tint="slate"
            />
            <EarningsTile
              label="Active default %"
              value={me.agent.agent_default_share_pct === null ? '—' : `${me.agent.agent_default_share_pct}%`}
              hint={
                me.agent.agent_default_share_pct === null
                  ? 'Self-service code generation is currently disabled. Tredoux can enable it.'
                  : 'Locked when you self-generate codes. Per-school share at redemption stays as agreed.'
              }
              tint="gold"
            />
          </div>
        ) : (
          <p className="text-emerald-200/50 text-sm">Loading earnings…</p>
        )}
      </section>

      {/* ── Codes section ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-lg font-light text-white tracking-wide">Recent codes</h2>
          <Link href="/montree/agent/codes" className="text-emerald-300/80 hover:text-emerald-200 text-xs">
            All codes & generate new →
          </Link>
        </div>
        {codes === null ? (
          <p className="text-emerald-200/50 text-sm">Loading codes…</p>
        ) : codes.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-emerald-200/60 text-sm">
            No codes yet.{' '}
            <Link href="/montree/agent/codes" className="text-emerald-300 hover:text-emerald-200">
              Generate your first code
            </Link>
            {' '}for the next school you pitch.
          </div>
        ) : (
          <ul className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
            {codes.map(c => (
              <CodeRowItem key={c.id} code={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function StripeBanner({ status }: { status: PayoutsResponse['stripe_connect_status'] }) {
  let title = 'Set up payouts to get paid automatically';
  let body = 'Five-minute Stripe form — bank + tax info goes directly to Stripe, not to us. Once verified, your monthly share lands in your account each cycle.';
  let cta = 'Set up payouts';
  let tone: 'amber' | 'red' = 'amber';
  if (status === 'onboarding') {
    title = 'Finish your payout setup';
    body = 'Stripe still needs a few details. You won&apos;t receive automated payouts until this is complete.';
    cta = 'Finish payout setup';
  } else if (status === 'restricted' || status === 'disabled') {
    title = 'Stripe needs your attention';
    body = 'Stripe has flagged your account. Open the link they sent you (or generate a fresh one) to fix it.';
    cta = 'Resolve in Stripe';
    tone = 'red';
  }
  const cls =
    tone === 'red'
      ? 'bg-red-500/10 border-red-500/40'
      : 'bg-amber-500/10 border-amber-500/40';
  const txt = tone === 'red' ? 'text-red-200' : 'text-amber-200';
  return (
    <div className={`mb-8 rounded-xl border p-5 ${cls}`}>
      <p className={`uppercase tracking-wider text-xs font-semibold mb-1 ${txt}`}>
        {title}
      </p>
      <p className="text-white/80 text-sm leading-relaxed mb-3">{body}</p>
      <Link
        href="/montree/agent/payouts"
        className="inline-block px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-lg text-sm transition-colors"
      >
        {cta} →
      </Link>
    </div>
  );
}

function EmptySchools() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
      <div className="text-3xl mb-3">🌱</div>
      <p className="text-white/80 mb-2">No referred schools yet.</p>
      <p className="text-emerald-200/60 text-sm mb-4">
        Generate a code, give it to a school, and they&apos;ll appear here when they sign up.
      </p>
      <Link
        href="/montree/agent/codes"
        className="inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
      >
        Generate your first code →
      </Link>
    </div>
  );
}

function SchoolCard({
  school,
  estimatedShare,
}: {
  school: School;
  estimatedShare: number | null;
}) {
  return (
    <Link
      href={`/montree/agent/schools/${school.id}`}
      className="block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 rounded-xl p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-white font-medium">{school.name || 'Unnamed school'}</h3>
        {!school.revenue_share_active && (
          <span className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
            Paused
          </span>
        )}
      </div>
      <p className="text-emerald-200/60 text-xs mt-1">
        Linked {fmtDate(school.created_at)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-white/40">Students</p>
          <p className="text-white text-base mt-0.5">{school.student_count}</p>
        </div>
        <div>
          <p className="text-white/40">Your share</p>
          <p className="text-emerald-300 text-base mt-0.5 tabular-nums">
            {estimatedShare === null ? '—' : USD(estimatedShare)}
            <span className="ml-1 text-white/40 text-[10px]">/ mo est.</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function EarningsTile({
  label,
  value,
  hint,
  tint,
}: {
  label: string;
  value: string;
  hint: string;
  tint: 'emerald' | 'slate' | 'gold';
}) {
  const valueClass =
    tint === 'emerald' ? 'text-emerald-300' : tint === 'gold' ? 'text-amber-300' : 'text-white';
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/40 uppercase tracking-wider text-[10px] font-semibold">{label}</p>
      <p className={`mt-2 text-2xl font-light tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-2 text-white/50 text-xs leading-relaxed">{hint}</p>
    </div>
  );
}

function CodeRowItem({ code }: { code: CodeRow }) {
  const statusBadge = (() => {
    switch (code.status) {
      case 'pending':
        return { cls: 'bg-amber-500/15 border-amber-500/40 text-amber-300', label: 'Pending' };
      case 'redeemed':
        return { cls: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', label: 'Redeemed' };
      case 'revoked':
        return { cls: 'bg-slate-700 border-slate-600 text-slate-300', label: 'Revoked' };
      case 'expired':
      default:
        return { cls: 'bg-slate-700 border-slate-600 text-slate-300', label: 'Expired' };
    }
  })();
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-emerald-300 text-sm">{code.code}</p>
        <p className="text-white/50 text-xs mt-0.5 truncate">
          {code.agent_pitch_label || (code.redeemed_by_school_name ? `→ ${code.redeemed_by_school_name}` : 'No pitch label')}
        </p>
      </div>
      <div className="text-right shrink-0">
        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
        <p className="text-white/40 text-[10px] mt-1 tabular-nums">{code.revenue_share_pct}%</p>
      </div>
    </li>
  );
}
