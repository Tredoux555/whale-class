"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyLoading, setProxyLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkProxyMode();
  }, []);

  const checkProxyMode = async () => {
    try {
      const response = await fetch("/api/admin/proxy-mode");
      const data = await response.json();
      setProxyEnabled(data.proxyEnabled || false);
    } catch (error) {
      console.error("Error checking proxy mode:", error);
    }
  };

  const toggleProxyMode = async (enabled: boolean) => {
    setProxyLoading(true);
    try {
      const response = await fetch("/api/admin/proxy-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setProxyEnabled(enabled);
        document.cookie = `video-proxy-enabled=${enabled}; path=/; max-age=${60 * 60 * 24 * 30}`;
      } else {
        document.cookie = `video-proxy-enabled=${enabled}; path=/; max-age=${60 * 60 * 24 * 30}`;
        setProxyEnabled(enabled);
      }
    } catch (error) {
      document.cookie = `video-proxy-enabled=${enabled}; path=/; max-age=${60 * 60 * 24 * 30}`;
      setProxyEnabled(enabled);
    } finally {
      setProxyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
        setError(errorData.error || "Login failed");
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (proxyEnabled) {
          fetch("/api/admin/proxy-mode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: true }),
          }).catch(() => {});
        }
        
        window.location.href = "/admin";
      } else {
        setError(data.error || "Login failed");
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network error: Unable to connect to server.');
      } else {
        setError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Glass card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <span className="text-4xl">🌳</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Admin Login</h1>
            <p className="text-slate-400 text-sm">Whale Montessori Platform</p>
          </div>

          {/* Proxy Mode Toggle */}
          <div className="mb-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-0.5">
                  🌏 Video Proxy Mode
                </label>
                <p className="text-xs text-slate-400">
                  Enable for China firewall bypass
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleProxyMode(!proxyEnabled)}
                disabled={proxyLoading}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
                  proxyEnabled ? "bg-emerald-500" : "bg-slate-600"
                } ${proxyLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                    proxyEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {proxyEnabled && (
              <p className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span>✓</span> Proxy will activate after login
              </p>
            )}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-slate-400 hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Secure admin access • Whale Montessori
        </p>
      </div>
    </div>
  );
}
