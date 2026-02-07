'use client';

// /home/page.tsx — Session 155
// Landing page for Montree Home

export default function HomeLandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-8">
          <span className="text-5xl">🏠</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
          <span className="font-semibold">Montree</span> Home
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-emerald-300/80 mb-4 font-light">
          Montessori at Home
        </p>
        <p className="text-sm text-emerald-300/50 mb-12">
          Track your child&apos;s learning journey with 68 curated Montessori activities
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 justify-center">
          <a
            href="/home/register"
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <span>🌱</span>
            <span>Start Free</span>
          </a>

          <a
            href="/home/login"
            className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <span>🔑</span>
            <span>I have an account</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-slate-500 text-xs">
          🏠 Montree Home • teacherpotato.xyz
        </p>
      </div>
    </div>
  );
}
