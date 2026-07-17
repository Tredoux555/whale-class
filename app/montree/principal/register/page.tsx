// /montree/principal/register/page.tsx
// Session 105: Principal Registration - Create account + school
// Lanternlight reskin (Jul 2026): skin-only conversion to the funnel register
// register (near-black stage, gold hairlines/eyebrow, flat #1D5C41 action).
// Every handler, state, validation, API call and redirect is byte-identical to
// the old teal-gradient page — className/style changes only.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { FT, FUNNEL_CSS } from '@/components/montree/funnel/funnel-theme';

export default function PrincipalRegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [schoolName, setSchoolName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Outreach attribution: /welcome/[code] drops a `montree_ref` cookie
  // (90 days). Pre-fill the optional referral field from it so schools
  // arriving from a cold-email link get attributed without typing anything.
  useEffect(() => {
    try {
      const m = document.cookie.match(/(?:^|;\s*)montree_ref=([^;]+)/);
      if (m && m[1]) {
        const fromCookie = decodeURIComponent(m[1]).trim().toUpperCase();
        if (/^[A-Z0-9-]{4,32}$/.test(fromCookie)) setReferralCode(fromCookie);
      }
    } catch {
      // Cookie unreadable — field stays empty, registration unaffected.
    }
  }, []);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError(t('principalRegister.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('principalRegister.passwordTooShort'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/principal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          principalName,
          email,
          password,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || t('principalRegister.registrationFailed'));
      }

      const data = await res.json();
      // Store session
      localStorage.setItem('montree_principal', JSON.stringify(data.principal));
      localStorage.setItem('montree_school', JSON.stringify(data.school));

      // Redirect to setup classrooms
      router.push('/montree/principal/setup');

    } catch (err) {
      setError(err instanceof Error ? err.message : t('principalRegister.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fn-page">
      <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />

      {/* Topbar — M artwork + wordmark + EN toggle (consistent with /try) */}
      <div className="fn-topbar">
        <a className="fn-wordmark" href="/montree">
          <picture>
            <source srcSet="/brand/m-mark-transparent.webp" type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/m-mark.png" alt="Montree" width={30} height={25} />
          </picture>
          <span>{t('app.name')}</span>
        </a>
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white border border-white/[0.08]" />
      </div>

      {/* Stage — centered form */}
      <div className="fn-stage-wrap" style={{ padding: '32px 20px 72px' }}>
        <div className="fn-screen center" style={{ maxWidth: 460 }}>
          {/* Heading & progress */}
          <div style={{ marginBottom: 32, width: '100%' }}>
            <div className="fn-eyebrow" style={{ textAlign: 'center' }}>{t('app.name')}</div>
            <h1 className="fn-h1" style={{ textAlign: 'center' }}>
              {t('principalRegister.welcome')}
            </h1>
            <p style={{ color: FT.whisper, fontSize: '0.9rem', textAlign: 'center', marginTop: 10 }}>
              {t('principalRegister.subtitle')}
            </p>

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: step >= 1 ? FT.gold : 'rgba(255,255,255,0.14)' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: step >= 2 ? FT.gold : 'rgba(255,255,255,0.14)' }} />
            </div>
          </div>

          <form onSubmit={handleRegister} style={{ width: '100%' }}>
            {/* Step 1: School Info */}
            {step === 1 && (
              <div>
                <div className="fn-field">
                  <label>{t('principalRegister.schoolNameLabel')}</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder={t('principalRegister.schoolNamePlaceholder')}
                    className="fn-input"
                    autoFocus
                    required
                  />
                  {schoolName && (
                    <div className="fn-slug">
                      montree.xyz/<b>{generateSlug(schoolName)}</b>
                    </div>
                  )}
                </div>

                <div className="fn-field">
                  <label>{t('principalRegister.principalNameLabel')}</label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder={t('principalRegister.principalNamePlaceholder')}
                    className="fn-input"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!schoolName.trim() || !principalName.trim()}
                  className="fn-pill block"
                  style={{ marginTop: 6 }}
                >
                  {t('principalRegister.continue')}
                </button>
              </div>
            )}

            {/* Step 2: Account Credentials */}
            {step === 2 && (
              <div>
                <div className="fn-field">
                  <label>{t('principalRegister.emailLabel')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('principalRegister.emailPlaceholder')}
                    className="fn-input"
                    autoFocus
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('principalRegister.passwordLabel')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('principalRegister.passwordPlaceholder')}
                    className="fn-input"
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('principalRegister.confirmPasswordLabel')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('principalRegister.confirmPasswordPlaceholder')}
                    className="fn-input"
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('principalRegister.referralCodeLabel')}</label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder={t('principalRegister.referralCodePlaceholder')}
                    className="fn-input"
                    maxLength={32}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                {error && (
                  <div className="fn-error" style={{ marginBottom: 18 }}>
                    <pre>{error}</pre>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="fn-pill ghost"
                  >
                    {t('principalRegister.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email || !password || !confirmPassword}
                    className="fn-pill"
                    style={{ flex: 1 }}
                  >
                    {loading ? t('principalRegister.creatingAccount') : t('principalRegister.createAccount')}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Links */}
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <p style={{ color: FT.whisper, fontSize: '0.86rem' }}>
              {t('principalRegister.alreadyHaveAccount')}{' '}
              <Link href="/montree/principal/login" className="fn-login-link">
                {t('principalRegister.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fn-foot">Montree · montree.xyz</div>
    </div>
  );
}
