'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Bayan's sanctuary door — identical machinery to /riddick and /story/admin.
//
// Posts to /api/story/admin/auth and stores the same 'story_admin_session'
// token. Bayan's story_admin_users row carries space='bayan', so her token
// scopes every personal API call to her own walled-off sanctuary (coach, diary,
// planner, projects). No other space is ever visible from here, and hers is
// never visible elsewhere — the wall is enforced server-side from the token.
//
// First login: her account is created WITHOUT a password (sentinel
// 'SET_ON_FIRST_LOGIN'). The auth route replies { needsPasswordSetup: true } and
// she sets her own private password here (via /api/story/admin/auth/claim) — so
// no one else ever chose or knows it. After that, normal login.

export default function BayanDoor() {
  const [mode, setMode] = useState<'login' | 'claim'>('login');
  const [username] = useState('Bayan'); // this door is Bayan's
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const enter = (token: string) => {
    sessionStorage.setItem('story_admin_session', token);
    router.push('/story/admin/coach');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/story/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.needsPasswordSetup) {
        setPassword('');
        setConfirm('');
        setMode('claim');
      } else if (res.ok) {
        enter(data.session);
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Choose a password of at least 6 characters.'); return; }
    if (password !== confirm) { setError('The two passwords don’t match.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/story/admin/auth/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        enter(data.session);
      } else {
        setError(data.error || 'Could not set your password.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(52,211,153,0.85)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: 8,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(0,0,0,0.30)',
    border: '1px solid rgba(52,211,153,0.18)',
    borderRadius: 10,
    padding: '12px 14px',
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0a1a0f',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), transparent 60%)',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: 'rgba(8,20,12,0.55)',
          border: '1px solid rgba(52,211,153,0.18)',
          borderRadius: 24,
          padding: 36,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #34d399 0%, #1D6B48 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 32px rgba(52,211,153,0.35)',
              fontSize: 36,
            }}
          >
            🌳
          </div>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-lora), Georgia, serif',
            fontSize: 28,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.95)',
            textAlign: 'center',
            margin: '0 0 6px',
            letterSpacing: '-0.4px',
          }}
        >
          Welcome
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            fontSize: 13,
            margin: '0 0 28px',
          }}
        >
          {mode === 'claim'
            ? 'This is your private space. Create a password — only you will ever know it.'
            : 'Your space'}
        </p>

        <form
          onSubmit={mode === 'claim' ? handleClaim : handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label htmlFor="bp" style={labelStyle}>
              {mode === 'claim' ? 'Choose a password' : 'Password'}
            </label>
            <input
              id="bp"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete={mode === 'claim' ? 'new-password' : 'current-password'}
              style={inputStyle}
            />
          </div>

          {mode === 'claim' && (
            <div>
              <label htmlFor="bc" style={labelStyle}>Confirm password</label>
              <input
                id="bc"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                background: 'rgba(220,50,50,0.10)',
                border: '1px solid rgba(220,50,50,0.30)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                color: 'rgba(255,180,180,0.92)',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '14px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #34d399 0%, #1D6B48 100%)',
              color: '#0a1a0f',
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              boxShadow: '0 8px 24px rgba(52,211,153,0.30)',
              marginTop: 4,
            }}
          >
            {isLoading
              ? (mode === 'claim' ? 'Setting up…' : 'Opening…')
              : (mode === 'claim' ? 'Create password & enter' : 'Enter')}
          </button>
        </form>
      </div>
    </div>
  );
}
