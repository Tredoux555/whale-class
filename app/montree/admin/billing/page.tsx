'use client';

// /app/montree/admin/billing/page.tsx
//
// Phase 4 — Principal-facing billing page. Replaces the old tier-based UI
// (basic/standard/premium with max_students) with the new $7/student/month
// unified model.
//
// 🚨 Pre-Stripe-config: when STRIPE_SECRET_KEY isn't set, the page renders
// honestly: "Billing isn't set up yet. Tredoux will reach out when it's
// ready." No checkout button, no error spinners.

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface BillingHistoryRow {
  id: string;
  stripe_invoice_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  description: string | null;
  invoice_pdf_url: string | null;
  period_start: string | null;
  period_end: string | null;
  quantity: number | null;
  created_at: string;
}

interface BillingStatus {
  billing_configured: boolean;
  school: {
    id: string;
    name: string | null;
    subscription_status: string | null;
    trial_ends_at: string | null;
    current_period_end: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    billing_email: string | null;
    billing_quantity: number | null;
    monthly_charge_estimate_cents: number | null;
    live_student_count: number;
    live_monthly_charge_estimate_cents: number;
    live_monthly_charge_estimate_usd: number;
    trial_days_remaining: number | null;
  };
  pricing: {
    price_per_student_usd: number;
  };
  history: BillingHistoryRow[];
}

const fmtUSD = (cents: number): string =>
  (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const fmtDate = (d: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

function BillingPageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams?.get('status'); // 'success' | 'canceled' | null
  const [data, setData] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(
    initialStatus === 'success'
      ? "Thanks — your subscription is active. It can take a minute for the new status to appear here."
      : initialStatus === 'canceled'
        ? 'Checkout canceled. No charge was made.'
        : null
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/montree/billing/status');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/montree/login-select';
          return;
        }
        const t = await res.text();
        throw new Error(t.slice(0, 200));
      }
      const d: BillingStatus = await res.json();
      setData(d);
    } catch (e) {
      console.error('[billing page] load error:', e);
      setError(e instanceof Error ? e.message : 'Could not load billing status.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCheckout = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/billing/checkout', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) {
        if (d.already_subscribed) {
          await openPortal();
          return;
        }
        setError(d.detail || d.error || 'Could not start checkout.');
        return;
      }
      if (d.checkout_url) {
        window.location.href = d.checkout_url;
      }
    } catch (e) {
      console.error('[billing page] checkout error:', e);
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/billing/portal-session', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) {
        setError(d.detail || d.error || 'Could not open billing portal.');
        return;
      }
      if (d.portal_url) {
        window.location.href = d.portal_url;
      }
    } catch (e) {
      console.error('[billing page] portal error:', e);
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  if (!data && !error) {
    return <div className="p-8 text-slate-400">Loading…</div>;
  }
  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-200 text-sm">
          {error}
        </div>
      </div>
    );
  }
  if (!data) return null;

  const status = data.school.subscription_status;
  const isActive = status === 'active' || status === 'trialing';
  const isPastDue = status === 'past_due';
  const isCanceled = status === 'canceled';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link href="/montree/admin" className="text-emerald-300/70 hover:text-emerald-200 text-xs">
        ← Back to admin
      </Link>
      <h1 className="mt-2 text-3xl sm:text-4xl font-light text-white tracking-tight">Billing</h1>
      <p className="mt-2 text-emerald-200/70 text-sm">
        ${data.pricing.price_per_student_usd} per active student per month. Billed monthly via Stripe.
      </p>

      {actionMessage && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-200 text-sm flex justify-between items-start gap-3">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-200/60 hover:text-white">✕</button>
        </div>
      )}

      {!data.billing_configured ? (
        <BillingNotConfigured />
      ) : (
        <>
          {/* Current state card */}
          <section className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="text-white text-lg font-light">Current plan</h2>
              <StatusPill status={status} />
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <Tile label="Active students" value={String(data.school.live_student_count)} />
              <Tile
                label="Monthly charge"
                value={fmtUSD(data.school.live_monthly_charge_estimate_cents)}
                accent
              />
              {data.school.trial_days_remaining !== null && data.school.trial_days_remaining > 0 ? (
                <Tile label="Trial ends in" value={`${data.school.trial_days_remaining} days`} accent2 />
              ) : data.school.current_period_end ? (
                <Tile label="Next bill" value={fmtDate(data.school.current_period_end)} />
              ) : (
                <Tile label="Status" value={prettyStatus(status)} />
              )}
            </div>

            {/* Billed-quantity drift indicator */}
            {data.school.billing_quantity !== null &&
              data.school.live_student_count !== data.school.billing_quantity && (
                <p className="mt-3 text-amber-200/80 text-xs">
                  Stripe was last billed for {data.school.billing_quantity} student
                  {data.school.billing_quantity === 1 ? '' : 's'} — your active count is now{' '}
                  {data.school.live_student_count}. The next sync will reconcile this; the next
                  invoice charges based on actual count.
                </p>
              )}

            {/* Action */}
            <div className="mt-5 flex flex-wrap gap-2">
              {!isActive && !isCanceled && (
                <button
                  onClick={startCheckout}
                  disabled={busy}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {busy ? 'Starting…' : 'Set up billing'}
                </button>
              )}
              {isActive && (
                <button
                  onClick={openPortal}
                  disabled={busy}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {busy ? 'Opening…' : 'Manage billing in Stripe'}
                </button>
              )}
              {isPastDue && (
                <button
                  onClick={openPortal}
                  disabled={busy}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {busy ? 'Opening…' : 'Update payment method'}
                </button>
              )}
              {isCanceled && (
                <button
                  onClick={startCheckout}
                  disabled={busy}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {busy ? 'Starting…' : 'Resubscribe'}
                </button>
              )}
            </div>

            {error && (
              <div className="mt-3 bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}
          </section>

          {/* Invoice history */}
          <section className="mt-6">
            <h2 className="text-white text-lg font-light mb-3">Invoice history</h2>
            {data.history.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-emerald-200/60 text-sm">
                No invoices yet.
              </div>
            ) : (
              <ul className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
                {data.history.map(h => (
                  <li key={h.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm">{h.description || 'Subscription invoice'}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {fmtDate(h.created_at)}
                        {h.quantity !== null && ` · ${h.quantity} student${h.quantity === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm tabular-nums ${
                        h.status === 'paid' ? 'text-emerald-300' :
                        h.status === 'failed' ? 'text-red-400' :
                        'text-white/70'
                      }`}>
                        {fmtUSD(h.amount_cents)}
                      </p>
                      <p className="text-white/40 text-[10px] mt-0.5">{h.status}</p>
                    </div>
                    {h.invoice_pdf_url && (
                      <a
                        href={h.invoice_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-300/80 hover:text-emerald-200 text-xs"
                      >
                        PDF →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function BillingNotConfigured() {
  return (
    <section className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
      <h2 className="text-white text-lg font-light">Billing isn&apos;t set up yet</h2>
      <p className="mt-2 text-emerald-200/70 text-sm leading-relaxed">
        We&apos;re finalising payment processing. Tredoux will reach out before any
        billing kicks in — there&apos;s nothing for you to do here right now. Keep
        using Montree as normal.
      </p>
      <p className="mt-3 text-white/50 text-xs">
        Pricing model when billing goes live: <strong className="text-white">$7 per
        active student per month</strong>, billed monthly. No setup fee, no
        contracts, cancel any time. The first 30 days are free.
      </p>
    </section>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">Not subscribed</span>;
  }
  const style = (() => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'trialing': return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
      case 'past_due': return 'bg-red-500/15 text-red-300 border-red-500/40';
      case 'canceled': return 'bg-slate-700 text-slate-400 border-slate-600';
      case 'inactive': return 'bg-slate-700 text-slate-400 border-slate-600';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  })();
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${style}`}>
      {prettyStatus(status)}
    </span>
  );
}

function prettyStatus(status: string | null): string {
  if (!status) return 'Not subscribed';
  switch (status) {
    case 'active': return 'Active';
    case 'trialing': return 'Trial';
    case 'past_due': return 'Past due';
    case 'canceled': return 'Canceled';
    case 'inactive': return 'Not subscribed';
    default: return status;
  }
}

function Tile({ label, value, accent, accent2 }: { label: string; value: string; accent?: boolean; accent2?: boolean }) {
  const valueClass = accent ? 'text-emerald-300' : accent2 ? 'text-amber-300' : 'text-white';
  return (
    <div>
      <p className="text-white/40 uppercase tracking-wider text-[10px] font-semibold">{label}</p>
      <p className={`mt-1 text-xl font-light tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function AdminBillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <BillingPageContent />
    </Suspense>
  );
}
