'use client';

// /montree/page.tsx - Landing page
export default function MontreeLanding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-lg">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-8">
          <span className="text-5xl">🐋</span>
        </div>
        
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
          Welcome to <span className="font-semibold">Montree</span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg text-emerald-300/80 mb-12 font-light">
          The future of Montessori Classroom Management
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Demo Button - Goes to login with Demo hint */}
          <a
            href="/montree/login?demo=true"
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <span>👀</span>
            <span>Try Demo</span>
          </a>
          
          {/* Setup Button */}
          <a
            href="/montree/principal/register"
            className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <span>🏫</span>
            <span>Set Up School</span>
          </a>
        </div>
        
        {/* Login Links */}
        <div className="mt-12 flex flex-col items-center gap-2">
          <a
            href="/montree/principal/login"
            className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
          >
            Principal Login →
          </a>
          <a
            href="/montree/login"
            className="text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            Teacher Login →
          </a>
        </div>
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
