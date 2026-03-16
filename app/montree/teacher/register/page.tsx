// /montree/teacher/register/page.tsx
// Session: Personal Classroom - Teacher registration for individual teachers
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

export default function TeacherRegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError(t('validation.passwordsDoNotMatch' as TranslationKey));
      return;
    }

    if (password.length < 6) {
      setError(t('validation.passwordMinLength' as TranslationKey));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/teacher/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName,
          schoolName,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('validation.registrationFailed' as TranslationKey));
      }

      // Store session
      localStorage.setItem('montree_teacher_trial', JSON.stringify(data.teacher));
      localStorage.setItem('montree_school', JSON.stringify(data.school));

      // Redirect to teacher dashboard
      router.push('/montree/teacher');

    } catch (err) {
      setError(err instanceof Error ? err.message : t('validation.registrationFailed' as TranslationKey));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Progress */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-6">
            <span className="text-4xl">🌱</span>
          </div>
          <h1 className="text-3xl font-light text-white mb-2">
            {t('register.welcomeTo' as TranslationKey)} <span className="font-semibold">Montree</span>
          </h1>
          <p className="text-emerald-300/70 text-sm">
            {t('register.startTrial' as TranslationKey)}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-emerald-400' : 'bg-white/20'}`} />
          </div>
        </div>

        <form onSubmit={handleRegister}>
          {/* Step 1: Teacher Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">{t('register.yourName' as TranslationKey)}</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder={t('register.namePlaceholder' as TranslationKey)}
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">{t('register.schoolName' as TranslationKey)}</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder={t('register.schoolPlaceholder' as TranslationKey)}
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
                <p className="mt-2 text-emerald-400/60 text-xs">
                  {t('register.schoolNameHint' as TranslationKey)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!teacherName.trim() || !schoolName.trim()}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
              >
                {t('common.continue' as TranslationKey)} →
              </button>
            </div>
          )}

          {/* Step 2: Account Credentials */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">{t('register.email' as TranslationKey)}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('register.emailPlaceholder' as TranslationKey)}
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">{t('register.createPassword' as TranslationKey)}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('register.passwordPlaceholder' as TranslationKey)}
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">{t('register.confirmPassword' as TranslationKey)}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
                >
                  ← {t('common.back' as TranslationKey)}
                </button>
                <button
                  type="submit"
                  disabled={loading || !email || !password || !confirmPassword}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? t('register.creating' as TranslationKey) : t('register.createAccount' as TranslationKey)}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Trial Info Banner */}
        <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <p className="text-emerald-300 text-sm text-center">
            ✨ <span className="font-semibold">{t('register.trialDuration' as TranslationKey)}</span> • {t('register.trialStudentLimit' as TranslationKey)}
          </p>
          <p className="text-emerald-300/60 text-xs text-center mt-2">
            {t('register.trialConvince' as TranslationKey)}
          </p>
        </div>

        {/* Links */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-white/50 text-sm">
            {t('register.registerSchool' as TranslationKey)}{' '}
            <Link href="/montree/principal/register" className="text-emerald-400 hover:text-emerald-300 font-semibold">
              {t('register.registerAsPrincipal' as TranslationKey)}
            </Link>
          </p>
          <p className="text-white/50 text-sm">
            {t('register.alreadyHaveAccount' as TranslationKey)}{' '}
            <Link href="/montree/teacher/login" className="text-emerald-400 hover:text-emerald-300">
              {t('register.signIn' as TranslationKey)}
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-slate-500 text-xs">
          🌳 Montree • montree.xyz
        </p>
      </div>
    </div>
  );
}
