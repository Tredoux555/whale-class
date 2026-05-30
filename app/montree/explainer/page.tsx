'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import MontreeLogo from '@/components/montree/MonteeLogo';

// /montree/explainer — the explainer video series (deep-forest palette,
// matches app/montree/page.tsx). A hero film plus a feature-by-feature
// gallery. Each video streams from the montree-media Supabase bucket via the
// CDN-cached media proxy, exactly like the splash film on the landing page.
//
// HOW TO PUBLISH A NEW VIDEO (no code change needed beyond the flag):
//   1. Produce the clip (see Montree_HeyGen_Scripts.md — slugs match below).
//   2. Upload it to montree-media/explainer/<slug>.mp4
//   3. Flip `available: true` on that entry. The card becomes playable.
// Until then the card shows a tasteful "Coming soon" tile with the feature's
// value line — so the gallery reads as a real showcase even before every
// film exists. We use CSS gradient tiles, not <img> posters, so there are
// never broken-image requests for clips that haven't been shot yet.

const PROXY = '/api/montree/media/proxy';

type VideoFormat = '16:9' | '9:16';

interface ExplainerVideo {
  slug: string;
  category: string; // short label, e.g. "Smart Capture"
  title: string; // one-line headline
  line: string; // the value proposition, one sentence
  share: string; // the share trigger from the script
  format: VideoFormat;
  available: boolean;
  src: string; // media-proxy URL (used once available)
}

// Hero reuses the existing, already-live splash film. The 12 feature clips
// are scripted (Montree_HeyGen_Scripts.md) and land here as they're produced.
const HERO: ExplainerVideo = {
  slug: 'main-explainer',
  category: 'Montree',
  title: 'What makes Montree different?',
  line: 'A teacher takes a photo. Montree identifies the work, records the observation, writes the parent report, and tracks every child — automatically.',
  share: '',
  format: '9:16',
  // The all-encompassing main explainer film — live.
  available: true,
  src: `${PROXY}/explainer/main-explainer.mp4`,
};

const FEATURES: ExplainerVideo[] = [
  {
    slug: 'smart-capture',
    category: 'Smart Capture',
    title: 'The end of writing observations.',
    line: 'One photo. Montree identifies the material, writes the observation, and updates the child’s progress on its own.',
    share: 'Send this to a teacher drowning in admin.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/smart-capture.mp4`,
  },
  {
    slug: 'weekly-reports',
    category: 'AI Weekly Reports',
    title: 'Forty-five minutes, written in moments.',
    line: 'Warm, specific, beautiful parent reports with the week’s photos woven in — every child, every week.',
    share: 'Send this to a teacher who dreads report week.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/weekly-reports.mp4`,
  },
  {
    slug: 'guru',
    category: 'Guru',
    title: 'Maria Montessori, in your pocket.',
    line: 'An assistant trained on everything Montessori wrote and the science of child development. Ask it anything, about any child.',
    share: 'Send this to a Montessori teacher you know.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/guru.mp4`,
  },
  {
    slug: 'astra',
    category: 'Astra',
    title: 'The whole school, in one conversation.',
    line: 'Montree’s AI for the head of school. Which children need attention, how a classroom is doing, what to tell a worried parent.',
    share: 'Send this to a Montessori principal.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/astra.mp4`,
  },
  {
    slug: 'curriculum',
    category: 'Curriculum & Planning',
    title: 'Your next lesson, already prepared.',
    line: 'The full Montessori curriculum is built in. Montree sees where a child is and shows you exactly what comes next.',
    share: 'Send this to a teacher who still plans by hand.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/curriculum.mp4`,
  },
  {
    slug: 'communication',
    category: 'Communication',
    title: 'Every conversation, in one place.',
    line: 'Teachers, parents, and the principal — one thread per family, the full history, always there. Nothing lost.',
    share: 'Send this to a school still chasing group chats.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/communication.mp4`,
  },
  {
    slug: 'voice-onboarding',
    category: 'Voice Onboarding',
    title: 'A whole class, set up by speaking.',
    line: 'Tell Montree about a child — ninety seconds, in your own words — and it builds their whole profile from what you say.',
    share: 'Send this to a teacher starting a new year.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/voice-onboarding.mp4`,
  },
  {
    slug: 'reading-tracker',
    category: 'Reading Tracker',
    title: 'Never lose a reader again.',
    line: 'Tracks every child’s reading journey lesson by lesson — who needs a push, who’s racing ahead, who’s quietly stuck.',
    share: 'Send this to a teacher teaching early reading.',
    format: '9:16',
    available: false,
    src: `${PROXY}/explainer/reading-tracker.mp4`,
  },
  {
    slug: 'appointments',
    category: 'Appointments',
    title: 'Book it. Meet by video. Inside Montree.',
    line: 'A parent picks a time and you meet by video, right inside the app. No links to chase. No apps to download.',
    share: 'Send this to a school doing parent conferences.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/appointments.mp4`,
  },
  {
    slug: 'library',
    category: 'Library Tools',
    title: 'Your prep time, handed back.',
    line: 'Three-part cards, picture bingo, sentence strips, flashcards — generated, printable, ready for tomorrow morning.',
    share: 'Send this to a teacher who makes their own cards.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/library.mp4`,
  },
  {
    slug: 'multilingual',
    category: 'Multilingual',
    title: 'Montessori, in your school’s language.',
    line: 'Montree speaks twelve languages, end to end. Teachers work in theirs. Parents read reports in theirs. No family left out.',
    share: 'Send this to a school where English isn’t the first language.',
    format: '9:16',
    available: true,
    src: `${PROXY}/explainer/multilingual.mp4`,
  },
];

export default function MontreeExplainer() {
  const { t } = useI18n();

  // Lightbox state — the feature video the user tapped to play (null = closed).
  const [active, setActive] = useState<ExplainerVideo | null>(null);

  const openVideo = useCallback((v: ExplainerVideo) => {
    if (!v.available) return;
    setActive(v);
  }, []);
  const closeVideo = useCallback(() => setActive(null), []);

  // ESC closes the lightbox; lock body scroll while it's open so the page
  // behind doesn't scroll under the modal on mobile.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeVideo();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [active, closeVideo]);

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        html, body { min-height: 100%; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-weight: 400;
          color: rgba(255,255,255,0.85);
          background: #06140e;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          line-height: 1.5;
          overflow-x: hidden;
        }
        .ex-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #E8C96A;
          font-weight: 500;
        }
        .ex-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 28px;
          border-radius: 999px;
          background: linear-gradient(180deg, #27815a 0%, #1D6B48 100%);
          color: #ffffff;
          text-decoration: none;
          font-size: 0.9375rem;
          font-weight: 500;
          letter-spacing: 0.005em;
          border: 1px solid rgba(130,217,174,0.18);
          cursor: pointer;
          transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease, border-color 200ms ease;
          box-shadow:
            0 1px 0 rgba(130,217,174,0.22) inset,
            0 0 0 1px rgba(0,0,0,0.25) inset,
            0 10px 28px -12px rgba(6,20,14,0.85),
            0 2px 6px -2px rgba(6,20,14,0.6);
          white-space: nowrap;
          font-family: inherit;
        }
        .ex-pill:hover {
          transform: translateY(-1px);
          border-color: rgba(130,217,174,0.32);
          filter: brightness(1.06);
        }
        .ex-pill-lg { padding: 18px 34px; font-size: 1rem; }

        /* ── Nav ── */
        .ex-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(8,26,18,0.72);
          backdrop-filter: saturate(180%) blur(14px);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-top: env(safe-area-inset-top);
        }
        .ex-nav-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 18px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ex-logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
        .ex-logo-word {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 500;
          font-size: 1.125rem;
          letter-spacing: -0.01em;
          background: linear-gradient(90deg, #62C396 0%, #47AB7E 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ex-nav-right { display: flex; align-items: center; gap: 16px; }
        .ex-nav-link {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          letter-spacing: 0.01em;
          transition: color 200ms ease;
        }
        .ex-nav-link:hover { color: rgba(255,255,255,0.85); }

        /* ── Hero ── */
        .ex-hero {
          max-width: 980px;
          margin: 0 auto;
          padding: 72px 32px 24px;
          text-align: center;
        }
        .ex-hero .ex-label { display: block; margin-bottom: 18px; }
        .ex-hero h1 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.25rem, 5vw, 3.5rem);
          line-height: 1.1;
          letter-spacing: -0.022em;
          color: #ffffff;
          margin: 0 auto 20px;
          max-width: 18ch;
        }
        .ex-hero-sub {
          font-size: 1.0625rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.7;
          max-width: 52ch;
          margin: 0 auto 36px;
        }
        .ex-hero-video {
          position: relative;
          width: 100%;
          max-width: 360px;
          margin: 0 auto;
          aspect-ratio: 9 / 16;
          border-radius: 16px;
          overflow: hidden;
          background: #06140e;
          border: 1px solid rgba(130,217,174,0.22);
          box-shadow:
            0 1px 0 rgba(130,217,174,0.08) inset,
            0 18px 44px -18px rgba(0,0,0,0.75),
            0 6px 14px -8px rgba(0,0,0,0.5);
        }
        .ex-hero-video video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        /* Portrait "coming soon" slot — shown until the main explainer film is
           produced and uploaded to explainer/main-explainer.mp4. */
        .ex-hero-soon {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: linear-gradient(160deg, #154a32 0%, #0a2418 100%);
        }
        .ex-hero-soon-badge {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.14);
          padding: 6px 14px;
          border-radius: 999px;
        }
        .ex-hero-soon-text {
          font-family: var(--font-lora), Georgia, serif;
          font-style: italic;
          font-size: 1rem;
          color: rgba(255,255,255,0.6);
        }
        .ex-hero-cta { margin-top: 36px; }
      `}</style>

      <style jsx global>{`
        /* ── Feature gallery ── */
        .ex-features { max-width: 1180px; margin: 0 auto; padding: 80px 32px 40px; }
        .ex-features-head { text-align: center; margin-bottom: 48px; }
        .ex-features-head .ex-label { display: block; margin-bottom: 16px; }
        .ex-features-head h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.75rem, 3.6vw, 2.5rem);
          line-height: 1.18;
          letter-spacing: -0.018em;
          color: rgba(255,255,255,0.92);
        }
        .ex-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 22px;
        }
        .ex-card {
          display: flex;
          flex-direction: column;
          text-align: left;
          background: rgba(12,36,25,0.55);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
          padding: 0;
          font-family: inherit;
          color: inherit;
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }
        .ex-card.is-available { cursor: pointer; }
        .ex-card.is-available:hover {
          transform: translateY(-3px);
          border-color: rgba(130,217,174,0.32);
          box-shadow: 0 18px 40px -20px rgba(0,0,0,0.8);
        }
        .ex-card.is-available:hover .ex-card-play { transform: scale(1.08); background: rgba(232,201,106,0.95); color: #1a1208; }
        .ex-card-tile {
          position: relative;
          aspect-ratio: 9 / 16;
          max-height: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        /* Distinct calm gradient per card via inline style; this is the base. */
        .ex-card-glyph {
          font-family: var(--font-lora), Georgia, serif;
          font-size: 2rem;
          font-weight: 500;
          color: rgba(255,255,255,0.92);
          text-align: center;
          padding: 0 18px;
          line-height: 1.15;
          letter-spacing: -0.01em;
          z-index: 1;
        }
        .ex-card-play {
          position: absolute;
          z-index: 2;
          width: 56px;
          height: 56px;
          border-radius: 999px;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.25);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 200ms ease, background 200ms ease, color 200ms ease;
        }
        .ex-card-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 2;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 600;
          color: rgba(255,255,255,0.78);
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.14);
          padding: 5px 10px;
          border-radius: 999px;
        }
        .ex-card-cat {
          position: absolute;
          bottom: 12px;
          left: 12px;
          right: 12px;
          z-index: 2;
          font-size: 0.95rem;
          font-weight: 500;
          color: #fff;
          text-shadow: 0 1px 8px rgba(0,0,0,0.6);
        }
        .ex-card-body { padding: 18px 18px 20px; }
        .ex-card-title {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: 1.1875rem;
          line-height: 1.25;
          letter-spacing: -0.01em;
          color: rgba(255,255,255,0.94);
          margin: 0 0 10px;
        }
        .ex-card-line {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.6;
          margin: 0 0 14px;
        }
        .ex-card-share {
          font-size: 0.8rem;
          color: rgba(130,217,174,0.7);
          letter-spacing: 0.01em;
          margin: 0;
          font-style: italic;
        }

        /* ── Closing ── */
        .ex-closing {
          padding: 120px 32px 130px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin-top: 48px;
        }
        .ex-closing h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2rem, 5vw, 3rem);
          line-height: 1.12;
          letter-spacing: -0.022em;
          color: #ffffff;
          margin-bottom: 22px;
        }
        .ex-closing-sub {
          color: rgba(255,255,255,0.55);
          font-size: 1.0625rem;
          line-height: 1.7;
          max-width: 46ch;
          margin: 0 auto 36px;
        }

        /* ── Footer ── */
        .ex-footer {
          padding: 48px 32px 60px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 0.78rem;
          letter-spacing: 0.02em;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .ex-footer-inner { display: inline-flex; align-items: center; gap: 8px; }

        /* ── Lightbox ── */
        .ex-lb {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(3,10,7,0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: ex-lb-in 220ms ease;
        }
        @keyframes ex-lb-in { from { opacity: 0; } to { opacity: 1; } }
        .ex-lb-inner {
          position: relative;
          width: 100%;
          max-width: 420px;
          aspect-ratio: 9 / 16;
          max-height: 84vh;
          border-radius: 16px;
          overflow: hidden;
          background: #06140e;
          border: 1px solid rgba(130,217,174,0.22);
          box-shadow: 0 30px 80px -20px rgba(0,0,0,0.9);
        }
        .ex-lb-inner video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ex-lb-close {
          position: absolute;
          top: -14px;
          right: -14px;
          z-index: 3;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          background: #E8C96A;
          color: #1a1208;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 22px -8px rgba(0,0,0,0.7);
        }
        @media (max-width: 640px) {
          .ex-nav-inner { padding: 14px 20px; }
          .ex-hero { padding: 40px 20px 16px; }
          .ex-features { padding: 56px 20px 32px; }
          .ex-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
          .ex-card-body { padding: 14px 14px 16px; }
          .ex-card-title { font-size: 1.0625rem; }
          .ex-card-line { display: none; }
          .ex-closing { padding: 90px 20px 100px; }
          .ex-lb-close { top: 8px; right: 8px; }
        }
      `}</style>

      {/* Background gradient — fixed div so the stacking context can't block it */}
      <div aria-hidden="true" style={{
        position: 'fixed',
        inset: 0,
        background: `
          radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
          radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
          linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
        `,
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── NAV ── */}
        <nav className="ex-nav" aria-label="Primary">
          <div className="ex-nav-inner">
            <a className="ex-logo" href="/montree" aria-label="Montree home">
              <MontreeLogo size={28} />
              <span className="ex-logo-word">Montree</span>
            </a>
            <div className="ex-nav-right">
              <Link className="ex-nav-link" href="/montree">{t('explainer.nav.back')}</Link>
              <Link className="ex-nav-link" href="/montree/login-select">{t('landing.nav.login')}</Link>
              <LanguageToggle />
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="ex-hero">
          <span className="ex-label">{t('explainer.hero.label')}</span>
          <h1>{t('explainer.hero.title')}</h1>
          <p className="ex-hero-sub">{t('explainer.hero.sub')}</p>
          <div className="ex-hero-video">
            {HERO.available ? (
              <video
                src={HERO.src}
                autoPlay
                muted
                loop
                controls
                playsInline
                preload="auto"
                aria-label="Montree introduction video"
              />
            ) : (
              <div className="ex-hero-soon">
                <span className="ex-hero-soon-badge">{t('explainer.comingSoon')}</span>
                <span className="ex-hero-soon-text">The film is on its way</span>
              </div>
            )}
          </div>
          <div className="ex-hero-cta">
            <a className="ex-pill ex-pill-lg" href="/montree/login-select?signup=true">
              {t('explainer.hero.cta')}
            </a>
          </div>
        </section>

        {/* ── FEATURE GALLERY ── */}
        <section className="ex-features" aria-label="Montree features explained">
          <div className="ex-features-head">
            <span className="ex-label">{t('explainer.features.label')}</span>
            <h2>{t('explainer.features.title')}</h2>
          </div>
          <div className="ex-grid">
            {FEATURES.map((v, i) => {
              // Calm per-card gradient for the placeholder tile — varied hue so
              // the wall of cards reads as distinct films, not one repeated tile.
              const hues = [
                'linear-gradient(160deg, #154a32 0%, #0a2418 100%)',
                'linear-gradient(160deg, #1d5a3e 0%, #0c2a1c 100%)',
                'linear-gradient(160deg, #2a6b4a 0%, #0e2e1f 100%)',
                'linear-gradient(160deg, #133f2c 0%, #081f15 100%)',
              ];
              const bg = hues[i % hues.length];
              return (
                <button
                  key={v.slug}
                  type="button"
                  className={`ex-card${v.available ? ' is-available' : ''}`}
                  onClick={() => openVideo(v)}
                  disabled={!v.available}
                  aria-label={v.available ? `${t('explainer.watch')}: ${v.category}` : `${v.category} — ${t('explainer.comingSoon')}`}
                >
                  <div className="ex-card-tile" style={{ background: bg }}>
                    <span className="ex-card-glyph">{v.category}</span>
                    {v.available ? (
                      <span className="ex-card-play" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    ) : (
                      <span className="ex-card-badge">{t('explainer.comingSoon')}</span>
                    )}
                  </div>
                  <div className="ex-card-body">
                    <h3 className="ex-card-title">{v.title}</h3>
                    <p className="ex-card-line">{v.line}</p>
                    {v.share && <p className="ex-card-share">{v.share}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── CLOSING CTA ── */}
        <section className="ex-closing">
          <h2>{t('explainer.closing.title')}</h2>
          <p className="ex-closing-sub">{t('explainer.closing.body')}</p>
          <a className="ex-pill ex-pill-lg" href="/montree/login-select?signup=true">
            {t('explainer.closing.cta')}
          </a>
        </section>

        {/* ── FOOTER ── */}
        <footer className="ex-footer">
          <div className="ex-footer-inner">
            <MontreeLogo size={14} />
            <span>Montree · montree.xyz</span>
          </div>
        </footer>
      </div>

      {/* ── LIGHTBOX ── */}
      {active && (
        <div
          className="ex-lb"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.category} video`}
          onClick={closeVideo}
        >
          <div className="ex-lb-inner" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ex-lb-close" aria-label="Close video" onClick={closeVideo}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <video
              key={active.slug}
              src={active.src}
              autoPlay
              controls
              playsInline
              preload="auto"
              aria-label={`${active.category} explainer`}
            />
          </div>
        </div>
      )}
    </>
  );
}
