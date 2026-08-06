'use client';

/**
 * The organisation registration wizard.
 *
 * Skinned with the Lanternlight funnel theme (components/montree/funnel/funnel-theme) —
 * the same dark, ceremonial surface a principal meets at /montree/principal/register, so an
 * organisation leader and their principals recognise the same product.
 *
 * Two steps, four fields, and then ONE more screen before /montree/org: the login code.
 *
 * That third screen is not a formality. The code (migration 317) is shown exactly once — it is
 * plaintext in the registration response and nowhere else the director can reach — so the
 * wizard stops and makes them look at it, the same way the principal cockpit stops and makes a
 * principal look at a teacher's code before it disappears. A director who taps past it can
 * still sign in with their email and password, and the platform owner can reissue a code, so
 * this is a moment worth taking rather than a trap.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { FT, FUNNEL_CSS } from '@/components/montree/funnel/funnel-theme';
import type { InviteLanding } from '@/lib/montree/org/lookup-invite';

export default function OrgJoinWizard({ token, landing }: { token: string; landing: InviteLanding }) {
  const router = useRouter();
  const { t } = useI18n();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Set once registration succeeds. `''` means the account was created but no code came back
  // (migration 317 not run) — the done screen then simply omits the code panel.
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const [organizationName, setOrganizationName] = useState(landing.prefillName ?? '');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError(t('org.join.passwordMismatch')); return; }
    if (password.length < 8) { setError(t('org.join.passwordTooShort')); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/montree/org/register-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, organizationName, contactName, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('org.join.failed'));

      // The API already set the httpOnly session cookie. These mirror it into localStorage
      // the way the principal flow does, so a client-side dashboard render has the names it
      // needs without a second round trip.
      try {
        localStorage.setItem('montree_org', JSON.stringify(data.organization));
        localStorage.setItem('montree_org_admin', JSON.stringify(data.admin));
      } catch { /* private browsing — the cookie is still the real session */ }

      // Stop here rather than pushing to /montree/org — the code is in `data` and nowhere
      // else. See the note at the top of this file.
      setIssuedCode(typeof data.loginCode === 'string' ? data.loginCode : '');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('org.join.failed'));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!issuedCode) return;
    try {
      await navigator.clipboard.writeText(issuedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // In-app webviews (WeChat/WhatsApp) block writeText. The code is on screen in large
      // type — they can read it or select it by hand, so this is silent by design.
    }
  };

  // ── A link that will not work ──────────────────────────────────────────────────────────
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
            <h1 className="fn-h1" style={{ textAlign: 'center' }}>{t('org.join.deadLinkTitle')}</h1>
            <p style={{ color: FT.whisper, fontSize: '0.92rem', textAlign: 'center', marginTop: 14, lineHeight: 1.7 }}>
              {landing.message || t('org.join.deadLinkBody')}
            </p>
            {/* 🚨 The dead end used to be a genuine dead end. The most common reason a link
                does not work is that it ALREADY WORKED — the person redeemed it, closed the
                tab, and came back to the same link days later. inviteStatusMessage('used')
                already tells them "sign in instead"; this is the button that lets them. */}
            <div style={{ marginTop: 26, textAlign: 'center' }}>
              <Link href="/montree/org/login" className="fn-pill" style={{ display: 'inline-block' }}>
                {t('org.join.signInInstead')}
              </Link>
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link href="/montree" className="fn-login-link">{t('org.join.backToMontree')}</Link>
            </div>
          </div>
        </div>
        <div className="fn-foot">Montree · montree.xyz</div>
      </div>
    );
  }

  // ── Registered. The one screen where the login code exists ─────────────────────────────
  if (done) {
    return (
      <div className="fn-page">
        <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />
        <div className="fn-topbar">
          <a className="fn-wordmark" href="/montree"><span>{t('app.name')}</span></a>
          <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white border border-white/[0.08]" />
        </div>
        <div className="fn-stage-wrap" style={{ padding: '48px 20px 72px' }}>
          <div className="fn-screen center" style={{ maxWidth: 470 }}>
            <div className="fn-eyebrow" style={{ textAlign: 'center' }}>{t('org.join.eyebrow')}</div>
            <h1 className="fn-h1" style={{ textAlign: 'center' }}>
              {t('org.join.readyTitle', { name: organizationName })}
            </h1>

            {issuedCode ? (
              <>
                <p style={{ color: FT.whisper, fontSize: '0.92rem', textAlign: 'center', marginTop: 14, lineHeight: 1.7 }}>
                  {t('org.join.codeLead')}
                </p>
                <div
                  style={{
                    marginTop: 22,
                    padding: '22px 18px',
                    background: 'rgba(232,201,106,0.08)',
                    border: '1px solid rgba(232,201,106,0.18)',
                    borderRadius: 14,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 32,
                      fontWeight: 600,
                      color: '#f0d68a',
                      letterSpacing: 6,
                    }}
                  >
                    {issuedCode}
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyCode()}
                    className="fn-pill ghost"
                    style={{ marginTop: 16 }}
                  >
                    {copied ? t('org.join.codeCopied') : t('org.join.copyCode')}
                  </button>
                </div>
                <p style={{ color: FT.hush, fontSize: '0.8rem', textAlign: 'center', marginTop: 16, lineHeight: 1.7 }}>
                  {t('org.join.codeKeepSafe')}
                </p>
              </>
            ) : (
              <p style={{ color: FT.whisper, fontSize: '0.92rem', textAlign: 'center', marginTop: 14, lineHeight: 1.7 }}>
                {t('org.join.readyLead')}
              </p>
            )}

            <button
              type="button"
              onClick={() => router.push('/montree/org')}
              className="fn-pill block"
              style={{ marginTop: 26 }}
            >
              {t('org.join.enterDashboard')}
            </button>
          </div>
        </div>
        <div className="fn-foot">Montree · montree.xyz</div>
      </div>
    );
  }

  // ── The wizard ─────────────────────────────────────────────────────────────────────────
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
            <div className="fn-eyebrow" style={{ textAlign: 'center' }}>{t('org.join.eyebrow')}</div>
            <h1 className="fn-h1" style={{ textAlign: 'center' }}>
              {landing.prefillName
                ? t('org.join.welcomeNamed', { name: landing.prefillName })
                : t('org.join.welcome')}
            </h1>
            <p style={{ color: FT.whisper, fontSize: '0.9rem', textAlign: 'center', marginTop: 12, lineHeight: 1.7 }}>
              {t('org.join.subtitle')}
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
                  <label>{t('org.join.orgNameLabel')}</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder={t('org.join.orgNamePlaceholder')}
                    className="fn-input"
                    autoFocus
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('org.join.contactNameLabel')}</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={t('org.join.contactNamePlaceholder')}
                    className="fn-input"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!organizationName.trim() || !contactName.trim()}
                  className="fn-pill block"
                  style={{ marginTop: 6 }}
                >
                  {t('org.join.continue')}
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="fn-field">
                  <label>{t('org.join.emailLabel')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('org.join.emailPlaceholder')}
                    className="fn-input"
                    autoFocus
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('org.join.passwordLabel')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('org.join.passwordPlaceholder')}
                    className="fn-input"
                    required
                  />
                </div>

                <div className="fn-field">
                  <label>{t('org.join.confirmPasswordLabel')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('org.join.confirmPasswordPlaceholder')}
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
                    {t('org.join.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email || !password || !confirmPassword}
                    className="fn-pill"
                    style={{ flex: 1 }}
                  >
                    {loading ? t('org.join.creating') : t('org.join.createAccount')}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p style={{ color: FT.hush, fontSize: '0.8rem', textAlign: 'center', marginTop: 26, lineHeight: 1.7 }}>
            {t('org.join.nextStepsHint')}
          </p>
        </div>
      </div>

      <div className="fn-foot">Montree · montree.xyz</div>
    </div>
  );
}
