'use client';

// /home/register/page.tsx — Session 155
// Registration form for Montree Home families

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setHomeSession } from '@/lib/home/auth';

export default function HomeRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!name.trim()) { setError('Name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);

    try {
      const res = await fetch('/api/home/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setHomeSession({
          family: data.family,
          loginAt: new Date().toISOString(),
        });
        router.push('/home/dashboard');
      } else {
        setError(data.error || 'Registration failed');
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
          <p className="text-emerald-300/70">Create your family account</p>
        </div>

        {/* Register Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50"
                placeholder="Sarah Johnson"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50"
                placeholder="sarah@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Start Free'}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center mt-6 text-emerald-300/60 text-sm">
          Already have an account?{' '}
          <Link href="/home/login" className="text-emerald-300 hover:text-white transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
