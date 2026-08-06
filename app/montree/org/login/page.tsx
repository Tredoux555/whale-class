'use client';

/**
 * /montree/org/login — the organisation leader's door.
 *
 * TWO MODES, and the order matters. The CODE box is primary and is what the page opens on,
 * because that is the shape of every other front door in Montree: a teacher types a code, a
 * principal types a code, a parent types a code. A director now gets one too (migration 317),
 * and this page should feel like login-select — same Lanternlight card, same logo, same
 * footer, same big monospace code field.
 *
 * Email + password is the second mode, one tap away, and it is NOT a legacy path: every
 * director chose those credentials when they redeemed their invite link, every director who
 * registered before migration 317 has no code at all, and a director who loses their code
 * signs in this way while the platform owner reissues one. Both modes post to the same
 * endpoint, which decides on the shape of the body.
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

  // 'code' is the landing mode — see the note above.
  const [mode, setMode] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
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
        body: JSON.stringify(
          mode === 'code' ? { code: code.trim() } : { email, password },
        ),
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
          <p style={{ color: 'rgba(232,201,106,0.6)', fontSize: '0.85rem' }}>
            {mode === 'code' ? t('org.login.codeSubtitle') : t('org.login.subtitle')}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', marginTop: 4 }}>montree.xyz</p>
        </div>

        <div className="fn-login-card">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div className="fn-error" style={{ marginTop: 0, textAlign: 'center' }}>{error}</div>
            )}

            {mode === 'code' ? (
              // The same big monospace field as /montree/login-select, deliberately — a
              // director's code is the same kind of thing as their teachers' codes.
              <input
                type="text"
                className="fn-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                required
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            ) : (
              <>
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
              </>
            )}

            <button
              type="submit"
              className="fn-pill block"
              disabled={
                loading ||
                (mode === 'code' ? code.trim().length < 6 : !email || !password)
              }
            >
              {loading ? t('org.login.signingIn') : t('org.login.signIn')}
            </button>
          </form>
        </div>

        <p className="fn-login-hint">
          {mode === 'code' ? t('org.login.codeHint') : t('org.login.hint')}
        </p>

        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Switching modes clears the error so a failed code attempt does not sit over the
              password form telling the director something that is no longer true. */}
          <button
            type="button"
            className="fn-login-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => { setMode(mode === 'code' ? 'password' : 'code'); setError(''); }}
          >
            {mode === 'code' ? t('org.login.usePassword') : t('org.login.useCode')}
          </button>
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
