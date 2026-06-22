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
  };
  pricing: {
    price_per_student_usd: number;
    /** Platform default ($7). May differ from price_per_student_usd if an override is in effect. */
    default_price_per_student_usd?: number;
    /** True when billing_override_usd is set on the school. */
    is_overridden?: boolean;
  };
  history: BillingHistoryRow[];
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
  const isCanceled = status === 'canceled';
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link href="/montree/admin" className="text-emerald-300/70 hover:text-emerald-200 text-xs">
        ← {t('billing.backToAdmin')}
      </Link>
      <h1 className="mt-2 text-3xl sm:text-4xl font-light text-white tracking-tight">{t('billing.title')}</h1>
      <p className="mt-2 text-emerald-200/70 text-sm">
        {t('billing.pricingTagline', { price: data.pricing.price_per_student_usd })}
      </p>
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
              <h2 className="text-white text-lg font-light">{t('billing.currentPlan')}</h2>
              <StatusPill status={status} t={t} />
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <Tile label={t('billing.tileActiveStudents')} value={String(data.school.live_student_count)} />
              <Tile
                label={t('billing.tileMonthlyCharge')}
                value={fmtUSD(data.school.live_monthly_charge_estimate_cents)}
                accent
              />
              {data.school.trial_days_remaining !== null && data.school.trial_days_remaining > 0 ? (
                <Tile
                  label={t('billing.tileTrialEndsIn')}
                  value={t('billing.daysCount', { days: data.school.trial_days_remaining })}
                  accent2
                />
              ) : data.school.current_period_end ? (
                <Tile label={t('billing.tileNextBill')} value={fmtDate(data.school.current_period_end)} />
              ) : (
                <Tile label={t('billing.tileStatus')} value={t(prettyStatusKey(status))} />
              )}
            </div>

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

            {/* Action — rail-aware */}
            <div className="mt-5 flex flex-wrap gap-2">
              {isStripeRail && !isActive && !isCanceled && (
                <button
                  onClick={startCheckout}
                  disabled={busy}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {busy ? t('billing.starting') : t('billing.setUpBilling')}
                </button>
              )}
              {isStripeRail && isActive && (
                <button
                  onClick={openPortal}
                  disabled={busy}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {busy ? t('billing.opening') : t('billing.manageInStripe')}
                </button>
              )}
              {isStripeRail && isPastDue && (
                <button
                  onClick={openPortal}
                  disabled={busy}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {busy ? t('billing.opening') : t('billing.updatePayment')}
                </button>
              )}
              {isStripeRail && isCanceled && (
                <button
                  onClick={startCheckout}
                  disabled={busy}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {busy ? t('billing.starting') : t('billing.resubscribe')}
                </button>
              )}
              {isAlipayRail && latestOpenInvoice?.invoice_pdf_url && (
                <a
                  href={latestOpenInvoice.invoice_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
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
                        className="text-emerald-300/80 hover:text-emerald-200 text-xs"
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
