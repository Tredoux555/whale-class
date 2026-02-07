'use client';

// /home/login/page.tsx — Session 155
// Code-only login for Montree Home families
// Parents enter their 6-char join code to sign in

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setHomeSession } from '@/lib/home/auth';

export default function HomeLoginPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInput = (index: number, value: string) => {
    // Allow only alphanumeric
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);

    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError('');

    // Auto-advance to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (char && index === 5 && next.every((d) => d)) {
      submitCode(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const next = [...digits];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);

    // Focus the next empty or the last one
    const nextEmpty = next.findIndex((d) => !d);
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();

    // Auto-submit if complete
    if (next.every((d) => d)) {
      submitCode(next.join(''));
    }
  };

  const submitCode = async (code: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/home/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.success) {
        setHomeSession({
          family: data.family,
          loginAt: new Date().toISOString(),
        });
        router.push('/home/dashboard');
      } else {
        setError(data.error || 'Invalid code');
        // Clear and refocus
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError('Connection error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
            <span className="text-4xl">🏠</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Montree Home</h1>
          <p className="text-emerald-300/70">Enter your family code</p>
        </div>

        {/* Code Input Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center mb-4">
              {error}
            </div>
          )}

          {/* 6-digit code input */}
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="w-12 h-14 text-center text-2xl font-mono font-bold bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all disabled:opacity-50 uppercase"
              />
            ))}
          </div>

          <p className="text-center text-emerald-300/40 text-xs mb-6">
            The 6-character code you received when you signed up
          </p>

          <button
            onClick={() => {
              const code = digits.join('');
              if (code.length === 6) submitCode(code);
            }}
            disabled={loading || digits.some((d) => !d)}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        {/* Register link */}
        <p className="text-center mt-6 text-emerald-300/60 text-sm">
          Don&apos;t have a code?{' '}
          <Link href="/home" className="text-emerald-300 hover:text-white transition-colors font-medium">
            Start Free
          </Link>
        </p>
      </div>
    </div>
  );
}
