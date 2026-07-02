'use client';

// app/welcome/[code]/RefCookie.tsx
// Tiny client component: persists the outreach code in a `montree_ref`
// cookie (90 days) so the principal registration form can pre-fill the
// referral code even if the visitor wanders around first.
//
// Server components can't set cookies during render, so this runs client-side
// after paint. Not httpOnly on purpose — the register page reads it in the
// browser. Only ever called with a code the server already validated.

import { useEffect } from 'react';

export default function RefCookie({ code }: { code: string }) {
  useEffect(() => {
    if (!code) return;
    try {
      const ninetyDays = 60 * 60 * 24 * 90;
      document.cookie = `montree_ref=${encodeURIComponent(code)}; max-age=${ninetyDays}; path=/; SameSite=Lax`;
    } catch {
      // Cookie write failed (privacy mode etc.) — the visitor can still type
      // the code manually during registration. Never break the landing page.
    }
  }, [code]);

  return null;
}
