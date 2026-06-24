'use client';

// Holding screen for the hard email-verification gate. The (app) layout bounces
// any unverified session here; new signups land here too. Lives OUTSIDE the
// (app) route group so it never re-triggers the layout gate (no redirect loop).
//
// PASSIVE WAITING ROOM — ONE PATH. There is no manual "I've confirmed" step. The
// single path is: click the email link. This page polls AND re-checks the instant
// the tab regains focus, so the moment the account flips verified (in any tab) it
// advances itself into the coach. Just a resend fallback + sign out alongside.

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
  const [notice, setNotice] = useState('');

  const authHeaders = (): Record<string, string> | undefined => {
    const token = getStoryAdminToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };

  // Land-here-not-login: when a confirm link fails, the verify route now sends
  // the user HERE (not the "Welcome back" login) with a ?verify= reason. Show a
  // gentle notice and tidy the URL so a refresh doesn't keep showing it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reason = new URLSearchParams(window.location.search).get('verify');
    if (!reason) return;
    const messages: Record<string, string> = {
      invalid: 'That confirmation link was invalid or already used. Tap “Resend confirmation email” for a fresh one.',
      expired: 'That confirmation link expired. Tap “Resend confirmation email” for a fresh one.',
      error: 'Something went wrong confirming your email. Tap “Resend confirmation email” and try again.',
      missing: 'That confirmation link was incomplete. Tap “Resend confirmation email” for a fresh one.',
    };
    if (messages[reason]) setNotice(messages[reason]);
    window.history.replaceState(null, '', '/lyf-coach/verify-pending');
  }, []);

  // Auto-advance. Check on mount, poll while open, AND re-check the instant the
  // tab regains focus — the focus path is what makes it feel instant, since
  // browsers throttle setInterval in background tabs. The moment the account
  // flips verified (the user clicked the email link in any tab) we drop them into
  // the coach. No session at all → back to login, but only on the FIRST check;
  // later checks never bounce.
  useEffect(() => {
    let cancelled = false;
    let done = false;
    let polls = 0;
    const MAX_POLLS = 120; // ~6 min at 3s

    const check = async (initial: boolean) => {
      if (done || cancelled) return;
      try {
        const res = await fetch('/api/lyf-coach/verify-status', { headers: authHeaders() });
        if (cancelled) return;
        if (res.status === 401) { if (initial) router.replace('/lyf-coach/login'); return; }
        const data = await res.json().catch(() => null);
        if (data?.email_verified === true) { done = true; router.replace('/lyf-coach/coach'); return; }
        if (data && typeof data.email === 'string') setEmail(data.email);
      } catch { /* stay on the holding screen */ }
    };

    void check(true);
    const id = setInterval(() => {
      polls += 1;
      if (polls > MAX_POLLS) { clearInterval(id); return; }
      void check(false);
    }, 3000);
    const onFocus = () => { if (!document.hidden) void check(false); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
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
      <style dangerouslySetInnerHTML={{ __html: '@keyframes lyfPulse{0%,100%{opacity:1}50%{opacity:0.3}}' }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', padding: '30px 26px' }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, lineHeight: 1.3, margin: '0 0 12px', color: T.text }}>
          Check your email to confirm your account before we begin.
        </h1>
        <p style={{ margin: '0 0 6px', color: T.textMid, fontSize: 15, lineHeight: 1.6 }}>
          {email
            ? <>We sent a confirmation link to <strong style={{ color: T.text }}>{email}</strong>. Click it and you&apos;re in — this page lets you in by itself.</>
            : <>We sent you a confirmation link. Click it and you&apos;re in — this page lets you in by itself.</>}
        </p>
        <p style={{ margin: '0 0 20px', color: T.textDim, fontSize: 13, lineHeight: 1.6 }}>
          Didn&apos;t get it? Check your spam folder, or resend below.
        </p>

        {notice && <p style={{ color: '#fca5a5', fontSize: 13, margin: '0 0 14px', lineHeight: 1.5 }}>{notice}</p>}

        <div
          aria-live="polite"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: '12px 14px', borderRadius: 12,
            border: `1px solid ${T.borderSoft}`, background: 'rgba(52,211,153,0.06)',
            color: T.textMid, fontSize: 14,
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: T.emerald, boxShadow: '0 0 10px rgba(52,211,153,0.7)', animation: 'lyfPulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
          Waiting for you to confirm…
        </div>

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
