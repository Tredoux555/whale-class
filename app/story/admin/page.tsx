'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
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
      const res = await fetch('/api/story/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem('story_admin_session', data.session);
        sessionStorage.setItem('story_admin_username', data.username);
        router.push('/story/admin/dashboard');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🔐</span>
          <h1 className="text-2xl font-bold mt-4 text-gray-800">Admin Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Story Management</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Admin Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
              autoComplete="off"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 text-sm text-center p-3 rounded-xl">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium hover:bg-slate-700 disabled:bg-slate-400 transition-colors"
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
        
        <p className="text-center text-gray-400 text-xs mt-6">
          Restricted access only
        </p>
      </div>
    </div>
  );
}
