// /montree/setup/page.tsx
// Teacher Account Setup - Create username/password after first code login
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherSetupPage() {
  const router = useRouter();
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
      // Pre-fill username with teacher name (lowercase, no spaces)
      if (parsed.teacher?.name) {
        setUsername(parsed.teacher.name.toLowerCase().replace(/\s+/g, ''));
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
      setError('Please enter a username');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setError('Username can only contain lowercase letters, numbers, and underscores');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
        setError(data.error || 'Failed to set up account');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
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
          <h1 className="text-2xl font-bold text-slate-800">Welcome to Montree!</h1>
          <p className="text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">
            A system designed to make your life easy, pleasant, and splendid.
            I can&apos;t wait to show you the magnificence of what we&apos;ve built for you!
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
                <strong>First, a tiny bit of setup!</strong> ✨ Create your personal login so you can access Montree anytime without needing your code.
              </p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Choose a Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g., sarah_teacher"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:bg-white outline-none transition-colors"
                required
                autoFocus
              />
              <p className="text-slate-400 text-xs mt-1">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Create a Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:bg-white outline-none transition-colors"
                required
                minLength={6}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Type password again"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:bg-white outline-none transition-colors"
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords don&apos;t match</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-green-500 text-xs mt-1">✓ Passwords match</p>
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
                  Setting up...
                </span>
              ) : (
                'Let\'s Go! →'
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
