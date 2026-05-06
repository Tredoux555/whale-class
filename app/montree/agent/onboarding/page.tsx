'use client';

// /montree/agent/onboarding — Stripe Connect Express return-URL landing page.
//
// The agent (Sarah, etc.) lands here AFTER completing — or refreshing — the
// Stripe-hosted onboarding form. Stripe sends them here via two URLs:
//
//   ?status=complete&account=acct_XXX  → finished (or thinks they're done)
//   ?status=refresh&account=acct_XXX   → link expired or session lost; need new
//
// The page is purely informational — the actual state is captured by the
// /api/stripe/connect-webhook handler. We just give the agent a friendly
// landing rather than a blank page.

import { useEffect, useState } from 'react';

function readStatusFromUrl(): 'complete' | 'refresh' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  try {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s === 'complete' || s === 'refresh') return s;
  } catch {
    // ignore
  }
  return 'unknown';
}

function AgentOnboardingContent() {
  // Lazy initial state runs once on mount; no setState-in-effect cascade.
  const [status, setStatus] = useState<'complete' | 'refresh' | 'unknown'>('unknown');

  useEffect(() => {
    // One-off mount-time URL read; intentional setState in effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(readStatusFromUrl());
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#06140e' }}>
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
          radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
          linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
        `,
      }} />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-2xl shadow-emerald-500/30 mb-6">
          <span className="text-4xl">🌳</span>
        </div>

        {status === 'complete' && (
          <>
            <h1 className="text-3xl font-light text-white mb-3">Thanks — you&apos;re all set.</h1>
            <p className="text-emerald-200/70 text-base leading-relaxed mb-6">
              Your payout details are with Stripe. We&apos;ll send your monthly share automatically once schools you&apos;ve referred are paying. You can close this tab.
            </p>
            <p className="text-white/30 text-xs">
              If something needed fixing, Stripe will let you know via the email you used.
            </p>
          </>
        )}

        {status === 'refresh' && (
          <>
            <h1 className="text-3xl font-light text-white mb-3">Link expired</h1>
            <p className="text-amber-200/70 text-base leading-relaxed mb-6">
              These links time out for security. Reply to the email you got — we&apos;ll send a fresh one and you can pick up where you left off.
            </p>
          </>
        )}

        {status === 'unknown' && (
          <>
            <h1 className="text-3xl font-light text-white mb-3">Montree agent onboarding</h1>
            <p className="text-white/50 text-base leading-relaxed mb-6">
              This page is for referral agents completing payout setup. If you arrived here without a link in your email, that&apos;s probably not where you want to be.
            </p>
            <a href="/montree" className="text-emerald-400 hover:text-emerald-300 text-sm">
              ← Back to Montree
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function AgentOnboardingPage() {
  return <AgentOnboardingContent />;
}
