'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Story admin login — themed to mirror the Montree dark-forest cockpit.
// Identical glass-card design as `app/story/page.tsx` for visual continuity.

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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

      if (res.ok) {
        sessionStorage.setItem('story_admin_session', data.session);
        router.push('/story/admin/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
          Story admin
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            fontSize: 13,
            margin: '0 0 28px',
          }}
        >
          Whale Montessori Platform
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              htmlFor="au"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(52,211,153,0.85)',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: 8,
              }}
            >
              Username
            </label>
            <input
              id="au"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="off"
              style={{
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
              }}
            />
          </div>

          <div>
            <label
              htmlFor="ap"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(52,211,153,0.85)',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: 8,
              }}
            >
              Password
            </label>
            <input
              id="ap"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="off"
              style={{
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
              }}
            />
          </div>

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
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
