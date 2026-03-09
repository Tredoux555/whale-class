'use client';

// /montree/login-select/page.tsx — Unified login: one code for everyone
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';

function UnifiedLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const redirectTo = searchParams.get('redirect');
  const qrCode = searchParams.get('code'); // QR code deep link support
  const [code, setCode] = useState(qrCode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const autoSubmitDone = useRef(false);

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
        localStorage.setItem('montree_parent_session', JSON.stringify({
          childId: data.child.id,
          childName: data.child.name,
          expires: Date.now() + (30 * 24 * 60 * 60 * 1000),
        }));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-2xl shadow-emerald-500/30 mb-4">
            <span className="text-4xl">🌳</span>
          </div>
          <h1 className="text-3xl font-light text-white mb-1">
            {t('app.name')}
          </h1>
          <p className="text-emerald-300/60 text-sm">
            {t('auth.unifiedSubtitle') || 'Enter your code to continue'}
          </p>
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
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 10))}
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
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center left-0 right-0">
        <p className="text-slate-500 text-xs">🌳 Montree • montree.xyz</p>
      </div>
    </div>
  );
}

export default function LoginSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    }>
      <UnifiedLoginContent />
    </Suspense>
  );
}
