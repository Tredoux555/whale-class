// /montree/library/page.tsx
// Montree Library — Welcome Landing Page
'use client';

import Link from 'next/link';

export default function LibraryWelcomePage() {
  return (
    <div className="min-h-screen bg-[#0D3330] flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-4">
        <Link
          href="/montree"
          className="text-emerald-400/70 text-sm hover:text-emerald-300 transition-colors"
        >
          ← montree.xyz
        </Link>
      </nav>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-lg w-full text-center">
          {/* Welcome */}
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Welcome to the
            <br />
            <span className="text-emerald-400">Montree Library</span>
          </h1>

          <p className="text-emerald-200/70 mt-4 text-lg">
            Create beautiful materials or browse what others have shared.
          </p>

          {/* Two paths */}
          <div className="mt-12 space-y-4">
            {/* Path 1: Create */}
            <Link
              href="/montree/library/tools"
              className="group flex items-center gap-5 w-full p-6 bg-white/[0.06] border border-white/[0.08] rounded-2xl hover:bg-white/[0.10] hover:border-emerald-400/30 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-semibold text-lg">Content Creation Tools</div>
                <div className="text-emerald-200/50 text-sm mt-0.5">
                  Cards, flashcards, labels, bingo &amp; more
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400/40 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Path 2: Browse */}
            <Link
              href="/montree/library/browse"
              className="group flex items-center gap-5 w-full p-6 bg-white/[0.06] border border-white/[0.08] rounded-2xl hover:bg-white/[0.10] hover:border-emerald-400/30 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-semibold text-lg">Browse the Library</div>
                <div className="text-emerald-200/50 text-sm mt-0.5">
                  Works shared by teachers around the world
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400/40 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Subtle footer */}
      <div className="px-6 py-4 text-center">
        <p className="text-emerald-200/30 text-xs">
          By teachers, for teachers
        </p>
      </div>
    </div>
  );
}
