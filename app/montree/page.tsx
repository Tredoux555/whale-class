'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSession } from '@/lib/montree/auth';
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
// Videos are served from the montree-media Supabase bucket via the CDN-cached
// media proxy (range-seekable, Cloudflare edge cache) rather than committed to
// /public — they're 48-65MB each and don't belong in git. Posters stay local
// (tiny). To swap a splash video: re-upload to montree-media/splash/ and the
// proxy URL is unchanged.
const SPLASH_VIDEOS = {
  en: {
    // v4 (Session 134) = the all-encompassing MAIN EXPLAINER film as the EN
    // hero (portrait 9:16, 720x1280 CRF26 faststart, ~5.9MB). The 中文 slot
    // keeps the Astra clip. Versioned filename busts the CDN cache.
    src: '/api/montree/media/proxy/splash/montree-splash-video-v4.mp4',
    poster: '/montree-splash-video-v4-poster.jpg',
    label: 'EN',
  },
  zh: {
    src: '/api/montree/media/proxy/splash/montree-splash-video-zh-v3.mp4',
    poster: '/montree-splash-video-zh-v3-poster.jpg',
    label: '中文',
  },
} as const;
type SplashVideoLocale = keyof typeof SPLASH_VIDEOS;

// Hero explainer video — hidden on the splash FOR NOW (Tredoux, Jul 2026).
// Flip to true to bring the corner video (+ EN/中文 toggle + tap-for-sound)
// back. Typed boolean so the video JSX/state/effect stay wired and lint-clean
// while hidden. The nav "Explainer" link + /montree/explainer page are
// untouched — this only removes the video from the splash hero.
const SHOW_HERO_VIDEO: boolean = false;

export default function MontreeLanding() {
  const { t } = useI18n();
  const revealRefs = useRef<HTMLElement[]>([]);

  // ── PWA app-mode launch (Jul 3 2026, Tredoux) ──
  // When Montree is opened FROM THE HOME SCREEN (standalone display mode),
  // it must act like an app: a signed-in user goes straight to their school,
  // never the marketing splash. The manifest start_url is /montree and iOS
  // bakes it in at install time, so this redirect is the fix that also works
  // for already-installed icons. Regular browser visits are unaffected.
  //
  // 🚨 Jul 4 2026 — use a HARD navigation (window.location.replace), NOT a
  // soft router.replace. On iOS standalone the localStorage session is
  // sometimes wiped between launches (see tier-3 note below), so the pre-paint
  // hard redirect script doesn't fire and THIS effect becomes the redirect
  // path. A soft router.replace transitions within the marketing splash's
  // document — inheriting its tall scroll layout / half-settled cold-launch
  // viewport — which rendered the app with the top half blank (self-healed on
  // a reopen once localStorage repopulated and the pre-paint path took over).
  // A hard navigation forces a fresh document + fresh viewport, matching the
  // clean pre-paint path.
  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    let cancelled = false;

    // Remember-the-surface marker: every redirect below persists where the
    // user landed so the pre-paint inline script (rendered above) can jump
    // straight there next launch — zero flash — for ANY role, parents
    // included. See rememberLaunchSurface() in lib/montree/launch-surface.
    const remember = (path: string) => {
      try { localStorage.setItem('montree_launch_surface', path); } catch {}
    };

    // 1. Teacher / homeschool session in localStorage — instant, no network.
    const sess = getSession();
    if (sess?.school?.id) {
      remember('/montree/dashboard');
      window.location.replace('/montree/dashboard');
      return;
    }

    // 2. Principal session (cockpit stores its own localStorage keys).
    try {
      if (localStorage.getItem('montree_principal')) {
        remember('/montree/admin');
        window.location.replace('/montree/admin');
        return;
      }
    } catch { /* storage unavailable — fall through */ }

    // 3. Cookie-only sessions (localStorage wiped on PWA relaunch is a known
    //    iOS behaviour): ask the server. Teacher + principal via auth/me,
    //    then parent via the parent session check. Stay on splash if none.
    (async () => {
      try {
        const r = await fetch('/api/montree/auth/me', { credentials: 'include' });
        if (r.ok) {
          const d = await r.json();
          if (!cancelled && d?.authenticated) {
            const surface = d.role === 'principal' ? '/montree/admin' : '/montree/dashboard';
            remember(surface);
            window.location.replace(surface);
            return;
          }
        }
      } catch { /* offline / no session — stay */ }
      try {
        const p = await fetch('/api/montree/parent/auth/access-code', { credentials: 'include' });
        if (p.ok) {
          const d = await p.json();
          if (!cancelled && (d?.authenticated || d?.valid)) {
            remember('/montree/parent/dashboard');
            window.location.replace('/montree/parent/dashboard');
          }
        }
      } catch { /* stay on splash */ }
    })();

    return () => { cancelled = true; };
  }, []);

  // Video-only locale state. Defaults to EN on every fresh page load.
  // Not persisted — keep it simple; toggle is a stateless visual switch.
  const [videoLocale, setVideoLocale] = useState<SplashVideoLocale>('en');

  // User-consent-to-sound state. Browser autoplay policy requires the
  // initial mount to be muted. Once the user explicitly taps the "Tap
  // for sound" overlay (or unmutes via native controls), we set this to
  // true and the unmute state propagates across locale toggles — so the
  // 中文 video also plays with sound once EN's been unmuted, and vice
  // versa. Mirrors the YouTube / Instagram autoplay-with-sound pattern.
  const [userUnmuted, setUserUnmuted] = useState(false);

  // Refs to the two video elements so we can imperatively toggle the
  // .muted property when the user taps the unmute overlay. React's
  // declarative `muted` attribute is initial-state-only on some
  // browsers (Chrome respects it via re-render, but Safari is sticky)
  // — setting .muted directly via ref is the reliable cross-browser path.
  const videoRefs = useRef<Record<SplashVideoLocale, HTMLVideoElement | null>>({
    en: null,
    zh: null,
  });

  // Whenever userUnmuted flips or videoLocale changes, sync the .muted
  // property on every video element, play the active locale, and PAUSE
  // the inactive one. The inactive video no longer background-plays —
  // it sits at preload="none" showing its poster until first activated
  // (PERF_PASS_JUN13.md finding 4: eagerly downloading BOTH locale
  // videos cost ~11MB on first load; the first EN↔中文 toggle now pays
  // a one-time short buffer instead). play() on a muted video needs no
  // gesture; unmuted play() happens inside the toggle/unmute click's
  // effect, where transient user activation still applies. Silent
  // .catch — if play() fails the user can hit play via native controls.
  //
  // NOTE: the fetch() cache-prime that used to live here was removed —
  // Lighthouse showed it RACING the <video> element's own request
  // (force-cache doesn't dedupe an in-flight Range-semantics media
  // request), so the EN video was downloaded twice (5.7MB × 2).
  useEffect(() => {
    if (!SHOW_HERO_VIDEO) return; // hero video hidden — nothing to sync
    (['en', 'zh'] as const).forEach((loc) => {
      const el = videoRefs.current[loc];
      if (!el) return;
      const isActive = loc === videoLocale;
      el.muted = !(isActive && userUnmuted);
      if (isActive) {
        el.play().catch(() => {
          /* user can re-trigger via native controls */
        });
      } else {
        el.pause();
      }
    });
  }, [videoLocale, userUnmuted]);

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
      {/* ── PWA no-flash launch gate (blocking, pre-paint) ──
          When Montree is opened from the home-screen icon (standalone
          display mode) by a signed-in user, we must NOT paint the marketing
          splash first. This inline <script> runs synchronously as the HTML is
          parsed — BEFORE the marketing content below renders — and hard-
          redirects to the app surface, so there's no visible flash.
          Three-tier, covers every role from launch one where possible:
            1. Teacher / homeschool  → montree_session (localStorage)
            2. Principal             → montree_principal (localStorage)
            3. ANYONE incl. parents  → montree_launch_surface, the last app
               surface they landed on (written on redirect + on each dashboard
               mount below). Parents auth by cookie with no synchronous signal,
               so this remembered-surface marker is how they get a flash-free
               launch too.
          The useEffect above is the network fallback (first launch before the
          marker exists / localStorage wiped by iOS). CSP allows 'unsafe-inline'
          scripts (next.config.ts). Logged-out launches fall through untouched;
          a stale marker just lands on a surface that bounces to login. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;if(!s)return;var t=localStorage.getItem('montree_session');if(t){var o=JSON.parse(t);if(o&&o.school&&o.school.id){location.replace('/montree/dashboard');return;}}if(localStorage.getItem('montree_principal')){location.replace('/montree/admin');return;}var g=localStorage.getItem('montree_launch_surface');if(g&&g.indexOf('/montree/')===0){location.replace(g);return;}}catch(e){}})();`,
        }}
      />
      {/* Plain <style> (NOT styled-jsx) — App Router has no styled-jsx
          StyleRegistry, so <style jsx global> renders NOTHING into the SSR
          HTML and the CSS only attached after hydration. Result: the first
          paint was completely unstyled, then the layout snapped into place
          when React hydrated — Lighthouse measured CLS 0.93 on this page
          (PERF_PASS_JUN13.md finding 4). A literal <style> element is
          server-rendered like any other element, so the hero frame's
          aspect-ratio box (and everything else) is reserved from the very
          first paint. Same pattern as AmbientParticles.tsx. */}
      <style dangerouslySetInnerHTML={{ __html: `
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

        /* ── Hero video ── (Session 131 redesign)
           Autoplay muted loop ambient clip flowing ABOVE the centered
           hero text. Was a 28vw top-left corner widget in S130; now a
           wide hero banner. ~720px max-width on desktop so it stays
           readable on ultra-wide displays; full width of the hero
           content box on tablets and phones.

           Frame includes a self-contained EN / 中文 toggle overlay in the
           top-right. Independent of the page-wide LanguageToggle.

           Tap-for-sound pill (.m-hero-corner-video-unmute) sits in the
           bottom-left of the frame ABOVE the native controls bar. Shown
           only when the active video is muted; disappears once the user
           consents to sound (either by tapping the pill or by using the
           native unmute icon). The class names retain the -corner-
           historical prefix to minimize churn across S130's other refs.
        */
        .m-hero-corner-video {
          position: relative;
          /* Portrait 9:16 video. Desktop: the LEFT column of the split hero —
             a fixed ~380px-wide phone-shaped preview. On ≤880px it returns to a
             full-width centred clip above the text (see media queries). */
          flex: 0 0 auto;
          width: 340px;
          max-width: 40vw;
          margin: 0;
          z-index: 2;
        }
        .m-hero-corner-video-frame {
          position: relative;
          /* aspect-ratio lives on the frame (not the videos) because both
             videos are absolutely positioned inside and stacked — the
             frame defines the height all on its own. */
          aspect-ratio: 9 / 16;
          border-radius: 12px;
          overflow: hidden;
          background: #06140e;
          border: 1px solid rgba(130,217,174,0.22);
          box-shadow:
            0 1px 0 rgba(130,217,174,0.08) inset,
            0 18px 44px -18px rgba(0,0,0,0.75),
            0 6px 14px -8px rgba(0,0,0,0.5);
        }
        /* Both EN and 中文 video elements render simultaneously, stacked
           inside the frame. Active one is opacity 1 + receives clicks /
           keyboard / native controls. Inactive one is opacity 0 + ignored
           by AT and pointers, paused at preload="none" (poster only — its
           media downloads on first activation; see the JSX comment). Both
           elements stay mounted so toggling BACK to a previously-watched
           locale is still an instant opacity flip. */
        .m-hero-corner-video-element {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #06140e;
          transition: opacity 180ms ease;
        }
        /* EN / 中文 pill pair lives TOP-RIGHT of the frame, not bottom,
           so it doesn't collide with the native video controls which
           always render at the bottom of the <video> element (and would
           overlap the toggle on hover-show or persistent-on-mobile). */
        .m-hero-corner-video-toggle {
          position: absolute;
          top: 8px;
          right: 8px;
          display: inline-flex;
          gap: 2px;
          padding: 3px;
          border-radius: 999px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.12);
          /* Z-index 3 so the toggle floats above BOTH video elements
             (active = z-index 2, inactive = z-index 1). */
          z-index: 3;
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
        /* Tap-for-sound pill — Session 131. Sits BOTTOM-LEFT of the
           video frame (native controls take the full bottom edge but
           a small pill at left clears the iOS unmute icon on the right).
           Visible only when the video is muted AND the user hasn't yet
           consented to sound. Disappears the moment they tap. */
        .m-hero-corner-video-unmute {
          position: absolute;
          bottom: 48px; /* sits above the native controls bar */
          left: 12px;
          z-index: 3;
          appearance: none;
          border: 1px solid rgba(232,201,106,0.45);
          background: rgba(232,201,106,0.92);
          color: #1a1208;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: 7px 14px;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          line-height: 1;
          box-shadow: 0 6px 18px -6px rgba(0,0,0,0.55);
          transition: opacity 200ms ease, transform 200ms ease;
          animation: m-hero-unmute-pulse 2400ms ease-in-out infinite;
        }
        .m-hero-corner-video-unmute:hover {
          transform: translateY(-1px);
        }
        @keyframes m-hero-unmute-pulse {
          0%, 100% { box-shadow: 0 6px 18px -6px rgba(232,201,106,0.55); }
          50% { box-shadow: 0 6px 28px -4px rgba(232,201,106,0.85); }
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

        /* ── Hero ── (Session 133: split layout)
           Desktop: two columns — portrait video LEFT, text block RIGHT,
           both vertically centred. Fills the horizontal space a tall 9:16
           video would otherwise leave empty. Collapses back to a centred
           stack at ≤880px (see media queries below). */
        .m-hero {
          position: relative;
          min-height: calc(100vh - 70px);
          max-width: 1040px;
          margin: 0 auto;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: clamp(44px, 5vw, 76px);
          text-align: left;
          padding: 64px 40px 88px;
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
          font-size: clamp(16px, 1.5vw, 20px);
          letter-spacing: 0.04em;
          color: #E8C96A;
          margin-bottom: 18px;
          text-shadow: 0 0 24px rgba(232,201,106,0.18);
        }
        /* When the kicker sits BELOW the CTA, swap the top/bottom margin so it
           breathes underneath the button instead of crowding the title above. */
        .m-hero-kicker.m-hero-kicker-below {
          margin-bottom: 0;
          margin-top: 24px;
        }
        /* Vertical stack with proportional spacing between title → CTA → kicker.
           Title margin-bottom (44px) > CTA → kicker margin-top (36px) so the
           negative space tapers naturally as the eye moves down. */
        .m-hero-stack {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          max-width: 28rem;
        }
        /* Gold eyebrow anchors the TOP of the text block so it reads as a unit
           with a clear hierarchy (eyebrow → name → tagline → CTA → line)
           instead of floating. Matches the site's section-label style. */
        .m-hero-eyebrow {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-weight: 500;
          color: #E8C96A;
          margin: 0 0 20px 0;
        }
        .m-hero h1 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          /* Sits WITH the tagline in the column, not shouting over it (the nav
             already carries the small wordmark). */
          font-size: clamp(2.5rem, 4.4vw, 4rem);
          line-height: 1.02;
          letter-spacing: -0.025em;
          color: #ffffff;
          margin: 0 0 10px 0;
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
          margin: 0 0 32px 0;
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

        /* ── Explainer teaser strip ──
           Sits between the three editorial statements and the closing CTA.
           A quiet invitation into /montree/explainer — not a hard sell. */
        .m-explainer-teaser {
          padding: 96px 32px 96px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .m-explainer-teaser .m-label { display: block; margin-bottom: 18px; }
        .m-explainer-teaser h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.875rem, 4vw, 2.75rem);
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin-bottom: 18px;
        }
        .m-explainer-teaser-sub {
          color: rgba(255,255,255,0.55);
          font-size: 1.0625rem;
          line-height: 1.7;
          max-width: 44ch;
          margin: 0 auto 32px;
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

        /* ≤880px: the split hero collapses to a single centred column —
           portrait video on top, text block (centred) below. */
        @media (max-width: 880px) {
          .m-hero {
            flex-direction: column;
            text-align: center;
            gap: 0;
            max-width: 540px;
            padding: 56px 24px 90px;
          }
          .m-hero-corner-video {
            width: 100%;
            max-width: 340px;
            margin: 0 auto 36px;
          }
          .m-hero-stack {
            align-items: center;
            max-width: 100%;
          }
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
            /* Mobile: portrait 9:16. Cap width so a tall phone video doesn't
               push the title too far down the fold — ~300px → ~533px tall,
               comfortable on a typical ~700px-tall mobile hero. */
            width: 86%;
            max-width: 300px;
            margin: 0 auto 28px;
          }
          .m-hero-corner-video-frame { border-radius: 10px; }
          .m-hero-corner-video-toggle { top: 6px; right: 6px; }
          .m-hero-corner-video-toggle-btn { font-size: 10px; padding: 3px 8px; }
          .m-hero-corner-video-unmute {
            font-size: 11px;
            padding: 6px 12px;
            bottom: 56px; /* clear of native controls on iOS */
          }
          .m-editorial { padding: 40px 24px 100px; }
          .m-block { padding: 40px 0; }
          .m-explainer-teaser { padding: 64px 24px 64px; }
          .m-closing { padding: 110px 24px 110px; }
          .m-bottom-quote { padding: 56px 24px 72px; }
          .m-footer { padding: 40px 24px 48px; }
        }
      ` }} />

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
            <Link
              className="m-nav-link m-nav-link-library"
              href="/montree/explainer"
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
              {t('landing.nav.explainer')}
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
        {/* Hero explainer video — hidden for now (SHOW_HERO_VIDEO flag at
            top of file). Flip to true to restore. NOT wrapped with
            ref={addReveal} — the reveal pattern's JS-set opacity racing the
            <video>'s first paint caused the 2ms flash users reported. */}
        {SHOW_HERO_VIDEO && (
        <div className="m-hero-corner-video">
          <div className="m-hero-corner-video-frame">
            {/* Dual-video pattern (Session 131, slimmed in the Jun 13 perf
                pass): BOTH EN and 中文 video elements stay mounted and
                stacked inside the frame, but only the ACTIVE locale
                downloads media. The inactive one sits at preload="none"
                showing its (local, tiny) poster — its first activation
                pays a one-time short buffer. Previously both files
                (5.7MB + 5.3MB) downloaded eagerly with preload="auto",
                which dominated the 13.4MB first-load weight Lighthouse
                flagged (PERF_PASS_JUN13.md finding 4).

                Active video uses preload="metadata", not "auto" — with
                autoPlay the browser streams progressively anyway, and
                metadata keeps the poster as the LCP candidate instead of
                blocking on video bytes.

                Key off the LOCALE (not src) so React keeps each <video>
                element across toggles — once a locale HAS been activated,
                toggling back to it is instant (element + buffer survive).

                controls — only on the active locale's element, so the
                hidden video's native control bar doesn't ghost-render
                underneath. Active video gets the full native HTML5
                control bar (mute/unmute, scrubber, fullscreen, PiP).

                playsInline — kept so the video does NOT auto-fullscreen
                on first tap (iOS Safari default). User can still go
                fullscreen explicitly via the controls. */}
            {(['en', 'zh'] as const).map((loc) => {
              const isActive = videoLocale === loc;
              const v = SPLASH_VIDEOS[loc];
              return (
                <video
                  key={loc}
                  ref={(el) => {
                    videoRefs.current[loc] = el;
                  }}
                  className="m-hero-corner-video-element"
                  src={v.src}
                  poster={v.poster}
                  autoPlay={isActive}
                  muted
                  loop
                  controls={isActive}
                  playsInline
                  preload={isActive ? 'metadata' : 'none'}
                  aria-hidden={!isActive}
                  aria-label={isActive ? 'Montree introduction video' : undefined}
                  tabIndex={isActive ? 0 : -1}
                  style={{
                    opacity: isActive ? 1 : 0,
                    pointerEvents: isActive ? 'auto' : 'none',
                    zIndex: isActive ? 2 : 1,
                  }}
                  /* Volume-change listener: if the user unmutes via the
                     native controls (speaker icon), reflect that into
                     userUnmuted state so the pill disappears AND the
                     unmute persists across locale toggle. Without this,
                     a user could unmute via the speaker icon, hit 中文,
                     and find sound gone again. */
                  onVolumeChange={(e) => {
                    if (!isActive) return;
                    const el = e.currentTarget;
                    if (!el.muted && !userUnmuted) {
                      setUserUnmuted(true);
                    }
                  }}
                />
              );
            })}
            {/* Tap-for-sound pill — only when the active video is still
                muted. Once tapped (or once the user uses native controls
                to unmute), userUnmuted flips true and the pill is
                removed forever for this page load. */}
            {!userUnmuted && (
              <button
                type="button"
                className="m-hero-corner-video-unmute"
                aria-label="Tap to enable sound"
                onClick={() => setUserUnmuted(true)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                Tap for sound
              </button>
            )}
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
        )}

        <div ref={addReveal} className="m-hero-stack">
          <span className="m-hero-eyebrow">{t('landing.hero.label')}</span>
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

      {/* ── EXPLAINER TEASER ──
          Invitation into the /montree/explainer video series. Quiet, not a
          hard sell — a single button into the gallery. */}
      <section className="m-explainer-teaser" ref={addReveal}>
        <span className="m-label">{t('landing.explainerTeaser.label')}</span>
        <h2>{t('landing.explainerTeaser.title')}</h2>
        <p className="m-explainer-teaser-sub">{t('landing.explainerTeaser.body')}</p>
        <Link className="m-pill m-pill-lg" href="/montree/explainer">
          {t('landing.explainerTeaser.cta')}
        </Link>
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
