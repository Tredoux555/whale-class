'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

export default function SetPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('montree_session');
    if (!stored) {
      router.push('/montree/login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setSession(parsed);
      
      // Check if password already set
      if (parsed.teacher?.password_set) {
        router.push('/montree/dashboard');
        return;
      }
      setChecking(false);
    } catch {
      router.push('/montree/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error(t('validation.passwordMinLength' as TranslationKey));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('validation.passwordsDoNotMatch' as TranslationKey));
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
          email: email || null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to set password');
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.success) {
        // Update session
        const updatedSession = {
          ...session,
          teacher: { ...session.teacher, password_set: true, email: email || session.teacher.email }
        };
        localStorage.setItem('montree_session', JSON.stringify(updatedSession));

        toast.success(t('validation.passwordSetSuccess' as TranslationKey));
        setTimeout(() => router.push('/montree/dashboard'), 1000);
      } else {
        toast.error(data.error || t('validation.failedToSetPassword' as TranslationKey));
      }
    } catch (err) {
      toast.error(t('validation.somethingWentWrong' as TranslationKey));
    }
    setLoading(false);
  };

  const handleSkip = () => {
    router.push('/montree/dashboard');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-5xl">🔐</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Toaster position="top-center" richColors />
      
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800">{t('setPassword.title' as TranslationKey)}</h1>
          <p className="text-gray-500 mt-2">
            {t('setPassword.greeting' as TranslationKey, { name: session?.teacher?.name })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('setPassword.emailLabel' as TranslationKey)}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">{t('setPassword.emailHint' as TranslationKey)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('setPassword.passwordLabel' as TranslationKey)}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('setPassword.confirmPasswordLabel' as TranslationKey)}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-xl font-bold
              shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {loading ? t('setPassword.setting' as TranslationKey) : t('setPassword.button' as TranslationKey)}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-gray-500 py-2 hover:text-gray-700"
          >
            {t('setPassword.skipButton' as TranslationKey)}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t('setPassword.settingsHint' as TranslationKey)}
        </p>
      </div>
    </div>
  );
}
