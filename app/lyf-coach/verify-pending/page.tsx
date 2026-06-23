'use client';

// Holding screen for the hard email-verification gate. The (app) layout bounces
// any unverified session here; new signups land here too. Lives OUTSIDE the
// (app) route group so it never re-triggers the layout gate (no redirect loop).
// Shows the "confirm your account" message + a resend link, and lets a user who
// has just clicked the email link re-check and continue.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { T } from '@/lib/story/personal-theme';

const SESSION_KEY = 'story_admin_session';

export default function VerifyPendingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');

  const authHeaders = (): Record<string, string> | undefined => {
    const token = getStoryAdminToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };

  // If already verified (e.g. they clicked the email link in another tab), go
  // straight in. No session at all → back to login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/lyf-coach/verify-status', { headers: authHeaders() });
        if (cancelled) return;
        if (res.status === 401) { router.replace('/lyf-coach/login'); return; }
        const data = await res.json().catch(() => null);
        if (data?.email_verified === true) { router.replace('/lyf-coach/coach'); return; }
        if (data && typeof data.email === 'string') setEmail(data.email);
      } catch { /* stay on the holding screen */ }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const resend = async () => {
    if (resending) return;
    setResending(true); setNotice('');
    try {
      const res = await fetch('/api/lyf-coach/verify-status', { method: 'POST', headers: authHeaders() });
      if (res.status === 429) setNotice('Please wait a moment before requesting another email.');
      else if (res.ok) setResent(true);
      else setNotice('Could not resend just now — please try again.');
    } catch { setNotice('Could not reach the server — please try again.'); }
    finally { setResending(false); }
  };

  const recheck = async () => {
    if (checking) return;
    setChecking(true); setNotice('');
    try {
      const res = await fetch('/api/lyf-coach/verify-status', { headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (data?.email_verified === true) { router.replace('/lyf-coach/coach'); return; }
      setNotice("Not confirmed yet — click the link in your email, then tap “I’ve confirmed”.");
    } catch { setNotice('Could not check just now — please try again.'); }
    finally { setChecking(false); }
  };

  const signOut = async () => {
    const token = getStoryAdminToken();
    try {
      await fetch('/api/story/admin/auth', { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    } catch { /* clear locally regardless */ }
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* non-fatal */ }
    window.location.href = '/lyf-coach';
  };

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, position: 'relative', fontFamily: T.sans, color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: T.glow, zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', padding: '30px 26px' }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, lineHeight: 1.3, margin: '0 0 12px', color: T.text }}>
          Check your email to confirm your account before we begin.
        </h1>
        <p style={{ margin: '0 0 6px', color: T.textMid, fontSize: 15, lineHeight: 1.6 }}>
          {email
            ? <>We sent a confirmation link to <strong style={{ color: T.text }}>{email}</strong>. Click it and you&apos;re in.</>
            : <>We sent you a confirmation link. Click it and you&apos;re in.</>}
        </p>
        <p style={{ margin: '0 0 20px', color: T.textDim, fontSize: 13, lineHeight: 1.6 }}>
          Didn&apos;t get it? Check your spam folder, or resend below.
        </p>

        {notice && <p style={{ color: '#fca5a5', fontSize: 13, margin: '0 0 14px', lineHeight: 1.5 }}>{notice}</p>}

        <button
          onClick={recheck}
          disabled={checking}
          style={{
            width: '100%', marginBottom: 10, padding: '13px', borderRadius: 12, border: 'none',
            cursor: checking ? 'default' : 'pointer', fontSize: 16, fontWeight: 700, color: '#06140c',
            background: checking ? 'rgba(52,211,153,0.4)' : `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
            boxShadow: '0 6px 20px rgba(52,211,153,0.22)',
          }}
        >
          {checking ? 'Checking…' : 'I’ve confirmed — continue'}
        </button>

        <button
          onClick={resend}
          disabled={resending || resent}
          style={{
            width: '100%', padding: '11px', borderRadius: 12, border: `1px solid ${T.borderSoft}`,
            background: 'transparent', cursor: resending || resent ? 'default' : 'pointer',
            fontSize: 14, fontWeight: 600, color: resent ? T.emerald : T.textMid,
          }}
        >
          {resent ? 'Email sent ✓' : resending ? 'Sending…' : 'Resend confirmation email'}
        </button>

        <p style={{ marginTop: 18, marginBottom: 0, fontSize: 13, color: T.textMid, textAlign: 'center' }}>
          Wrong account?{' '}
          <button onClick={signOut} style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.emerald, fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
