// /montree/demo/zohan/setup/page.tsx
// School setup wizard - Phase 2
// Session 80 - Placeholder for now

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ZohanSetupPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // In the future, this would actually save the email
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-3xl shadow-2xl mb-6">
            <span className="text-5xl">✅</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">You're on the List!</h1>
          <p className="text-slate-400 mb-8">
            Tredoux will reach out personally to help you set up your school.
            This isn't automated onboarding - it's a partnership.
          </p>
          <Link
            href="/montree/demo/zohan"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            ← Back to Welcome
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-lg w-full">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl shadow-2xl mb-6">
          <span className="text-4xl">🏫</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Set Up Your School
        </h1>

        <p className="text-slate-400 mb-8 leading-relaxed">
          We're taking a <span className="text-emerald-400 font-semibold">slow, intentional approach</span> to onboarding.
          Each school gets personalized setup support to ensure quality.
        </p>

        {/* Status indicator */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-center gap-3 text-amber-400">
            <span className="text-2xl">🚧</span>
            <div className="text-left">
              <p className="font-semibold">Coming Soon</p>
              <p className="text-sm text-amber-400/70">Self-service setup in Phase 2</p>
            </div>
          </div>
        </div>

        {/* Interest form */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Join the Waiting List</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg"
            >
              Get Early Access
            </button>
          </form>

          <p className="text-slate-500 text-xs mt-4">
            Quality over quantity. We'll personally help you get started.
          </p>
        </div>

        {/* Back link */}
        <Link
          href="/montree/demo/zohan"
          className="inline-flex items-center gap-2 mt-8 text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Welcome
        </Link>
      </div>
    </div>
  );
}
