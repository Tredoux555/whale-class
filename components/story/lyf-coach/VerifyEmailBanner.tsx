'use client';

// Gentle, dismissible "confirm your email" bar for the public Lyf Coach shell.
// Renders nothing unless the live session is explicitly unverified. Fail-quiet:
// any error / no session / migration-not-run -> nothing shown. NEVER blocks use.

import { useEffect, useState } from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { T } from '@/lib/story/personal-theme';

const DISMISS_KEY = 'lyf_coach_verify_banner_dismissed';

export default function VerifyEmailBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try { if (sessionStorage.getItem(DISMISS_KEY) === '1') return; } catch { /* ignore */ }
    const token = getStoryAdminToken();
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/lyf-coach/verify-status', { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (data && data.email_verified === false) {
          setEmail(typeof data.email === 'string' ? data.email : null);
          setShow(true);
        }
      } catch { /* banner is non-critical */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function resend() {
    const token = getStoryAdminToken();
    if (!token || resending) return;
    setResending(true);
    try {
      const res = await fetch('/api/lyf-coach/verify-status', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setResent(true);
    } catch { /* ignore */ } finally { setResending(false); }
  }

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: '10px 14px', marginBottom: 18, fontSize: 13.5, color: T.textMid,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.gold, flexShrink: 0, boxShadow: `0 0 10px ${T.gold}` }} />
      <span style={{ flex: 1, lineHeight: 1.5 }}>
        {resent
          ? <>Sent{email ? <> to <strong style={{ color: T.text }}>{email}</strong></> : ''} — check your inbox to confirm.</>
          : <>Confirm your email{email ? <> (<strong style={{ color: T.text }}>{email}</strong>)</> : ''} to secure your account. You can keep using Lyf Coach in the meantime.</>}
      </span>
      {!resent && (
        <button onClick={resend} disabled={resending} style={{
          appearance: 'none', border: `1px solid ${T.border}`, background: 'transparent',
          color: T.emerald, fontSize: 12.5, fontWeight: 600, padding: '6px 10px',
          borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', opacity: resending ? 0.6 : 1,
        }}>
          {resending ? 'Sending…' : 'Resend email'}
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" style={{
        appearance: 'none', border: 'none', background: 'transparent',
        color: T.textDim, fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '0 2px',
      }}>×</button>
    </div>
  );
}
