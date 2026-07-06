'use client';

// /montree/locked/page.tsx
// Shown when a school has been LOCKED by a super-admin (migration 286).
// auth/unified 403s any role of a locked school with a redirectTo here, and
// the admin layout + teacher dashboard bounce an already-authenticated session
// here too. Locked users can't log in — so the "message Tredoux" form below
// is UNAUTHENTICATED by design; it POSTs feedback_type='appeal' to the shared
// /api/montree/feedback route, landing in the super-admin Feedback tab.
//
// Dark forest brand, mobile-first. Inputs use fontSize >= 16px so iOS Safari
// doesn't zoom on focus. Hardcoded English (matches FoundingHundred posture).

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import MontreeLogo from '@/components/montree/MonteeLogo';

// UUID v1-v5 shape. The locked-screen appeal is unauthenticated, so we only
// forward school_id when it looks like a real UUID (the server also validates).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function LockedContent() {
  const searchParams = useSearchParams();
  const rawSchool = searchParams.get('school') || '';
  const schoolId = UUID_RE.test(rawSchool) ? rawSchool : '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please write a short message.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/montree/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId || null,
          user_type: 'principal',
          user_name: name.trim() || null,
          page_url: `/montree/locked${email.trim() ? ` · ${email.trim()}` : ''}`,
          feedback_type: 'appeal',
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        setError('Could not send your message. Please try again.');
        setSending(false);
        return;
      }
      setSent(true);
    } catch {
      setError('Could not send your message. Please try again.');
      setSending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 16, // ≥16px so iOS Safari doesn't zoom on focus
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#ffffff',
    outline: 'none',
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#06140e' }}
    >
      {/* Background gradient — matches the login screen */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
            radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
            linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
          `,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-4">
            <MontreeLogo size={64} />
          </div>
          <h1
            className="text-white mb-2"
            style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 26, fontWeight: 600 }}
          >
            This account has been locked.
          </h1>
          <p className="text-emerald-300/60 text-sm leading-relaxed">
            Access is paused for now. If you think this is a mistake, send a
            message below and Tredoux will get back to you.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: 'rgba(52,211,153,0.16)' }}>
                <span style={{ fontSize: 28 }}>✓</span>
              </div>
              <h2 className="text-white text-lg font-semibold mb-1">Message sent</h2>
              <p className="text-white/50 text-sm">Tredoux will get back to you.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl text-sm text-center" style={{ background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm mb-1.5 text-emerald-300/70">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah"
                  style={inputStyle}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5 text-emerald-300/70">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sarah@school.com"
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5 text-emerald-300/70">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell Tredoux what's going on…"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 96 }}
                />
              </div>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="w-full font-semibold rounded-xl transition-all disabled:opacity-50"
                style={{
                  padding: '14px 16px',
                  fontSize: 16,
                  color: '#04150c',
                  background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                  border: 'none',
                  cursor: sending || !message.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>

        <p className="text-white/25 text-xs text-center mt-6">montree.xyz</p>
      </div>
    </div>
  );
}

export default function LockedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center" style={{ background: '#06140e' }}>
          <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      }
    >
      <LockedContent />
    </Suspense>
  );
}
