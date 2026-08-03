'use client';

/**
 * /montree/org/login — the organisation leader's door.
 *
 * The unified login at /montree/login-select is a CODE box: teachers, principals and
 * parents all type a short code into one field. An organisation leader has no code — they
 * chose an email and a password when they redeemed their invite link — so they get this
 * page instead, skinned exactly like login-select (same Lanternlight card, same logo, same
 * footer) so it is recognisably the same product's front door.
 *
 * Bookmarkable and self-sufficient: this is the URL an org leader returns to for the rest
 * of the relationship, and /montree/org sends anyone without a session straight here.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { FUNNEL_CSS } from '@/components/montree/funnel/funnel-theme';

export default function OrgLoginPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/montree/org/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('org.login.failed'));

      try {
        localStorage.setItem('montree_org', JSON.stringify(data.organization));
        localStorage.setItem('montree_org_admin', JSON.stringify(data.admin));
      } catch { /* private browsing — the httpOnly cookie is the real session */ }

      router.push(data.redirect || '/montree/org');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('org.login.failed'));
      setLoading(false);
    }
  };

  return (
    <div className="fn-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />

      <div className="absolute right-4 z-10" style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}>
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white border border-white/[0.08]" />
      </div>

      <div style={{ position: 'relative', zIndex: 4, width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 16 }}>
            <MontreeLogo size={40} />
          </div>
          <h1 className="fn-h1" style={{ fontSize: '2rem', marginBottom: 4 }}>{t('app.name')}</h1>
          <p style={{ color: 'rgba(232,201,106,0.6)', fontSize: '0.85rem' }}>{t('org.login.subtitle')}</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', marginTop: 4 }}>montree.xyz</p>
        </div>

        <div className="fn-login-card">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div className="fn-error" style={{ marginTop: 0, textAlign: 'center' }}>{error}</div>
            )}

            <div className="fn-field" style={{ marginBottom: 0 }}>
              <label>{t('org.login.emailLabel')}</label>
              <input
                type="email"
                className="fn-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('org.login.emailPlaceholder')}
                required
                autoFocus
                autoComplete="email"
                spellCheck={false}
              />
            </div>

            <div className="fn-field" style={{ marginBottom: 0 }}>
              <label>{t('org.login.passwordLabel')}</label>
              <input
                type="password"
                className="fn-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('org.login.passwordPlaceholder')}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="fn-pill block" disabled={loading || !email || !password}>
              {loading ? t('org.login.signingIn') : t('org.login.signIn')}
            </button>
          </form>
        </div>

        <p className="fn-login-hint">{t('org.login.hint')}</p>

        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/montree/login-select" className="fn-login-link">{t('org.login.notAnOrg')}</a>
        </div>
      </div>

      <div className="absolute text-center left-0 right-0" style={{ bottom: 'max(24px, env(safe-area-inset-bottom, 24px))', zIndex: 4 }}>
        <p style={{ color: 'rgba(255,250,240,0.25)', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <MontreeLogo size={12} />
          <span>Montree • montree.xyz</span>
        </p>
      </div>
    </div>
  );
}
