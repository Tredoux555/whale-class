'use client';

// app/montree/agent/payouts/page.tsx
//
// Phase 7c — Stripe Connect status + payout history. Agent can:
//  - generate a fresh onboarding link (POST /api/montree/agent/connect-onboard)
//  - force-refresh status from Stripe (POST /api/montree/agent/connect-status)
//  - see past payouts (GET /api/montree/agent/payouts) — empty until Phase 5

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface PayoutRow {
  id: string;
  period_start: string;
  period_end: string;
  school_name: string | null;
  agent_payout_usd: number;
  status: string;
  paid_at: string | null;
}

interface ManualPayoutDetails {
  method?: 'wise' | 'swift' | 'paypal' | 'other';
  currency?: string;
  country?: string;
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  swift_code?: string;
  branch_code?: string;
  branch_name?: string;
  iban?: string;
  routing_number?: string;
  notes?: string;
}

interface PayoutsResponse {
  payout_method: 'stripe_connect' | 'manual_wire';
  manual_payout_details: ManualPayoutDetails | null;
  manual_payout_details_updated_at: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_status:
    | 'pending'
    | 'onboarding'
    | 'verified'
    | 'restricted'
    | 'disabled'
    | null;
  stripe_connect_charges_enabled: boolean;
  stripe_connect_payouts_enabled: boolean;
  stripe_connect_details_submitted: boolean;
  stripe_connect_disabled_reason: string | null;
  stripe_connect_completed_at: string | null;
  payout_history: PayoutRow[];
  payouts_pending_phase5?: boolean;
}

const fmtDate = (d: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const USD = (n: number): string =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const STATUS_DISPLAY: Record<NonNullable<PayoutsResponse['stripe_connect_status']>, { label: string; tone: 'green' | 'amber' | 'red' | 'slate'; tip: string }> = {
  pending: { label: 'Not started', tone: 'slate', tip: 'Generate your onboarding link to get started.' },
  onboarding: { label: 'In progress', tone: 'amber', tip: "Stripe still needs some details. Won't pay out until verified." },
  verified: { label: 'Verified', tone: 'green', tip: 'Ready for automated monthly payouts.' },
  restricted: { label: 'Restricted', tone: 'red', tip: 'Stripe needs you to fix something. Open the link they emailed you.' },
  disabled: { label: 'Disabled', tone: 'red', tip: 'Account disabled. Reach out to Tredoux.' },
};

// Session 110 — self-service manual wire form fields.
interface ManualWireForm {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  swift_code: string;
  branch_code: string;
  branch_name: string;
  iban: string;
  routing_number: string;
  currency: string;
  country: string;
  notes: string;
}

const EMPTY_WIRE_FORM: ManualWireForm = {
  account_holder_name: '',
  bank_name: '',
  account_number: '',
  swift_code: '',
  branch_code: '',
  branch_name: '',
  iban: '',
  routing_number: '',
  currency: '',
  country: '',
  notes: '',
};

export default function AgentPayoutsPage() {
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; expires_at: number } | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  // Inline error for the onboarding-link button. The page-level `error` state
  // is rendered up at the top of the section so a user clicking the button
  // at the bottom doesn't see it. linkError renders directly below the
  // button so the failure mode is visible without scrolling.
  const [linkError, setLinkError] = useState<string | null>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  // Session 109: country picker for first-time Connect account creation.
  // Empty string = no selection. The picker only appears when no account exists.
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  // Session 110: self-service "switch to manual wire" flow.
  // unsupportedCountry: holds the country code that just failed → triggers
  // friendly fallback banner instead of generic red error.
  const [unsupportedCountry, setUnsupportedCountry] = useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualWireForm>(EMPTY_WIRE_FORM);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/montree/agent/payouts');
      if (!res.ok) {
        // Session 110: both 401 (signed out) and 403 (not agent role)
        // mean the user isn't an agent here. AgentNav will redirect, but
        // we also bail out silently so this page doesn't flash the raw
        // "Forbidden — agent role required" JSON blob in the meantime.
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/montree/login-select?reason=agent_required';
          return;
        }
        const t = await res.text();
        setError(t.slice(0, 200));
        return;
      }
      setData(await res.json());
    } catch (e) {
      console.error('[payouts] load error:', e);
      setError('Could not load payout status.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateLink = async () => {
    // Session 109: when creating a NEW Connect account, pass the agent's
    // country so Stripe creates it in the right jurisdiction (not platform's
    // default HK). If an account already exists, no country needed (we just
    // generate a fresh onboarding LINK against the existing account).
    const needsCountry = !data?.stripe_connect_account_id;
    if (needsCountry && !selectedCountry) {
      setError('Pick your country first — that determines which Stripe rules apply.');
      return;
    }

    setLinkLoading(true);
    setError(null);
    setLinkError(null);
    setUnsupportedCountry(null);
    try {
      const res = await fetch('/api/montree/agent/connect-onboard', {
        method: 'POST',
        headers: needsCountry ? { 'Content-Type': 'application/json' } : undefined,
        body: needsCountry ? JSON.stringify({ country: selectedCountry }) : undefined,
      });
      // Defensive: response.json() can throw if the server returns a non-JSON
      // body (HTML error page, blank response, etc.). Without this guard the
      // promise rejects and the user sees nothing — exactly the symptom this
      // was reported with. Read text first, parse if possible, surface the
      // raw text as the error otherwise.
      const rawText = await res.text();
      let d: { onboarding_url?: string; onboarding_expires_at?: number; detail?: string; error?: string; country_unsupported?: boolean } = {};
      try {
        d = rawText ? JSON.parse(rawText) : {};
      } catch {
        // Non-JSON response — server probably crashed or returned HTML.
        console.error('[payouts] link error: non-JSON response', { status: res.status, body: rawText.slice(0, 500) });
        setLinkError(`Server returned a non-JSON response (status ${res.status}). Reach out to Tredoux.`);
        return;
      }
      if (!res.ok) {
        // Session 110: friendly fallback for unsupported-country case.
        // Server returns { country_unsupported: true } — instead of a generic
        // red error, show a banner with "Switch to manual wire" CTA.
        if (d.country_unsupported && needsCountry) {
          setUnsupportedCountry(selectedCountry);
          return;
        }
        const msg = d.detail || d.error || `Could not generate onboarding link (status ${res.status}).`;
        console.error('[payouts] link error: server rejected', { status: res.status, body: d });
        setLinkError(msg);
        return;
      }
      // Success path — but defensively check we actually got a URL back.
      // If the route 200's without onboarding_url (would be a server bug),
      // the user would see nothing without this guard.
      if (!d.onboarding_url) {
        console.error('[payouts] link error: server returned 200 with no onboarding_url', d);
        setLinkError('Server returned an empty link. Reach out to Tredoux.');
        return;
      }
      setLink({ url: d.onboarding_url, expires_at: d.onboarding_expires_at || 0 });
      setLinkCopied(false);
      await load();
    } catch (err) {
      console.error('[payouts] link error:', err);
      setLinkError('Network error — check your connection and try again.');
    } finally {
      setLinkLoading(false);
    }
  };

  // Session 110 — self-service flip to manual_wire.
  const openManualModal = (prefillCountry: string | null) => {
    setManualForm({
      ...EMPTY_WIRE_FORM,
      country: prefillCountry || '',
    });
    setManualError(null);
    setManualModalOpen(true);
  };

  const submitManualWire = async () => {
    // Friendly client-side validation. Server enforces the same rule + the
    // verified-Stripe guardrail.
    const accountNumber = manualForm.account_number.trim();
    const iban = manualForm.iban.trim();
    if (!accountNumber && !iban) {
      setManualError('Add either an account number or IBAN so the bank can find your account.');
      return;
    }
    if (!manualForm.account_holder_name.trim()) {
      setManualError('Add the account holder name (exactly as it appears on your ID).');
      return;
    }
    if (!manualForm.bank_name.trim()) {
      setManualError('Add the bank name.');
      return;
    }
    if (!manualForm.country.trim()) {
      setManualError('Add the country.');
      return;
    }

    // Strip empty strings before sending — keeps the JSONB tidy.
    const details: Record<string, string> = {};
    (Object.keys(manualForm) as (keyof ManualWireForm)[]).forEach((k) => {
      const v = manualForm[k].trim();
      if (v) details[k] = v;
    });
    // Convention used by super-admin path — default to swift if unspecified.
    if (!('method' in details)) details['method'] = iban ? 'swift' : 'swift';

    setManualSubmitting(true);
    setManualError(null);
    try {
      const res = await fetch('/api/montree/agent/payout-method', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payout_method: 'manual_wire',
          manual_payout_details: details,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        // verified_stripe_blocked → friendly explanation, leave modal open
        // so the agent can read it and choose to message Tredoux.
        setManualError(d.detail || d.error || 'Could not save bank details.');
        return;
      }
      // Success — close modal, clear unsupported state, reload page state.
      setManualModalOpen(false);
      setUnsupportedCountry(null);
      setLink(null);
      await load();
    } catch (err) {
      console.error('[payouts] manual wire submit error:', err);
      setManualError('Network error. Try again.');
    } finally {
      setManualSubmitting(false);
    }
  };

  const refreshStatus = async () => {
    setRefreshLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/agent/connect-status', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json();
        setError(d.detail || d.error || 'Could not refresh status.');
        return;
      }
      await load();
    } catch (err) {
      console.error('[payouts] refresh error:', err);
      setError('Network error.');
    } finally {
      setRefreshLoading(false);
    }
  };

  const copy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* */ }
      document.body.removeChild(ta);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link href="/montree/agent/dashboard" className="text-emerald-300/70 hover:text-emerald-200 text-xs">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-3xl sm:text-4xl font-light text-white tracking-tight">Payouts</h1>
      <p className="mt-2 text-emerald-200/60 text-sm">
        {data?.payout_method === 'manual_wire'
          ? 'Tredoux pays you monthly via bank wire. Your details below are used for each payout — they go from Tredoux directly to your bank, not through Stripe.'
          : 'We use Stripe Connect Express. Bank and tax details go directly to Stripe — we never see them. Once you’re verified, monthly payouts land automatically.'}
      </p>

      {error && !unsupportedCountry && (
        <div className="mt-6 bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Session 110: friendly fallback when Stripe doesn't support the
          agent's country. Replaces the old "reach out to Tredoux" dead end
          with a self-service "Switch to manual wire" CTA. */}
      {unsupportedCountry && (
        <div className="mt-6 bg-amber-500/10 border border-amber-500/40 rounded-xl p-5">
          <p className="text-amber-200 uppercase tracking-wider text-[10px] font-semibold">
            Stripe doesn&apos;t cover {unsupportedCountry}
          </p>
          <p className="mt-1 text-white text-sm leading-relaxed">
            Stripe Connect doesn&apos;t support payouts to {unsupportedCountry} yet. No problem — we&apos;ll wire your monthly commissions directly via SWIFT / Wise instead. Add your bank details below and you&apos;re set.
          </p>
          <button
            onClick={() => openManualModal(unsupportedCountry)}
            className="mt-4 inline-block px-4 py-3 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-base sm:text-sm transition-colors"
          >
            Add bank details for manual wire
          </button>
        </div>
      )}

      {data && data.payout_method === 'manual_wire' && (
        <>
          {/* Manual wire — bank details on file, view-only for the agent.
              Updates flow through super-admin (Tredoux owns this data). */}
          <section className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h2 className="text-white text-lg font-light">Bank details on file</h2>
              {data.manual_payout_details_updated_at && (
                <span className="text-white/40 text-xs">
                  Updated {fmtDate(data.manual_payout_details_updated_at)}
                </span>
              )}
            </div>

            {data.manual_payout_details ? (
              <>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      // Pre-fill the modal with current details so this acts
                      // as an Edit flow (Session 110).
                      const d = data.manual_payout_details!;
                      setManualForm({
                        account_holder_name: (d.account_holder_name as string) || '',
                        bank_name: (d.bank_name as string) || '',
                        account_number: (d.account_number as string) || '',
                        swift_code: (d.swift_code as string) || '',
                        branch_code: (d.branch_code as string) || '',
                        branch_name: (d.branch_name as string) || '',
                        iban: (d.iban as string) || '',
                        routing_number: (d.routing_number as string) || '',
                        currency: (d.currency as string) || '',
                        country: (d.country as string) || '',
                        notes: (d.notes as string) || '',
                      });
                      setManualError(null);
                      setManualModalOpen(true);
                    }}
                    className="text-emerald-300/80 hover:text-emerald-200 text-xs underline underline-offset-2"
                  >
                    Update bank details →
                  </button>
                </div>
              <div className="mt-4 space-y-2 text-sm">
                {data.manual_payout_details.account_holder_name && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">Account holder</span><span className="text-white">{data.manual_payout_details.account_holder_name}</span></div>
                )}
                {data.manual_payout_details.bank_name && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">Bank</span><span className="text-white">{data.manual_payout_details.bank_name}</span></div>
                )}
                {data.manual_payout_details.account_number && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">Account #</span><code className="text-white font-mono">{data.manual_payout_details.account_number}</code></div>
                )}
                {data.manual_payout_details.swift_code && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">SWIFT</span><code className="text-white font-mono">{data.manual_payout_details.swift_code}</code></div>
                )}
                {data.manual_payout_details.branch_code && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">Branch code</span><code className="text-white font-mono">{data.manual_payout_details.branch_code}</code></div>
                )}
                {data.manual_payout_details.branch_name && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">Branch</span><span className="text-white">{data.manual_payout_details.branch_name}</span></div>
                )}
                {data.manual_payout_details.iban && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">IBAN</span><code className="text-white font-mono">{data.manual_payout_details.iban}</code></div>
                )}
                {data.manual_payout_details.routing_number && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">Routing #</span><code className="text-white font-mono">{data.manual_payout_details.routing_number}</code></div>
                )}
                {data.manual_payout_details.currency && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">Currency</span><span className="text-white">{data.manual_payout_details.currency}</span></div>
                )}
                {data.manual_payout_details.country && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">Country</span><span className="text-white">{data.manual_payout_details.country}</span></div>
                )}
                {data.manual_payout_details.method && (
                  <div className="flex gap-2"><span className="text-white/50 w-32 shrink-0">Rail</span><span className="text-white capitalize">{data.manual_payout_details.method}</span></div>
                )}
              </div>
              </>
            ) : (
              <div className="mt-4">
                <p className="text-amber-300 text-sm">
                  No bank details on file yet. Add them now — Tredoux uses these to wire your monthly commissions.
                </p>
                <button
                  onClick={() => openManualModal(null)}
                  className="mt-3 inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  Add bank details
                </button>
              </div>
            )}

            <p className="mt-4 text-white/40 text-xs leading-relaxed">
              These details are visible only to Tredoux (super-admin) and you. Updating them here saves directly — no need to message anyone.
            </p>
          </section>
        </>
      )}

      {data && data.payout_method !== 'manual_wire' && (
        <>
          {/* Status card */}
          <section className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h2 className="text-white text-lg font-light">Stripe Connect status</h2>
              {data.stripe_connect_account_id && (
                <button
                  onClick={refreshStatus}
                  disabled={refreshLoading}
                  className="text-emerald-300/80 hover:text-emerald-200 text-xs disabled:opacity-50"
                >
                  {refreshLoading ? 'Refreshing…' : '↻ Refresh from Stripe'}
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {data.stripe_connect_status ? (
                (() => {
                  const s = STATUS_DISPLAY[data.stripe_connect_status];
                  const cls =
                    s.tone === 'green'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : s.tone === 'amber'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : s.tone === 'red'
                          ? 'bg-red-500/15 text-red-300 border-red-500/40'
                          : 'bg-slate-700 text-slate-300 border-slate-600';
                  return (
                    <span className={`inline-block px-3 py-1 rounded-full border text-sm font-medium ${cls}`}>
                      {s.label}
                    </span>
                  );
                })()
              ) : (
                <span className="text-white/50 text-sm">Not set up yet</span>
              )}
              {data.stripe_connect_completed_at && (
                <span className="text-white/40 text-xs">
                  Verified {fmtDate(data.stripe_connect_completed_at)}
                </span>
              )}
            </div>

            {data.stripe_connect_status && (
              <p className="mt-3 text-white/60 text-xs leading-relaxed">
                {STATUS_DISPLAY[data.stripe_connect_status].tip}
              </p>
            )}
            {data.stripe_connect_disabled_reason && (
              <p className="mt-2 text-red-200 text-xs">
                Stripe reason: <code>{data.stripe_connect_disabled_reason}</code>
              </p>
            )}

            {/* Country picker — only shown when no Connect account exists yet.
                Stripe locks the account to whatever country it's created in,
                so getting this right at first-issue is critical. */}
            {data.stripe_connect_status !== 'verified' && !data.stripe_connect_account_id && (
              <div className="mt-5">
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Your country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-slate-900 border border-white/15 rounded-lg text-white text-base sm:text-sm focus:border-emerald-500 outline-none"
                >
                  <option value="">— Pick your country —</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="ZA">South Africa</option>
                  <option value="AE">United Arab Emirates</option>
                  <option value="AU">Australia</option>
                  <option value="NZ">New Zealand</option>
                  <option value="CA">Canada</option>
                  <option value="SG">Singapore</option>
                  <option value="HK">Hong Kong</option>
                  <option value="JP">Japan</option>
                  <option value="KR">South Korea</option>
                  <option value="IN">India</option>
                  <option value="MY">Malaysia</option>
                  <option value="TH">Thailand</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="NL">Netherlands</option>
                  <option value="IE">Ireland</option>
                  <option value="ES">Spain</option>
                  <option value="IT">Italy</option>
                  <option value="PT">Portugal</option>
                  <option value="BE">Belgium</option>
                  <option value="AT">Austria</option>
                  <option value="SE">Sweden</option>
                  <option value="NO">Norway</option>
                  <option value="DK">Denmark</option>
                  <option value="FI">Finland</option>
                  <option value="CH">Switzerland</option>
                  <option value="MX">Mexico</option>
                  <option value="BR">Brazil</option>
                  <option value="BH">Bahrain</option>
                </select>
                <p className="mt-2 text-white/40 text-[11px]">
                  Pick the country where your bank account is. Stripe locks the
                  account to this country permanently — be careful. If your
                  country isn&apos;t listed, use the manual wire option below.
                </p>
                <button
                  onClick={() => openManualModal(null)}
                  className="mt-3 text-emerald-300/80 hover:text-emerald-200 text-xs underline underline-offset-2"
                >
                  My country isn&apos;t here — set me up with manual wire instead →
                </button>
              </div>
            )}

            {/* CTA — primary action so it gets the 44pt mobile touch target. */}
            {data.stripe_connect_status !== 'verified' && (
              <div className="mt-5">
                <button
                  onClick={generateLink}
                  disabled={linkLoading || (!data.stripe_connect_account_id && !selectedCountry)}
                  className="inline-block px-4 py-3 sm:py-2 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-lg text-base sm:text-sm disabled:opacity-50 transition-colors"
                >
                  {linkLoading
                    ? 'Generating…'
                    : data.stripe_connect_account_id
                      ? 'Generate fresh onboarding link'
                      : 'Set up payouts now'}
                </button>
                <p className="mt-2 text-white/40 text-[11px]">
                  Stripe links time out in ~5 minutes for security. Generate fresh whenever you need.
                </p>
                {/* Inline error display — surfaces failures right next to the
                    button so the user doesn't have to scroll up to find why
                    the click didn't produce a link. */}
                {linkError && (
                  <div className="mt-3 bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-red-200 text-sm">
                    <div className="font-medium mb-1">Couldn&apos;t generate a link</div>
                    <div className="text-red-300/90 text-xs leading-relaxed">{linkError}</div>
                    <div className="text-red-300/60 text-xs mt-2">
                      If this keeps happening, message Tredoux from the Tredoux tab and he&apos;ll reset your Stripe account.
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Onboarding link banner */}
          {link && (
            <section className="mt-4 bg-indigo-500/10 border border-indigo-500/40 rounded-xl p-5">
              <p className="text-indigo-200 uppercase tracking-wider text-[10px] font-semibold">
                Onboarding link ready
              </p>
              <p className="mt-1 text-white text-sm">
                Open this link to complete your setup. Expires soon — generate a fresh one if it times out.
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-3 sm:py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-medium rounded-lg text-base sm:text-sm transition-colors"
                >
                  Open Stripe →
                </a>
                <button
                  onClick={() => copy(link.url)}
                  className="px-3 py-3 sm:py-2 bg-white/10 hover:bg-white/20 text-white text-sm sm:text-xs rounded-lg"
                >
                  {linkCopied ? '✓ Copied' : 'Copy link'}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* Payout history — shown for both methods. Source: montree_agent_payouts
          regardless of paid_by_method. */}
      {data && (
        <section className="mt-6">
          <h2 className="text-white text-lg font-light mb-3">Payout history</h2>
          {data.payouts_pending_phase5 && data.payout_history.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <p className="text-white/80 text-sm">Monthly payouts are coming soon.</p>
              <p className="mt-2 text-emerald-200/60 text-xs leading-relaxed">
                We&apos;re finalising the automated payment pipeline. Once it&apos;s live, every closed month will appear here with the exact share you were paid.
              </p>
            </div>
          ) : data.payout_history.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-emerald-200/60 text-sm">
              No payouts yet.
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <ul className="divide-y divide-white/5">
                {data.payout_history.map(p => (
                  <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white text-sm">{p.school_name || 'Multiple schools'}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {fmtDate(p.period_start)} — {fmtDate(p.period_end)}
                        {p.paid_at && ` · paid ${fmtDate(p.paid_at)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-300 tabular-nums">{USD(p.agent_payout_usd)}</p>
                      <p className="text-white/40 text-[10px] mt-0.5">{p.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Session 110: Self-service manual wire modal. Friendly fields
          (no raw JSON). Handles both "first add" and "edit existing"
          via prefill in openManualModal. */}
      {manualModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center px-4 py-6 overflow-y-auto"
          onClick={(e) => {
            // Click outside to close — but only if not submitting.
            if (e.target === e.currentTarget && !manualSubmitting) {
              setManualModalOpen(false);
            }
          }}
        >
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 max-w-xl w-full my-auto">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-white text-xl font-light">
                {data?.manual_payout_details ? 'Update bank details' : 'Bank details for manual wire'}
              </h2>
              <button
                onClick={() => !manualSubmitting && setManualModalOpen(false)}
                disabled={manualSubmitting}
                className="text-white/40 hover:text-white text-2xl leading-none disabled:opacity-30"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-emerald-200/60 text-xs leading-relaxed">
              Tredoux uses these to wire your monthly commissions via SWIFT or Wise. Visible only to Tredoux and you.
            </p>

            {manualError && (
              <div className="mt-4 bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-red-200 text-sm">
                {manualError}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Account holder name <span className="text-amber-300">*</span>
                </label>
                <input
                  type="text"
                  value={manualForm.account_holder_name}
                  onChange={(e) => setManualForm({ ...manualForm, account_holder_name: e.target.value })}
                  placeholder="Exactly as on your government ID"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white text-base sm:text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Bank name <span className="text-amber-300">*</span>
                </label>
                <input
                  type="text"
                  value={manualForm.bank_name}
                  onChange={(e) => setManualForm({ ...manualForm, bank_name: e.target.value })}
                  placeholder="e.g. First National Bank"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white text-base sm:text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Account number
                  </label>
                  <input
                    type="text"
                    value={manualForm.account_number}
                    onChange={(e) => setManualForm({ ...manualForm, account_number: e.target.value })}
                    placeholder="Local account number"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-base sm:text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    SWIFT / BIC
                  </label>
                  <input
                    type="text"
                    value={manualForm.swift_code}
                    onChange={(e) => setManualForm({ ...manualForm, swift_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. FIRNZAJJ"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-base sm:text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Branch code
                  </label>
                  <input
                    type="text"
                    value={manualForm.branch_code}
                    onChange={(e) => setManualForm({ ...manualForm, branch_code: e.target.value })}
                    placeholder="If your country uses one"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-base sm:text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Branch name
                  </label>
                  <input
                    type="text"
                    value={manualForm.branch_name}
                    onChange={(e) => setManualForm({ ...manualForm, branch_name: e.target.value })}
                    placeholder="e.g. Sandton"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white text-base sm:text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    IBAN <span className="text-white/40 text-xs">(EU agents)</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.iban}
                    onChange={(e) => setManualForm({ ...manualForm, iban: e.target.value.toUpperCase() })}
                    placeholder="If your bank gives you one"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-base sm:text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Routing # <span className="text-white/40 text-xs">(US agents)</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.routing_number}
                    onChange={(e) => setManualForm({ ...manualForm, routing_number: e.target.value })}
                    placeholder="9-digit ABA routing"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-base sm:text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={manualForm.currency}
                    onChange={(e) => setManualForm({ ...manualForm, currency: e.target.value.toUpperCase() })}
                    placeholder="e.g. ZAR, USD, EUR"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-base sm:text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Country <span className="text-amber-300">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.country}
                    onChange={(e) => setManualForm({ ...manualForm, country: e.target.value.toUpperCase() })}
                    placeholder="ISO code, e.g. ZA"
                    maxLength={2}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-base sm:text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Notes <span className="text-white/40 text-xs">(optional)</span>
                </label>
                <textarea
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="Anything Tredoux needs to know — preferred rail, intermediary bank, etc."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-white text-base sm:text-sm focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setManualModalOpen(false)}
                disabled={manualSubmitting}
                className="px-4 py-3 sm:py-2 text-white/70 hover:text-white text-base sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitManualWire}
                disabled={manualSubmitting}
                className="px-5 py-3 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-base sm:text-sm disabled:opacity-50 transition-colors"
              >
                {manualSubmitting ? 'Saving…' : (data?.manual_payout_details ? 'Save changes' : 'Save bank details')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
