'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'code' | 'email'>('code');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const body = mode === 'code' 
        ? { code: code.trim().toLowerCase() }
        : { email: email.trim().toLowerCase(), password };

      const res = await fetch('/api/montree/auth/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('montree_session', JSON.stringify({
          teacher: data.teacher,
          school: data.school,
          classroom: data.classroom,
          loginAt: new Date().toISOString(),
        }));
        
        // Redirect to set-password if not set (only for code login)
        if (mode === 'code' && !data.teacher.password_set) {
          router.push('/montree/set-password');
        } else {
          router.push('/montree/dashboard');
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
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
            <span className="text-4xl">🐋</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Montree</h1>
          <p className="text-emerald-300/70">Teacher Login</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode('code')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'code'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              Code
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'email'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              Email
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            {mode === 'code' ? (
              <div>
                <label className="block text-sm font-medium text-emerald-300 mb-2 text-center">
                  Enter your 6-character code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.slice(0, 6))}
                  placeholder="abc123"
                  className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-white/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                  autoFocus
                  maxLength={6}
                />
                <p className="text-white/40 text-xs text-center mt-2">
                  Your principal gave you this code
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-emerald-300 mb-2">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tredoux"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                    required
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'code' ? code.length < 6 : !email || !password)}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Logging in...
                </span>
              ) : (
                'Login →'
              )}
            </button>
          </form>
        </div>

        {/* Principal link */}
        <div className="text-center mt-6">
          <a
            href="/montree/principal/login"
            className="text-white/50 hover:text-white/70 text-sm"
          >
            Principal? Login here →
          </a>
        </div>
      </div>
    </div>
  );
}
