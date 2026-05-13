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

export default function AgentPayoutsPage() {
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; expires_at: number } | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/montree/agent/payouts');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/montree/login-select';
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
    setLinkLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/agent/connect-onboard', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) {
        setError(d.detail || d.error || 'Could not generate onboarding link.');
        return;
      }
      setLink({ url: d.onboarding_url, expires_at: d.onboarding_expires_at });
      setLinkCopied(false);
      await load();
    } catch (err) {
      console.error('[payouts] link error:', err);
      setError('Network error.');
    } finally {
      setLinkLoading(false);
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

      {error && (
        <div className="mt-6 bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-200 text-sm">
          {error}
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
            ) : (
              <div className="mt-4 text-amber-300 text-sm">
                No bank details on file yet. Send your details to Tredoux directly (name as per ID, bank, account number, SWIFT, branch code) and he&apos;ll enter them here. Once on file, monthly payouts arrive automatically.
              </div>
            )}

            <p className="mt-4 text-white/40 text-xs leading-relaxed">
              These details are visible only to Tredoux (super-admin) and you. To update them, message Tredoux from the &quot;Tredoux&quot; tab in the nav — he&apos;ll update on his end.
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

            {/* CTA — primary action so it gets the 44pt mobile touch target. */}
            {data.stripe_connect_status !== 'verified' && (
              <div className="mt-5">
                <button
                  onClick={generateLink}
                  disabled={linkLoading}
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
    </div>
  );
}
