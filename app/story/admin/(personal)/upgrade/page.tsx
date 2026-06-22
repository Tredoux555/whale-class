'use client';

// Lyf Coach — upgrade surface. The [Upgrade] button (shown once at the Haiku
// transition) and the billing link both land here. Inside the (personal) route
// group, so the layout's auth guard already gates it. Calm, no pressure: one
// price, an optional annual toggle, cancel-anytime. Spec v1.0 copy.

import { useState } from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';

type Cadence = 'monthly' | 'annual';

export default function UpgradePage() {
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go(path: string, body?: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const token = getStoryAdminToken();
      if (!token) {
        window.location.href = '/story/admin';
        return;
      }
      const res = await fetch(path, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setErr(data?.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      const url = data.checkout_url || data.portal_url;
      if (url) {
        window.location.href = url;
        return;
      }
      setErr('Something went wrong. Please try again.');
      setBusy(false);
    } catch {
      setErr('Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  const EMERALD = '#34d399';
  const GOLD = '#E8C96A';
  const priceLabel = cadence === 'annual' ? '$99 / year' : '$14.99 / month';

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(8,20,12,0.55)',
          border: '1px solid rgba(52,211,153,0.22)',
          borderRadius: 18,
          padding: '32px 26px',
          backdropFilter: 'blur(18px)',
          textAlign: 'center',
          color: '#e8f0ea',
        }}
      >
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 26, margin: '0 0 8px', color: '#fff' }}>
          Want the full depth back?
        </h1>
        <p style={{ margin: '0 0 22px', opacity: 0.8, lineHeight: 1.5 }}>
          $14.99/month, cancel anytime. Your coach, at full depth, all month.
        </p>

        {/* cadence toggle — annual surfaced, never pushed */}
        <div style={{ display: 'inline-flex', gap: 6, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.05)', marginBottom: 18 }}>
          {(['monthly', 'annual'] as Cadence[]).map((c) => (
            <button
              key={c}
              onClick={() => setCadence(c)}
              disabled={busy}
              style={{
                border: 'none',
                cursor: busy ? 'default' : 'pointer',
                padding: '8px 18px',
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
                color: cadence === c ? '#06140c' : '#cfe5d8',
                background: cadence === c ? EMERALD : 'transparent',
              }}
            >
              {c === 'monthly' ? 'Monthly' : 'Annual'}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{priceLabel}</div>
        {cadence === 'annual' && (
          <div style={{ fontSize: 13, color: GOLD, marginBottom: 4 }}>Save ~$81 a year</div>
        )}
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 22 }}>
          Local tax added at checkout where it applies.
        </div>

        <button
          onClick={() => go('/api/story/coach-billing/checkout', { cadence })}
          disabled={busy}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: 'none',
            cursor: busy ? 'default' : 'pointer',
            fontSize: 16,
            fontWeight: 700,
            color: '#06140c',
            background: `linear-gradient(135deg, ${EMERALD}, #1D6B48)`,
            boxShadow: '0 6px 20px rgba(52,211,153,0.25)',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'One moment…' : 'Upgrade'}
        </button>

        {err && <p style={{ color: '#fca5a5', fontSize: 13, marginTop: 14 }}>{err}</p>}

        <button
          onClick={() => go('/api/story/coach-billing/portal')}
          disabled={busy}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            color: '#9fc7b0',
            fontSize: 13,
            cursor: busy ? 'default' : 'pointer',
            textDecoration: 'underline',
          }}
        >
          Manage billing
        </button>
      </div>
    </div>
  );
}
