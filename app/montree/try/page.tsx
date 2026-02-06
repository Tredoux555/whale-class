'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TrialResponse {
  success: boolean;
  code: string;
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
  const [step, setStep] = useState<'role' | 'creating' | 'code'>('role');
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'principal' | null>(null);
  const [code, setCode] = useState('');
  const [responseData, setResponseData] = useState<TrialResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleRoleSelect = async (role: 'teacher' | 'principal') => {
    setSelectedRole(role);
    setStep('creating');
    setError('');

    try {
      const res = await fetch('/api/montree/try/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      const data: TrialResponse = await res.json();

      if (!res.ok || !data.success) {
        // Show full debug info from API response
        const debugInfo = (data as any).debug;
        const debugStr = debugInfo ? `\n\nDebug: ${JSON.stringify(debugInfo)}` : '';
        const stepsStr = (data as any).steps ? `\nSteps: ${(data as any).steps.join(' → ')}` : '';
        console.error('Trial API error:', JSON.stringify(data, null, 2));
        setError(((data as any).error || 'Something went wrong') + debugStr + stepsStr);
        setStep('role');
        setSelectedRole(null);
        return;
      }

      setCode(data.code);
      setResponseData(data);
      setStep('code');
    } catch (err) {
      setError('Failed to connect. Please try again.');
      setStep('role');
      setSelectedRole(null);
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
      // Match the exact session shape the teacher dashboard expects
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
      // Match the exact session shape the admin dashboard expects
      localStorage.setItem('montree_principal', JSON.stringify(responseData.principal));
      localStorage.setItem('montree_school', JSON.stringify(responseData.school));
      router.push('/montree/principal/setup');
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    if (step === 'creating' || step === 'code') {
      // Can't go back from creating/code since account is already created
      e.preventDefault();
      return;
    }
    // Step 1 goes back to /montree
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <a
          href="/montree"
          onClick={handleBackClick}
          className={`inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors ${
            step !== 'role' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          <span>←</span> Back
        </a>

        {/* Step 1: Role Selection */}
        {step === 'role' && (
          <div className="text-center">
            <h1 className="text-3xl font-light text-white mb-10">
              I&apos;m a...
            </h1>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleRoleSelect('teacher')}
                className="w-full px-6 py-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] transition-all text-left"
              >
                <span className="text-lg block">👩‍🏫 Teacher</span>
                <span className="text-sm text-blue-100/70 font-normal mt-1 block">I want to try Montree in my classroom</span>
              </button>

              <button
                onClick={() => handleRoleSelect('principal')}
                className="w-full px-6 py-5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-[1.02] transition-all text-left"
              >
                <span className="text-lg block">👔 Principal / School Owner</span>
                <span className="text-sm text-purple-100/70 font-normal mt-1 block">I want to set up Montree for my school</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Creating (Loading) */}
        {step === 'creating' && (
          <div className="text-center py-16">
            <div className="mb-8 flex justify-center">
              <div className="w-16 h-16 bg-emerald-500/30 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-12 h-12 bg-emerald-500/50 rounded-full animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-white mb-3">
              Setting up your trial...
            </h2>

            <p className="text-slate-400">
              Just a moment
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
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Code Reveal */}
        {step === 'code' && responseData && (
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
                <span className="text-3xl">✨</span>
              </div>

              <h2 className="text-2xl font-semibold text-white mb-2">
                This is your login code
              </h2>

              <p className="text-slate-400 text-sm">
                Save it somewhere safe — you&apos;ll use it to get back in
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
              {copied ? '✓ Copied!' : 'Copy code'}
            </button>

            {/* Take me in button */}
            <button
              onClick={handleTakeMeIn}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              Take me in →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
