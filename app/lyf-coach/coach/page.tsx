'use client';

// Public Lyf Coach (web) coach surface. Reuses the existing coach brain via
// CoachChatProvider + useCoachChat (which send a Bearer token from
// sessionStorage('story_admin_session') to /api/story/coach). On load we ensure a
// session exists, bridging the httpOnly cookie -> sessionStorage after the
// email-confirmation redirect.
//
// CAVEAT (documented follow-up): the shared coach client redirects to /story/admin
// on session loss/expiry. For a public user that's the wrong door — a small
// parameterisation of the client's redirect target is the clean fix. Main paths
// (signup->verify->trial->coach, login->coach) are unaffected.

import { useEffect, useRef, useState } from 'react';
import { CoachChatProvider, useCoachChat } from '@/lib/story/coach/coach-chat-context';

const BG = '#0a1a0f';
const EMERALD = '#34d399';

export default function LyfCoachCoachPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionStorage.getItem('story_admin_session')) { setReady(true); return; }
      // Bridge the httpOnly cookie (set by /verify or /login) into sessionStorage.
      try {
        const res = await fetch('/api/lyf-coach/session', { credentials: 'same-origin' });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.session) {
            sessionStorage.setItem('story_admin_session', data.session);
            setReady(true);
            return;
          }
        }
        window.location.href = '/lyf-coach/login';
      } catch {
        if (!cancelled) window.location.href = '/lyf-coach/login';
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ready) {
    return (
      <main style={{ minHeight: '100vh', background: BG, color: '#9fc7b0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        Opening your space…
      </main>
    );
  }

  return (
    <CoachChatProvider>
      <CoachSurface />
    </CoachChatProvider>
  );
}

function CoachSurface() {
  const { messages, busy, send } = useCoachChat();
  const [text, setText] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    await send(t);
  }

  async function upgrade(cadence: 'monthly' | 'annual') {
    if (upgrading) return;
    setUpgrading(true);
    try {
      const token = sessionStorage.getItem('story_admin_session');
      const res = await fetch('/api/story/coach-billing/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadence }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert(data?.error || 'Could not start checkout. Please try again.');
        setUpgrading(false);
      }
    } catch {
      alert('Network error. Please try again.');
      setUpgrading(false);
    }
  }

  async function logout() {
    try { await fetch('/api/lyf-coach/session', { method: 'DELETE', credentials: 'same-origin' }); } catch { /* non-fatal */ }
    sessionStorage.removeItem('story_admin_session');
    sessionStorage.removeItem('story_coach_chat');
    window.location.href = '/lyf-coach/login';
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, color: '#e8f0ea', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(52,211,153,0.18)', position: 'sticky', top: 0, background: BG, zIndex: 5 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 19, color: '#fff' }}>🌿 Lyf Coach</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => upgrade('monthly')} disabled={upgrading}
            style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${EMERALD}`, background: 'transparent', color: EMERALD, cursor: 'pointer' }}>
            Upgrade $14.99/mo
          </button>
          <button onClick={() => upgrade('annual')} disabled={upgrading}
            style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(232,201,106,0.5)', background: 'transparent', color: '#E8C96A', cursor: 'pointer' }}>
            $99/yr
          </button>
          <button onClick={logout}
            style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#9fc7b0', cursor: 'pointer' }}>
            Log out
          </button>
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', maxWidth: 760, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#6f9482', marginTop: 40, lineHeight: 1.6 }}>
            This is your private space. What&rsquo;s on your mind?
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', margin: '10px 0' }}>
            <div style={{
              maxWidth: '80%', padding: '11px 14px', borderRadius: 14, fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? 'linear-gradient(135deg, #34d399, #1D6B48)' : 'rgba(8,20,12,0.7)',
              color: m.role === 'user' ? '#06140c' : '#e8f0ea',
              border: m.role === 'user' ? 'none' : '1px solid rgba(52,211,153,0.18)',
            }}>
              {m.text}{m.streaming ? ' ▍' : ''}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form onSubmit={onSend} style={{ borderTop: '1px solid rgba(52,211,153,0.18)', padding: '12px 16px', display: 'flex', gap: 10, maxWidth: 760, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type what's on your mind…"
          style={{ flex: 1, padding: '13px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(52,211,153,0.25)', color: '#fff', fontSize: 16, outline: 'none' }} />
        <button type="submit" disabled={busy || !text.trim()}
          style={{ padding: '0 18px', borderRadius: 11, border: 'none', background: busy || !text.trim() ? 'rgba(52,211,153,0.4)' : `linear-gradient(135deg, ${EMERALD}, #1D6B48)`, color: '#06140c', fontWeight: 700, fontSize: 15, cursor: busy || !text.trim() ? 'default' : 'pointer' }}>
          {busy ? '…' : 'Send'}
        </button>
      </form>
    </main>
  );
}
