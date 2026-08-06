'use client';

/**
 * The school registration wizard for an invited principal.
 *
 * Visually identical to /montree/principal/register — same Lanternlight funnel skin, same
 * two-step shape, same field order — with one difference that matters: it names the
 * organisation that invited them, at the top, before anything is asked of them.
 *
 * There is no referral-code field here. A school arriving through an organisation is already
 * attributed, and asking a principal for a code they were never given is a dead end.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { FT, FUNNEL_CSS } from '@/components/montree/funnel/funnel-theme';
import type { InviteLanding } from '@/lib/montree/org/lookup-invite';

export default function SchoolJoinWizard({ token, landing }: { token: string; landing: InviteLanding }) {
  const router = useRouter();
  const { t } = useI18n();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [schoolName, setSchoolName] = useState(landing.prefillName ?? '');
  const [principalName, setPrincipalName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError(t('org.schoolJoin.passwordMismatch')); return; }
    if (password.length < 8) { setError(t('org.schoolJoin.passwordTooShort')); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/montree/org/register-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, schoolName, principalName, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('org.schoolJoin.failed'));

      // Exactly what /montree/principal/register stores, so every downstream principal page
      // (which reads these two keys) works with no change at all.
      localStorage.setItem('montree_principal', JSON.stringify(data.principal));
      localStorage.setItem('montree_school', JSON.stringify(data.school));

      router.push('/montree/principal/setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('org.schoolJoin.failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!landing.valid) {
    return (
      <div className="fn-page">
        <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />
        <div className="fn-topbar">
          <a className="fn-wordmark" href="/montree"><span>{t('app.name')}</span></a>
          <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white border border-white/[0.08]" />
        </div>
        <div className="fn-stage-wrap" style={{ padding: '48px 20px 72px' }}>
          <div className="fn-screen center" style={{ maxWidth: 460 }}>
            <div className="fn-eyebrow" style={{ textAlign: 'center' }}>{t('app.name')}</div>
            <h1 className="fn-h1" style={{ textAlign: 'center' }}>{t('org.schoolJoin.deadLinkTitle')}</h1>
            <p style={{ color: FT.whisper, fontSize: '0.92rem', textAlign: 'center', marginTop: 14, lineHeight: 1.7 }}>
              {landing.message || t('org.schoolJoin.deadLinkBody')}
            </p>
            {/* 🚨 A used school link almost always means the principal ALREADY registered
                with it and came back to the same message in a chat thread. inviteStatusMessage
                tells them to sign in; this is the button that does it. Registering again would
                create a second, unlinked school — the wrong move, so it stays the quiet
                secondary option below. */}
            <div style={{ marginTop: 26, textAlign: 'center' }}>
              <Link href="/montree/principal/login" className="fn-pill" style={{ display: 'inline-block' }}>
                {t('org.schoolJoin.signInInstead')}
              </Link>
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link href="/montree/principal/register" className="fn-login-link">
                {t('org.schoolJoin.registerAnyway')}
              </Link>
            </div>
          </div>
        </div>
        <div className="fn-foot">Montree · montree.xyz</div>
      </div>
    );
  }

  const orgName = landing.organizationName;

  return (
    <div className="fn-page">
      <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />

      <div className="fn-topbar">
        <a className="fn-wordmark" href="/montree"><span>{t('app.name')}</span></a>
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white border border-white/[0.08]" />
      </div>

      <div className="fn-stage-wrap" style={{ padding: '32px 20px 72px' }}>
        <div className="fn-screen center" style={{ maxWidth: 470 }}>
          <div style={{ marginBottom: 30, width: '100%' }}>
            <div className="fn-eyebrow" style={{ textAlign: 'center' }}>
              {orgName ? t('org.schoolJoin.eyebrowNamed', { org: orgName }) : t('org.schoolJoin.eyebrow')}
            </div>
            <h1 className="fn-h1" style={{ textAlign: 'center' }}>{t('org.schoolJoin.welcome')}</h1>
            <p style={{ color: FT.whisper, fontSize: '0.9rem', textAlign: 'center', marginTop: 12, lineHeight: 1.7 }}>
              {orgName ? t('org.schoolJoin.subtitleNamed', { org: orgName }) : t('org.schoolJoin.subtitle')}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: step >= 1 ? FT.gold : 'rgba(255,255,255,0.14)' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: step >= 2 ? FT.gold : 'rgba(255,255,255,0.14)' }} />
            </div>
          </div>

          <form onSubmit={submit} style={{ width: '100%' }}>
            {step === 1 && (
              <div>
                <div className="fn-field">
                  <label>{t('org.schoolJoin.schoolNameLabel')}</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder={t('org.schoolJoin.schoolNamePlaceholder')}
                    className="fn-input"
                    autoFocus
                    required
                  />
                  {schoolName && (
                    <div className="fn-slug">montree.xyz/<b>{generateSlug(schoolName)}</b></div>
                  )}
                </div>

                <div className="fn-field">
                  <label>{t('org.schoolJoin.principalNameLabel')}</label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder={t('org.schoolJoin.principalNamePlaceholder')}
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
                  {t('org.schoolJoin.continue')}
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="fn-field">
                  <label>{t('org.schoolJoin.emailLabel')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('org.schoolJoin.emailPlaceholder')}
                    className="fn-input"
                    autoFocus
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('org.schoolJoin.passwordLabel')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('org.schoolJoin.passwordPlaceholder')}
                    className="fn-input"
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('org.schoolJoin.confirmPasswordLabel')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('org.schoolJoin.confirmPasswordPlaceholder')}
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
                  <button type="button" onClick={() => setStep(1)} className="fn-pill ghost">
                    {t('org.schoolJoin.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email || !password || !confirmPassword}
                    className="fn-pill"
                    style={{ flex: 1 }}
                  >
                    {loading ? t('org.schoolJoin.creating') : t('org.schoolJoin.createAccount')}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p style={{ color: FT.hush, fontSize: '0.8rem', textAlign: 'center', marginTop: 26, lineHeight: 1.7 }}>
            {t('org.schoolJoin.nextStepsHint')}
          </p>
        </div>
      </div>

      <div className="fn-foot">Montree · montree.xyz</div>
    </div>
  );
}
