// app/auth/student-login/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  avatar_emoji: string;
  photo_url?: string;
}

export default function StudentLoginPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  useEffect(() => {
    async function fetchChildren() {
      try {
        const res = await fetch('/api/whale/children');
        if (res.ok) {
          const data = await res.json();
          const withPasswords = data.filter((c: Child & { login_password?: string }) => c.login_password);
          setChildren(withPasswords);
        }
      } catch (err) {
        console.error('Failed to fetch children:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchChildren();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !password) return;

    setLoggingIn(true);
    setError('');

    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChild.id,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoggingIn(false);
        return;
      }

      localStorage.setItem('studentSession', JSON.stringify({
        childId: data.childId,
        childName: data.childName,
        avatar: data.avatar,
      }));

      router.push('/student/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <span className="text-5xl animate-bounce">🐋</span>
          </div>
          <p className="text-white text-xl font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4 pb-24">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-3xl mb-4 backdrop-blur-sm">
          <span className="text-6xl">🐋</span>
        </div>
        <h1 className="text-3xl font-bold text-white">
          Welcome Back!
        </h1>
        <p className="text-white/80 mt-2">Tap your name to log in</p>
      </div>

      {/* Child Selection */}
      {!selectedChild ? (
        <div className="max-w-md mx-auto">
          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
              <div className="text-5xl mb-4">😢</div>
              <p className="text-gray-700 font-medium">No students ready to log in yet.</p>
              <p className="text-gray-500 text-sm mt-2">
                Ask your teacher to set up your password!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className="bg-white hover:bg-gray-50 rounded-2xl p-6 text-center 
                           shadow-xl hover:scale-105 transition-all active:scale-95 group"
                >
                  <div className="mb-3">
                    {child.photo_url ? (
                      <img src={child.photo_url} alt="" className="w-16 h-16 rounded-full mx-auto object-cover" />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mx-auto flex items-center justify-center">
                        <span className="text-3xl">{child.avatar_emoji || '🧒'}</span>
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors">{child.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Password Entry */
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            {/* Selected Child Display */}
            <div className="text-center mb-6">
              <div className="mb-3">
                {selectedChild.photo_url ? (
                  <img src={selectedChild.photo_url} alt="" className="w-20 h-20 rounded-full mx-auto object-cover" />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mx-auto flex items-center justify-center">
                    <span className="text-4xl">{selectedChild.avatar_emoji || '🧒'}</span>
                  </div>
                )}
              </div>
              <div className="font-bold text-xl text-gray-800">{selectedChild.name}</div>
              <button
                onClick={() => { setSelectedChild(null); setPassword(''); setError(''); }}
                className="text-purple-500 text-sm mt-2 hover:text-purple-600 font-medium"
              >
                Not you? Tap here
              </button>
            </div>

            {/* Password Form */}
            <form onSubmit={handleLogin}>
              <label className="block text-gray-700 font-medium mb-2">
                Enter your password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 text-xl border-2 border-gray-200 rounded-xl 
                         focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-center transition-all"
                placeholder="••••••"
                autoFocus
              />

              {error && (
                <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-xl text-center text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn || !password}
                className="w-full mt-4 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600
                         text-white font-bold text-lg rounded-xl shadow-lg shadow-green-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all active:scale-95"
              >
                {loggingIn ? '🔄 Logging in...' : '🚀 Let\'s Go!'}
              </button>
            </form>

            {/* Help Link */}
            <button
              onClick={() => setShowPasswordReset(true)}
              className="w-full mt-4 text-purple-500 text-sm hover:text-purple-600 font-medium"
            >
              Forgot your password?
            </button>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <span className="text-3xl">🔑</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Need Help?</h2>
              <p className="text-gray-600 mb-6">
                Ask your teacher or parent to reset your password in the admin area.
              </p>
              <button
                onClick={() => setShowPasswordReset(false)}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                OK, Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Links */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/20 to-transparent">
        <div className="flex justify-center gap-4 text-white/80 text-sm">
          <Link href="/teacher" className="hover:text-white transition-colors">
            Teacher Login
          </Link>
          <span>•</span>
          <Link href="/" className="hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
