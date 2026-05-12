// components/montree/InvitePrincipalModal.tsx
// Teacher-facing modal: create a principal account for this classroom and
// surface a 6-char login code the teacher hands off directly (SMS, WhatsApp,
// in person). The auto-email step was retired — Resend setup on Railway is
// the recurring blocker, and a code-on-screen + copy button is plenty to
// share with one principal at a time.
'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  gold: '#E8C96A',
  cardBg: 'rgba(8,20,12,0.97)',
  cardBorder: '1px solid rgba(52,211,153,0.25)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.45)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface InviteResult {
  code: string;
  email: string;
  name: string;
}

export default function InvitePrincipalModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setName('');
        setEmail('');
        setNote('');
        setSubmitting(false);
        setResult(null);
        setError('');
        setCopied(false);
      }, 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/montree/invite-principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          note: note.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not send the invitation.');
        setSubmitting(false);
        return;
      }
      setResult({
        code: data.principal.login_code,
        email: data.principal.email,
        name: data.principal.name,
      });
      setSubmitting(false);
    } catch (err) {
      console.error('[invite-principal] fetch error:', err);
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.code).then(
      () => {
        setCopied(true);
        toast.success('Code copied');
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error('Could not copy'),
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.cardBg,
          border: T.cardBorder,
          backdropFilter: 'blur(24px)',
          borderRadius: 18,
          padding: 28,
          maxWidth: 480,
          width: '100%',
          fontFamily: T.sans,
          color: T.textPrimary,
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'transparent',
            border: 'none',
            color: T.textMuted,
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={20} strokeWidth={1.75} />
        </button>

        {!result ? (
          <>
            {/* Form state */}
            <h2
              style={{
                fontFamily: T.serif,
                fontSize: 24,
                fontWeight: 500,
                color: T.textPrimary,
                margin: 0,
                letterSpacing: -0.4,
              }}
            >
              Invite your principal
            </h2>
            <p
              style={{
                color: T.textSecondary,
                fontSize: 14,
                lineHeight: 1.55,
                marginTop: 10,
                marginBottom: 22,
              }}
            >
              They'll be able to look at this classroom — every child, every
              observation, every parent letter — through your eyes. Free for as
              long as they want to look.
            </p>

            <div style={{ marginBottom: 14 }}>
              <Label>Their name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mrs. Chen"
                disabled={submitting}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <Label>Their email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="principal@school.com"
                disabled={submitting}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <Label>A note from you (optional)</Label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Wanted you to take a look at this — I think it's worth your time."
                disabled={submitting}
                maxLength={600}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: T.inputBg,
                  border: T.inputBorder,
                  borderRadius: 10,
                  color: T.textPrimary,
                  fontFamily: T.sans,
                  fontSize: 14,
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: T.textMuted,
                  marginTop: 4,
                  textAlign: 'right',
                }}
              >
                {note.length}/600
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: 12,
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.30)',
                  borderRadius: 10,
                  color: '#f87171',
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  background: 'rgba(255,255,255,0.06)',
                  color: T.textPrimary,
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 999,
                  fontFamily: T.sans,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !name.trim() || !email.trim()}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  background: T.emerald,
                  color: '#0a1a0f',
                  border: 'none',
                  borderRadius: 999,
                  fontFamily: T.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    submitting || !name.trim() || !email.trim()
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    submitting || !name.trim() || !email.trim() ? 0.5 : 1,
                }}
              >
                {submitting ? 'Creating…' : 'Get their code'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                background: 'rgba(52,211,153,0.15)',
                border: '1px solid rgba(52,211,153,0.30)',
                borderRadius: '50%',
                margin: '0 auto 18px',
              }}
            >
              <Check size={28} strokeWidth={2} color={T.emerald} />
            </div>
            <h2
              style={{
                fontFamily: T.serif,
                fontSize: 22,
                fontWeight: 500,
                color: T.textPrimary,
                margin: 0,
                textAlign: 'center',
                letterSpacing: -0.3,
              }}
            >
              Code created
            </h2>
            <p
              style={{
                color: T.textSecondary,
                fontSize: 14,
                lineHeight: 1.55,
                marginTop: 10,
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              Share this code with <strong>{result.name}</strong>. They'll log
              in at <strong>montree.xyz</strong> with it and land straight on
              your classroom.
            </p>

            <div
              style={{
                background: '#1a2e22',
                borderRadius: 14,
                padding: '20px 18px',
                textAlign: 'center',
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(232,201,106,0.85)',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Their code
              </div>
              <div
                style={{
                  fontFamily: T.serif,
                  fontSize: 32,
                  fontWeight: 600,
                  color: T.textPrimary,
                  letterSpacing: 4,
                  marginBottom: 14,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {result.code}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  background: copied ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.08)',
                  color: copied ? T.emerald : T.textPrimary,
                  border: copied
                    ? '1px solid rgba(52,211,153,0.30)'
                    : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 999,
                  fontFamily: T.sans,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {copied ? (
                  <>
                    <Check size={14} strokeWidth={2} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} strokeWidth={1.75} />
                    Copy code
                  </>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px 22px',
                background: T.emerald,
                color: '#0a1a0f',
                border: 'none',
                borderRadius: 999,
                fontFamily: T.sans,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        color: T.emeraldDim,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '12px 14px',
        background: T.inputBg,
        border: T.inputBorder,
        borderRadius: 10,
        color: T.textPrimary,
        fontFamily: T.sans,
        fontSize: 14,
        outline: 'none',
      }}
    />
  );
}
