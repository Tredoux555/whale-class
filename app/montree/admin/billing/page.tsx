'use client';

// /app/montree/admin/billing/page.tsx
//
// Principal-facing billing page.
//
// 🚨 3-TIER PRICING (Sep 7 2026) — Basic $12/year/school · Lite $20/month/school
// · Full $3 per active child/month with a $30 minimum. The RESOLVED plan comes
// from `GET /api/montree/billing/status` → `plan` (never re-derived here); plan
// moves go through `POST /api/montree/billing/change-plan` when a Stripe
// subscription exists and through `/checkout` when it does not. The webhook is
// the only writer of `montree_schools.plan`, so after a change we re-fetch
// status rather than assuming the new plan landed.
//
// There is NO free trial any more — the countdown, the Starter/Premium chooser
// and every "7 days" line were retired with the restructure. Do not reintroduce
// them without changing docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md first.
//
// 🚨 Pre-Stripe-config: when STRIPE_SECRET_KEY isn't set, the page renders
// honestly: "Billing isn't set up yet. Tredoux will reach out when it's
// ready." No checkout button, no error spinners.

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';
import type { TranslationKey } from '@/lib/montree/i18n/en';

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
    /** Phase B/C — three-rail inbound payments. Defaults to stripe_subscription. */
    payment_method?: 'stripe_subscription' | 'alipay_invoice' | 'manual_invoice' | string;
    /** monthly | annual. */
    billing_cadence?: 'monthly' | 'annual' | string;
    next_invoice_due_at?: string | null;
    /** Launch pricing (Jul 6 2026) — Founding 100 school (migration 286). */
    founding_member?: boolean;
  };
  pricing: {
    price_per_student_usd: number;
    /** Platform default ($7). May differ from price_per_student_usd if an override is in effect. */
    default_price_per_student_usd?: number;
    /** True when billing_override_usd is set on the school. */
    is_overridden?: boolean;
  };
  /** 3-tier plan block (WP-A). Absent only on a very old cached response. */
  plan?: PlanBlock;
  history: BillingHistoryRow[];
}

type Plan = 'basic' | 'lite' | 'full';

interface PlanBlock {
  plan: Plan;
  source: 'locked' | 'override' | 'founding' | 'partner' | 'stripe' | 'legacy' | 'default';
  model: 'none' | 'haiku' | 'sonnet';
  locked: boolean;
  ai_budget_usd: number;
  /** null = uncapped (Lite / Full). */
  photo_cap: number | null;
  /** null when uncapped. Grandfathered — only photos since plan_changed_at. */
  photos_used: number | null;
  plan_changed_at: string | null;
  prices: {
    basic_usd_per_year: number;
    lite_usd_per_month: number;
    full_usd_per_child_month: number;
    full_min_children: number;
    full_min_usd_per_month: number;
  };
  full_quote_quantity: number;
  full_quote_usd_per_month: number;
}

const PLAN_ORDER: Record<Plan, number> = { basic: 0, lite: 1, full: 2 };

/** Card copy. Prices read from the status block so there is one source of
 *  truth (lib/montree/plans/types.ts), with the locked figures as fallback. */
const PLAN_META: Record<
  Plan,
  { name: string; per: string; price: (p: PlanBlock | null) => string; bullets: string[] }
> = {
  basic: {
    name: 'Basic',
    per: '/year',
    price: (p) => `$${p?.prices.basic_usd_per_year ?? 12}`,
    bullets: [
      'The full tracker, tap grid and printables',
      'Dark Phonics and the Writing Shelf library',
      'Class documents, labels and parent codes',
      'Up to 500 photos per school',
    ],
  },
  lite: {
    name: 'Lite',
    per: '/month',
    price: (p) => `$${p?.prices.lite_usd_per_month ?? 20}`,
    bullets: [
      'Guru answers your questions, all day',
      'Astra sits with the principal',
      'Weekly and parent reports, written for you',
      'Unlimited photos — you tag them yourself',
    ],
  },
  full: {
    name: 'Full',
    per: '/child/mo',
    price: (p) => `$${p?.prices.full_usd_per_child_month ?? 3}`,
    bullets: [
      'Take a photo — Montree knows the work',
      'Deeper reports parents keep',
      'Montages, parent messaging, appointments and calls',
      'Onboarding across your whole organisation',
    ],
  },
};

/** Where the plan came from, in the principal's language. */
function planSourceLabel(source: PlanBlock['source']): string | null {
  switch (source) {
    case 'founding': return 'Founding member';
    case 'partner': return 'Foundation Partner';
    case 'override': return 'Set by Montree';
    case 'locked': return 'Account locked';
    case 'stripe': return null;
    default: return null;
  }
}

function BillingPageContent() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const initialStatus = searchParams?.get('status'); // 'success' | 'canceled' | null

  const fmtUSD = (cents: number): string =>
    (cents / 100).toLocaleString(getIntlLocale(locale), { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  const fmtDate = (d: string | null): string => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(getIntlLocale(locale), { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const [data, setData] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Two-tap confirm for a plan move. No native confirm() — the repo's pattern
  // is an inline confirm strip on the card itself.
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(
    initialStatus === 'success'
      ? t('billing.checkoutSuccess')
      : initialStatus === 'canceled'
        ? t('billing.checkoutCanceled')
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
      setError(e instanceof Error ? e.message : t('billing.couldNotLoad'));
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // 3-tier: start a Stripe Checkout for a plan the school has no subscription
  // for yet. The server forces `full` for founding schools and 400s a $0
  // partner (nothing to pay).
  const startCheckout = async (plan: Plan = 'basic') => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.already_subscribed) {
          await openPortal();
          return;
        }
        setError(d.detail || d.error || t('billing.couldNotStartCheckout'));
        return;
      }
      if (d.checkout_url) {
        window.location.href = d.checkout_url;
      }
    } catch (e) {
      console.error('[billing page] checkout error:', e);
      setError(t('billing.networkError'));
    } finally {
      setBusy(false);
    }
  };

  // Move an EXISTING Stripe subscription to another plan. The route never
  // writes montree_schools.plan — the webhook does — so we re-fetch status
  // instead of optimistically painting the new plan, and say so in the UI.
  const changePlan = async (plan: Plan) => {
    setBusy(true);
    setError(null);
    setPendingPlan(null);
    try {
      const res = await fetch('/api/montree/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const d = await res.json();
      if (!res.ok) {
        // No Stripe subscription yet → this is a first purchase, not a move.
        if (res.status === 409 && d.needs_checkout) {
          await startCheckout(plan);
          return;
        }
        setError(d.detail || d.error || 'Could not change your plan.');
        return;
      }
      setActionMessage(
        d.direction === 'downgrade'
          ? 'Your plan change is booked. You keep what you have paid for until the end of this period.'
          : 'Your plan change is going through. It usually lands within a few seconds.'
      );
      // Give the webhook a beat, then re-read the truth.
      setTimeout(() => { load(); }, 3000);
    } catch (e) {
      console.error('[billing page] change-plan error:', e);
      setError(t('billing.networkError'));
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
        setError(d.detail || d.error || t('billing.couldNotOpenPortal'));
        return;
      }
      if (d.portal_url) {
        window.location.href = d.portal_url;
      }
    } catch (e) {
      console.error('[billing page] portal error:', e);
      setError(t('billing.networkError'));
    } finally {
      setBusy(false);
    }
  };

  if (!data && !error) {
    return <div className="p-8 text-slate-400">{t('common.loading')}</div>;
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
  // A subscription is "active" only if Stripe actually knows about it. The
  // local /montree/try signup sets subscription_status='trialing' without
  // creating a Stripe customer, so we must also check stripe_customer_id —
  // otherwise the "Manage billing in Stripe" button 500s on the portal call.
  const hasStripeCustomer = !!data.school.stripe_customer_id;
  const isActive = (status === 'active' || status === 'trialing') && hasStripeCustomer;
  const isPastDue = status === 'past_due';
  // (canceled schools fall into showPlanChooser below — !isActive — so a
  // dedicated isCanceled flag is no longer needed for the resubscribe CTA.)
  // Phase B/C rail awareness. Default to stripe_subscription.
  const paymentMethod = (data.school.payment_method || 'stripe_subscription') as
    | 'stripe_subscription'
    | 'alipay_invoice'
    | 'manual_invoice';
  const billingCadence = (data.school.billing_cadence || 'monthly') as 'monthly' | 'annual';
  const isAlipayRail = paymentMethod === 'alipay_invoice';
  const isManualRail = paymentMethod === 'manual_invoice';
  const isStripeRail = paymentMethod === 'stripe_subscription';
  const latestOpenInvoice = data.history.find((h) => h.status === 'open') || null;

  // 🚨 3-tier: the plan is RESOLVED SERVER-SIDE. Never re-derive it here.
  // A missing `plan` block (stale cached response) falls back to Basic, which
  // is the safe direction — it shows the upgrade path, it never grants AI.
  const planBlock: PlanBlock | null = data.plan ?? null;
  const currentPlan: Plan = planBlock?.plan ?? 'basic';
  const planSource = planBlock?.source ?? 'default';
  const sourceLabel = planSourceLabel(planSource);
  const isFounding = data.school.founding_member === true || planSource === 'founding';
  const isPartner = planSource === 'partner';
  // A plan the school cannot move itself out of: founding and partner grants
  // are ours to change, and a locked school changes nothing at all.
  const planIsGranted = isFounding || isPartner || planSource === 'override' || planSource === 'locked';
  // The plan chooser is for schools paying (or about to pay) through Stripe.
  const showPlanChooser = isStripeRail && !planIsGranted;
  const hasStripeSubscription = !!data.school.stripe_subscription_id;
  // Signup leaves the school on 'incomplete' until the card clears — the school
  // works on Basic meanwhile, so this is a nudge, not a wall.
  const needsCard = isStripeRail && status === 'incomplete';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link href="/montree/admin" className="btn btn-ghost btn-sm">
        ← {t('billing.backToAdmin')}
      </Link>
      <h1 className="mt-2 text-3xl sm:text-4xl font-light text-white tracking-tight">{t('billing.title')}</h1>
      <p className="mt-2 text-emerald-200/70 text-sm">
        Basic ${planBlock?.prices.basic_usd_per_year ?? 12} a year · Lite $
        {planBlock?.prices.lite_usd_per_month ?? 20} a month · Full $
        {planBlock?.prices.full_usd_per_child_month ?? 3} per child a month (minimum $
        {planBlock?.prices.full_min_usd_per_month ?? 30}).
      </p>

      {/* Add-your-card nudge. Signup lands a school on Basic with
          subscription_status='incomplete' — everything works, the card is just
          not on file yet. Dismissible by paying, not by closing. */}
      {needsCard && (
        <div className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(232,201,106,0.35)', background: 'rgba(232,201,106,0.08)', color: 'rgba(255,250,240,0.9)' }}>
          <p className="font-medium" style={{ color: '#E8C96A' }}>Add your card to keep your school</p>
          <p className="mt-1 text-white/70 text-xs leading-relaxed">
            Your school is running on Basic — ${planBlock?.prices.basic_usd_per_year ?? 12} for the
            year. Nothing has been charged yet.
          </p>
          <button
            onClick={() => startCheckout('basic')}
            disabled={busy}
            className="btn btn-primary btn-sm mt-3"
          >
            {busy ? t('billing.starting') : 'Add your card'}
          </button>
        </div>
      )}
      {/* Override banner — only when a per-school custom rate is in effect.
          Sits right under the tagline so the principal immediately sees their
          actual rate. Gold accent matches the early-adopter / partner tone. */}
      {data.pricing.is_overridden && data.pricing.default_price_per_student_usd !== undefined && (
        <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-100 text-xs flex items-center gap-2">
          <span aria-hidden>💛</span>
          <span>
            {t('billing.overrideBanner', {
              price: data.pricing.price_per_student_usd,
              defaultPrice: data.pricing.default_price_per_student_usd,
            })}
          </span>
        </div>
      )}

      {actionMessage && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-200 text-sm flex justify-between items-start gap-3">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="btn btn-ghost btn-icon btn-sm">✕</button>
        </div>
      )}

      {!data.billing_configured ? (
        <BillingNotConfigured />
      ) : (
        <>
          {/* Current state card */}
          <section className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="text-white text-lg font-light">{t('billing.currentPlan')}</h2>
              <StatusPill status={status} t={t} />
            </div>

            {/* Resolved plan pill + where it came from. */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className="text-xs px-2.5 py-1 rounded-full border font-medium tracking-wide uppercase"
                style={{
                  borderColor: currentPlan === 'full' ? 'rgba(232,201,106,0.5)' : 'rgba(255,255,255,0.18)',
                  color: currentPlan === 'full' ? '#E8C96A' : 'rgba(255,255,255,0.8)',
                  background: currentPlan === 'full' ? 'rgba(232,201,106,0.10)' : 'rgba(255,255,255,0.06)',
                }}
              >
                {PLAN_META[currentPlan].name}
              </span>
              {sourceLabel && (
                <span className="text-white/45 text-xs">{sourceLabel}</span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <Tile label={t('billing.tileActiveStudents')} value={String(data.school.live_student_count)} />
              <Tile
                label={t('billing.tileMonthlyCharge')}
                value={fmtUSD(data.school.live_monthly_charge_estimate_cents)}
                accent
              />
              {data.school.current_period_end ? (
                <Tile label={t('billing.tileNextBill')} value={fmtDate(data.school.current_period_end)} />
              ) : (
                <Tile label={t('billing.tileStatus')} value={t(prettyStatusKey(status))} />
              )}
            </div>

            {/* Basic photo usage. The count is grandfathered: only photos taken
                since the school moved onto Basic count toward the cap. */}
            {planBlock && planBlock.photo_cap !== null && planBlock.photos_used !== null && (
              <div className="mt-5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-white/50 uppercase tracking-wider font-semibold">Photos</span>
                  <span className="text-white/70 tabular-nums">
                    {planBlock.photos_used} / {planBlock.photo_cap}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((planBlock.photos_used / planBlock.photo_cap) * 100))}%`,
                      background: planBlock.photos_used >= planBlock.photo_cap ? '#E8C96A' : '#34d399',
                    }}
                  />
                </div>
                <p className="mt-2 text-white/50 text-xs leading-relaxed">
                  {planBlock.photos_used >= planBlock.photo_cap
                    ? 'Your oldest photos are archived past 500 — nothing is deleted. Upgrade to bring them all back.'
                    : `Basic keeps ${planBlock.photo_cap} photos per school. Past that, the oldest are archived — never deleted — and come back the moment you upgrade.`}
                </p>
              </div>
            )}

            {/* Lite AI allowance. The status endpoint exposes the ALLOWANCE but
                not the spend so far, so this is a stated figure rather than a
                usage bar. Add the bar when status carries the spend. */}
            {planBlock && currentPlan === 'lite' && planBlock.ai_budget_usd > 0 && (
              <p className="mt-4 text-white/60 text-xs leading-relaxed">
                Lite includes an AI allowance of{' '}
                <span className="text-emerald-300 tabular-nums">${planBlock.ai_budget_usd}</span> a
                month. It refreshes on the 1st. If you keep reaching it, Full runs without a ceiling.
              </p>
            )}

            {/* Billed-quantity drift indicator */}
            {data.school.billing_quantity !== null &&
              data.school.live_student_count !== data.school.billing_quantity && (
                <p className="mt-3 text-amber-200/80 text-xs">
                  {t('billing.quantityDrift', {
                    billed: data.school.billing_quantity,
                    live: data.school.live_student_count,
                  })}
                </p>
              )}

            {/*
              🚨 3-tier plan chooser. Copy is hardcoded English by design (it
              matches the rest of this page's mix of i18n keys + hardcoded
              strings). The CTA reads Upgrade / Downgrade / Current plan against
              the RESOLVED plan; a move goes through change-plan when a Stripe
              subscription exists and through checkout when it does not.
            */}
            {showPlanChooser && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['basic', 'lite', 'full'] as Plan[]).map((p) => {
                  const meta = PLAN_META[p];
                  const isCurrent = p === currentPlan;
                  const direction =
                    PLAN_ORDER[p] > PLAN_ORDER[currentPlan] ? 'upgrade' : 'downgrade';
                  const featured = p === 'full';
                  const confirming = pendingPlan === p;
                  return (
                    <div
                      key={p}
                      className="rounded-xl p-5 flex flex-col"
                      style={
                        featured
                          ? { border: '2px solid #E8C96A', background: 'rgba(232,201,106,0.06)' }
                          : { border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }
                      }
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3
                          className="text-lg font-light"
                          style={featured ? { color: '#E8C96A' } : { color: '#ffffff' }}
                        >
                          {meta.name}
                        </h3>
                        <span
                          className="text-sm tabular-nums"
                          style={featured ? { color: '#E8C96A' } : { color: 'rgb(167,243,208)' }}
                        >
                          {meta.price(planBlock)}
                          <span className="text-white/40 text-xs">{meta.per}</span>
                        </span>
                      </div>
                      <ul className="mt-3 space-y-1.5 text-white/75 text-xs leading-relaxed flex-1">
                        {meta.bullets.map((b) => <li key={b}>{b}</li>)}
                      </ul>
                      {p === 'full' && planBlock && (
                        <p className="mt-3 text-white/45 text-[11px] leading-relaxed">
                          {planBlock.full_quote_quantity} billed ×{' '}
                          ${planBlock.prices.full_usd_per_child_month} ={' '}
                          <span className="tabular-nums">${planBlock.full_quote_usd_per_month}</span>/mo
                          {' '}· minimum ${planBlock.prices.full_min_usd_per_month} (
                          {planBlock.prices.full_min_children} children)
                        </p>
                      )}

                      {isCurrent ? (
                        <button disabled className="btn btn-secondary btn-md mt-4 opacity-60">
                          Current plan
                        </button>
                      ) : confirming ? (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => (hasStripeSubscription ? changePlan(p) : startCheckout(p))}
                            disabled={busy}
                            className={`btn btn-md flex-1 ${direction === 'upgrade' ? 'btn-primary' : 'btn-danger'}`}
                          >
                            {busy ? t('billing.starting') : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setPendingPlan(null)}
                            disabled={busy}
                            className="btn btn-ghost btn-md"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPendingPlan(p)}
                          disabled={busy}
                          className={`btn btn-md mt-4 ${featured ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {direction === 'upgrade' ? `Upgrade to ${meta.name}` : `Move to ${meta.name}`}
                        </button>
                      )}
                      {confirming && (
                        <p className="mt-2 text-white/50 text-[11px] leading-relaxed">
                          {direction === 'upgrade'
                            ? 'Takes effect straight away, prorated against what you have already paid.'
                            : 'You keep what you have paid for until the end of this period.'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Foundation Partner — Full, free for life ($0 override).
                Checked BEFORE the Founding 100 card so a partner never sees
                the "$3 per child for life" copy. No checkout button: there is
                nothing to pay. */}
            {isPartner && (
              <div className="mt-6 rounded-xl border-2 p-5" style={{ borderColor: '#E8C96A', background: 'rgba(232,201,106,0.08)' }}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-light" style={{ color: '#E8C96A' }}>Foundation Partner</h3>
                  <span className="text-sm tabular-nums" style={{ color: '#E8C96A' }}>Free<span className="text-white/40 text-xs">· for life</span></span>
                </div>
                <p className="mt-2 text-white/80 text-sm leading-relaxed">
                  Full Montree, free, for life — the whole thing, with nothing to pay. You are one of
                  the partners we are building Montree with.
                </p>
              </div>
            )}

            {/* Founding 100 — Full at $3 per child, for life. Partners are
                excluded (they get the Foundation Partner card above). */}
            {isFounding && !isPartner && (
              <div className="mt-6 rounded-xl border-2 p-5" style={{ borderColor: '#E8C96A', background: 'rgba(232,201,106,0.08)' }}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-light" style={{ color: '#E8C96A' }}>Founding 100</h3>
                  <span className="text-sm tabular-nums" style={{ color: '#E8C96A' }}>$3<span className="text-white/40 text-xs">/child/mo · for life</span></span>
                </div>
                <p className="mt-2 text-white/80 text-sm leading-relaxed">
                  Full Montree at $3 per child, for life — the price never rises, whatever we add.
                  {planBlock ? ` Minimum $${planBlock.prices.full_min_usd_per_month} a month (${planBlock.prices.full_min_children} children).` : ''}
                </p>
                {!hasStripeSubscription && (
                  <button
                    onClick={() => startCheckout('full')}
                    disabled={busy}
                    className="btn btn-primary btn-md mt-4"
                  >
                    {busy ? t('billing.starting') : 'Set up billing'}
                  </button>
                )}
              </div>
            )}

            {/* Action — rail-aware. Stripe rail: portal for active, update-payment
                for past-due. The set-up-billing + resubscribe CTAs are now the
                plan-chooser / founding cards above (both cover !isActive). */}
            <div className="mt-5 flex flex-wrap gap-2">
              {isStripeRail && isActive && (
                <button
                  onClick={openPortal}
                  disabled={busy}
                  className="btn btn-secondary btn-md"
                >
                  {busy ? t('billing.opening') : t('billing.manageInStripe')}
                </button>
              )}
              {isStripeRail && isPastDue && (
                <button
                  onClick={openPortal}
                  disabled={busy}
                  className="btn btn-danger btn-md"
                >
                  {busy ? t('billing.opening') : t('billing.updatePayment')}
                </button>
              )}
              {isAlipayRail && latestOpenInvoice?.invoice_pdf_url && (
                <a
                  href={latestOpenInvoice.invoice_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-md"
                >
                  {t('billing.openInvoice')}
                </a>
              )}
            </div>

            {/* Alipay / WeChat — pending invoice banner */}
            {isAlipayRail && latestOpenInvoice && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-100 text-sm">
                <p className="font-medium">{t('billing.invoicePending')}</p>
                <p className="mt-1 text-amber-100/80 text-xs leading-relaxed">
                  {t('billing.alipayInstructions')}
                </p>
              </div>
            )}

            {/* Alipay / WeChat — explanatory card when no open invoice */}
            {isAlipayRail && !latestOpenInvoice && (
              <div className="mt-4 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/70 text-sm">
                {t('billing.alipayRailExplain')}
              </div>
            )}

            {/* Manual invoice — bank details card */}
            {isManualRail && (
              <div className="mt-4 bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white/80 text-sm space-y-2">
                <p className="font-medium text-white">{t('billing.wireDetailsLabel')}</p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-white/40 uppercase tracking-wider text-[10px]">{t('billing.wireDetailsBankName')}</dt>
                    <dd className="text-white">DBS Bank (Hong Kong) Limited</dd>
                  </div>
                  <div>
                    <dt className="text-white/40 uppercase tracking-wider text-[10px]">{t('billing.wireDetailsAccountHolder')}</dt>
                    <dd className="text-white">Montree Limited</dd>
                  </div>
                  <div>
                    <dt className="text-white/40 uppercase tracking-wider text-[10px]">{t('billing.wireDetailsAccountNumber')}</dt>
                    <dd className="text-white tabular-nums">7949855392</dd>
                  </div>
                  <div>
                    <dt className="text-white/40 uppercase tracking-wider text-[10px]">{t('billing.wireDetailsSwift')}</dt>
                    <dd className="text-white tabular-nums">DHBKHKHH</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-white/40 uppercase tracking-wider text-[10px]">{t('billing.wireDetailsReferenceNumber')}</dt>
                    <dd className="text-white font-mono text-[11px]">
                      MONTREE-{data.school.id.slice(0, 8).toUpperCase()}-
                      {new Date().toISOString().slice(0, 7).replace('-', '')}
                    </dd>
                  </div>
                </dl>
                <p className="text-white/60 text-xs mt-2">
                  {t('billing.manualRailExplain')}
                </p>
              </div>
            )}

            {/* Annual savings pill */}
            {billingCadence === 'annual' && isActive && (
              <p className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/40 rounded-full px-3 py-1 text-emerald-200 text-xs">
                <span aria-hidden>🎉</span>
                <span>{t('billing.annualSavings')}</span>
              </p>
            )}

            {error && (
              <div className="mt-3 bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            {/*
              Alternative payment path. Original prompt: "they need a clean
              and clear path to both" — i.e. Stripe Checkout for cards
              + a direct line to Tredoux for everything else (wire transfers,
              Chinese schools that can't use Stripe, fapiao questions,
              custom invoicing arrangements). Always visible regardless
              of subscription status so it works for paying schools too
              who have billing questions.
            */}
            <div className="mt-5 border-t border-white/5 pt-4 text-center">
              <p className="text-white/55 text-xs">
                {t('billing.altPaymentQ')}{' '}
                <a
                  href="mailto:tredoux555@gmail.com?subject=Montree%20billing%20—%20alternative%20payment&body=Hi%20Montree%20team,%0A%0AI%27d%20like%20to%20talk%20about%20paying%20for%20Montree%20outside%20Stripe%20Checkout.%20Our%20situation%20is:%0A%0A"
                  className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
                >
                  {t('billing.altPaymentLink')}
                </a>{' '}
                {t('billing.altPaymentA')}
              </p>
            </div>
          </section>

          {/* Invoice history */}
          <section className="mt-6">
            <h2 className="text-white text-lg font-light mb-3">{t('billing.invoiceHistory')}</h2>
            {data.history.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-emerald-200/60 text-sm">
                {t('billing.noInvoices')}
              </div>
            ) : (
              <ul className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
                {data.history.map(h => (
                  <li key={h.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm">{h.description || t('billing.subscriptionInvoice')}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {fmtDate(h.created_at)}
                        {h.quantity !== null && ` · ${t('billing.studentsCount', { count: h.quantity })}`}
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
                        className="btn btn-ghost btn-sm"
                      >
                        {t('billing.pdfLink')}
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
  const { t } = useI18n();
  return (
    <section className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
      <h2 className="text-white text-lg font-light">{t('billing.notConfiguredTitle')}</h2>
      <p className="mt-2 text-emerald-200/70 text-sm leading-relaxed">
        {t('billing.notConfiguredBody')}
      </p>
      <p
        className="mt-3 text-white/50 text-xs"
        dangerouslySetInnerHTML={{ __html: t('billing.notConfiguredPricing') }}
      />
    </section>
  );
}

function StatusPill({ status, t }: { status: string | null; t: (key: TranslationKey) => string }) {
  if (!status) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
        {t('billing.status.notSubscribed')}
      </span>
    );
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
      {t(prettyStatusKey(status))}
    </span>
  );
}

function prettyStatusKey(status: string | null): TranslationKey {
  if (!status) return 'billing.status.notSubscribed';
  switch (status) {
    case 'active': return 'billing.status.active';
    case 'trialing': return 'billing.status.trialing';
    case 'past_due': return 'billing.status.pastDue';
    case 'canceled': return 'billing.status.canceled';
    case 'inactive': return 'billing.status.notSubscribed';
    default: return 'billing.status.notSubscribed';
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

function BillingPageWithSuspense() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">{t('common.loading')}</div>}>
      <BillingPageContent />
    </Suspense>
  );
}

export default function AdminBillingPage() {
  return <BillingPageWithSuspense />;
}
