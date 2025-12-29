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

  // Fetch children with login enabled
  useEffect(() => {
    async function fetchChildren() {
      try {
        const res = await fetch('/api/whale/children');
        if (res.ok) {
          const data = await res.json();
          // Filter to only show children with passwords set
          const withPasswords = data.filter((c: any) => c.login_password);
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

      // Store session
      localStorage.setItem('studentSession', JSON.stringify({
        childId: data.childId,
        childName: data.childName,
        avatar: data.avatar,
      }));

      // Redirect to student dashboard
      router.push('/student/dashboard');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoggingIn(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 flex items-center justify-center" 
           style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        <div className="text-white text-2xl animate-bounce">🐋 Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-4"
         style={{ fontFamily: "'Comic Sans MS', cursive" }}>
      
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <div className="text-6xl mb-4">🐋</div>
        <h1 className="text-3xl font-bold text-white drop-shadow-lg">
          Welcome Back!
        </h1>
        <p className="text-white/90 mt-2">Tap your name to log in</p>
      </div>

      {/* Child Selection */}
      {!selectedChild ? (
        <div className="max-w-md mx-auto">
          {children.length === 0 ? (
            <div className="bg-white/90 rounded-2xl p-6 text-center shadow-xl">
              <div className="text-4xl mb-4">😢</div>
              <p className="text-gray-700">No students ready to log in yet.</p>
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
                  className="bg-white/90 hover:bg-white rounded-2xl p-6 text-center 
                           shadow-xl hover:scale-105 transition-all active:scale-95"
                >
                  <div className="text-5xl mb-2">
                    {child.photo_url ? (
                      <img src={child.photo_url} alt="" className="w-16 h-16 rounded-full mx-auto" />
                    ) : (
                      child.avatar_emoji || '🧒'
                    )}
                  </div>
                  <div className="font-bold text-gray-800">{child.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (

        /* Password Entry */
        <div className="max-w-sm mx-auto">
          <div className="bg-white/90 rounded-2xl p-6 shadow-xl">
            {/* Selected Child Display */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">
                {selectedChild.photo_url ? (
                  <img src={selectedChild.photo_url} alt="" className="w-20 h-20 rounded-full mx-auto" />
                ) : (
                  selectedChild.avatar_emoji || '🧒'
                )}
              </div>
              <div className="font-bold text-xl text-gray-800">{selectedChild.name}</div>
              <button
                onClick={() => { setSelectedChild(null); setPassword(''); setError(''); }}
                className="text-blue-500 text-sm mt-1 hover:underline"
              >
                Not you? Tap here
              </button>
            </div>

            {/* Password Form */}
            <form onSubmit={handleLogin}>
              <label className="block text-gray-700 font-bold mb-2">
                Enter your password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 text-xl border-2 border-gray-300 rounded-xl 
                         focus:border-blue-500 focus:outline-none text-center"
                placeholder="••••••"
                autoFocus
              />

              {error && (
                <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-lg text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn || !password}
                className="w-full mt-4 py-4 bg-green-500 hover:bg-green-600 
                         text-white font-bold text-xl rounded-xl shadow-lg
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all active:scale-95"
              >
                {loggingIn ? '🔄 Logging in...' : '🚀 Let\'s Go!'}
              </button>
            </form>

            {/* Help Link */}
            <button
              onClick={() => setShowPasswordReset(true)}
              className="w-full mt-4 text-blue-500 text-sm hover:underline"
            >
              Forgot your password?
            </button>
          </div>
        </div>
      )}


      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-4">🔑</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Need Help?</h2>
              <p className="text-gray-600 mb-4">
                Ask your teacher or parent to reset your password in the admin area.
              </p>
              <button
                onClick={() => setShowPasswordReset(false)}
                className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl"
              >
                OK, Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Links */}
      <div className="fixed bottom-0 left-0 right-0 p-4 text-center">
        <div className="flex justify-center gap-4 text-white/80 text-sm">
          <Link href="/admin/login" className="hover:text-white">
            Teacher Login
          </Link>
          <span>•</span>
          <Link href="/" className="hover:text-white">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
