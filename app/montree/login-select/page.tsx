'use client';

// /montree/login-select/page.tsx — Unified login: one code for everyone
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { getSession, recoverSession } from '@/lib/montree/auth';
import LanguageToggle from '@/components/montree/LanguageToggle';
import MontreeLogo from '@/components/montree/MonteeLogo';
import { FUNNEL_CSS } from '@/components/montree/funnel/funnel-theme';

// Render **bold** markers in the quiet Astra hint line.
function renderHint(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <b key={i}>{part.slice(2, -2)}</b>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function UnifiedLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const redirectTo = searchParams.get('redirect');
  const qrCode = searchParams.get('code'); // QR code deep link support
  const isSignup = searchParams.get('signup') === 'true';
  const [code, setCode] = useState(qrCode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const autoSubmitDone = useRef(false);
  const recoveryDone = useRef(false);

  // On mount: if already logged in (localStorage or cookie), skip login page
  // BUT if a code param is present (parent invite link), don't auto-redirect —
  // let the code submission handle the correct redirect for the parent role
  useEffect(() => {
    if (recoveryDone.current) return;
    recoveryDone.current = true;

    // If a code is provided (parent invite / QR link), always process it fresh
    // Don't redirect to teacher dashboard just because a teacher session exists
    if (qrCode) return;

    // Signup flow — send new visitors directly to self-serve trial
    if (isSignup) {
      router.replace('/montree/try');
      return;
    }

    const sess = getSession();
    if (sess) {
      router.replace(redirectTo || '/montree/dashboard');
      return;
    }

    // Try cookie-based session recovery (e.g., PWA relaunch cleared localStorage)
    recoverSession().then(recovered => {
      if (recovered) {
        router.replace(redirectTo || '/montree/dashboard');
      }
    });
  }, [router, redirectTo, qrCode, isSignup]);

  // Auto-submit if code came from QR URL param
  useEffect(() => {
    if (qrCode && qrCode.length >= 4 && !autoSubmitDone.current) {
      autoSubmitDone.current = true;
      submitCode(qrCode);
    }
  }, [qrCode]);

  const submitCode = async (codeToSubmit: string) => {
    if (codeToSubmit.trim().length < 4) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/auth/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToSubmit.trim() }),
      });

      const data = await res.json();

      // Phase 2: pending referral code → bounce to signup with the code carried
      // over. Distinct from a normal auth failure (which is 401 + an error toast).
      if (res.status === 409 && data?.pendingReferral && data?.redirectTo) {
        router.replace(data.redirectTo);
        return;
      }

      // Abuse lock — the code was valid but the school is locked. Bounce to the
      // locked screen where they can message Tredoux. Same pattern as the 409
      // pending-referral redirect above (server-supplied redirectTo).
      if (res.status === 403 && data?.locked && data?.redirectTo) {
        router.replace(data.redirectTo);
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.error || t('auth.invalidCode'));
        setLoading(false);
        return;
      }

      // Store session based on role
      if (data.role === 'teacher' || data.role === 'homeschool_parent') {
        localStorage.setItem('montree_session', JSON.stringify({
          teacher: data.teacher,
          school: data.school,
          classroom: data.classroom,
          loginAt: new Date().toISOString(),
          onboarded: data.onboarded || false,
        }));
      } else if (data.role === 'principal') {
        localStorage.setItem('montree_principal', JSON.stringify(data.principal));
        localStorage.setItem('montree_school', JSON.stringify(data.school));
      } else if (data.role === 'parent') {
        // 🚨 Session 113 V2 Parent audit F-1.3 — DO NOT write a forgeable
        // localStorage('montree_parent_session') auth blob. The httpOnly
        // cookie set by the server is the only authority. We do still
        // write 'montree_selected_child' as a NON-AUTH cross-page hint
        // (which child to show in multi-child families); server validates
        // every access via the cookie regardless.
        if (data.child) {
          localStorage.setItem('montree_selected_child', JSON.stringify({
            id: data.child.id,
            name: data.child.name,
          }));
        }
      }

      // Redirect
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push(data.redirect);
      }
    } catch {
      setError(t('common.connectionError'));
      setLoading(false);
    }
  };

  return (
    <div className="fn-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />

      {/* Language toggle — respects safe area for notch */}
      <div className="absolute right-4 z-10" style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}>
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white" />
      </div>

      <div style={{ position: 'relative', zIndex: 4, width: '100%', maxWidth: 380 }}>
        {/* Logo — canonical Montree M monogram */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 16 }}>
            <MontreeLogo size={72} />
          </div>
          <h1 className="fn-h1" style={{ fontSize: '2rem', marginBottom: 4 }}>
            {t('app.name')}
          </h1>
          <p style={{ color: 'rgba(232,201,106,0.6)', fontSize: '0.85rem' }}>
            {t('auth.unifiedSubtitle') || 'Enter your code to continue'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', marginTop: 4 }}>montree.xyz</p>
        </div>

        {/* Login card */}
        <div className="fn-login-card">
          <form onSubmit={(e) => { e.preventDefault(); submitCode(code); }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && (
              <div className="fn-error" style={{ marginTop: 0, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <input
              type="text"
              className="fn-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 32))}
              placeholder="ABC123"
              required
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
            />

            <button
              type="submit"
              className="fn-pill block"
              disabled={loading || code.trim().length < 4}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block', animation: 'fnSpin 0.7s linear infinite',
                  }} />
                  {t('auth.loggingIn')}
                </span>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>
        </div>

        {/* Quiet Astra hint line — the single line of narration on this screen
            (returning users don't need the full narrator). */}
        <p className="fn-login-hint">{renderHint(t('copilot.funnel.say.login'))}</p>

        {/* Help links */}
        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/montree/try" className="fn-login-link">
            {t('auth.noCode')}
          </a>
          <a href="/pricing" className="fn-login-link muted">
            {t('auth.seePricing')}
          </a>
        </div>
      </div>

      {/* Footer — respects safe area on iPhones */}
      <div className="absolute text-center left-0 right-0" style={{ bottom: 'max(24px, env(safe-area-inset-bottom, 24px))', zIndex: 4 }}>
        <p style={{ color: 'rgba(255,250,240,0.25)', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <MontreeLogo size={12} />
          <span>Montree • montree.xyz</span>
        </p>
      </div>
    </div>
  );
}

export default function LoginSelectPage() {
  return (
    <Suspense fallback={
      <div className="fn-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />
        <div style={{
          width: 32, height: 32, border: '2px solid rgba(52,211,153,0.3)',
          borderTopColor: '#34d399', borderRadius: '50%', animation: 'fnSpin 0.7s linear infinite',
        }} />
      </div>
    }>
      <UnifiedLoginContent />
    </Suspense>
  );
}
