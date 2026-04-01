// /montree/setup/page.tsx
// Teacher Account Setup - Create username/password after first code login
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

export default function TeacherSetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('montree_session');
    if (!stored) {
      router.push('/montree/login');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      // If password already set, skip to onboarding or dashboard
      if (parsed.teacher?.password_set_at) {
        if (parsed.onboarded) {
          router.push('/montree/dashboard');
        } else {
          router.push('/montree/onboarding');
        }
        return;
      }
      setSession(parsed);
      // Pre-fill username with teacher name (no spaces)
      if (parsed.teacher?.name) {
        setUsername(parsed.teacher.name.replace(/\s+/g, ''));
      }
    } catch {
      router.push('/montree/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!username.trim()) {
      setError(t('setup.validation.enterUsername' as TranslationKey));
      return;
    }
    if (username.length < 3) {
      setError(t('setup.validation.usernameMinLength' as TranslationKey));
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError(t('setup.validation.usernameChars' as TranslationKey));
      return;
    }
    if (!password) {
      setError(t('setup.validation.enterPassword' as TranslationKey));
      return;
    }
    if (password.length < 6) {
      setError(t('setup.validation.passwordMinLength' as TranslationKey));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('setup.validation.passwordsDoNotMatch' as TranslationKey));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/montree/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: session.teacher.id,
          password,
          email: username, // Store username in email field for login
        }),
      });

      if (!res.ok) {
        setError(t('setup.validation.connectionError'));
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.success) {
        // Update local session
        const updatedSession = {
          ...session,
          teacher: {
            ...session.teacher,
            password_set_at: new Date().toISOString(),
            email: username,
          },
        };
        localStorage.setItem('montree_session', JSON.stringify(updatedSession));

        // Redirect to onboarding
        router.push('/montree/onboarding');
      } else {
        setError(data.error || t('setup.validation.setupFailed' as TranslationKey));
      }
    } catch (err) {
      setError(t('setup.validation.connectionError' as TranslationKey));
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="animate-bounce text-4xl">🌳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/20 mb-4">
            <span className="text-4xl">🌳</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t('setup.welcomeTitle' as TranslationKey)}</h1>
          <p className="text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">
            {t('setup.welcomeSubtitle' as TranslationKey)}
          </p>
        </div>

        {/* Setup Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Friendly intro */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
              <p className="text-emerald-700 text-sm">
                <strong>{t('setup.introTitle' as TranslationKey)}</strong> ✨ {t('setup.introMessage' as TranslationKey)}
              </p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('setup.chooseUsername' as TranslationKey)}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder={t('setup.usernamePlaceholder' as TranslationKey)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:bg-white outline-none transition-colors"
                required
                autoFocus
              />
              <p className="text-slate-400 text-xs mt-1">
                {t('setup.usernameHint' as TranslationKey)}
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('setup.createPassword' as TranslationKey)}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('setup.passwordPlaceholder' as TranslationKey)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:bg-white outline-none transition-colors"
                required
                minLength={6}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('setup.confirmPassword' as TranslationKey)}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('setup.confirmPasswordPlaceholder' as TranslationKey)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:bg-white outline-none transition-colors"
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{t('setup.passwordsMismatch' as TranslationKey)}</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-green-500 text-xs mt-1">✓ {t('setup.passwordsMatch' as TranslationKey)}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password || password !== confirmPassword}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {t('setup.settingUp' as TranslationKey)}
                </span>
              ) : (
                t('setup.letsGo' as TranslationKey)
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-slate-400 text-xs mt-6">
          {session.classroom?.name} • {session.school?.name}
        </p>
      </div>
    </div>
  );
}
