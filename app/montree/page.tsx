// /montree/page.tsx
// MONTREE HUB - Clean portal for all user types
// Session 64: Unified login dashboard

import Link from 'next/link';

export default function MontreeHub() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-12 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-3xl shadow-2xl shadow-emerald-500/20 mb-6">
          <span className="text-5xl">🐋</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Whale Class</h1>
        <p className="text-slate-400 text-lg">Montessori Learning System</p>
      </header>

      {/* Main Portal Grid */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            
            {/* Teacher Portal */}
            <Link
              href="/teacher"
              className="group bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6 text-center transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl">👨‍🏫</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-1">Teacher</h2>
              <p className="text-blue-300/70 text-sm">Track progress</p>
            </Link>

            {/* Parent Portal */}
            <Link
              href="/montree/parent"
              className="group bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-emerald-600/30 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 text-center transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl">👨‍👩‍👧</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-1">Parent</h2>
              <p className="text-emerald-300/70 text-sm">View reports</p>
            </Link>

            {/* Student Portal */}
            <Link
              href="/auth/student-login"
              className="group bg-gradient-to-br from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 text-center transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl">🧒</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-1">Student</h2>
              <p className="text-purple-300/70 text-sm">Play & learn</p>
            </Link>

            {/* Principal Portal */}
            <Link
              href="/principal"
              className="group bg-gradient-to-br from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-6 text-center transition-all hover:scale-105 hover:shadow-xl hover:shadow-amber-500/10"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl">🏫</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-1">Principal</h2>
              <p className="text-amber-300/70 text-sm">School overview</p>
            </Link>

          </div>

          {/* Admin Link - Subtle at bottom */}
          <div className="mt-8 text-center">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <span>⚙️</span>
              <span>Admin Access</span>
            </Link>
          </div>

          {/* Quick Info Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📱</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Teachers</p>
                  <p className="text-slate-400 text-xs">Password: 123</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔑</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Parents</p>
                  <p className="text-slate-400 text-xs">Use access code</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎮</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Students</p>
                  <p className="text-slate-400 text-xs">Tap your face</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-slate-500 text-sm">
          🐋 Whale Class • Beijing International School
        </p>
        <p className="text-slate-600 text-xs mt-1">
          teacherpotato.xyz
        </p>
      </footer>
    </div>
  );
}
