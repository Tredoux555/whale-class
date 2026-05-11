'use client';

// components/montree/admin/TrialExpiringBanner.tsx
// Warning banner shown on principal admin pages when the school's trial is
// about to expire. Shows when:
//   - subscription_status === 'trialing'
//   - trial_ends_at is within 14 days
//
// Pulls from /api/montree/admin/billing-status (a small read endpoint we use
// elsewhere). Non-blocking — if fetch fails, banner doesn't render.
//
// Dismissible per-day via localStorage. Re-appears the next day OR if days
// remaining changes.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface BillingStatus {
  subscription_status: string | null;
  trial_ends_at: string | null;
}

interface BillingStatusResponse {
  school?: BillingStatus;
  // The actual endpoint returns more fields; we only need these two.
}

const STORAGE_KEY_PREFIX = 'montree.trialExpiringDismissed.';

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default function TrialExpiringBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/montree/billing/status', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BillingStatusResponse | null) => {
        if (cancelled || !data?.school) return;
        setStatus(data.school);
      })
      .catch(() => {
        /* silently no-op */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Compute once, then set ONCE. Keeps the lint rule (single setState per
    // effect run) happy.
    let next: number | null = null;
    if (
      status &&
      status.trial_ends_at &&
      status.subscription_status === 'trialing'
    ) {
      const ends = new Date(status.trial_ends_at).getTime();
      const now = Date.now();
      next = Math.ceil((ends - now) / (1000 * 60 * 60 * 24));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- single setState derived from status, no cascading renders
    setDaysLeft(next);
  }, [status]);

  // Check dismissal once daysLeft is known.
  useEffect(() => {
    if (daysLeft === null || daysLeft > 14 || daysLeft < 0) return;
    try {
      const key = `${STORAGE_KEY_PREFIX}${todayKey()}.${daysLeft}`;
      if (typeof window !== 'undefined' && localStorage.getItem(key) === '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- single setState on mount-time check, no cascading renders
        setDismissed(true);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, [daysLeft]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      if (daysLeft === null) return;
      const key = `${STORAGE_KEY_PREFIX}${todayKey()}.${daysLeft}`;
      localStorage.setItem(key, '1');
    } catch {
      /* no-op */
    }
  }, [daysLeft]);

  if (dismissed || daysLeft === null || daysLeft > 14 || daysLeft < 0) return null;

  const urgent = daysLeft <= 3;
  const bg = urgent ? 'rgba(220,38,38,0.12)' : 'rgba(245,158,11,0.12)';
  const border = urgent ? 'rgba(220,38,38,0.32)' : 'rgba(245,158,11,0.36)';
  const accent = urgent ? '#fca5a5' : '#fbbf24';

  const message =
    daysLeft === 0
      ? 'Your trial expires today.'
      : daysLeft === 1
        ? 'Your trial expires tomorrow.'
        : `Your trial expires in ${daysLeft} days.`;

  return (
    <div
      style={{
        marginBottom: 16,
        padding: '12px 16px',
        borderRadius: 12,
        background: bg,
        border: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <span aria-hidden style={{ fontSize: 18 }}>⏰</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: accent, fontSize: 14, fontWeight: 600 }}>{message}</p>
          <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            Activate the full plan to keep AI features running — $7 per active student per month.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link
          href="/montree/admin/billing"
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: urgent ? 'rgba(220,38,38,0.25)' : 'rgba(245,158,11,0.25)',
            border: `1px solid ${border}`,
            color: accent,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Activate plan →
        </Link>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss for today"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
