'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';

interface TrialResponse {
  success: boolean;
  code: string;
  token?: string;
  role: 'teacher' | 'principal';
  error?: string;
  teacher?: {
    id: string;
    name: string;
    email: string | null;
    password_set_at: string | null;
  };
  classroom?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  school?: {
    id: string;
    name: string;
    slug: string;
    subscription_status?: string;
    plan_type?: string;
    trial_ends_at?: string;
  };
  principal?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onboarded?: boolean;
  userId: string;
}

export default function TryMontreePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<'role' | 'details' | 'creating' | 'code'>('role');
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'principal' | null>(null);
  const [userName, setUserName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [code, setCode] = useState('');
  const [responseData, setResponseData] = useState<TrialResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleRoleSelect = (role: 'teacher' | 'principal') => {
    setSelectedRole(role);
    setStep('details');
    setError('');
  };

  const handleDetailsSubmit = async () => {
    if (!userName.trim()) {
      setError(t('signup.pleaseEnterName'));
      return;
    }
    if (!schoolName.trim()) {
      setError(selectedRole === 'principal' ? t('signup.pleaseEnterSchool') : t('signup.pleaseEnterSchoolClassroom'));
      return;
    }

    setStep('creating');
    setError('');

    try {
      const res = await fetch('/api/montree/try/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          name: userName.trim(),
          schoolName: schoolName.trim(),
          email: userEmail.trim(),
        })
      });

      const data: TrialResponse = await res.json();

      if (!res.ok || !data.success) {
        const debugInfo = (data as any).debug;
        const debugStr = debugInfo ? `\n\nDebug: ${JSON.stringify(debugInfo)}` : '';
        const stepsStr = (data as any).steps ? `\nSteps: ${(data as any).steps.join(' → ')}` : '';
        console.error('Trial API error:', JSON.stringify(data, null, 2));
        setError(((data as any).error || 'Something went wrong') + debugStr + stepsStr);
        setStep('details');
        return;
      }

      setCode(data.code);
      setResponseData(data);
      setStep('code');
    } catch (err) {
      setError(t('signup.failed'));
      setStep('details');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTakeMeIn = () => {
    if (!responseData) return;

    if (responseData.role === 'teacher' && responseData.teacher) {
      localStorage.setItem(
        'montree_session',
        JSON.stringify({
          teacher: {
            id: responseData.teacher.id,
            name: responseData.teacher.name,
            role: 'teacher',
            email: responseData.teacher.email,
            password_set: !!responseData.teacher.password_set_at,
          },
          school: responseData.school,
          classroom: responseData.classroom || null,
          loginAt: new Date().toISOString(),
          onboarded: responseData.onboarded || false,
        })
      );
      router.push('/montree/dashboard');
    } else if (responseData.role === 'principal' && responseData.principal) {
      localStorage.setItem('montree_principal', JSON.stringify(responseData.principal));
      localStorage.setItem('montree_school', JSON.stringify(responseData.school));
      router.push('/montree/principal/setup');
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    if (step === 'creating' || step === 'code') {
      e.preventDefault();
      return;
    }
    if (step === 'details') {
      e.preventDefault();
      setStep('role');
      setSelectedRole(null);
      setError('');
      return;
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

      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <a
          href="/montree"
          onClick={handleBackClick}
          className={`inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors ${
            step === 'creating' || step === 'code' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          <span>←</span> {t('common.back')}
        </a>

        {/* Step 1: Role Selection */}
        {step === 'role' && (
          <div className="text-center">
            <h1 className="text-3xl font-light text-white mb-10">
              {t('signup.iAmA')}
            </h1>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleRoleSelect('teacher')}
                className="w-full px-6 py-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] transition-all text-left"
              >
                <span className="text-lg block">👩‍🏫 {t('signup.teacher')}</span>
                <span className="text-sm text-blue-100/70 font-normal mt-1 block">{t('signup.teacherDesc')}</span>
              </button>

              <button
                onClick={() => handleRoleSelect('principal')}
                className="w-full px-6 py-5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-[1.02] transition-all text-left"
              >
                <span className="text-lg block">👔 {t('signup.principal')}</span>
                <span className="text-sm text-purple-100/70 font-normal mt-1 block">{t('signup.principalDesc')}</span>
              </button>

            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && selectedRole && (
          <div className="text-center">
            <h1 className="text-3xl font-light text-white mb-2">
              {t('signup.quickDetails')}
            </h1>
            <p className="text-slate-400 text-sm mb-8">
              {t('signup.soWeKnow')}
            </p>

            <div className="flex flex-col gap-4 text-left">
              <div>
                <label className="block text-sm mb-2 text-emerald-300/70">{t('signup.yourName')}</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={selectedRole === 'principal' ? t('signup.namePlaceholder.principal') : t('signup.namePlaceholder.teacher')}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-emerald-300/70">
                  {selectedRole === 'principal' ? t('signup.schoolName') : t('signup.schoolClassroomName')}
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder={selectedRole === 'principal' ? t('signup.schoolPlaceholder.principal') : t('signup.schoolPlaceholder.teacher')}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
                  onKeyDown={(e) => e.key === 'Enter' && handleDetailsSubmit()}
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-emerald-300/70">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. sarah@school.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
                />
                <p className="text-xs text-slate-400 mt-1">So we can help you get started and recover your code</p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                onClick={handleDetailsSubmit}
                className="w-full mt-2 py-4 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30"
              >
                {t('signup.getMyCode')}
              </button>

              <button
                onClick={() => {
                  setStep('role');
                  setSelectedRole(null);
                  setError('');
                }}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                {t('signup.backToRoles')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Creating (Loading) */}
        {step === 'creating' && (
          <div className="text-center py-16">
            <div className="mb-8 flex justify-center">
              <div className="w-16 h-16 bg-emerald-500/30 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-12 h-12 bg-emerald-500/50 rounded-full animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-white mb-3">
              {t('signup.settingUp')}
            </h2>

            <p className="text-slate-400">
              {t('signup.justAMoment')}
            </p>

            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl max-w-lg mx-auto">
                <pre className="text-red-400 text-xs whitespace-pre-wrap break-all font-mono">{error}</pre>
                <button
                  onClick={() => {
                    setError('');
                    setStep('role');
                    setSelectedRole(null);
                  }}
                  className="mt-3 text-red-300 hover:text-red-200 text-sm underline"
                >
                  {t('common.tryAgain')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Code Reveal */}
        {step === 'code' && responseData && (
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
                <span className="text-3xl">✨</span>
              </div>

              <h2 className="text-2xl font-semibold text-white mb-2">
                {t('signup.thisIsYourCode')}
              </h2>

              <p className="text-slate-400 text-sm">
                {t('signup.saveItSafe')}
              </p>
            </div>

            {/* Code Display */}
            <div className="mb-8 p-8 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl">
              <div className="font-mono text-5xl font-bold text-emerald-300 tracking-wider">
                {code.toUpperCase()}
              </div>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopyCode}
              className="w-full mb-4 px-4 py-3 bg-slate-800/60 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700/60 hover:border-slate-600 transition-all text-sm font-medium"
            >
              {copied ? t('signup.copied') : t('signup.copyCode')}
            </button>

            {/* Take me in button */}
            <button
              onClick={handleTakeMeIn}
              className="w-full py-4 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30"
            >
              {t('signup.takeMeIn')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
