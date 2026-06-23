'use client';

// Public Lyf Coach (web) login page. Posts to the EXISTING /api/lyf-coach/login
// (returns { session } + sets the story-admin-token cookie). We mirror the session
// into sessionStorage('story_admin_session') — the key the coach client reads for
// its Bearer calls — then into the coach.

import { useEffect, useState, type CSSProperties } from 'react';

const BG = '#0a1a0f';
const EMERALD = '#34d399';

export default function LyfCoachLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already signed in this tab → go straight in.
    if (sessionStorage.getItem('story_admin_session')) {
      window.location.href = '/lyf-coach/coach';
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/lyf-coach/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Invalid email or password.');
        return;
      }
      if (data?.session) {
        sessionStorage.setItem('story_admin_session', data.session);
        window.location.href = '/lyf-coach/coach';
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const input: CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(52,211,153,0.25)',
    color: '#fff', fontSize: 16, outline: 'none', marginTop: 8,
  };
  const label: CSSProperties = { fontSize: 13, color: '#9fc7b0' };

  return (
    <main style={{ minHeight: '100vh', background: BG, color: '#e8f0ea', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, color: '#fff', margin: '0 0 16px', textAlign: 'center' }}>🌿 Lyf Coach</h1>

        <div style={{ background: 'rgba(8,20,12,0.6)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 16, padding: 28 }}>
          <h2 style={{ fontSize: 20, color: '#fff', margin: '0 0 18px', textAlign: 'center' }}>Welcome back</h2>

          <form onSubmit={submit}>
            <label style={label}>Email
              <input style={input} type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <div style={{ height: 14 }} />
            <label style={label}>Password
              <input style={input} type="password" autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
            </label>

            {error && <p style={{ color: '#fca5a5', fontSize: 14, marginTop: 14 }}>{error}</p>}

            <button type="submit" disabled={busy}
              style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 11, border: 'none',
                background: busy ? 'rgba(52,211,153,0.5)' : `linear-gradient(135deg, ${EMERALD}, #1D6B48)`,
                color: '#06140c', fontWeight: 700, fontSize: 16, cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Signing in…' : 'Log in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: '#9fc7b0', marginTop: 18 }}>
          New here? <a href="/lyf-coach/signup" style={{ color: EMERALD }}>Create your space</a>
        </p>
      </div>
    </main>
  );
}
