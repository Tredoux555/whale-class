// app/dark-phonics/account/page.tsx
//
// The Teachers' Room account, for Dark Phonics.
//
// 🚨 WHY THIS PAGE EXISTS. `lib/montree/community/auth.ts` and its seven API
// routes (signup, login, logout, confirm, forgot, reset, resend) have been in
// the repo for a while, and there has never been a PAGE for them — the only
// way in was another surface's modal. The Dark Phonics paywall needs an
// individual identity (a teacher, not a school), and that identity is this one,
// so the hub brings the missing door with it.
//
// It is deliberately minimal: three forms behind one toggle, no profile, no
// avatar, no settings. Everything it does goes through the EXISTING routes; not
// one line of community auth changed to make this page work.
//
// Nothing here is behind the paywall flag: signing in is free and always was.
// With DARK_PHONICS_PAYWALL off this page is simply never linked to.
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { makeHubT, type HubLang } from '@/lib/montree/dark-phonics/hub-strings';

type Mode = 'login' | 'signup' | 'forgot';

interface Me {
  displayName: string | null;
  email: string | null;
}

export default function DarkPhonicsAccountPage() {
  const [lang, setLang] = useState<HubLang>('en');
  const [mode, setMode] = useState<Mode>('login');
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(() => makeHubT(lang), [lang]);

  // The same fb_lang cookie the hub and the feedback board use.
  useEffect(() => {
    try {
      const m = /(?:^|;\s*)fb_lang=(en|zh)/.exec(document.cookie);
      if (m) setLang(m[1] as HubLang);
    } catch {
      /* default English */
    }
  }, []);

  // "Who am I?" — the one read this page does on mount. A 401/404/503 all mean
  // the same thing here: show the forms.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/community/me');
        if (!res.ok) return;
        const j = (await res.json()) as { user?: { displayName?: string; email?: string } | null };
        if (cancelled || !j?.user) return;
        setMe({ displayName: j.user.displayName ?? null, email: j.user.email ?? null });
      } catch {
        /* signed out */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setBusy(true);
      setError(null);
      setNote(null);

      const endpoint =
        mode === 'login'
          ? '/api/montree/community/auth/login'
          : mode === 'signup'
            ? '/api/montree/community/auth/signup'
            : '/api/montree/community/auth/forgot';

      const body =
        mode === 'signup'
          ? { email, password, displayName: name, website }
          : mode === 'login'
            ? { email, password }
            : { email };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string; user?: Me };
        if (!res.ok) {
          setError(j.error || 'That did not work. Try again.');
          return;
        }
        if (mode === 'login' && j.user) {
          setMe({ displayName: j.user.displayName ?? null, email: j.user.email ?? null });
          setPassword('');
          return;
        }
        setNote(mode === 'signup' ? t('account.signupSent') : t('account.forgotSent'));
        setPassword('');
      } catch {
        setError('That did not work. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [busy, mode, email, password, name, website, t],
  );

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await fetch('/api/montree/community/auth/logout', { method: 'POST' });
    } catch {
      /* the cookie may already be gone */
    }
    setMe(null);
    setBusy(false);
  }, []);

  return (
    <main className="dpa-root">
      <div className="dpa-card">
        <Link href="/dark-phonics" className="dpa-back">
          ← {t('account.backToHub')}
        </Link>

        <h1 className="dpa-title">{t('account.title')}</h1>
        <p className="dpa-sub">{t('account.sub')}</p>

        {me ? (
          <>
            <p className="dpa-note" role="status">
              {t('account.signedIn')} {me.email ? <strong>{me.email}</strong> : null}
            </p>
            <button type="button" className="dpa-btn dpa-btn-ghost" onClick={() => void signOut()} disabled={busy}>
              {t('account.signOut')}
            </button>
          </>
        ) : (
          <>
            <div className="dpa-modes" role="tablist" aria-label={t('account.title')}>
              {(['login', 'signup', 'forgot'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  className={`dpa-mode${mode === m ? ' dpa-mode-on' : ''}`}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                    setNote(null);
                  }}
                >
                  {t(m === 'login' ? 'account.signIn' : m === 'signup' ? 'account.signUp' : 'account.forgot')}
                </button>
              ))}
            </div>

            <form className="dpa-form" onSubmit={submit}>
              {mode === 'signup' ? (
                <label className="dpa-field">
                  <span>{t('account.name')}</span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              ) : null}

              <label className="dpa-field">
                <span>{t('account.email')}</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              {mode !== 'forgot' ? (
                <label className="dpa-field">
                  <span>{t('account.password')}</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              ) : null}

              {/* Honeypot — hidden from sight and from the a11y tree. */}
              <div className="dpa-honey" aria-hidden="true">
                <label htmlFor="dpa-website">Website</label>
                <input
                  id="dpa-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <button type="submit" className="dpa-btn" disabled={busy}>
                {busy
                  ? t('account.working')
                  : t(
                      mode === 'login'
                        ? 'account.submitLogin'
                        : mode === 'signup'
                          ? 'account.submitSignup'
                          : 'account.submitForgot',
                    )}
              </button>
            </form>
          </>
        )}

        {error ? (
          <p className="dpa-error" role="alert">
            {error}
          </p>
        ) : null}
        {note ? (
          <p className="dpa-note" role="status">
            {note}
          </p>
        ) : null}
      </div>

      <style jsx global>{`
        .dpa-root {
          min-height: 100dvh;
          background: linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%);
          color: rgba(255, 250, 240, 0.94);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          box-sizing: border-box;
        }
        .dpa-card {
          width: min(420px, 100%);
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.03);
          padding: 26px 22px 24px;
        }
        .dpa-back {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          color: rgba(255, 250, 240, 0.5);
          text-decoration: none;
          font-size: 0.85rem;
        }
        .dpa-back:hover {
          color: rgba(255, 250, 240, 0.9);
        }
        .dpa-title {
          margin: 8px 0 6px;
          font-size: 1.4rem;
          font-weight: 600;
        }
        .dpa-sub {
          margin: 0 0 20px;
          color: rgba(255, 250, 240, 0.58);
          font-size: 0.92rem;
          line-height: 1.55;
        }
        .dpa-modes {
          display: flex;
          gap: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          padding: 3px;
          margin-bottom: 18px;
        }
        .dpa-mode {
          flex: 1;
          appearance: none;
          border: 0;
          background: transparent;
          color: rgba(255, 250, 240, 0.55);
          font: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 10px 6px;
          min-height: 42px;
          border-radius: 999px;
          cursor: pointer;
        }
        .dpa-mode-on {
          background: rgba(130, 217, 174, 0.16);
          color: #d6f5e6;
        }
        .dpa-form {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }
        .dpa-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.82rem;
          color: rgba(255, 250, 240, 0.62);
        }
        .dpa-field input {
          min-height: 46px;
          padding: 12px 13px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(0, 0, 0, 0.32);
          color: rgba(255, 250, 240, 0.94);
          font: inherit;
          font-size: 0.95rem;
        }
        .dpa-btn {
          appearance: none;
          min-height: 48px;
          margin-top: 4px;
          padding: 13px 20px;
          border-radius: 999px;
          border: 1px solid rgba(130, 217, 174, 0.4);
          background: linear-gradient(135deg, #2e8f63, #1d6b48);
          color: #f3fff8;
          font: inherit;
          font-size: 0.96rem;
          font-weight: 600;
          cursor: pointer;
        }
        .dpa-btn:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .dpa-btn-ghost {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.16);
          color: rgba(255, 250, 240, 0.9);
          width: 100%;
        }
        .dpa-error {
          margin: 14px 0 0;
          color: #ffb4a8;
          font-size: 0.87rem;
        }
        .dpa-note {
          margin: 14px 0 0;
          color: #9fe3c0;
          font-size: 0.87rem;
          line-height: 1.5;
        }
        .dpa-honey {
          position: absolute;
          left: -9999px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        .dpa-root :focus-visible {
          outline: 2px solid #82d9ae;
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .dpa-root * {
            transition-duration: 0.001ms !important;
            animation-duration: 0.001ms !important;
          }
        }
      `}</style>
    </main>
  );
}
