'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [sessionWarning, setSessionWarning] = useState(false);

  // Session timeout
  useEffect(() => {
    if (!authenticated) return;

    const checkSession = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed > SESSION_TIMEOUT_MS) {
        setAuthenticated(false);
        setSessionWarning(false);
        alert('Session expired for security. Please login again.');
      } else if (elapsed > SESSION_TIMEOUT_MS - 60000) {
        setSessionWarning(true);
      }
    }, 10000);

    return () => clearInterval(checkSession);
  }, [authenticated, lastActivity]);

  // Track activity
  const trackActivity = useCallback(() => {
    setLastActivity(Date.now());
    setSessionWarning(false);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    window.addEventListener('mousemove', trackActivity);
    window.addEventListener('keydown', trackActivity);
    return () => {
      window.removeEventListener('mousemove', trackActivity);
      window.removeEventListener('keydown', trackActivity);
    };
  }, [authenticated, trackActivity]);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setAuthenticated(true);
        setLastActivity(Date.now());
      } else if (res.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <span className="text-4xl block mb-2">🚀</span>
            <h1 className="text-xl font-bold text-white">Marketing Hub</h1>
            <p className="text-slate-400 text-sm">Enter password to continue</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-emerald-500 outline-none"
            autoFocus
          />

          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleLogin}
            className="mt-4 w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {sessionWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 p-3 bg-amber-500/20 border-b border-amber-500/50 text-amber-400 text-sm text-center">
          Session expiring soon. Move mouse to stay logged in.
        </div>
      )}
      {children}
    </div>
  );
}
