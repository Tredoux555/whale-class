'use client';

// /home/register/page.tsx
// Registration page for Montree Home — code-based, no passwords
// Same flow as /home but at the /register URL people are already hitting

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setHomeSession } from '@/lib/home/auth';

export default function HomeRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [parentName, setParentName] = useState('');

  const handleStartFree = async () => {
    if (loading) return;
    if (!parentName.trim()) {
      setError('Please enter your name so we know who you are');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/home/auth/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: parentName.trim() }),
      });
      const data = await res.json();

      if (data.success && data.code) {
        setCode(data.code);

        // Auto-login: save session
        setHomeSession({
          family: data.family,
          loginAt: new Date().toISOString(),
        });
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError('Connection error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // After code is generated — show it big
  if (code) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-2xl shadow-emerald-500/30 mb-6">
            <span className="text-4xl">🎉</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">You&apos;re in!</h1>
          <p className="text-emerald-300/70 mb-8">
            Here&apos;s your family code. Save it — this is your login.
          </p>

          {/* Big code display */}
          <div className="bg-white/10 backdrop-blur border border-emerald-400/30 rounded-2xl p-6 mb-6">
            <p className="text-sm text-emerald-300/60 mb-2 uppercase tracking-wider">Your Code</p>
            <p className="text-5xl font-mono font-bold text-white tracking-[0.3em]">{code}</p>
          </div>

          <p className="text-sm text-emerald-300/50 mb-6">
            Write this down! You&apos;ll use it to log in next time.
          </p>

          <button
            onClick={() => router.push('/home/dashboard')}
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            Go to Dashboard →
          </button>

          <p className="text-xs text-emerald-300/30 mt-4">
            Take your time — save your code before continuing.
          </p>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-8">
          <span className="text-5xl">🏠</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
          <span className="font-semibold">Montree</span> Home
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-emerald-300/80 mb-4 font-light">
          Create your family account
        </p>
        <p className="text-sm text-emerald-300/50 mb-12">
          No password needed — we&apos;ll give you a simple login code
        </p>

        {/* Form */}
        <div className="flex flex-col gap-4 justify-center">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Name input */}
          <div className="text-left">
            <label className="block text-sm text-emerald-300/60 mb-2">Your Name</label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30 text-center"
              onKeyDown={(e) => e.key === 'Enter' && handleStartFree()}
              autoFocus
            />
          </div>

          <button
            onClick={handleStartFree}
            disabled={loading}
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>🌱</span>
            <span>{loading ? 'Creating your account...' : 'Start Free'}</span>
          </button>

          <a
            href="/home/login"
            className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <span>🔑</span>
            <span>I have a code</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-slate-500 text-xs">
          🏠 Montree Home • teacherpotato.xyz
        </p>
      </div>
    </div>
  );
}
