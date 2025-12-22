'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StoryLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/story/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem('story_session', data.session);
        sessionStorage.setItem('story_username', data.username);
        router.push(`/story/${data.session}`);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-amber-100">
        <div className="text-center mb-8">
          <span className="text-5xl">📖</span>
          <h1 className="text-2xl font-serif font-bold mt-4 text-gray-700">Story Time</h1>
          <p className="text-gray-400 text-sm mt-1">Enter your reading garden</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-200 focus:border-transparent outline-none transition-all text-gray-700"
              autoComplete="off"
              autoFocus
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-200 focus:border-transparent outline-none transition-all"
              autoComplete="off"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 text-sm text-center p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 disabled:bg-amber-300 transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Opening...
              </span>
            ) : (
              'Read Story'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
