'use client';

// components/montree/agent/AgentFirstRunOverlay.tsx
//
// Phase 7e — First-run tutorial overlay. Keyed off localStorage so it doesn't
// race with the server stamping agent_login_last_used_at. Three explainer
// cards with a CTA to set up Stripe Connect on the last one.
//
// Shown ONCE per device. To re-trigger: clear localStorage key.

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'montree.agent.firstrun.dismissed.v1';

const CARDS: Array<{ title: string; body: string; cta?: { label: string; href: string } }> = [
  {
    title: 'This is your home.',
    body: 'Every school you bring in shows up on the dashboard. Your share is calculated on top of what they pay each month.',
  },
  {
    title: 'Generate codes any time.',
    body: 'Click "Codes" and generate a fresh code for each school you pitch. When a school redeems your code, they\'re permanently linked to you — you earn share for as long as they\'re paying.',
  },
  {
    title: 'Set up payouts now.',
    body: "We use Stripe Connect — bank and tax info goes directly to Stripe, not to us. Once you're verified, monthly payouts land automatically.",
    cta: { label: 'Set up payouts', href: '/montree/agent/payouts' },
  },
];

export default function AgentFirstRunOverlay() {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState<boolean | null>(null); // null = still deciding

  // Mount-time read of localStorage to decide if we've already shown this
  // tutorial. The setState-in-effect is intentional — same pattern as
  // /montree/agent/onboarding/page.tsx.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(dismissed !== '1');
    } catch {
      // localStorage blocked (private browsing) — don't show; never able to
      // remember dismissal anyway.
      setShow(false);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
    setShow(false);
  };

  if (show !== true) return null;

  const card = CARDS[step];
  const isLast = step === CARDS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,20,12,0.85)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="firstrun-title"
    >
      <div className="max-w-md w-full bg-white/5 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/20">
        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-5">
          {CARDS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step
                  ? 'w-8 bg-emerald-400'
                  : i < step
                    ? 'w-3 bg-emerald-500/60'
                    : 'w-3 bg-white/15'
              }`}
            />
          ))}
        </div>

        <h2 id="firstrun-title" className="text-2xl sm:text-3xl font-light text-white tracking-tight">
          {card.title}
        </h2>
        <p className="mt-3 text-emerald-200/80 text-sm sm:text-base leading-relaxed">
          {card.body}
        </p>

        <div className="mt-6 flex items-center gap-3 flex-wrap">
          {!isLast ? (
            <button
              onClick={() => setStep(s => Math.min(s + 1, CARDS.length - 1))}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Next →
            </button>
          ) : (
            <>
              {card.cta && (
                <Link
                  href={card.cta.href}
                  onClick={dismiss}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {card.cta.label} →
                </Link>
              )}
              <button
                onClick={dismiss}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-colors"
              >
                {card.cta ? 'Maybe later' : 'Got it'}
              </button>
            </>
          )}

          {step > 0 && !isLast && (
            <button
              onClick={() => setStep(s => Math.max(s - 1, 0))}
              className="text-white/50 hover:text-white text-sm"
            >
              ← Back
            </button>
          )}
          {!isLast && (
            <button
              onClick={dismiss}
              className="ml-auto text-white/40 hover:text-white text-xs"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
