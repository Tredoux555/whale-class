'use client';

// Lyf Coach — public upgrade surface. The [Upgrade] button (shown once at the
// quieter-mode transition) and the coach's billing link land here. Calm, one
// price, optional annual, cancel-anytime. Hits the same space-scoped checkout/
// portal routes the Sanctuary upgrade uses; branded for the public front door.

import { useState } from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import PublicShell from '@/components/story/lyf-coach/PublicShell';
import { T } from '@/lib/story/personal-theme';

type Cadence = 'monthly' | 'annual';

export default function LyfCoachUpgradePage() {
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go(path: string, body?: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const token = getStoryAdminToken();
      if (!token) {
        window.location.href = '/lyf-coach/login';
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

  const priceLabel = cadence === 'annual' ? '$99 / year' : '$14.99 / month';

  return (
    <PublicShell>
      <div
        style={{
          width: '100%', maxWidth: 440,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 18,
          padding: '32px 26px', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          textAlign: 'center', color: T.text,
        }}
      >
        <h1 style={{ fontFamily: T.serif, fontSize: 26, margin: '0 0 8px', color: '#fff' }}>
          Want the full depth back?
        </h1>
        <p style={{ margin: '0 0 22px', color: T.textMid, lineHeight: 1.5 }}>
          $14.99/month, cancel anytime. Your coach, at full depth, all month.
        </p>

        <div style={{ display: 'inline-flex', gap: 6, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.05)', marginBottom: 18 }}>
          {(['monthly', 'annual'] as Cadence[]).map((c) => (
            <button
              key={c}
              onClick={() => setCadence(c)}
              disabled={busy}
              style={{
                border: 'none', cursor: busy ? 'default' : 'pointer', padding: '8px 18px',
                borderRadius: 9, fontSize: 14, fontWeight: 600,
                color: cadence === c ? '#06140c' : '#cfe5d8',
                background: cadence === c ? T.emerald : 'transparent',
              }}
            >
              {c === 'monthly' ? 'Monthly' : 'Annual'}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{priceLabel}</div>
        {cadence === 'annual' && <div style={{ fontSize: 13, color: T.gold, marginBottom: 4 }}>Save ~$81 a year</div>}
        <div style={{ fontSize: 12, color: T.textDim, marginBottom: 22 }}>Local tax added at checkout where it applies.</div>

        <button
          onClick={() => go('/api/story/coach-billing/checkout', { cadence })}
          disabled={busy}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            cursor: busy ? 'default' : 'pointer', fontSize: 16, fontWeight: 700, color: '#06140c',
            background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
            boxShadow: '0 6px 20px rgba(52,211,153,0.25)', opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'One moment…' : 'Upgrade'}
        </button>

        {err && <p style={{ color: '#fca5a5', fontSize: 13, marginTop: 14 }}>{err}</p>}

        <button
          onClick={() => go('/api/story/coach-billing/portal')}
          disabled={busy}
          style={{
            marginTop: 16, background: 'none', border: 'none', color: '#9fc7b0',
            fontSize: 13, cursor: busy ? 'default' : 'pointer', textDecoration: 'underline',
          }}
        >
          Manage billing
        </button>
      </div>
    </PublicShell>
  );
}
