'use client';

// /montree/login-select/page.tsx — Unified login: one code for everyone
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { getSession, recoverSession } from '@/lib/montree/auth';
import LanguageToggle from '@/components/montree/LanguageToggle';
import MontreeLogo from '@/components/montree/MonteeLogo';

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
    <div className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#06140e' }}>
      {/* Background gradient — matches landing page */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
          radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
          linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
        `,
      }} />

      {/* Language toggle — respects safe area for notch */}
      <div className="absolute right-4 z-10" style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}>
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo — canonical Montree M monogram per Session 113 V2 brand work */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <MontreeLogo size={80} />
          </div>
          <h1 className="text-3xl font-light text-white mb-1">
            {t('app.name')}
          </h1>
          <p className="text-emerald-300/60 text-sm">
            {t('auth.unifiedSubtitle') || 'Enter your code to continue'}
          </p>
          <p className="text-white/20 text-xs mt-1">montree.xyz</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          <form onSubmit={(e) => { e.preventDefault(); submitCode(code); }} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 32))}
                placeholder="ABC123"
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl font-mono tracking-[0.3em] placeholder-white/20 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                required
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length < 4}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 transition-all text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('auth.loggingIn')}
                </span>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>
        </div>

        {/* Help text */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-white/30 text-xs leading-relaxed">
            {t('auth.unifiedHint') || 'Teachers, principals, and parents — all use the same code you were given.'}
          </p>
          <a
            href="/montree/try"
            className="text-emerald-400/50 hover:text-emerald-400/70 text-sm inline-block"
          >
            {t('auth.noCode')}
          </a>
          <div>
            <a
              href="/pricing"
              className="text-white/30 hover:text-white/50 text-xs inline-block transition-colors"
            >
              See pricing →
            </a>
          </div>
        </div>
      </div>

      {/* Footer — respects safe area on iPhones */}
      <div className="absolute text-center left-0 right-0" style={{ bottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
        <p className="text-slate-500 text-xs inline-flex items-center justify-center gap-1.5">
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
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#06140e' }}>
        <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    }>
      <UnifiedLoginContent />
    </Suspense>
  );
}
