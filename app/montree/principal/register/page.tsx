// /montree/principal/register/page.tsx
// Session 105: Principal Registration - Create account + school
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrincipalRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [schoolName, setSchoolName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/principal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          principalName,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store session
      localStorage.setItem('montree_principal', JSON.stringify(data.principal));
      localStorage.setItem('montree_school', JSON.stringify(data.school));

      // Redirect to setup classrooms
      router.push('/montree/principal/setup');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Progress */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-6">
            <span className="text-4xl">🌱</span>
          </div>
          <h1 className="text-3xl font-light text-white mb-2">
            Welcome to <span className="font-semibold">Montree</span>
          </h1>
          <p className="text-emerald-300/70 text-sm">
            Let's set up your school
          </p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-emerald-400' : 'bg-white/20'}`} />
          </div>
        </div>

        <form onSubmit={handleRegister}>
          {/* Step 1: School Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">School Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Sunshine Montessori"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  autoFocus
                  required
                />
                {schoolName && (
                  <p className="mt-2 text-emerald-400/60 text-sm">
                    montree.app/{generateSlug(schoolName)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Your Name (Principal)</label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  placeholder="e.g. Sarah Johnson"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!schoolName.trim() || !principalName.trim()}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Account Credentials */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="principal@school.com"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Create Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !email || !password || !confirmPassword}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Links */}
        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm">
            Already have an account?{' '}
            <Link href="/montree/principal/login" className="text-emerald-400 hover:text-emerald-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-slate-500 text-xs">
          🌳 Montree • teacherpotato.xyz
        </p>
      </div>
    </div>
  );
}
