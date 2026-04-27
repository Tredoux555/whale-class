'use client';

import { useEffect, useRef } from 'react';
import MontreeLogo from '@/components/montree/MonteeLogo';

// /montree/page.tsx — Montree landing page

export default function MontreeLanding() {
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
          color: rgba(255,255,255,0.9);
          background: #0f172a;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          line-height: 1.5;
          position: relative;
          overflow-x: hidden;
        }

        /* Full-page gradient + radial emerald glow */
        body::before {
          content: "";
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 900px 700px at 88% 8%, rgba(16,185,129,0.18), rgba(16,185,129,0) 60%),
            linear-gradient(150deg, #0f172a 0%, #064e3b 55%, #134e4a 100%);
          z-index: -1;
          pointer-events: none;
        }

        .m-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: rgba(52,211,153,0.65);
          font-weight: 500;
        }

        .m-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 28px;
          border-radius: 999px;
          background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%);
          color: #ffffff;
          text-decoration: none;
          font-size: 0.9375rem;
          font-weight: 500;
          letter-spacing: 0.005em;
          border: 0;
          cursor: pointer;
          transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease;
          box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 24px -8px rgba(16,185,129,0.45);
          white-space: nowrap;
          font-family: inherit;
        }
        .m-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.22) inset, 0 14px 32px -10px rgba(16,185,129,0.55);
          filter: brightness(1.04);
        }
        .m-pill:active {
          transform: translateY(0);
          filter: brightness(0.98);
        }
        .m-pill-lg {
          padding: 18px 34px;
          font-size: 1rem;
        }

        .m-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(15,23,42,0.75);
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
        .m-logo-word {
          font-family: "Lora", Georgia, serif;
          font-weight: 500;
          font-size: 1.125rem;
          letter-spacing: -0.01em;
          background: linear-gradient(90deg, #34d399 0%, #14b8a6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .m-nav .m-pill {
          padding: 10px 20px;
          font-size: 0.875rem;
        }

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
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.02em;
        }

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
          color: rgba(255,255,255,0.38);
          line-height: 1.85;
          font-size: 1.0625rem;
        }

        .m-closing {
          padding: 160px 32px;
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

        .m-footer {
          padding: 56px 32px 64px;
          text-align: center;
          color: rgba(255,255,255,0.22);
          font-size: 0.78rem;
          letter-spacing: 0.02em;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .m-footer-inner {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 640px) {
          .m-nav-inner { padding: 14px 20px; }
          .m-hero { padding: 80px 24px 100px; }
          .m-hero .m-label { margin-bottom: 28px; }
          .m-hero-sub { margin-bottom: 32px; }
          .m-editorial { padding: 40px 24px 100px; }
          .m-block { padding: 40px 0; }
          .m-closing { padding: 110px 24px; }
          .m-footer { padding: 40px 24px 48px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="m-nav" aria-label="Primary">
        <div className="m-nav-inner">
          <a className="m-logo" href="/montree" aria-label="Montree home">
            <MontreeLogo size={28} />
            <span className="m-logo-word">Montree</span>
          </a>
          <a className="m-pill" href="/montree/login-select?signup=true">Get started</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="m-hero">
        <div ref={addReveal} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="m-label">Montessori classroom management</span>
          <h1>The magic of Montree.</h1>
          <p className="m-hero-sub">A teacher takes a photo. Montree does the rest.</p>
          <a className="m-pill m-pill-lg" href="/montree/login-select?signup=true">
            Experience it free for 30 days
          </a>
          <p className="m-hero-fineprint">One classroom · No credit card</p>
        </div>
      </section>

      {/* ── THREE STATEMENTS ── */}
      <section className="m-editorial" aria-label="What Montree does">
        <div className="m-editorial-inner">

          <article className="m-block" ref={addReveal}>
            <span className="m-label">For the teacher</span>
            <h2>No more paperwork. No more writing.</h2>
            <p>Montree identifies the work in every photo, records the observation, and tracks each child across all five curriculum areas. Automatically.</p>
          </article>

          <article className="m-block" ref={addReveal}>
            <span className="m-label">For parents</span>
            <h2>Reports that actually say something.</h2>
            <p>Not templates. Genuine, personalised accounts of what each child is learning and why it matters — written every week.</p>
          </article>

          <article className="m-block" ref={addReveal}>
            <span className="m-label">For the principal</span>
            <h2>A complete view of the school.</h2>
            <p>Every classroom. Every child. A built-in Montessori expert available at any hour to answer any question.</p>
          </article>

        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="m-closing" id="cta" ref={addReveal}>
        <h2>Experience the magic.</h2>
        <p className="m-closing-sub">One month free. Then $7 per child, per month.<br />One plan. No tiers. No contracts.</p>
        <a className="m-pill m-pill-lg" href="/montree/login-select?signup=true">
          Start your free trial
        </a>
      </section>

      {/* ── FOOTER ── */}
      <footer className="m-footer">
        <div className="m-footer-inner">
          <MontreeLogo size={16} />
          <span>Montree · montree.xyz</span>
        </div>
      </footer>
    </>
  );
}
