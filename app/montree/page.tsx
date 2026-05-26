'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import MontreeLogo from '@/components/montree/MonteeLogo';

// /montree/page.tsx — Montree landing page (v2 — deep forest palette)

// Splash video assets — one per language we currently offer (EN + 中文 only).
// The picker on the video itself is INDEPENDENT of the page-wide LanguageToggle
// (which switches UI strings across 12 locales). The video toggle is a small
// EN / 中文 pill pair overlaid on the corner-video; it only flips THIS video's
// src + poster. Independent state by design — a French principal browsing the
// site shouldn't be forced into the English video, and we don't want the EN
// video to disappear the moment someone clicks 中文 on the UI toggle.
const SPLASH_VIDEOS = {
  en: {
    src: '/montree-splash-video.mp4',
    poster: '/montree-splash-video-poster.jpg',
    label: 'EN',
  },
  zh: {
    src: '/montree-splash-video-zh.mp4',
    poster: '/montree-splash-video-zh-poster.jpg',
    label: '中文',
  },
} as const;
type SplashVideoLocale = keyof typeof SPLASH_VIDEOS;

export default function MontreeLanding() {
  const { t } = useI18n();
  const revealRefs = useRef<HTMLElement[]>([]);

  // Video-only locale state. Defaults to EN on every fresh page load.
  // Not persisted — keep it simple; toggle is a stateless visual switch.
  const [videoLocale, setVideoLocale] = useState<SplashVideoLocale>('en');
  const splashVideo = SPLASH_VIDEOS[videoLocale];

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = '1';
            (e.target as HTMLElement).style.transform = 'translateY(0)';
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    revealRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const addReveal = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      revealRefs.current.push(el);
    }
  };

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

        /* Full-page gradient — rendered as a real DOM element so Next.js doesn't block it */
        .m-bg {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), rgba(39,129,90,0) 55%),
            radial-gradient(ellipse 700px 600px at 82% 14%, rgba(130,217,174,0.24), rgba(130,217,174,0) 60%),
            linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%);
          z-index: 0;
          pointer-events: none;
        }
        .m-bg ~ * { position: relative; z-index: 1; }

        .m-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #E8C96A;
          font-weight: 500;
        }

        .m-pill {
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
        .m-pill:hover {
          transform: translateY(-1px);
          border-color: rgba(130,217,174,0.32);
          box-shadow:
            0 1px 0 rgba(130,217,174,0.3) inset,
            0 0 0 1px rgba(0,0,0,0.25) inset,
            0 16px 36px -12px rgba(6,20,14,0.9),
            0 0 0 4px rgba(71,171,126,0.08);
          filter: brightness(1.06);
        }
        .m-pill:active {
          transform: translateY(0);
          filter: brightness(0.97);
        }
        .m-pill-lg {
          padding: 18px 34px;
          font-size: 1rem;
        }

        /* ── Hero corner video ──
           Autoplay muted loop ambient clip pinned to the top-left of the
           hero. Sits BELOW the sticky nav (which has its own z-index) and
           to the LEFT of the centered hero text. Position is absolute so
           it doesn't affect the centered text layout. The text just stays
           centered as before; the video is decoration in the corner.

           Mobile (≤640px): position becomes static — the video drops into
           normal flow above the centered text. Sized down so it doesn't
           dominate the small viewport.

           Frame includes a self-contained EN / 中文 toggle overlay in the
           bottom-right. Independent of the page-wide LanguageToggle.
        */
        .m-hero-corner-video {
          position: absolute;
          top: 32px;
          left: 32px;
          width: clamp(260px, 28vw, 360px);
          z-index: 2;
        }
        .m-hero-corner-video-frame {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #06140e;
          border: 1px solid rgba(130,217,174,0.22);
          box-shadow:
            0 1px 0 rgba(130,217,174,0.08) inset,
            0 18px 44px -18px rgba(0,0,0,0.75),
            0 6px 14px -8px rgba(0,0,0,0.5);
        }
        .m-hero-corner-video-element {
          display: block;
          width: 100%;
          height: auto;
          aspect-ratio: 16 / 9;
          background: #06140e;
        }
        .m-hero-corner-video-toggle {
          position: absolute;
          bottom: 8px;
          right: 8px;
          display: inline-flex;
          gap: 2px;
          padding: 3px;
          border-radius: 999px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .m-hero-corner-video-toggle-btn {
          appearance: none;
          border: 0;
          background: transparent;
          color: rgba(255,255,255,0.55);
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: 4px 10px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease;
          line-height: 1;
        }
        .m-hero-corner-video-toggle-btn:hover {
          color: rgba(255,255,255,0.92);
        }
        .m-hero-corner-video-toggle-btn[aria-pressed='true'] {
          background: rgba(232,201,106,0.92);
          color: #1a1208;
        }

        /* ── Nav ── */
        .m-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(8,26,18,0.72);
          backdrop-filter: saturate(180%) blur(14px);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          /* Edge-to-edge iPhones (notch / Dynamic Island): pad the bar down
             past the status bar so the logo and links never hide under it.
             env() is 0 on devices with no inset, so this is harmless
             everywhere else. viewport-fit=cover is already set in app/layout. */
          padding-top: env(safe-area-inset-top);
        }
        .m-nav-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 18px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .m-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        /* .m-logo-mark and ::after rules removed — replaced by the
           <MontreeLogo> component which carries its own styling + spark. */
        .m-logo-word {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 500;
          font-size: 1.125rem;
          letter-spacing: -0.01em;
          background: linear-gradient(90deg, #62C396 0%, #47AB7E 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .m-nav .m-pill {
          padding: 10px 20px;
          font-size: 0.875rem;
        }

        /* ── Hero ── */
        .m-hero {
          position: relative;
          min-height: calc(100vh - 70px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 120px 32px 140px;
        }
        .m-hero .m-label { margin-bottom: 40px; }
        .m-hero-quote {
          font-family: var(--font-lora), Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: clamp(14px, 1.6vw, 18px);
          letter-spacing: 0.01em;
          color: rgba(255,255,255,0.55);
          margin-bottom: 28px;
          max-width: 38ch;
          line-height: 1.6;
        }
        .m-hero-quote-attr {
          display: block;
          margin-top: 6px;
          font-style: normal;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.38);
          letter-spacing: 0.04em;
        }
        .m-hero-evolve {
          font-family: var(--font-lora), Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: clamp(16px, 1.9vw, 22px);
          letter-spacing: 0.01em;
          color: rgba(255,255,255,0.82);
          margin: 0 0 36px 0;
          max-width: 32ch;
          line-height: 1.45;
        }
        .m-hero-kicker {
          font-family: var(--font-lora), Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: clamp(18px, 2.5vw, 28px);
          letter-spacing: 0.04em;
          color: #E8C96A;
          margin-bottom: 18px;
          text-shadow: 0 0 24px rgba(232,201,106,0.18);
        }
        /* When the kicker sits BELOW the CTA, swap the top/bottom margin so it
           breathes underneath the button instead of crowding the title above. */
        .m-hero-kicker.m-hero-kicker-below {
          margin-bottom: 0;
          margin-top: 36px;
        }
        /* Vertical stack with proportional spacing between title → CTA → kicker.
           Title margin-bottom (44px) > CTA → kicker margin-top (36px) so the
           negative space tapers naturally as the eye moves down. */
        .m-hero-stack {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .m-hero h1 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(3.25rem, 8vw, 6rem);
          line-height: 1.04;
          letter-spacing: -0.025em;
          color: #ffffff;
          margin: 0 0 14px 0;
          max-width: 14ch;
        }
        /* Tagline sits directly under the h1 brand mark.
           Same serif as the title for visual continuity, smaller + lighter so
           the brand word "Montree" leads and the tagline supports it. */
        .m-hero-tagline {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-style: italic;
          font-size: clamp(1.125rem, 2.4vw, 1.5rem);
          line-height: 1.35;
          letter-spacing: 0.005em;
          color: rgba(255,255,255,0.7);
          margin: 0 0 44px 0;
          max-width: 26ch;
        }
        .m-hero-sub {
          font-size: 1.125rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.6;
          margin-bottom: 44px;
          max-width: 36ch;
        }
        .m-hero-fineprint {
          margin-top: 22px;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.32);
          letter-spacing: 0.02em;
        }

        /* ── Editorial ── */
        .m-editorial {
          padding: 60px 32px 140px;
        }
        .m-editorial-inner {
          max-width: 600px;
          margin: 0 auto;
        }
        .m-block {
          padding: 56px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .m-block:first-child { padding-top: 16px; }
        .m-block:last-child { border-bottom: 0; }
        .m-block .m-label { display: block; margin-bottom: 22px; }
        .m-block h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.875rem, 3.6vw, 2.5rem);
          line-height: 1.18;
          letter-spacing: -0.018em;
          color: rgba(255,255,255,0.92);
          margin-bottom: 22px;
        }
        .m-block p {
          color: rgba(255,255,255,0.40);
          line-height: 1.85;
          font-size: 1.0625rem;
        }

        /* ── Closing CTA ── */
        .m-closing {
          padding: 160px 32px 160px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .m-closing h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.25rem, 5.2vw, 3.4rem);
          line-height: 1.1;
          letter-spacing: -0.022em;
          color: #ffffff;
          margin-bottom: 24px;
        }
        .m-closing-sub {
          color: rgba(255,255,255,0.55);
          font-size: 1.0625rem;
          line-height: 1.7;
          max-width: 44ch;
          margin: 0 auto 40px;
        }

        /* ── Bottom quote ── */
        .m-bottom-quote {
          padding: 80px 32px 96px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .m-bottom-quote-body {
          font-family: var(--font-lora), Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: clamp(16px, 2vw, 22px);
          letter-spacing: 0.01em;
          color: rgba(255,255,255,0.55);
          margin: 0 auto 12px;
          max-width: 36ch;
          line-height: 1.6;
        }
        .m-bottom-quote-attr {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.32);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin: 0;
        }

        /* ── Footer ── */
        .m-footer {
          padding: 56px 32px 64px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 0.78rem;
          letter-spacing: 0.02em;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .m-footer-inner {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .m-footer-mark {
          width: 16px;
          height: 16px;
          border-radius: 5px;
          background: linear-gradient(135deg, #1D6B48 0%, #0c2419 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(130,217,174,0.18);
          opacity: 0.85;
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          /* Hide secondary nav links on mobile (Become an ambassador,
             About) but keep Library (m-nav-link-library) visible on the
             left and Log in on the right — per user directive these are
             the always-reachable links. */
          .m-nav-link-secondary { display: none; }
          .m-nav-link-library { font-size: 0.875rem; }
          .m-nav-link-login { font-size: 0.875rem; }
          .m-nav-inner { padding: 14px 20px; }
          /* Mobile: hero stacks vertically with the corner video flowing in
             above the centered text (static position) instead of overlapping. */
          .m-hero { padding: 32px 24px 80px; }
          .m-hero .m-label { margin-bottom: 28px; }
          .m-hero-sub { margin-bottom: 32px; }
          .m-hero-corner-video {
            position: static;
            width: min(280px, 75vw);
            margin: 0 auto 36px;
          }
          .m-hero-corner-video-frame { border-radius: 10px; }
          .m-hero-corner-video-toggle { bottom: 6px; right: 6px; }
          .m-hero-corner-video-toggle-btn { font-size: 10px; padding: 3px 8px; }
          .m-editorial { padding: 40px 24px 100px; }
          .m-block { padding: 40px 0; }
          .m-closing { padding: 110px 24px 110px; }
          .m-bottom-quote { padding: 56px 24px 72px; }
          .m-footer { padding: 40px 24px 48px; }
        }
      `}</style>

      {/* ── BACKGROUND GRADIENT — rendered as a real div so Next.js stacking context can't block it ── */}
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

      {/* ── PAGE CONTENT — sits above the fixed gradient div ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── NAV ──
          LEFT cluster:  brand mark + 'Montree' wordmark + Library link
          RIGHT cluster: Become an ambassador · About · Log in · LanguageToggle
          On mobile (≤640px): Library STAYS visible on the left (user
          directive — Library must be reachable everywhere). Become an
          ambassador + About collapse via .m-nav-link-secondary. Log in +
          LanguageToggle remain visible on the right.
      */}
      <nav className="m-nav" aria-label="Primary">
        <div className="m-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <a className="m-logo" href="/montree" aria-label="Montree home">
              <MontreeLogo size={28} />
              <span className="m-logo-word">Montree</span>
            </a>
            <Link
              className="m-nav-link m-nav-link-library"
              href="/montree/library"
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.55)',
                textDecoration: 'none',
                letterSpacing: '0.01em',
                transition: 'color 200ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
            >
              {t('landing.nav.library')}
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link className="m-nav-link m-nav-link-secondary" href="/montree/become-an-agent" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', letterSpacing: '0.01em', transition: 'color 200ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              {t('landing.nav.forTeachers')}
            </Link>
            <Link className="m-nav-link m-nav-link-secondary" href="/montree/about" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', letterSpacing: '0.01em', transition: 'color 200ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              About
            </Link>
            {/* Security nav link removed per user directive — the /montree/security
                route still exists for direct access; it's just not surfaced on the
                landing nav (avoids implying there's something to hide). */}
            {/* "What's new" link removed from public landing nav per Session 108 directive —
                /montree/changelog is internal-use only now. The route still exists for direct
                access. */}
            <Link className="m-nav-link m-nav-link-login" href="/montree/login-select" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', letterSpacing: '0.01em', transition: 'color 200ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              {t('landing.nav.login')}
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </nav>

      {/* ── HERO ──
          Session 130: brand-statement form + corner autoplay video.
            • Corner video: top-left, autoplay muted loop, EN/中文 toggle
              overlaid. Independent of the page-wide LanguageToggle.
            • Centered text stack:
              1. Montree                                — h1, brand name
              2. the AI Montessori classroom revolution — tagline below
              3. Try it                                 — primary CTA
              4. Work smarter not harder                — italic gold kicker

          Why corner-video and not inline-below-hero / lightbox / pre-roll:
          users landing on the page want to know what Montree is BEFORE
          they read anything. The video plays the moment the page loads,
          ambient and muted, in the corner where it doesn't fight the
          centered text but is the first thing the eye picks up.
      */}
      <section className="m-hero">
        {/* Corner video. NOT wrapped with ref={addReveal} — the reveal
            pattern's JS-set opacity racing the <video>'s first paint
            caused the 2ms flash users reported earlier. Visible from
            first paint instead. */}
        <div className="m-hero-corner-video">
          <div className="m-hero-corner-video-frame">
            {/* key={src} so React rebuilds the player when the user
                flips EN ↔ 中文 — without that, the old buffer + playhead
                point at the previous locale's MP4 and the new src
                doesn't load. */}
            <video
              key={splashVideo.src}
              className="m-hero-corner-video-element"
              src={splashVideo.src}
              poster={splashVideo.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label="Montree introduction video"
            />
            <div className="m-hero-corner-video-toggle" role="group" aria-label="Video language">
              {(['en', 'zh'] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className="m-hero-corner-video-toggle-btn"
                  aria-pressed={videoLocale === loc}
                  onClick={() => setVideoLocale(loc)}
                >
                  {SPLASH_VIDEOS[loc].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div ref={addReveal} className="m-hero-stack">
          <h1>{t('landing.hero.title')}</h1>
          <p className="m-hero-tagline">{t('landing.hero.tagline')}</p>
          <Link className="m-pill m-pill-lg" href="/montree/login-select?signup=true">
            {t('landing.hero.cta')}
          </Link>
          <span className="m-hero-kicker m-hero-kicker-below">{t('landing.hero.kicker')}</span>
        </div>
      </section>

      {/* ── THREE STATEMENTS ── */}
      <section className="m-editorial" aria-label="What Montree does">
        <div className="m-editorial-inner">

          <article className="m-block" ref={addReveal}>
            <span className="m-label">{t('landing.teacher.label')}</span>
            <h2>{t('landing.teacher.title')}</h2>
            <p>{t('landing.teacher.body')}</p>
          </article>

          <article className="m-block" ref={addReveal}>
            <span className="m-label">{t('landing.parents.label')}</span>
            <h2>{t('landing.parents.title')}</h2>
            <p>{t('landing.parents.body')}</p>
          </article>

          <article className="m-block" ref={addReveal}>
            <span className="m-label">{t('landing.principal.label')}</span>
            <h2>{t('landing.principal.title')}</h2>
            <p>{t('landing.principal.body')}</p>
          </article>

        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="m-closing" id="cta" ref={addReveal}>
        <h2>{t('landing.closing.title')}</h2>
        <p className="m-closing-sub">{t('landing.closing.body')}</p>
        <a className="m-pill m-pill-lg" href="/montree/login-select?signup=true">
          {t('landing.closing.cta')}
        </a>
      </section>

      {/* ── BOTTOM QUOTE ──
          Maria Montessori quote moved here from the hero per Session 113 V2
          user directive. A quiet closing thought before the footer.
      */}
      <section className="m-bottom-quote" aria-label="Maria Montessori quote" ref={addReveal}>
        <p className="m-bottom-quote-body">&ldquo;{t('landing.quote.body')}&rdquo;</p>
        <p className="m-bottom-quote-attr">— {t('landing.quote.attribution')}</p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="m-footer">
        <div className="m-footer-inner">
          <MontreeLogo size={14} />
          <span>Montree · montree.xyz</span>
        </div>
      </footer>
      </div>
    </>
  );
}
