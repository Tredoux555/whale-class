// /montree/principal/login/page.tsx
// Code-based login for principals (matches teacher login pattern)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';

export default function PrincipalLoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const normalizedCode = code.trim().toUpperCase();

    try {
      const res = await fetch('/api/montree/principal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || t('auth.invalidCode'));
      }

      // Store session
      localStorage.setItem('montree_principal', JSON.stringify(data.principal));
      localStorage.setItem('montree_school', JSON.stringify(data.school));

      // Redirect to setup if school has no classrooms, else admin
      if (data.needsSetup) {
        router.push('/montree/principal/setup');
      } else {
        router.push('/montree/admin');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Language toggle — top right */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-6">
            <span className="text-4xl">🏫</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('app.name')}</h1>
          <p className="text-emerald-300/70">{t('auth.principalLoginTitle')}</p>
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
                placeholder="ABC123"
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-white/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                required
                autoFocus
                maxLength={6}
              />
              <p className="text-white/40 text-xs text-center mt-2">
                {t('auth.principalCode')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {t('auth.signingIn')}
                </span>
              ) : (
                t('auth.signIn')
              )}
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-8 text-center space-y-3">
          <Link href="/montree/login" className="text-white/50 hover:text-white/70 text-sm block">
            {t('auth.teacherLoginLink')}
          </Link>
          <Link href="/montree/try" className="text-emerald-400/50 hover:text-emerald-400/70 text-sm block">
            {t('auth.noCode')}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-slate-500 text-xs">
          🌳 {t('app.name')} • montree.xyz
        </p>
      </div>
    </div>
  );
}
