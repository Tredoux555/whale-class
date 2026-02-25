'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';

export default function TeacherLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const redirectTo = searchParams.get('redirect');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const normalizedCode = code.trim().toUpperCase();

    // Try teacher login first, then homeschool parent
    try {
      const res = await fetch('/api/montree/auth/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const data = await res.json();

      if (data.success) {
        // Auth cookie (montree-auth) is set by the server response
        // Works for both teachers and homeschool parents (both in montree_teachers table)
        localStorage.setItem('montree_session', JSON.stringify({
          teacher: data.teacher,
          school: data.school,
          classroom: data.classroom,
          loginAt: new Date().toISOString(),
          onboarded: data.onboarded || false,
        }));

        // Redirect: use return URL if provided, otherwise default flow
        if (redirectTo) {
          router.push(redirectTo);
        } else if (!data.onboarded) {
          router.push('/montree/onboarding');
        } else {
          router.push('/montree/dashboard');
        }
        return;
      }

      setError(t('auth.invalidCode'));
    } catch (err) {
      setError(t('common.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
      {/* Language toggle — top right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white" />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
            <span className="text-4xl">🌳</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{t('app.name')}</h1>
          <p className="text-emerald-300/70">{t('auth.login')}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2 text-center">
                {t('auth.enterCode')}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 6))}
                placeholder="abc123"
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-white/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                required
                autoFocus
                maxLength={6}
              />
              <p className="text-white/40 text-xs text-center mt-2">
                {t('auth.enterCodeHint')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {t('auth.loggingIn')}
                </span>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>
        </div>

        {/* Help links */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-white/40 text-xs">
            {t('auth.enterCodeHint')}
          </p>
          <a
            href="/montree/principal/login"
            className="text-white/50 hover:text-white/70 text-sm block"
          >
            {t('auth.principalLoginLink')}
          </a>
          <a
            href="/montree/try"
            className="text-emerald-400/50 hover:text-emerald-400/70 text-sm block"
          >
            {t('auth.noCode')}
          </a>
        </div>
      </div>
    </div>
  );
}
