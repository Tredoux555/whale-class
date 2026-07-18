// /montree/library/page.tsx
// Montree Library — Welcome Landing Page
'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';

export default function LibraryWelcomePage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ background: '#06140e' }}>

      {/* Background gradient — matches landing page */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
          radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
          linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
        `,
      }} />

      {/* Nav */}
      <nav
        className="relative z-10 px-6 pb-5 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
      >
        <Link
          href="/montree"
          className="text-white/40 text-sm hover:text-white/70 transition-colors"
        >
          ← montree.xyz
        </Link>
        <LanguageToggle />
      </nav>

      {/* Centered content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-8">
        <div className="max-w-xl w-full text-center">

          {/* Small badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/50 text-xs tracking-wide uppercase">{t('library.openResource')}</span>
          </div>

          {/* Welcome */}
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            <span className="text-white/90">{t('library.welcomeTo')}</span>
            <br />
            <span style={{ background: 'linear-gradient(135deg, #6ee7b7, #34d399, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('library.montreeLibrary')}
            </span>
          </h1>

          <p className="text-white/40 mt-5 text-lg max-w-sm mx-auto leading-relaxed">
            {t('library.description')}
          </p>

          {/* Two paths */}
          <div className="mt-14 space-y-4">

            {/* Dark Phonics — violet accent, TOP CARD (the flagship phonics program) */}
            <a
              href="/dark-phonics.html"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(167,139,250,0.10), rgba(124,58,237,0.04))',
                borderColor: 'rgba(167,139,250,0.18)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.14), rgba(124,58,237,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.18)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-300">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Dark Phonics</div>
                <div className="text-violet-200/40 text-sm mt-0.5">
                  49 sound-songs &middot; music videos, vocab card packs, flashcards, sing-alongs, books &amp; easy readers
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-violet-300/30 group-hover:text-violet-300 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

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
                <div className="text-white font-semibold text-lg">{t('library.contentCreationTools')}</div>
                <div className="text-amber-200/40 text-sm mt-0.5">
                  {t('library.contentCreationDescription')}
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-amber-400/30 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Curriculum Studio — gold accent (the 26-week sound year) */}
            <Link
              href="/montree/library/curriculum-studio"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(232,201,106,0.10), rgba(180,140,40,0.04))',
                borderColor: 'rgba(232,201,106,0.20)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(232,201,106,0.14), rgba(180,140,40,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(232,201,106,0.16)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#E8C96A' }}>
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Curriculum Studio</div>
                <div className="text-sm mt-0.5" style={{ color: 'rgba(232,201,106,0.55)' }}>
                  The 26-Week Sound Year &middot; pick a week, drop pictures, print every material
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 group-hover:translate-x-1 transition-all shrink-0" style={{ color: 'rgba(232,201,106,0.4)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Picture Bank — blue accent */}
            <Link
              href="/montree/library/photo-bank"
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(59, 130, 246, 0.04))',
                borderColor: 'rgba(96, 165, 250, 0.15)',
              }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.12), rgba(59, 130, 246, 0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ background: 'rgba(96, 165, 250, 0.15)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">Picture Bank</div>
                <div className="text-blue-200/40 text-sm mt-0.5">
                  Search, browse &amp; contribute English teaching pictures
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-blue-400/30 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* The Complete Language Area — emerald accent */}
            <Link
              href="/montree/library/language-area"
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
                <div className="text-white font-semibold text-lg">The Complete Language Area</div>
                <div className="text-emerald-200/40 text-sm mt-0.5">
                  Setup guide &amp; lesson-by-lesson word bank &middot; writing first &middot; UFLI L1-53
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-emerald-400/30 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-6 py-5 text-center">
        <p className="text-white/20 text-xs tracking-wider uppercase">
          {t('library.byTeachers')}
        </p>
      </div>
    </div>
  );
}
