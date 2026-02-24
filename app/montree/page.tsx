'use client';

// /montree/page.tsx - Landing page
export default function MontreeLanding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Top-right Library link */}
      <a
        href="/montree/library"
        className="absolute top-5 right-6 z-20 flex items-center gap-2 px-4 py-2 text-sm text-emerald-300/80 hover:text-white border border-emerald-500/20 hover:border-emerald-400/40 rounded-xl backdrop-blur bg-white/5 hover:bg-white/10 transition-all"
      >
        <span className="font-medium">Montree</span>
        <span className="text-emerald-500/40">—</span>
        <span className="font-semibold">Library</span>
      </a>

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-8">
          <span className="text-5xl">🌳</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
          Welcome to <span className="font-semibold">Montree</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-emerald-300/80 mb-12 font-light">
          Observe, record, and share every child's Montessori journey — with expert guidance built in.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 justify-center">
          {/* Try Button - primary CTA */}
          <a
            href="/montree/try"
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <span>🌱</span>
            <span>I want to try</span>
          </a>

          {/* Login Button - existing users */}
          <a
            href="/montree/login-select"
            className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <span>🔑</span>
            <span>I already have an account</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-slate-500 text-xs">
          🌳 Montree • montree.xyz
        </p>
      </div>
    </div>
  );
}
