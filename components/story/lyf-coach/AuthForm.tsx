'use client';

// Shared email+password form for the public Lyf Coach signup + login pages.
// On success it stores the session where the coach reads it
// (sessionStorage 'story_admin_session', matching getStoryAdminToken) — the
// server also set the httpOnly cookie — then lands the user in the coach.

import { useState, type FormEvent } from 'react';
import { T } from '@/lib/story/personal-theme';

// Matches lib/story/personal-client.ts getStoryAdminToken().
const SESSION_KEY = 'story_admin_session';
const COACH_HOME = '/montree/lyf-coach/coach';

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${T.borderSoft}`,
  borderRadius: 12,
  outline: 'none',
  color: T.text,
  fontFamily: T.sans,
  fontSize: 16, // ≥16px so iOS Safari doesn't zoom on focus
  lineHeight: 1.4,
  padding: '12px 14px',
  marginTop: 6,
};

export default function AuthForm({
  endpoint,
  submitLabel,
}: {
  endpoint: string;
  submitLabel: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      // Check status BEFORE parsing — error responses may not be JSON.
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.session) {
        setError(data?.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      try { sessionStorage.setItem(SESSION_KEY, data.session); } catch { /* private mode — cookie still set */ }
      window.location.href = COACH_HOME;
    } catch {
      setError('Could not reach the server. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label style={{ fontSize: 13, color: T.textMid }}>
        Email
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ fontSize: 13, color: T.textMid }}>
        Password
        <input
          type="password"
          autoComplete={endpoint.includes('signup') ? 'new-password' : 'current-password'}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
      </label>

      {error && <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{error}</p>}

      <button
        type="submit"
        disabled={busy}
        style={{
          marginTop: 4, padding: '13px', borderRadius: 12, border: 'none',
          cursor: busy ? 'default' : 'pointer', fontSize: 16, fontWeight: 700, color: '#06140c',
          background: busy ? 'rgba(52,211,153,0.4)' : `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
          boxShadow: '0 6px 20px rgba(52,211,153,0.22)',
        }}
      >
        {busy ? 'One moment…' : submitLabel}
      </button>
    </form>
  );
}
