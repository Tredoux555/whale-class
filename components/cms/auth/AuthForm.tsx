'use client';

// components/cms/auth/AuthForm.tsx
// The only form in CMS that takes a credential. Two modes in one card — sign in
// and create-a-family-account — because a parent arriving from an invitation
// does not know which of the two they need until they read the page.
//
// Harbor law: every class is `cms-`-prefixed, every string goes through t().
// Fields are built from <Field> (components/cms/enroll/StepScaffold) so an auth
// input is visually identical to an enrolment input — one form language across
// the surface, not two.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import { Field } from '@/components/cms/enroll/StepScaffold';
import { ArrowRightIcon, IconBox } from '@/components/cms/icons';

type Mode = 'signIn' | 'signUp';

/** Server error code → the key the parent actually reads. An unmapped code is
 *  a server bug, and shows the generic message rather than a raw code. */
const ERROR_KEY: Record<string, TranslationKey> = {
  invalid_credentials: 'auth.error.invalid',
  rate_limited: 'auth.error.rateLimited',
  email_taken: 'auth.error.emailTaken',
  school_not_found: 'auth.error.schoolNotFound',
  no_membership: 'auth.error.noMembership',
  demo_mode: 'auth.demo.body',
  server_error: 'auth.error.server',
  invalid: 'auth.error.invalid',
};

export function AuthForm({ initialMode = 'signIn' }: { initialMode?: Mode }) {
  const t = useT();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  // Honeypot. A real person never fills this; a bot fills everything.
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  function switchTo(next: Mode) {
    setMode(next);
    setErrorKey(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setErrorKey(null);

    // Client-side checks exist for the message, not for the gate — the route
    // validates again and is the one that counts.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorKey('auth.error.emailInvalid');
      return;
    }
    if (password.length < 8) {
      setErrorKey('auth.error.passwordShort');
      return;
    }
    if (mode === 'signUp' && !fullName.trim()) {
      setErrorKey('auth.error.nameRequired');
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === 'signIn' ? '/api/cms/auth/login' : '/api/cms/auth/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'signIn'
            ? { email: email.trim(), password }
            : {
                email: email.trim(),
                password,
                fullName: fullName.trim(),
                schoolCode: schoolCode.trim(),
                website,
              }
        ),
      });

      // JSON-before-OK: a 500 can be an HTML error page, and .json() on that
      // throws a parse error that hides the real status (repo-wide rule).
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErrorKey(ERROR_KEY[String(body?.error ?? '')] ?? 'auth.error.server');
        setBusy(false);
        return;
      }

      const body = await response.json();
      // A full navigation, not router.push: the session cookie is set by the
      // response, and every gated page is server-rendered from it.
      window.location.assign(String(body?.redirectTo ?? '/cms'));
    } catch {
      setErrorKey('auth.error.network');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="cms-card p-6 sm:p-7">
      <div className="flex gap-1 mb-6" role="tablist">
        {(['signIn', 'signUp'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchTo(m)}
            className={`cms-btn cms-btn-sm flex-1 ${
              mode === m ? 'cms-btn-primary cms-btn-soft' : 'cms-btn-ghost'
            }`}
          >
            {t(m === 'signIn' ? 'auth.tab.signIn' : 'auth.tab.signUp')}
          </button>
        ))}
      </div>

      <h1 className="font-head text-[26px] leading-tight m-0">
        {t(mode === 'signIn' ? 'auth.title' : 'auth.signUpTitle')}
      </h1>
      <p className="text-[13.5px] text-harbor-muted mt-2 mb-6 leading-relaxed max-w-[46ch]">
        {t(mode === 'signIn' ? 'auth.subtitle' : 'auth.signUpSubtitle')}
      </p>

      <div className="grid gap-4">
        {mode === 'signUp' ? (
          <Field label={t('auth.fullName')} help={t('auth.fullName.help')} required>
            <input
              className="cms-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              dir="auto"
            />
          </Field>
        ) : null}

        <Field label={t('auth.email')} required>
          <input
            type="email"
            className="cms-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            dir="ltr"
          />
        </Field>

        <Field
          label={t('auth.password')}
          help={mode === 'signUp' ? t('auth.password.help') : undefined}
          required
        >
          <input
            type="password"
            className="cms-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            dir="ltr"
          />
        </Field>

        {mode === 'signUp' ? (
          <Field label={t('auth.schoolCode')} help={t('auth.schoolCode.help')}>
            <input
              className="cms-input"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              autoComplete="off"
              dir="ltr"
            />
          </Field>
        ) : null}

        {/* Honeypot — visually and semantically hidden from humans and readers. */}
        {mode === 'signUp' ? (
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
        ) : null}
      </div>

      {errorKey ? (
        <p
          role="alert"
          className="cms-card-sunk mt-5 mb-0 px-3.5 py-3 text-[13px] leading-relaxed text-harbor-danger-deep border-s-[3px] border-s-harbor-danger"
        >
          {t(errorKey)}
        </p>
      ) : null}

      <button
        type="submit"
        className="cms-btn cms-btn-primary cms-btn-lg cms-btn-full mt-6"
        disabled={busy}
      >
        {busy
          ? t('auth.working')
          : t(mode === 'signIn' ? 'auth.submit.signIn' : 'auth.submit.signUp')}
        {busy ? null : (
          <IconBox flip>
            <ArrowRightIcon />
          </IconBox>
        )}
      </button>

      <p className="text-[12px] text-harbor-muted mt-5 mb-0 leading-relaxed">
        {t('auth.staffNote')}
      </p>

      <p className="mt-4 mb-0">
        <Link
          href="/cms"
          className="text-[12.5px] text-harbor-accent-deep font-semibold no-underline"
          onClick={() => router.prefetch?.('/cms')}
        >
          {t('auth.backToStart')}
        </Link>
      </p>
    </form>
  );
}
