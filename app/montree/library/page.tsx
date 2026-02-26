// /montree/library/page.tsx
// Montree Library — Welcome Landing Page
'use client';

import Link from 'next/link';

export default function LibraryWelcomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ background: 'linear-gradient(160deg, #0A2725 0%, #0D3330 40%, #122C2A 70%, #0F1F1E 100%)' }}>

      {/* Ambient glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #fbbf24, transparent 70%)' }} />

      {/* Nav */}
      <nav className="relative z-10 px-6 py-5">
        <Link
          href="/montree"
          className="text-white/40 text-sm hover:text-white/70 transition-colors"
        >
          ← montree.xyz
        </Link>
      </nav>

      {/* Centered content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-8">
        <div className="max-w-xl w-full text-center">

          {/* Small badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/50 text-xs tracking-wide uppercase">Open Resource</span>
          </div>

          {/* Welcome */}
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            <span className="text-white/90">Welcome to the</span>
            <br />
            <span style={{ background: 'linear-gradient(135deg, #6ee7b7, #34d399, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Montree Library
            </span>
          </h1>

          <p className="text-white/40 mt-5 text-lg max-w-sm mx-auto leading-relaxed">
            Create professional materials in minutes, or explore what teachers worldwide have shared.
          </p>

          {/* Two paths */}
          <div className="mt-14 space-y-4">

            {/* Path 1: Create — warm accent */}
            <Link
              href="/montree/library/tools"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(245, 158, 11, 0.04))',
                borderColor: 'rgba(251, 191, 36, 0.15)',
              }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.06))', borderColor: 'rgba(251, 191, 36, 0.25)' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Content Creation Tools</div>
                <div className="text-amber-200/40 text-sm mt-0.5">
                  Cards, flashcards, labels, bingo &amp; more
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-amber-400/30 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Path 2: English Corner — rose/pink accent */}
            <Link
              href="/montree/library/english-corner"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.08), rgba(236, 72, 153, 0.04))',
                borderColor: 'rgba(244, 114, 182, 0.15)',
              }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.12), rgba(236, 72, 153, 0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(244, 114, 182, 0.15)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">English Language Corner</div>
                <div className="text-pink-200/40 text-sm mt-0.5">
                  AMI Master Setup &amp; Implementation Plan
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-pink-400/30 group-hover:text-pink-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Path 3: Browse — cool teal accent */}
            <Link
              href="/montree/library/browse"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(94, 234, 212, 0.06), rgba(45, 212, 191, 0.03))',
                borderColor: 'rgba(94, 234, 212, 0.12)',
              }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(94, 234, 212, 0.10), rgba(45, 212, 191, 0.05))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(94, 234, 212, 0.12)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-300">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Browse the Library</div>
                <div className="text-teal-200/40 text-sm mt-0.5">
                  Works shared by teachers around the world
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-teal-300/30 group-hover:text-teal-300 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-6 py-5 text-center">
        <p className="text-white/20 text-xs tracking-wider uppercase">
          By teachers, for teachers
        </p>
      </div>
    </div>
  );
}
