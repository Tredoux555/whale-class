'use client';

// /montree/login-select/page.tsx - Choose login type
export default function LoginSelectPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg w-full">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-2xl shadow-emerald-500/30 mb-6">
          <span className="text-4xl">🌳</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-light text-white mb-2">
          Login to <span className="font-semibold">Montree</span>
        </h1>
        <p className="text-emerald-300/70 mb-10">
          Select your role to continue
        </p>

        {/* Login Options */}
        <div className="flex flex-col gap-4">
          <a
            href="/montree/login"
            className="px-8 py-5 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
          >
            <span className="text-2xl">👩‍🏫</span>
            <div className="text-left">
              <div className="text-lg">Teacher Login</div>
              <div className="text-sm text-emerald-300/70 font-normal">Enter your classroom code</div>
            </div>
          </a>

          <a
            href="/montree/principal/login"
            className="px-8 py-5 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
          >
            <span className="text-2xl">👔</span>
            <div className="text-left">
              <div className="text-lg">Principal Login</div>
              <div className="text-sm text-emerald-300/70 font-normal">School admin access</div>
            </div>
          </a>

          <a
            href="/montree/parent"
            className="px-8 py-5 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
          >
            <span className="text-2xl">👨‍👩‍👧</span>
            <div className="text-left">
              <div className="text-lg">Parent Login</div>
              <div className="text-sm text-emerald-300/70 font-normal">View your child's progress</div>
            </div>
          </a>
        </div>

        {/* Back link */}
        <a
          href="/montree"
          className="inline-block mt-8 text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          ← Back to home
        </a>
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
