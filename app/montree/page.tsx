'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { getSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import MontreeLogo from '@/components/montree/MonteeLogo';

// /montree/page.tsx — Montree landing page (v2 — deep forest palette)

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
          __html: `(function(){try{var s=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;if(!s)return;var t=localStorage.getItem('montree_session');if(t){var o=JSON.parse(t);if(o&&o.school&&o.school.id){location.replace('/montree/dashboard');return;}}if(localStorage.getItem('montree_principal')){location.replace('/montree/admin');return;}var g=localStorage.getItem('montree_launch_surface');if(g&&g.indexOf('/montree/')===0){location.replace(g);return;}var c=document.cookie.match(/(?:^|; )montree_surface=([^;]+)/);if(c){var cp=decodeURIComponent(c[1]);if(cp.indexOf('/montree/')===0){location.replace(cp);return;}}}catch(e){}})();`,
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
          color: rgba(255,250,240,0.58);
          background: #030b08;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          line-height: 1.5;
          overflow-x: hidden;
        }

        .m-label {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          color: rgba(232,201,106,0.55);
          font-weight: 500;
        }

        .m-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 13px 26px;
          border-radius: 10px;
          background: #1D5C41;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 500;
          letter-spacing: 0.005em;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: background 160ms ease;
          white-space: nowrap;
          font-family: inherit;
        }
        .m-pill:hover {
          background: #236B4C;
        }
        .m-pill-lg {
          padding: 15px 30px;
          font-size: 0.95rem;
        }

        /* ── Nav ── */
        .m-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(3,10,7,0.7);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
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
          font-size: 1.1rem;
          letter-spacing: 0.02em;
          color: rgba(232,201,106,0.85);
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
          color: rgba(255,250,240,0.58);
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
          color: rgba(232,201,106,0.85);
          margin-bottom: 18px;
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
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          font-weight: 500;
          color: rgba(232,201,106,0.55);
          margin: 0 0 20px 0;
        }
        .m-hero h1 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          /* Sits WITH the tagline in the column, not shouting over it (the nav
             already carries the small wordmark). */
          font-size: clamp(2rem, 5vw, 2.6rem);
          line-height: 1.08;
          letter-spacing: -0.015em;
          color: rgba(255,250,240,0.92);
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
          color: rgba(255,250,240,0.58);
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

        /* ── Hero gold M brandmark ── (amendment A10)
           The transparent gold M sits inside a soft gold radial glow that
           gives the hero its brand anchor on the LEFT column of the split
           layout. The "breathing" is opacity + box-shadow ONLY — never a
           scaling blob — and is disabled under prefers-reduced-motion. The
           <img> carries explicit width/height to reserve layout (CLS). On
           ≤880px the split hero collapses and the mark centres above the
           title (media queries below). */
        .m-hero-brandmark {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 340px;
          max-width: 40vw;
          margin: 0;
          z-index: 2;
        }
        /* Quiet pass (Jul 16): the breathing halo + gold drop-shadow are gone.
           A transparent gold mark sits perfectly still on the page's own dark
           ground — no disc, no glow. Only a soft dark drop-shadow for depth. */
        .m-hero-brandmark-glow {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .m-hero-brandmark-img {
          position: relative;
          display: block;
          /* True aspect of the mark (480x394) — no square letterbox. */
          width: 110px;
          height: auto;
          aspect-ratio: 480 / 394;
          object-fit: contain;
          filter: drop-shadow(0 10px 26px rgba(0,0,0,0.55));
          user-select: none;
        }

        /* ── Pricing section ── (id="pricing")
           Sits between the three editorial statements and the explainer teaser.
           A compact, honest two-card summary — the full story lives on /pricing.
           Premium is visually featured (gold border + badge). Cards stack on
           mobile. */
        .m-pricing {
          padding: 116px 32px 116px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .m-pricing-inner {
          max-width: 860px;
          margin: 0 auto;
          text-align: center;
        }
        .m-pricing .m-label { display: block; margin-bottom: 16px; }
        .m-pricing h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.45rem, 3.6vw, 1.7rem);
          line-height: 1.2;
          letter-spacing: -0.01em;
          color: rgba(255,250,240,0.92);
          margin-bottom: 14px;
        }
        .m-pricing-tagline {
          color: rgba(255,250,240,0.58);
          font-size: 1.0625rem;
          line-height: 1.6;
          max-width: 42ch;
          margin: 0 auto 44px;
        }
        .m-pricing-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          text-align: left;
          margin-bottom: 40px;
        }
        .m-price-card {
          background: rgba(255,255,255,0.028);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          transition: border-color 220ms ease;
        }
        /* Gentle border brighten on pointer devices only — no lift, no shadow. */
        @media (hover: hover) {
          .m-price-card:hover {
            border-color: rgba(255,255,255,0.14);
          }
          .m-price-card-featured:hover {
            border-color: rgba(232,201,106,0.45);
          }
        }
        .m-price-card-featured {
          border-color: rgba(232,201,106,0.3);
          position: relative;
        }
        /* Quiet pass: badge is no longer a gold pill — it's a small-caps gold
           text line sitting above the card name (static flow, first child). */
        .m-price-card-badge {
          display: block;
          font-size: 0.62rem;
          font-weight: 500;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(232,201,106,0.7);
          margin-bottom: 12px;
        }
        .m-price-card-name {
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          margin-bottom: 14px;
        }
        .m-price-card-featured .m-price-card-name { color: #E8C96A; }
        .m-price-card-price {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 22px;
        }
        .m-price-card-amount {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: 2.75rem;
          line-height: 1;
          letter-spacing: -0.02em;
          color: #ffffff;
        }
        .m-price-card-unit {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.45);
        }
        .m-price-card-bullets {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .m-price-card-bullets li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.9375rem;
          line-height: 1.5;
          color: rgba(255,255,255,0.72);
        }
        .m-price-card-check {
          flex-shrink: 0;
          margin-top: 3px;
          color: #47AB7E;
        }
        .m-price-card-featured .m-price-card-check { color: #E8C96A; }
        .m-pricing-cta-row {
          display: inline-flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
        }
        .m-pricing-cta-secondary {
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(255,250,240,0.58);
          text-decoration: none;
          letter-spacing: 0.01em;
          padding: 13px 24px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.14);
          transition: color 200ms ease, border-color 200ms ease, background 200ms ease;
        }
        .m-pricing-cta-secondary:hover {
          color: rgba(255,250,240,0.92);
          border-color: rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.04);
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
          padding: 68px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .m-block:first-child { padding-top: 16px; }
        .m-block:last-child { border-bottom: 0; }
        .m-block .m-label { display: block; margin-bottom: 22px; }
        .m-block h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.45rem, 3.4vw, 1.7rem);
          line-height: 1.24;
          letter-spacing: -0.01em;
          color: rgba(255,250,240,0.92);
          margin-bottom: 22px;
        }
        .m-block p {
          color: rgba(255,250,240,0.5);
          line-height: 1.85;
          font-size: 1.0625rem;
        }

        /* ── Foundation strip ──
           Sits directly below the hero. A quiet charity line — no gold glow,
           just a hairline-bordered dark-forest band in the editorial voice. */
        .m-foundation {
          padding: 84px 32px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .m-foundation-line {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.35rem, 3.4vw, 1.6rem);
          line-height: 1.3;
          letter-spacing: -0.01em;
          color: rgba(255,250,240,0.9);
          max-width: 26ch;
          margin: 0 auto 16px;
        }
        .m-foundation-sub {
          color: rgba(255,250,240,0.5);
          font-size: 1rem;
          line-height: 1.7;
          max-width: 44ch;
          margin: 0 auto;
        }

        /* ── Explainer teaser strip ──
           Sits between the three editorial statements and the closing CTA.
           A quiet invitation into /montree/explainer — not a hard sell. */
        .m-explainer-teaser {
          padding: 116px 32px 116px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .m-explainer-teaser .m-label { display: block; margin-bottom: 18px; }
        .m-explainer-teaser h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.45rem, 3.6vw, 1.7rem);
          line-height: 1.2;
          letter-spacing: -0.01em;
          color: rgba(255,250,240,0.92);
          margin-bottom: 18px;
        }
        .m-explainer-teaser-sub {
          color: rgba(255,250,240,0.58);
          font-size: 1.0625rem;
          line-height: 1.7;
          max-width: 44ch;
          margin: 0 auto 32px;
        }

        /* ── Closing CTA ── */
        .m-closing {
          padding: 190px 32px 190px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .m-closing h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.5rem, 4vw, 1.9rem);
          line-height: 1.16;
          letter-spacing: -0.012em;
          color: rgba(255,250,240,0.92);
          margin-bottom: 24px;
        }
        .m-closing-sub {
          color: rgba(255,250,240,0.58);
          font-size: 1.0625rem;
          line-height: 1.7;
          max-width: 44ch;
          margin: 0 auto 40px;
        }

        /* ── Bottom quote ── */
        .m-bottom-quote {
          padding: 80px 32px 96px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .m-bottom-quote-body {
          font-family: var(--font-lora), Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: clamp(16px, 2vw, 22px);
          letter-spacing: 0.01em;
          color: rgba(255,250,240,0.58);
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
        /* Quiet nav row above the mark line — the reader who scrolled the whole
           page shouldn't have to travel back to the top bar. Reuses the nav
           i18n keys; wraps gracefully on narrow phones. */
        .m-footer-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px 22px;
          margin-bottom: 22px;
        }
        .m-footer-links a {
          color: rgba(255,255,255,0.42);
          text-decoration: none;
          font-size: 0.8125rem;
          letter-spacing: 0.02em;
          transition: color 200ms ease;
        }
        .m-footer-links a:hover { color: rgba(255,255,255,0.75); }
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
          /* Split hero collapses — the gold M centres above the title. */
          .m-hero-brandmark {
            width: 100%;
            max-width: 260px;
            margin: 0 auto 20px;
          }
          .m-hero-brandmark-glow { padding: 0; }
          .m-hero-brandmark-img { width: 96px; }
          .m-hero-stack {
            align-items: center;
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          /* Hide secondary nav links on mobile (About + Explainer) but keep
             Library (m-nav-link-library), Pricing (m-nav-link-pricing), and
             Log in (m-nav-link-login) visible — these are the always-reachable
             links. Pricing is the #2 question after "what is it" so it stays.
             Explainer is hidden on mobile: five text links + logo + language
             toggle overflow a ~360-390px row (no flex-wrap on .m-nav-inner), and
             the explainer video gallery is the least-critical link — Library,
             Pricing and Log in take priority. The /montree/explainer route stays
             reachable from the on-page Explainer teaser strip further down. */
          .m-nav-link-secondary { display: none; }
          .m-nav-link-explainer { display: none; }
          .m-nav-link-library { font-size: 0.85rem; }
          .m-nav-link-pricing { font-size: 0.85rem; }
          .m-nav-link-login { font-size: 0.85rem; }
          /* Tighten inter-link gaps + horizontal padding so Library, Pricing,
             Log in + the language toggle all fit on a narrow phone. The two
             clusters are the direct flex children of .m-nav-inner and carry
             inline gaps (20px left / 16px right) — override them here so the
             Pricing link doesn't overflow on small screens. */
          .m-nav-inner { padding: 14px 16px; gap: 8px; }
          .m-nav-inner > div { gap: 12px !important; }
          /* Mobile: hero stacks vertically with the corner video flowing in
             above the centered text (static position) instead of overlapping. */
          .m-hero { padding: 32px 24px 80px; }
          .m-hero .m-label { margin-bottom: 28px; }
          .m-hero-sub { margin-bottom: 32px; }
          .m-hero-brandmark {
            width: 68%;
            max-width: 220px;
            margin: 0 auto 18px;
          }
          .m-hero-brandmark-glow { padding: 0; }
          .m-hero-brandmark-img { width: 88px; }
          .m-foundation { padding: 56px 24px; }
          .m-editorial { padding: 40px 24px 100px; }
          .m-block { padding: 40px 0; }
          .m-pricing { padding: 64px 24px 64px; }
          .m-pricing-cards {
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 32px;
          }
          .m-price-card { padding: 28px 22px; }
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
          radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.14), rgba(39,129,90,0) 60%),
          linear-gradient(168deg, #071510 0%, #051009 45%, #030b08 100%)
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
              <MontreeLogo size={22} showBackground={false} />
              <span className="m-logo-word">Montree</span>
            </a>
            <Link
              className="m-nav-link m-nav-link-library"
              href="/montree/library"
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255,250,240,0.58)',
                textDecoration: 'none',
                letterSpacing: '0.01em',
                transition: 'color 200ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.92)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.58)')}
            >
              {t('landing.nav.library')}
            </Link>
            <Link
              className="m-nav-link m-nav-link-explainer"
              href="/montree/explainer"
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255,250,240,0.58)',
                textDecoration: 'none',
                letterSpacing: '0.01em',
                transition: 'color 200ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.92)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.58)')}
            >
              {t('landing.nav.explainer')}
            </Link>
            {/* Pricing — pricing is the #2 question after "what is it", so it
                stays visible on mobile (NOT .m-nav-link-secondary). */}
            <Link
              className="m-nav-link m-nav-link-pricing"
              href="/pricing"
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255,250,240,0.58)',
                textDecoration: 'none',
                letterSpacing: '0.01em',
                transition: 'color 200ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.92)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.58)')}
            >
              {t('landing.nav.pricing')}
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Ambassador nav link removed (Jul 2026) — no more public agent
                recruitment. /montree/become-an-agent now redirects to home. */}
            <Link className="m-nav-link m-nav-link-secondary" href="/montree/about" style={{ fontSize: '0.85rem', color: 'rgba(255,250,240,0.58)', textDecoration: 'none', letterSpacing: '0.01em', transition: 'color 200ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.92)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.58)')}>
              About
            </Link>
            {/* Security nav link removed per user directive — the /montree/security
                route still exists for direct access; it's just not surfaced on the
                landing nav (avoids implying there's something to hide). */}
            {/* "What's new" link removed from public landing nav per Session 108 directive —
                /montree/changelog is internal-use only now. The route still exists for direct
                access. */}
            <Link className="m-nav-link m-nav-link-login" href="/montree/login-select" style={{ fontSize: '0.85rem', color: 'rgba(255,250,240,0.58)', textDecoration: 'none', letterSpacing: '0.01em', transition: 'color 200ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.92)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,250,240,0.58)')}>
              {t('landing.nav.login')}
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </nav>

      {/* ── HERO ──
            • Centered text stack:
              1. Montree                                — h1, brand name
              2. the AI Montessori classroom revolution — tagline below
              3. Try it                                 — primary CTA
              4. Work smarter not harder                — italic gold kicker
      */}
      <section className="m-hero">
        {/* ── Hero gold M brandmark ── (amendment A10)
            The transparent gold M sits inside a soft gold radial glow that
            "breathes" via opacity + box-shadow only (no scaling blob;
            disabled under prefers-reduced-motion — see CSS).
            <img> carries explicit width/height to reserve layout (CLS). */}
        <div className="m-hero-brandmark" aria-hidden="true">
          <span className="m-hero-brandmark-glow">
            {/* Transparent gold mark on the page's own dark ground — no disc.
                480x394 true aspect (no letterbox); the hero renders it at
                ≤110 CSS px so this covers >2x DPR. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="m-hero-brandmark-img"
              src="/brand/m-mark-transparent.webp"
              alt=""
              width={480}
              height={394}
              draggable={false}
            />
          </span>
        </div>

        <div ref={addReveal} className="m-hero-stack">
          <span className="m-hero-eyebrow">{t('landing.hero.label')}</span>
          <h1>{t('landing.hero.title')}</h1>
          <p className="m-hero-tagline">{t('landing.hero.tagline')}</p>
          <Link className="m-pill m-pill-lg" href="/montree/login-select?signup=true">
            {t('landing.hero.cta')}
          </Link>
          <span className="m-hero-kicker m-hero-kicker-below">{t('landing.hero.kicker')}</span>
          {/* Fineprint trust signal under the CTA — cheap, honest pricing line. */}
          <span className="m-hero-fineprint">{t('landing.hero.fineprint')}</span>
        </div>
      </section>

      {/* ── FOUNDATION STRIP (directly below the hero) ──
          Quiet charity line — the subscription-funds-a-school-in-need story
          that replaced the retired Founding 100 promo. Dark forest register,
          no gold glow. */}
      <section className="m-foundation" aria-label="Montree Foundation" ref={addReveal}>
        <p className="m-foundation-line">{t('landing.foundation.line')}</p>
        <p className="m-foundation-sub">{t('landing.foundation.sub')}</p>
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

      {/* ── PRICING ── (id="pricing")
          Compact two-card summary. Starter $3 vs Premium $7 (featured). Full
          story + slider + FAQ live on /pricing. Cards stack on mobile. */}
      <section className="m-pricing" id="pricing" aria-label="Pricing" ref={addReveal}>
        <div className="m-pricing-inner">
          <span className="m-label">{t('landing.pricing.label')}</span>
          <h2>{t('landing.pricing.title')}</h2>
          <p className="m-pricing-tagline">{t('landing.pricing.trialLine')}</p>

          <div className="m-pricing-cards">
            {/* Starter — $3 */}
            <div className="m-price-card">
              <div className="m-price-card-name">{t('landing.pricing.starterName')}</div>
              <div className="m-price-card-price">
                <span className="m-price-card-amount">{t('landing.pricing.starterPrice')}</span>
                <span className="m-price-card-unit">{t('landing.pricing.perStudent')}</span>
              </div>
              <ul className="m-price-card-bullets">
                <li><PriceCheck className="m-price-card-check" />{t('landing.pricing.starterB1')}</li>
                <li><PriceCheck className="m-price-card-check" />{t('landing.pricing.starterB2')}</li>
                <li><PriceCheck className="m-price-card-check" />{t('landing.pricing.starterB3')}</li>
              </ul>
            </div>

            {/* Premium — $7, featured */}
            <div className="m-price-card m-price-card-featured">
              <span className="m-price-card-badge">{t('landing.pricing.premiumBadge')}</span>
              <div className="m-price-card-name">{t('landing.pricing.premiumName')}</div>
              <div className="m-price-card-price">
                <span className="m-price-card-amount">{t('landing.pricing.premiumPrice')}</span>
                <span className="m-price-card-unit">{t('landing.pricing.perStudent')}</span>
              </div>
              <ul className="m-price-card-bullets">
                <li><PriceCheck className="m-price-card-check" />{t('landing.pricing.premiumB1')}</li>
                <li><PriceCheck className="m-price-card-check" />{t('landing.pricing.premiumB2')}</li>
                <li><PriceCheck className="m-price-card-check" />{t('landing.pricing.premiumB3')}</li>
              </ul>
            </div>
          </div>

          <div className="m-pricing-cta-row">
            <Link className="m-pill m-pill-lg" href="/montree/login-select?signup=true">
              {t('landing.pricing.cta')}
            </Link>
            <Link className="m-pricing-cta-secondary" href="/pricing">
              {t('landing.pricing.seeFull')}
            </Link>
          </div>
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
        <div className="m-footer-links">
          <Link href="/pricing">{t('landing.nav.pricing')}</Link>
          <Link href="/montree/library">{t('landing.nav.library')}</Link>
          <Link href="/montree/explainer">{t('landing.nav.explainer')}</Link>
          <Link href="/montree/about">About</Link>
          <Link href="/montree/login-select">{t('landing.nav.login')}</Link>
        </div>
        <div className="m-footer-inner">
          <MontreeLogo size={14} />
          <span>Montree · montree.xyz</span>
        </div>
      </footer>
      </div>
    </>
  );
}

// Small check glyph for the pricing-card bullet rows. Colour comes from the
// className (.m-price-card-check — emerald on Starter, gold on Premium).
function PriceCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        fill="currentColor"
      />
    </svg>
  );
}
