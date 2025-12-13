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

      if (res.ok) {
        const { session } = await res.json();
        // Store session in sessionStorage (cleared on browser close)
        sessionStorage.setItem('story_session', session);
        router.push(`/story/${session}`);
      } else {
        // Get error details from response
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.details || errorData.error || 'Invalid credentials');
        console.error('Login error:', errorData);
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Story Time
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              autoComplete="off"
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
          >
            {isLoading ? 'Loading...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}



