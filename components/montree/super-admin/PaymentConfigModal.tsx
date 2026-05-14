'use client';

// /components/montree/super-admin/PaymentConfigModal.tsx
//
// Phase A of INBOUND_PAYMENTS_PLAN.md — three-rail inbound payments.
// Per-school payment-method + billing-cadence + manual_invoice_details editor.
//
// 🚨 Architectural rules locked (do NOT remove):
//   #80 Every school pays via exactly ONE payment_method at a time.
//   #81 stripe_subscription is the canonical default.
//   #82 alipay_invoice are recurring one-time invoices, NOT Stripe subscriptions.
//   #86 Annual cadence writes 12 monthly finance_tx rows at once (Phase D).
//   #70 mirror — refuses silent flip from active stripe_subscription. Force=true logs.

import { useEffect, useState } from 'react';

type PaymentMethod = 'stripe_subscription' | 'alipay_invoice' | 'manual_invoice';
type BillingCadence = 'monthly' | 'annual';

interface PaymentConfigData {
  payment_method: PaymentMethod;
  billing_cadence: BillingCadence;
  manual_invoice_details: Record<string, unknown> | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  next_invoice_due_at: string | null;
  billing_email: string | null;
  billing_quantity: number | null;
}

interface PaymentConfigModalProps {
  schoolId: string;
  schoolName: string;
  sessionToken: string;
  onClose: () => void;
  /**
   * Called with the saved method + cadence after a successful PATCH.
   * SchoolsTab uses this for optimistic display updates.
   */
  onSaved: (method: PaymentMethod, cadence: BillingCadence) => void;
}

const METHOD_LABELS: Record<PaymentMethod, { label: string; subtitle: string; flag: string }> = {
  stripe_subscription: {
    label: 'Stripe subscription',
    subtitle: 'Auto-renewing Checkout + Customer Portal. Western markets + supported Asia.',
    flag: '💳',
  },
  alipay_invoice: {
    label: 'Alipay / WeChat invoice',
    subtitle: 'Monthly Stripe invoice with Alipay + WeChat QR codes. Mainland China + HK + Taiwan.',
    flag: '🇨🇳',
  },
  manual_invoice: {
    label: 'Manual invoice + SWIFT wire',
    subtitle: 'Super-admin issues PDF, school wires to Wallex HK, super-admin records receipt.',
    flag: '🏦',
  },
};

const CADENCE_LABELS: Record<BillingCadence, { label: string; subtitle: string }> = {
  monthly: { label: 'Monthly', subtitle: 'Billed each month. Default.' },
  annual: { label: 'Annual (10% discount)', subtitle: 'One upfront prepayment. Writes 12 monthly finance_tx rows.' },
};

export default function PaymentConfigModal({
  schoolId,
  schoolName,
  sessionToken,
  onClose,
  onSaved,
}: PaymentConfigModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeWarning, setStripeWarning] = useState<string | null>(null);
  const [showForceConfirm, setShowForceConfirm] = useState(false);

  const [data, setData] = useState<PaymentConfigData | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('stripe_subscription');
  const [cadence, setCadence] = useState<BillingCadence>('monthly');
  const [detailsJson, setDetailsJson] = useState<string>('');
  const [detailsValid, setDetailsValid] = useState(true);

  // Load current config on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/montree/super-admin/schools/${schoolId}/payment-config`, {
          headers: { 'x-super-admin-token': sessionToken },
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (cancelled) return;
        const loaded: PaymentConfigData = {
          payment_method: (json.payment_method || 'stripe_subscription') as PaymentMethod,
          billing_cadence: (json.billing_cadence || 'monthly') as BillingCadence,
          manual_invoice_details: json.manual_invoice_details ?? null,
          stripe_subscription_id: json.stripe_subscription_id,
          subscription_status: json.subscription_status,
          current_period_end: json.current_period_end,
          next_invoice_due_at: json.next_invoice_due_at,
          billing_email: json.billing_email,
          billing_quantity: json.billing_quantity,
        };
        setData(loaded);
        setMethod(loaded.payment_method);
        setCadence(loaded.billing_cadence);
        setDetailsJson(loaded.manual_invoice_details ? JSON.stringify(loaded.manual_invoice_details, null, 2) : '');
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, sessionToken]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  // Validate JSON details as user types.
  useEffect(() => {
    if (method !== 'manual_invoice') {
      setDetailsValid(true);
      return;
    }
    if (detailsJson.trim() === '') {
      setDetailsValid(true);
      return;
    }
    try {
      const parsed = JSON.parse(detailsJson);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        setDetailsValid(false);
        return;
      }
      setDetailsValid(true);
    } catch {
      setDetailsValid(false);
    }
  }, [detailsJson, method]);

  const submit = async (force: boolean = false) => {
    if (!data) return;
    setError(null);
    setStripeWarning(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (method !== data.payment_method) payload.payment_method = method;
      if (cadence !== data.billing_cadence) payload.billing_cadence = cadence;

      // manual_invoice_details: only send when method is manual_invoice OR clearing.
      if (method === 'manual_invoice') {
        if (detailsJson.trim() === '') {
          payload.manual_invoice_details = null;
        } else {
          try {
            payload.manual_invoice_details = JSON.parse(detailsJson);
          } catch {
            throw new Error('Manual invoice details must be valid JSON');
          }
        }
      } else if (data.manual_invoice_details) {
        // Switching AWAY from manual_invoice — clear the stale details.
        payload.manual_invoice_details = null;
      }

      if (force) payload.force = true;

      if (Object.keys(payload).length === 0 || (Object.keys(payload).length === 1 && 'force' in payload)) {
        setError('Nothing to change.');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/montree/super-admin/schools/${schoolId}/payment-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const d = await res.json().catch(() => ({}));
        setStripeWarning(d.error || 'School has an active Stripe subscription — confirm to override.');
        setShowForceConfirm(true);
        setSaving(false);
        return;
      }

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }

      onSaved(method, cadence);
      onClose();
    } catch (e) {
      console.error('[PaymentConfigModal] save failed:', e);
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const hasActiveStripe =
    data?.payment_method === 'stripe_subscription' &&
    !!data?.stripe_subscription_id &&
    data?.subscription_status === 'active';

  const isFlippingAwayFromStripe =
    hasActiveStripe && method !== 'stripe_subscription';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Payment configuration</h2>
            <p className="text-xs text-slate-400 mt-1">{schoolName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-slate-500 hover:text-white text-xl leading-none disabled:opacity-40"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="mt-6 p-8 text-center">
            <div className="animate-pulse text-slate-500 text-sm">Loading current config…</div>
          </div>
        ) : !data ? (
          <div className="mt-6 p-8 text-center">
            <p className="text-red-400 text-sm">{error || 'Could not load payment config'}</p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Current state summary */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-xs text-slate-300">
              <p>
                Currently:{' '}
                <span className="text-white font-medium">
                  {METHOD_LABELS[data.payment_method].label}
                </span>
                {' · '}
                <span className="text-white">{CADENCE_LABELS[data.billing_cadence].label}</span>
              </p>
              <p className="mt-1 text-slate-500">
                Status: {data.subscription_status || 'none'}
                {data.billing_quantity != null && ` · ${data.billing_quantity} students`}
                {data.current_period_end &&
                  ` · period ends ${new Date(data.current_period_end).toLocaleDateString()}`}
              </p>
            </div>

            {/* Payment method radio */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Payment rail
              </label>
              <div className="space-y-2">
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => {
                  const meta = METHOD_LABELS[m];
                  const active = method === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      disabled={saving}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        active
                          ? 'bg-emerald-500/15 border-emerald-500/60'
                          : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{meta.flag}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${active ? 'text-emerald-300' : 'text-white'}`}>
                            {meta.label}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>
                        </div>
                        <span
                          className={`w-4 h-4 rounded-full border ${
                            active ? 'bg-emerald-400 border-emerald-400' : 'border-slate-500'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cadence radio */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Billing cadence
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CADENCE_LABELS) as BillingCadence[]).map((c) => {
                  const meta = CADENCE_LABELS[c];
                  const active = cadence === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCadence(c)}
                      disabled={saving}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        active
                          ? 'bg-emerald-500/15 border-emerald-500/60'
                          : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <p className={`text-sm font-medium ${active ? 'text-emerald-300' : 'text-white'}`}>
                        {meta.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual invoice details (only for manual_invoice rail) */}
            {method === 'manual_invoice' && (
              <div>
                <label htmlFor="manual-details" className="block text-xs font-medium text-slate-300 mb-1">
                  Manual invoice details <span className="text-slate-500">(JSONB, optional)</span>
                </label>
                <textarea
                  id="manual-details"
                  rows={8}
                  placeholder={`{
  "billing_contact_name": "School treasurer",
  "billing_email_override": "treasurer@school.cn",
  "currency_preference": "USD",
  "payment_terms_days": 14,
  "invoice_notes": "PO required on every invoice"
}`}
                  value={detailsJson}
                  onChange={(e) => setDetailsJson(e.target.value)}
                  disabled={saving}
                  className={`w-full bg-slate-800 border rounded px-3 py-2 text-white text-xs font-mono focus:outline-none ${
                    detailsValid ? 'border-slate-700 focus:border-emerald-500' : 'border-red-500'
                  }`}
                />
                {!detailsValid && (
                  <p className="text-red-400 text-xs mt-1">
                    Must be valid JSON object (or empty).
                  </p>
                )}
                <p className="text-slate-500 text-[10px] mt-1">
                  Max 4KB. Leave blank to use defaults (school billing_email, 14-day terms, USD).
                </p>
              </div>
            )}

            {/* Active-Stripe warning when flipping away */}
            {isFlippingAwayFromStripe && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 text-amber-100 text-xs">
                <p className="font-medium">⚠ Active Stripe subscription</p>
                <p className="mt-1">
                  This school has an active Stripe subscription. Cancel it in the Stripe Dashboard
                  or via the school&apos;s Customer Portal FIRST, otherwise Stripe will keep
                  auto-charging the card after the rail flip.
                </p>
              </div>
            )}

            {/* Force-confirm dialog */}
            {showForceConfirm && stripeWarning && (
              <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-red-100 text-xs">
                <p className="font-medium">Confirm force flip</p>
                <p className="mt-1">{stripeWarning}</p>
                <p className="mt-2 text-red-200">
                  Confirming will flip the rail AND log the override (audit trail). The Stripe
                  subscription will keep auto-charging until you cancel it manually in Stripe.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setShowForceConfirm(false);
                      setStripeWarning(null);
                    }}
                    disabled={saving}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submit(true)}
                    disabled={saving}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-medium"
                  >
                    {saving ? 'Saving…' : 'Confirm force flip'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {!loading && data && !showForceConfirm && (
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => submit(false)}
              disabled={saving || !detailsValid}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
