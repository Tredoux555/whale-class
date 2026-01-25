'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginMode = 'code' | 'password' | 'setup';

type TeacherData = {
  id: string;
  name: string;
  classroom_name: string;
  classroom_icon: string;
};

export default function MontreeLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Code mode
  const [code, setCode] = useState('');
  
  // Password mode
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  
  // Setup mode (after valid code)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);

  // Validate login code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/montree/auth/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Code valid - go to setup mode
      setTeacherData(data.teacher);
      setMode('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Set password (first time setup)
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/montree/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: code.toLowerCase().trim(),
          password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set password');
      }

      // Store session and redirect
      localStorage.setItem('montree_teacher', JSON.stringify(data.teacher));
      router.push('/montree/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Login with name + password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/montree/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Store session and redirect
      localStorage.setItem('montree_teacher', JSON.stringify(data.teacher));
      router.push('/montree/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🌱</span>
          <h1 className="text-2xl font-bold text-gray-800">Montree</h1>
          <p className="text-gray-500 mt-1">Teacher Login</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* CODE MODE - First time with code */}
          {mode === 'code' && (
            <form onSubmit={handleCodeSubmit}>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">First time?</h2>
                <p className="text-sm text-gray-500">Enter the code from your principal</p>
              </div>

              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. whale-7392"
                className="w-full p-4 text-lg text-center border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none tracking-wider"
                autoFocus
              />

              <button
                type="submit"
                disabled={!code.trim() || loading}
                className="mt-6 w-full py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Checking...' : 'Continue →'}
              </button>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setMode('password')}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Already have an account? Login here
                </button>
              </div>
            </form>
          )}

          {/* SETUP MODE - Set password after valid code */}
          {mode === 'setup' && teacherData && (
            <form onSubmit={handleSetupSubmit}>
              <div className="text-center mb-6">
                <span className="text-4xl">{teacherData.classroom_icon}</span>
                <h2 className="text-lg font-semibold text-gray-800 mt-2">
                  Welcome, {teacherData.name}!
                </h2>
                <p className="text-sm text-gray-500">{teacherData.classroom_name}</p>
              </div>

              <p className="text-sm text-gray-600 mb-4 text-center">
                Set a password to finish setup
              </p>

              <div className="space-y-4">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  autoFocus
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!newPassword || !confirmPassword || loading}
                className="mt-6 w-full py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Setting up...' : 'Start Teaching →'}
              </button>
            </form>
          )}

          {/* PASSWORD MODE - Returning user */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordSubmit}>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Welcome back</h2>
                <p className="text-sm text-gray-500">Login to your classroom</p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  autoFocus
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!name.trim() || !password || loading}
                className="mt-6 w-full py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Logging in...' : 'Login →'}
              </button>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setMode('code')}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  First time? Enter your code
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Montree by TeacherPotato
        </p>
      </div>
    </div>
  );
}
