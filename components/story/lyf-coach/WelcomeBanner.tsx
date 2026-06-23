'use client';

// First-login welcome banner. Full-width emerald (#00a86b), white text, shown
// ONCE to a verified public coach user the first time they land in the app, then
// never again (server flag first_login_shown via /api/lyf-coach/welcome). Two
// variants, chosen server-side from welcome_bonus_period:
//   founder  (first 100)      — "1000 prompts this month"
//   standard (everyone else)  — "7-day free trial starts now"
// Dismisses on click. The server is stamped the moment it renders, so a reload
// or another device never shows it again.

import { useEffect, useState } from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';

// Belt-and-braces per-session guard so it can't re-fetch/flash within a session;
// the durable "never again" guarantee is the server first_login_shown flag.
const SHOWN_KEY = 'lyf_coach_welcome_shown';

const COPY: Record<'founder' | 'standard', string> = {
  founder: "Congratulations — you're one of the first 100. You have 1000 prompts this month. Welcome.",
  standard: "Welcome to Lyf Coach. Your 7-day free trial starts now. Let's begin.",
};

export default function WelcomeBanner() {
  const [variant, setVariant] = useState<'founder' | 'standard' | null>(null);

  useEffect(() => {
    let cancelled = false;
    try { if (sessionStorage.getItem(SHOWN_KEY) === '1') return; } catch { /* ignore */ }
    const token = getStoryAdminToken();
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/lyf-coach/welcome', { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled || !res.ok) return;
        const data = (await res.json().catch(() => null)) as { show?: boolean; variant?: string } | null;
        if (!data?.show) return;
        setVariant(data.variant === 'founder' ? 'founder' : 'standard');
        // Stamp "the moment it renders" — fire-and-forget, idempotent server-side.
        try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch { /* ignore */ }
        fetch('/api/lyf-coach/welcome', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      } catch { /* banner is non-critical — never block the app */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!variant) return null;

  return (
    <button
      type="button"
      onClick={() => setVariant(null)}
      aria-label="Dismiss welcome"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        width: '100%', textAlign: 'left', appearance: 'none', cursor: 'pointer',
        margin: '0 0 18px', padding: '14px 16px', borderRadius: 12, border: 'none',
        background: '#00a86b', color: '#ffffff',
        fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, lineHeight: 1.5,
        boxShadow: '0 0 22px rgba(0,168,107,0.30)',
      }}
    >
      <span>{COPY[variant]}</span>
      <span aria-hidden style={{ opacity: 0.85, fontSize: 17, flexShrink: 0, lineHeight: 1 }}>×</span>
    </button>
  );
}
