// /montree/super-admin/photo-debug/page.tsx
//
// Audit rec #4 (Session 113 photo pipeline audit) — landing page.
// Enter a media_id and jump into the detail view at /photo-debug/[mediaId].
// No list view because there are tens of thousands of photos; entering
// the id from a Railway log line or Supabase query is the canonical entry.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg: '#0a1a0f',
  cardBg: 'rgba(8,20,12,0.55)',
  border: '1px solid rgba(52,211,153,0.18)',
  emerald: '#34d399',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
};

export default function PhotoDebugLanding() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [mediaId, setMediaId] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('sa_pwd') : '';
    if (saved) {
      setPassword(saved);
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem('sa_pwd', password);
        setAuthenticated(true);
      } else {
        setLoginError('Wrong password.');
      }
    } catch {
      setLoginError('Login error.');
    }
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = mediaId.trim();
    if (!trimmed) return;
    router.push(`/montree/super-admin/photo-debug/${trimmed}`);
  };

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textPrimary, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 360, width: '100%', padding: 28, background: C.cardBg, border: C.border, borderRadius: 12 }}>
          <h2 style={{ fontFamily: C.serif, fontSize: 22, margin: '0 0 16px', color: C.emerald }}>Photo Debug</h2>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 16px' }}>Super-admin password required.</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            style={{ width: '100%', padding: '10px 12px', background: C.inputBg, border: C.inputBorder, borderRadius: 6, color: C.textPrimary, fontSize: 14 }}
          />
          {loginError && <p style={{ color: '#f87171', fontSize: 12, margin: '8px 0 0' }}>{loginError}</p>}
          <button onClick={handleLogin} style={{ marginTop: 12, width: '100%', padding: '10px', background: C.emerald, color: C.bg, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: 'Inter, sans-serif', padding: 32 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontFamily: C.serif, fontSize: 28, color: C.emerald, margin: '0 0 6px' }}>Photo Debug</h1>
        <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 24px' }}>
          Enter a media id to see the full pipeline state: photo, status, sonnet_draft, telemetry rows, injected visual memory.
        </p>

        <form onSubmit={handleJump} style={{ background: C.cardBg, border: C.border, borderRadius: 10, padding: 20 }}>
          <label style={{ display: 'block', fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 8px' }}>media_id</label>
          <input
            type="text"
            value={mediaId}
            onChange={e => setMediaId(e.target.value)}
            placeholder="e.g. 12345678-1234-1234-1234-123456789012"
            autoFocus
            spellCheck={false}
            style={{ width: '100%', padding: '10px 14px', background: C.inputBg, border: C.inputBorder, borderRadius: 6, color: C.textPrimary, fontSize: 14, fontFamily: 'SF Mono, monospace' }}
          />
          <button type="submit" disabled={!mediaId.trim()} style={{ marginTop: 14, padding: '10px 22px', background: C.emerald, color: C.bg, border: 'none', borderRadius: 6, fontWeight: 600, cursor: mediaId.trim() ? 'pointer' : 'not-allowed', opacity: mediaId.trim() ? 1 : 0.5 }}>
            Open
          </button>
        </form>

        <div style={{ marginTop: 24, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 6px' }}><b style={{ color: C.textSecondary }}>How to get a media_id:</b></p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Railway log: grep <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>[PhotoIdentification]</code> — look for <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>media=&lt;uuid&gt;</code></li>
            <li>Supabase: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>SELECT id FROM montree_media WHERE captured_at &gt; now() - interval &apos;1 day&apos; ORDER BY captured_at DESC LIMIT 20;</code></li>
            <li>Photo Audit page: click on a photo card, the id appears in the inspector or URL on some surfaces.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
