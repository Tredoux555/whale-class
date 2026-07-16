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
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#ffffff',
    outline: 'none',
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#030b08' }}
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
            radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.14), rgba(39,129,90,0) 60%),
            linear-gradient(168deg, #071510 0%, #051009 45%, #030b08 100%)
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
            style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 26, fontWeight: 400 }}
          >
            This account has been locked.
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Access is paused for now. If you think this is a mistake, send a
            message below and Tredoux will get back to you.
          </p>
        </div>

        <div className="bg-white/[0.028] backdrop-blur border border-white/[0.08] rounded-[14px] p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: 'rgba(232,201,106,0.14)' }}>
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
                <label className="block text-sm mb-1.5 text-white/55">Your name</label>
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
                <label className="block text-sm mb-1.5 text-white/55">Email</label>
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
                <label className="block text-sm mb-1.5 text-white/55">Message</label>
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
                  color: '#ffffff',
                  background: '#1D5C41',
                  border: '1px solid rgba(255,255,255,0.08)',
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
          <div className="w-8 h-8 border-2 border-white/20 border-t-[#E8C96A] rounded-full animate-spin" />
        </div>
      }
    >
      <LockedContent />
    </Suspense>
  );
}
