'use client';

// /home/page.tsx
// Landing page for Montree Home
// "Start Free" creates account instantly, shows join code, auto-logs in

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setHomeSession } from '@/lib/home/auth';

export default function HomeLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        body: JSON.stringify({ name: parentName.trim(), email: parentEmail.trim() }),
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
        const debugStr = data.debug ? `\n${JSON.stringify(data.debug)}` : '';
        setError((data.error || 'Something went wrong') + debugStr);
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

          <h1 className="text-2xl font-bold text-white mb-2">You're in!</h1>
          <p className="text-emerald-300/70 mb-8">
            Here's your family code. Save it — this is your login.
          </p>

          {/* Big code display */}
          <div className="bg-white/10 backdrop-blur border border-emerald-400/30 rounded-2xl p-6 mb-6">
            <p className="text-sm text-emerald-300/60 mb-2 uppercase tracking-wider">Your Code</p>
            <p className="text-5xl font-mono font-bold text-white tracking-[0.3em]">{code}</p>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopyCode}
            className="w-full max-w-sm mx-auto mb-4 px-4 py-3 bg-slate-800/60 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700/60 hover:border-slate-600 transition-all text-sm font-medium block"
          >
            {copied ? '✓ Copied!' : 'Copy code'}
          </button>

          <p className="text-sm text-emerald-300/50 mb-6">
            Write this down! You'll use it to log in next time.
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

  // Default: landing page
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/50 mb-8 animate-bounce">
          <span className="text-6xl">🏠</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          Montree Home
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-emerald-200 mb-3 font-medium">
          Montessori Learning at Home
        </p>
        <p className="text-lg text-emerald-300/70 mb-12 leading-relaxed">
          Track your child's Montessori journey with 66 curated activities. <br/>
          <span className="text-emerald-200 font-semibold">Beautiful progress tracking • Games & activities • Photo gallery</span>
        </p>

        {/* CTA Section */}
        <div className="flex flex-col gap-4 justify-center">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-200 text-sm text-center font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Name input */}
          <div className="text-left">
            <label className="block text-sm text-emerald-300 mb-3 font-semibold">Your Name</label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full px-6 py-4 bg-white/10 backdrop-blur border border-white/30 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 transition-all text-center font-medium"
              onKeyDown={(e) => e.key === 'Enter' && handleStartFree()}
            />
          </div>

          <div>
            <label className="block text-sm text-emerald-300 mb-3 font-semibold">Email (optional)</label>
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="e.g. sarah@example.com"
              className="w-full px-6 py-4 bg-white/10 backdrop-blur border border-white/30 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 transition-all"
            />
            <p className="text-xs text-emerald-300/60 mt-2">For account recovery only — we'll never spam you</p>
          </div>

          <button
            onClick={handleStartFree}
            disabled={loading}
            className="mt-4 px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/40 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            <span className="text-2xl">🌱</span>
            <span>{loading ? 'Creating your account...' : 'Start Free Now'}</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/40 text-sm">or</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <a
            href="/home/login"
            className="px-8 py-4 bg-white/10 backdrop-blur border border-white/30 text-white font-semibold rounded-2xl hover:bg-white/20 active:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <span>🔑</span>
            <span>I already have a code</span>
          </a>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '📊', label: 'Progress Tracking', desc: 'Beautiful dashboards showing your child\'s learning' },
            { icon: '🎮', label: '30+ Games', desc: 'Educational games that reinforce skills' },
            { icon: '🖼️', label: 'Photo Gallery', desc: 'Capture and organize learning moments' },
          ].map((feature, i) => (
            <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-white mb-2">{feature.label}</h3>
              <p className="text-sm text-emerald-300/70">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-emerald-300/40 text-xs">
          🏠 Montree Home • Free forever for families
        </p>
      </div>
    </div>
  );
}
