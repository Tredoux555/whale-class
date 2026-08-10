'use client';

// TryItGateModal — the gate behind every "Try it" CTA on the landing page.
//
// Montree is no longer self-serve: pressing "Try it" does not open a signup
// form, it opens a conversation. The click itself is logged fire-and-forget
// (POST /api/montree/tryit/click) so we can still see how many people wanted
// in — including everyone who reads this and closes it — and the form posts to
// /api/montree/tryit/message, which stores the request and emails Tredoux.
//
// Styling follows the landing page's own register (deep forest, emerald,
// gold hairline, Lora heading) and reuses its global .m-pill button class.
// Per the Turbopack rule this component has exactly ONE <style> element and it
// sits at the top level of the return — never inside a conditional branch, and
// never styled-jsx.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useI18n } from '@/lib/montree/i18n';

interface TryItGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

const MAX = {
  name: 200,
  email: 320,
  organisation: 200,
  message: 4000,
};

const FIELD_STYLE: CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 9,
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: 'rgba(255,250,240,0.94)',
  fontSize: '0.92rem',
  fontFamily: 'inherit',
  lineHeight: 1.5,
  outline: 'none',
};

const LABEL_STYLE: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: '0.68rem',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'rgba(232,201,106,0.62)',
  fontWeight: 500,
};

export default function TryItGateModal({ isOpen, onClose }: TryItGateModalProps) {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorText, setErrorText] = useState('');

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Escape closes; body scroll is frozen while the sheet is up. Both undone on
  // close so a visitor who dismisses the gate can keep reading the page.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first field so the form is usable straight from the keyboard.
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  // Reset back to a blank form whenever the gate is dismissed, so the next
  // visitor to open it doesn't find a stale success screen.
  useEffect(() => {
    if (isOpen) return;
    setStatus('idle');
    setErrorText('');
  }, [isOpen]);

  const submit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    const payload = {
      name: name.trim(),
      email: email.trim(),
      organisation: organisation.trim(),
      message: message.trim(),
    };

    if (!payload.name || !payload.email || !payload.organisation || !payload.message) {
      setStatus('error');
      setErrorText(t('landing.tryitGate.required'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setStatus('error');
      setErrorText(t('landing.tryitGate.invalidEmail'));
      return;
    }

    setStatus('sending');
    setErrorText('');
    try {
      const res = await fetch('/api/montree/tryit/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // JSON-before-OK rule: check the status before parsing — an error page
      // is not JSON and would throw a confusing parse error instead.
      if (!res.ok) {
        setStatus('error');
        setErrorText(t('landing.tryitGate.error'));
        return;
      }
      setStatus('sent');
    } catch (err) {
      console.error('[TryItGate] submit failed:', err);
      setStatus('error');
      setErrorText(t('landing.tryitGate.error'));
    }
  }, [name, email, organisation, message, status, t]);

  if (!isOpen) return null;

  const sending = status === 'sending';

  return (
    <>
      {/* One style element, top level of the return. Turbopack rejects a
          nested <style jsx>; a literal <style> is also the pattern the landing
          page itself uses. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes mtg-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mtg-rise { from { transform: translateY(18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .mtg-scrim { animation: mtg-fade 220ms ease-out; }
        .mtg-card { animation: mtg-rise 300ms cubic-bezier(0.22, 1, 0.36, 1); }
        .mtg-field:focus { border-color: rgba(52,211,153,0.55) !important; background: rgba(255,255,255,0.055) !important; }
        .mtg-field::placeholder { color: rgba(255,250,240,0.28); }
        .mtg-submit { width: 100%; }
        .mtg-submit:disabled { opacity: 0.55; cursor: default; }
        @media (prefers-reduced-motion: reduce) {
          .mtg-scrim, .mtg-card { animation: none; }
        }
      `,
        }}
      />

      <div
        className="mtg-scrim"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          background: 'rgba(2,8,5,0.76)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
        }}
      />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          overflowY: 'auto',
          pointerEvents: 'none',
        }}
      >
        <div
          className="mtg-card"
          role="dialog"
          aria-modal="true"
          aria-label={t('landing.tryitGate.title')}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 480,
            margin: 'auto',
            padding: '32px 28px 26px',
            background: 'rgba(6,17,11,0.97)',
            border: '1px solid rgba(232,201,106,0.20)',
            borderRadius: 18,
            boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
            color: 'rgba(255,250,240,0.92)',
            pointerEvents: 'auto',
            textAlign: 'left',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t('landing.tryitGate.close')}
            className="btn btn-secondary btn-icon btn-sm"
            style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.95rem' }}
          >
            ×
          </button>

          <h2
            style={{
              margin: '0 0 10px',
              fontFamily: 'var(--font-lora), Georgia, serif',
              fontSize: '1.55rem',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: 'rgba(255,250,240,0.95)',
            }}
          >
            {status === 'sent' ? t('landing.tryitGate.successTitle') : t('landing.tryitGate.title')}
          </h2>

          <p
            style={{
              margin: '0 0 22px',
              fontSize: '0.92rem',
              lineHeight: 1.65,
              color: 'rgba(255,250,240,0.6)',
            }}
          >
            {status === 'sent' ? t('landing.tryitGate.success') : t('landing.tryitGate.body')}
          </p>

          {status === 'sent' ? (
            <button type="button" className="m-pill mtg-submit" onClick={onClose}>
              {t('landing.tryitGate.done')}
            </button>
          ) : (
            <form onSubmit={submit} noValidate>
              <div style={{ marginBottom: 14 }}>
                <label style={LABEL_STYLE} htmlFor="mtg-name">
                  {t('landing.tryitGate.name')}
                </label>
                <input
                  id="mtg-name"
                  ref={firstFieldRef}
                  className="mtg-field"
                  style={FIELD_STYLE}
                  type="text"
                  autoComplete="name"
                  value={name}
                  disabled={sending}
                  onChange={(e) => setName(e.target.value.slice(0, MAX.name))}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL_STYLE} htmlFor="mtg-email">
                  {t('landing.tryitGate.email')}
                </label>
                <input
                  id="mtg-email"
                  className="mtg-field"
                  style={FIELD_STYLE}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  disabled={sending}
                  onChange={(e) => setEmail(e.target.value.slice(0, MAX.email))}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL_STYLE} htmlFor="mtg-org">
                  {t('landing.tryitGate.organisation')}
                </label>
                <input
                  id="mtg-org"
                  className="mtg-field"
                  style={FIELD_STYLE}
                  type="text"
                  autoComplete="organization"
                  value={organisation}
                  disabled={sending}
                  onChange={(e) => setOrganisation(e.target.value.slice(0, MAX.organisation))}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={LABEL_STYLE} htmlFor="mtg-message">
                  {t('landing.tryitGate.message')}
                </label>
                <textarea
                  id="mtg-message"
                  className="mtg-field"
                  style={{ ...FIELD_STYLE, minHeight: 104, resize: 'vertical' }}
                  rows={4}
                  value={message}
                  disabled={sending}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX.message))}
                />
              </div>

              {status === 'error' && errorText && (
                <p
                  role="alert"
                  style={{
                    margin: '0 0 14px',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    color: '#fca5a5',
                  }}
                >
                  {errorText}
                </p>
              )}

              <button type="submit" className="m-pill mtg-submit" disabled={sending}>
                {sending ? t('landing.tryitGate.sending') : t('landing.tryitGate.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
