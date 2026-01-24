// /montree/demo/page.tsx
// Welcome page - personalized for Zohan
// Session 80: Zohan Demo Experience
// Session 81: Fixed Suspense boundary for Next.js 16.1

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function DemoWelcomeContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Zohan';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex flex-col items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-8 animate-bounce">
          <span className="text-6xl">🐋</span>
        </div>

        {/* Welcome Text */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Welcome {name},
        </h1>
        <p className="text-xl md:text-2xl text-emerald-300 mb-12 leading-relaxed">
          Welcome to the future of<br />
          <span className="text-white font-semibold">Montessori Classroom Management</span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/montree/demo/setup"
            className="group px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-2xl font-semibold text-lg hover:bg-white/20 hover:border-white/50 transition-all flex items-center justify-center gap-3"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🏫</span>
            <span>Set Up Your School</span>
          </Link>

          <Link
            href="/montree/demo/disclaimer"
            className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">👀</span>
            <span>Preview Demo</span>
          </Link>
        </div>

        {/* Subtle tagline */}
        <p className="mt-12 text-emerald-400/60 text-sm">
          30% effort → 150% output
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-slate-500 text-xs">
          🐋 Montree • teacherpotato.xyz
        </p>
      </div>
    </div>
  );
}

export default function DemoWelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center">
        <div className="animate-bounce text-6xl">🐋</div>
      </div>
    }>
      <DemoWelcomeContent />
    </Suspense>
  );
}
