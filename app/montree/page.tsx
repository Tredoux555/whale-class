'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';

// /montree/page.tsx — Montree landing page (v2 — deep forest palette)

export default function MontreeLanding() {
  const { t } = useI18n();
  const revealRefs = useRef<HTMLElement[]>([]);

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
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500&display=swap');

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

        /* ── Nav ── */
        .m-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(8,26,18,0.72);
          backdrop-filter: saturate(180%) blur(14px);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
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
        .m-logo-mark {
          position: relative;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, #1D6B48 0%, #0c2419 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(130,217,174,0.22);
          box-shadow:
            0 1px 0 rgba(130,217,174,0.18) inset,
            0 6px 18px -6px rgba(6,20,14,0.8);
          flex-shrink: 0;
        }
        /* Tiny gold dot — the star from the icon */
        .m-logo-mark::after {
          content: "";
          position: absolute;
          top: -2px;
          right: -2px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #FFF6D6 0%, #E8C96A 55%, #b88f25 100%);
          box-shadow: 0 0 8px rgba(232,201,106,0.55), 0 0 0 1px rgba(8,26,18,0.6);
        }
        .m-logo-word {
          font-family: "Lora", Georgia, serif;
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
          min-height: calc(100vh - 70px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 120px 32px 140px;
        }
        .m-hero .m-label { margin-bottom: 40px; }
        .m-hero h1 {
          font-family: "Lora", Georgia, serif;
          font-weight: 400;
          font-size: clamp(3.25rem, 8vw, 6rem);
          line-height: 1.04;
          letter-spacing: -0.025em;
          color: #ffffff;
          margin-bottom: 28px;
          max-width: 14ch;
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
          font-family: "Lora", Georgia, serif;
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
          font-family: "Lora", Georgia, serif;
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
          /* Hide secondary nav links on mobile (Library, Become an agent),
             but keep Log in visible — users MUST be able to find it. */
          .m-nav-link-secondary { display: none; }
          .m-nav-link-login { font-size: 0.875rem; }
          .m-nav-inner { padding: 14px 20px; }
          .m-hero { padding: 80px 24px 100px; }
          .m-hero .m-label { margin-bottom: 28px; }
          .m-hero-sub { margin-bottom: 32px; }
          .m-editorial { padding: 40px 24px 100px; }
          .m-block { padding: 40px 0; }
          .m-closing { padding: 110px 24px 110px; }
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

      {/* ── NAV ── */}
      <nav className="m-nav" aria-label="Primary">
        <div className="m-nav-inner">
          <a className="m-logo" href="/montree" aria-label="Montree home">
            <span className="m-logo-mark" aria-hidden="true" style={{ fontSize: '15px', lineHeight: 1 }}>🌿</span>
            <span className="m-logo-word">Montree</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link className="m-nav-link m-nav-link-secondary" href="/montree/library" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', letterSpacing: '0.01em', transition: 'color 200ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              {t('landing.nav.library')}
            </Link>
            <Link className="m-nav-link m-nav-link-secondary" href="/montree/become-an-agent" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', letterSpacing: '0.01em', transition: 'color 200ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              {t('landing.nav.forTeachers')}
            </Link>
            <Link className="m-nav-link m-nav-link-login" href="/montree/login-select" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', letterSpacing: '0.01em', transition: 'color 200ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)' )}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              {t('landing.nav.login')}
            </Link>
            <LanguageToggle />
            <a className="m-pill" href="/montree/login-select?signup=true">{t('landing.nav.getStarted')}</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── Clean and clear: title + CTA, nothing else. ── */}
      <section className="m-hero">
        <div ref={addReveal} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1>{t('landing.hero.title')}</h1>
          <Link className="m-pill m-pill-lg" href="/montree/login-select?signup=true">
            {t('landing.hero.cta')}
          </Link>
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

      {/* ── FOOTER ── */}
      <footer className="m-footer">
        <div className="m-footer-inner">
          <span className="m-footer-mark" aria-hidden="true" style={{ fontSize: '9px', lineHeight: 1 }}>🌿</span>
          <span>Montree · montree.xyz</span>
        </div>
      </footer>
      </div>
    </>
  );
}
