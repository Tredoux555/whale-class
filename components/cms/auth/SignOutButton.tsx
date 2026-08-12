'use client';

// components/cms/auth/SignOutButton.tsx
// POSTs to /api/cms/auth/logout and does a full navigation afterwards — the
// session lives in an httpOnly cookie that only the server can clear, and every
// gated page is server-rendered from it, so a client-side route push would show
// a stale, already-rendered screen.

import { useState } from 'react';
import { useT } from '@/lib/cms/i18n/provider';

export function SignOutButton() {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/cms/auth/logout', { method: 'POST' });
    } catch {
      // Even if the request failed, send them to the door — a sign-out button
      // that appears to do nothing is worse than one that over-navigates.
    }
    window.location.assign('/cms/login');
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className="cms-btn cms-btn-ghost cms-btn-sm"
    >
      {busy ? t('auth.working') : t('auth.signOut')}
    </button>
  );
}
