'use client';

import Link from 'next/link';
import LanguageToggle from '@/components/montree/LanguageToggle';

export default function LanguageAreaLandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ background: '#06140e' }}>

      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
          radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
          linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
        `,
      }} />

      <nav className="relative z-10 px-6 py-5 flex items-center justify-between">
        <Link
          href="/montree/library"
          className="text-white/40 text-sm hover:text-white/70 transition-colors"
        >
          ← Library
        </Link>
        <LanguageToggle />
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-8">
        <div className="max-w-2xl w-full text-center">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/50 text-xs tracking-wide uppercase">Complete Reference</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            <span className="text-white/90">The Complete</span>
            <br />
            <span style={{ background: 'linear-gradient(135deg, #6ee7b7, #34d399, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Language Area
            </span>
          </h1>

          <p className="text-white/40 mt-5 text-lg max-w-md mx-auto leading-relaxed">
            Six resources for the language area: the room setup, the daily lessons for every phase, a song for every Pink Phase sound, and fifteen little storybooks the child reads alone.
          </p>

          <div className="mt-14 space-y-4">

            {/* Setup Guide — emerald */}
            <a
              href="/language-area-guide.html"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(5,150,105,0.04))',
                borderColor: 'rgba(16,185,129,0.18)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(5,150,105,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(16,185,129,0.18)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Setup Guide</div>
                <div className="text-emerald-200/40 text-sm mt-0.5">
                  13 works · 4 shelves · how to set the room up and present every material
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-emerald-400/30 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

            {/* Pink Phase Lessons — pink */}
            <a
              href="/language-area-lessons.html"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(244,114,182,0.08), rgba(219,39,119,0.04))',
                borderColor: 'rgba(244,114,182,0.15)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(244,114,182,0.12), rgba(219,39,119,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(244,114,182,0.15)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Pink Phase Lessons</div>
                <div className="text-pink-200/40 text-sm mt-0.5">
                  Lesson-by-lesson word bank · UFLI L1-53 · words, phrases, sentences, pictures, heart words
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-pink-400/30 group-hover:text-pink-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

            {/* Pink Sound Songs — violet, one per lesson */}
            <a
              href="/pink-phase-songs.html"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(167,139,250,0.11), rgba(124,58,237,0.04))',
                borderColor: 'rgba(167,139,250,0.20)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(124,58,237,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(167,139,250,0.17)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-300">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Pink Sound Songs</div>
                <div className="text-violet-200/45 text-sm mt-0.5">
                  49 circle-time songs · one per UFLI lesson L5-53 · sing every sound · Suno-ready
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-violet-300/30 group-hover:text-violet-300 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

            {/* Pink Readers — amber storybooks */}
            <a
              href="/pink-readers.html"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(234,179,8,0.11), rgba(202,138,4,0.04))',
                borderColor: 'rgba(234,179,8,0.20)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(202,138,4,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(234,179,8,0.17)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-300">
                  <path d="m16 6 4 14" />
                  <path d="M12 6v14" />
                  <path d="M8 8v12" />
                  <path d="M4 4v16" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Pink Readers</div>
                <div className="text-amber-200/45 text-sm mt-0.5">
                  15 decodable storybooks · UFLI L5-53 · real little story books — every word the child can sound out
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-amber-300/30 group-hover:text-amber-300 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

            {/* Blue Phase Lessons — blue */}
            <a
              href="/language-area-blue.html"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(30,64,175,0.04))',
                borderColor: 'rgba(59,130,246,0.18)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.14), rgba(30,64,175,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(59,130,246,0.18)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Blue Phase Lessons</div>
                <div className="text-blue-200/40 text-sm mt-0.5">
                  UFLI L54-83 · Magic-e · soft c/g · y as vowel · inflections · 2-syllable · r-controlled
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-blue-400/30 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

            {/* Green Phase Lessons — deep green */}
            <a
              href="/language-area-green.html"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(21,128,61,0.04))',
                borderColor: 'rgba(34,197,94,0.18)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(21,128,61,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(34,197,94,0.18)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Green Phase Lessons</div>
                <div className="text-green-200/40 text-sm mt-0.5">
                  UFLI L84-128 · vowel teams · silent letters · suffixes · prefixes · Greek + Latin roots
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-green-400/30 group-hover:text-green-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

          </div>

          <p className="text-white/30 mt-12 text-sm leading-relaxed max-w-md mx-auto">
            Built on UFLI Foundations &middot; AMI Montessori &middot; the Science of Reading. Mandarin-L1 ESL adaptations woven throughout.
          </p>

        </div>
      </div>

      <div className="relative z-10 px-6 py-5 text-center">
        <p className="text-white/20 text-xs tracking-wider uppercase">
          Writing first &middot; Reading follows
        </p>
      </div>
    </div>
  );
}
