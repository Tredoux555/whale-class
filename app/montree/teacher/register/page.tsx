// /montree/teacher/register/page.tsx
// Session: Personal Classroom - Teacher registration for individual teachers
// Lanternlight reskin (Jul 2026): skin-only conversion to the funnel register
// (near-black stage, gold hairlines/eyebrow, flat #1D5C41 action). Every
// handler, state, validation, API call and redirect is byte-identical to the
// old teal-gradient page — className/style changes only.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { FT, FUNNEL_CSS } from '@/components/montree/funnel/funnel-theme';

export default function TeacherRegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError(t('validation.passwordsDoNotMatch' as TranslationKey));
      return;
    }

    if (password.length < 6) {
      setError(t('validation.passwordMinLength' as TranslationKey));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/teacher/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName,
          schoolName,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('validation.registrationFailed' as TranslationKey));
      }

      // Store session
      localStorage.setItem('montree_teacher_trial', JSON.stringify(data.teacher));
      localStorage.setItem('montree_school', JSON.stringify(data.school));

      // Redirect to teacher dashboard
      // audit-fix (Jun 2026): '/montree/teacher' has no page (404 dead-end
      // straight after successful signup!) — the real dashboard is below.
      router.push('/montree/dashboard');

    } catch (err) {
      setError(err instanceof Error ? err.message : t('validation.registrationFailed' as TranslationKey));
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
              {t('register.welcomeTo' as TranslationKey)}
            </h1>
            <p style={{ color: FT.whisper, fontSize: '0.9rem', textAlign: 'center', marginTop: 10 }}>
              {t('register.startTrial' as TranslationKey)}
            </p>

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: step >= 1 ? FT.gold : 'rgba(255,255,255,0.14)' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: step >= 2 ? FT.gold : 'rgba(255,255,255,0.14)' }} />
            </div>
          </div>

          <form onSubmit={handleRegister} style={{ width: '100%' }}>
            {/* Step 1: Teacher Info */}
            {step === 1 && (
              <div>
                <div className="fn-field">
                  <label>{t('register.yourName' as TranslationKey)}</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder={t('register.namePlaceholder' as TranslationKey)}
                    className="fn-input"
                    autoFocus
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('register.schoolName' as TranslationKey)}</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder={t('register.schoolPlaceholder' as TranslationKey)}
                    className="fn-input"
                    required
                  />
                  <div className="fn-slug" style={{ color: FT.hush }}>
                    {t('register.schoolNameHint' as TranslationKey)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!teacherName.trim() || !schoolName.trim()}
                  className="fn-pill block"
                  style={{ marginTop: 6 }}
                >
                  {t('common.continue' as TranslationKey)} →
                </button>
              </div>
            )}

            {/* Step 2: Account Credentials */}
            {step === 2 && (
              <div>
                <div className="fn-field">
                  <label>{t('register.email' as TranslationKey)}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('register.emailPlaceholder' as TranslationKey)}
                    className="fn-input"
                    autoFocus
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('register.createPassword' as TranslationKey)}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('register.passwordPlaceholder' as TranslationKey)}
                    className="fn-input"
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('register.confirmPassword' as TranslationKey)}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="fn-input"
                    required
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
                    ← {t('common.back' as TranslationKey)}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email || !password || !confirmPassword}
                    className="fn-pill"
                    style={{ flex: 1 }}
                  >
                    {loading ? t('register.creating' as TranslationKey) : t('register.createAccount' as TranslationKey)}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Trial Info Banner */}
          <div
            style={{
              marginTop: 28,
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              background: 'rgba(232,201,106,0.08)',
              border: '1px solid rgba(232,201,106,0.28)',
              textAlign: 'center',
            }}
          >
            <p style={{ color: FT.voice, fontSize: '0.86rem' }}>
              <span style={{ fontWeight: 600 }}>{t('register.trialDuration' as TranslationKey)}</span> · {t('register.trialStudentLimit' as TranslationKey)}
            </p>
            <p style={{ color: FT.whisper, fontSize: '0.78rem', marginTop: 6 }}>
              {t('register.trialConvince' as TranslationKey)}
            </p>
          </div>

          {/* Links */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ color: FT.whisper, fontSize: '0.86rem', marginBottom: 12 }}>
              {t('register.registerSchool' as TranslationKey)}{' '}
              <Link href="/montree/principal/register" className="fn-login-link">
                {t('register.registerAsPrincipal' as TranslationKey)}
              </Link>
            </p>
            <p style={{ color: FT.whisper, fontSize: '0.86rem' }}>
              {t('register.alreadyHaveAccount' as TranslationKey)}{' '}
              <Link href="/montree/login" className="fn-login-link">
                {t('register.signIn' as TranslationKey)}
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
