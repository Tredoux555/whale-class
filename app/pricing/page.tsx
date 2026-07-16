'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import MontreeLogo from '@/components/montree/MonteeLogo';

// /app/pricing/page.tsx — Montree public pricing page (dark-forest rebrand,
// Jul 2026 launch-pricing restructure).
//
// Two tiers: Starter $3 (our fast model all the way through — photo recognition
// never escalates) and Premium $7 (Claude Sonnet reports + Sonnet photo
// fallback + Sonnet Guru + Astra). Every school starts with 7 days of Premium,
// free — no card. After the week they pick a plan.
//
// Uses the same .m-* dark-forest tokens as the landing page, a plain <style>
// tag (NOT styled-jsx — App Router has no styled-jsx StyleRegistry, so nested
// <style jsx> renders nothing into SSR HTML), and --font-lora for headings.
// Hardcoded English by design (as the previous pricing page was).

// Founding 100 apply-by-email (same mailto as the homepage FoundingHundred).
const APPLY_TO = 'tredoux555@gmail.com';
const APPLY_SUBJECT = 'Founding 100 Application — [Your school]';
const APPLY_BODY = [
  'School name:',
  'Country:',
  'Number of students:',
  'Why you want in:',
].join('\n');
const APPLY_MAILTO =
  `mailto:${APPLY_TO}` +
  `?subject=${encodeURIComponent(APPLY_SUBJECT)}` +
  `&body=${encodeURIComponent(APPLY_BODY)}`;

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How does the free trial work?',
    a: 'Every school starts with 7 days of Premium — the full experience, Claude Sonnet and all — completely free. No card required to start. When the week is up, you pick your plan: Starter or Premium. Nothing is charged automatically until you choose.',
  },
  {
    q: 'What happens after the trial?',
    a: 'You choose. Because you have spent the week on Premium, you already know exactly what the top tier feels like. Pick Starter if you want the full Montree workflow on our fast model, or Premium if you want the richest Sonnet reports and photo fallback. You add a card at that point — not before.',
  },
  {
    q: 'What is the difference between Starter and Premium?',
    a: 'Starter ($3 per active student / month) is the full Montree system running on our fast model, all the way through — AI photo identification, Smart Shelf, progress tracking, the parent portal, and Guru. On Starter, photo recognition never escalates to Sonnet; the fast model handles every photo. Premium ($7 per active student / month) upgrades the teacher reports and parent letters to Claude Sonnet, adds a Sonnet fallback when a photo is genuinely hard to identify, and runs Guru and Astra on Sonnet too. Both are the real product; Premium simply writes and reasons with more depth.',
  },
  {
    q: 'What is Claude Sonnet?',
    a: 'Claude Sonnet is Anthropic\'s most capable model — the reasoning behind the parent letters, teacher reports, and developmental analysis that teachers describe as "magic." It reasons deeply, writes with genuine warmth, and understands Montessori philosophy in a way that shows in every output. Premium runs on Sonnet; Starter runs on our fast model.',
  },
  {
    q: 'What is the Founding 100?',
    a: 'The first hundred schools we hand-pick to build Montree with. Founding schools get one month of Premium free, then Premium locked at the $3 Starter price — for life. In exchange, they help us validate Montree with their feedback and a testimonial. Applications are read personally and schools are enrolled in small batches of 10–15. Once the hundred are in, the offer closes.',
  },
  {
    q: 'Is pricing per classroom or per school?',
    a: 'Per active student, across your whole school. If you have 40 students across two classrooms, you pay for 40 students — not per classroom. Add or close classrooms freely; the bill follows your actual student count.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. No annual contracts. You are billed monthly and can cancel whenever you like. Your classroom data is never deleted.',
  },
];

export default function PricingPage() {
  const revealRefs = useRef<HTMLElement[]>([]);
  const [students, setStudents] = useState(20);

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
      el.style.transform = 'translateY(28px)';
      el.style.transition = 'opacity 0.65s ease, transform 0.65s ease';
      revealRefs.current.push(el);
    }
  };

  const starterMonthly = students * 3;
  const premiumMonthly = students * 7;

  return (
    <>
      {/* Plain <style> (NOT styled-jsx) — see file header. */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        html, body { min-height: 100%; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: rgba(255,250,240,0.58);
          background: #030b08;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          line-height: 1.5;
          overflow-x: hidden;
        }

        .pr-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.14), rgba(39,129,90,0) 60%),
            linear-gradient(168deg, #071510 0%, #051009 45%, #030b08 100%);
        }

        .pr-shell { position: relative; z-index: 1; }

        /* ── Nav ── */
        .pr-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(3,10,7,0.7);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-top: env(safe-area-inset-top);
        }
        .pr-nav-inner {
          max-width: 960px; margin: 0 auto;
          padding: 16px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .pr-logo {
          display: inline-flex; align-items: center; gap: 10px; text-decoration: none;
        }
        .pr-logo-word {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 500; font-size: 1.125rem; letter-spacing: 0.02em;
          color: rgba(232,201,106,0.85);
        }
        .pr-nav-links { display: flex; align-items: center; gap: 20px; }
        .pr-nav-link {
          font-size: 0.875rem; font-weight: 500;
          color: rgba(255,255,255,0.55); text-decoration: none; letter-spacing: 0.01em;
          transition: color 200ms ease;
        }
        .pr-nav-link:hover { color: rgba(255,255,255,0.9); }

        /* ── Pills ── */
        .pr-pill {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 13px 26px; border-radius: 10px;
          background: #1D5C41;
          color: #ffffff; text-decoration: none;
          font-size: 0.92rem; font-weight: 500; letter-spacing: 0.005em;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer; white-space: nowrap; font-family: inherit;
          transition: background 160ms ease;
        }
        .pr-pill:hover { background: #236B4C; }
        .pr-pill-lg { padding: 15px 30px; font-size: 0.95rem; }
        .pr-pill-ghost {
          background: rgba(255,255,255,0.05); box-shadow: none;
          border: 1px solid rgba(255,255,255,0.14); color: rgba(255,250,240,0.92);
        }
        .pr-pill-ghost:hover { background: rgba(255,255,255,0.08); }
        .pr-pill-gold {
          background: transparent;
          color: rgba(232,201,106,0.9); border-color: rgba(232,201,106,0.35);
          box-shadow: none;
        }
        .pr-pill-gold:hover { background: rgba(232,201,106,0.06); }

        /* ── Hero ── */
        .pr-hero {
          max-width: 640px; margin: 0 auto; text-align: center;
          padding: 76px 24px 48px;
        }
        /* Small gold M above the hero — ties the pricing page to the brand
           plaque on the landing hero. Static (no breathing here — the pricing
           page should feel calm and factual). */
        .pr-hero-mark {
          display: inline-block;
          width: 76px; height: auto;
          aspect-ratio: 480 / 394;
          margin-bottom: 26px;
          filter: drop-shadow(0 10px 26px rgba(0,0,0,0.55));
          user-select: none;
        }
        .pr-eyebrow {
          display: inline-block;
          font-size: 0.62rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase;
          color: rgba(232,201,106,0.55); margin-bottom: 22px;
        }
        .pr-hero h1 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400; font-size: clamp(2rem, 5vw, 2.6rem);
          line-height: 1.1; letter-spacing: -0.015em; color: rgba(255,250,240,0.92);
          margin-bottom: 20px;
        }
        .pr-hero-sub {
          font-size: 1.0625rem; color: rgba(255,250,240,0.58);
          line-height: 1.7; max-width: 30rem; margin: 0 auto;
        }
        .pr-gold { color: #E8C96A; }

        /* ── Pricing cards ── */
        .pr-cards-wrap { padding: 8px 24px 64px; }
        .pr-cards {
          max-width: 820px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr; gap: 22px;
          align-items: stretch;
        }
        .pr-card {
          background: rgba(255,255,255,0.028);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 36px 30px;
          display: flex; flex-direction: column; position: relative; overflow: hidden;
          transition: border-color 220ms ease;
        }
        @media (hover: hover) {
          .pr-card:hover {
            border-color: rgba(255,255,255,0.14);
          }
          .pr-card-featured:hover {
            border-color: rgba(232,201,106,0.45);
          }
        }
        .pr-card-featured {
          border-color: rgba(232,201,106,0.3);
        }
        .pr-card-badge {
          position: absolute; top: 24px; right: 24px;
          font-size: 0.62rem; font-weight: 500; letter-spacing: 0.24em; text-transform: uppercase;
          color: rgba(232,201,106,0.7); background: none;
          padding: 0; border-radius: 0;
        }
        .pr-card-name {
          font-size: 0.78rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.5); margin-bottom: 16px;
        }
        .pr-card-featured .pr-card-name { color: #E8C96A; }
        .pr-card-price { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
        .pr-card-amount {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400; font-size: 3rem; line-height: 1; letter-spacing: -0.02em; color: #ffffff;
        }
        .pr-card-unit { font-size: 0.9375rem; color: rgba(255,255,255,0.45); }
        .pr-card-total {
          font-size: 0.875rem; color: rgba(255,255,255,0.4); margin-bottom: 24px;
        }
        .pr-card-total strong { color: rgba(255,250,240,0.85); font-weight: 600; }
        .pr-card-featured .pr-card-total strong { color: #E8C96A; }
        .pr-card-bullets {
          list-style: none; margin: 0 0 28px; padding: 0;
          display: flex; flex-direction: column; gap: 13px; flex: 1;
        }
        .pr-card-bullets li {
          display: flex; align-items: flex-start; gap: 11px;
          font-size: 0.9375rem; line-height: 1.5; color: rgba(255,255,255,0.75);
        }
        .pr-card-check { flex-shrink: 0; margin-top: 3px; color: #47AB7E; }
        .pr-card-featured .pr-card-check { color: #E8C96A; }
        .pr-card-cta {
          display: block; text-align: center; text-decoration: none;
          padding: 14px 24px; border-radius: 10px;
          font-weight: 500; font-size: 0.92rem; letter-spacing: 0.01em;
          background: #1D5C41; color: #ffffff;
          border: 1px solid rgba(255,255,255,0.08);
          transition: background 160ms ease;
        }
        .pr-card-cta:hover { background: #236B4C; }
        .pr-card-featured .pr-card-cta {
          background: transparent;
          color: rgba(232,201,106,0.9); border: 1px solid rgba(232,201,106,0.35);
        }
        .pr-card-featured .pr-card-cta:hover { background: rgba(232,201,106,0.06); }

        /* ── Slider ── */
        .pr-slider-wrap { padding: 0 24px 72px; }
        .pr-slider-card {
          max-width: 620px; margin: 0 auto;
          background: rgba(255,255,255,0.028);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 32px 30px; text-align: center;
        }
        .pr-slider-label {
          font-size: 0.78rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,255,255,0.45); margin-bottom: 18px;
        }
        .pr-slider-count {
          font-family: var(--font-lora), Georgia, serif;
          font-size: 1.5rem; color: #ffffff; margin-bottom: 22px;
        }
        .pr-slider-totals {
          display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;
        }
        .pr-slider-total {
          background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 16px 14px;
        }
        .pr-slider-total-featured { border-color: rgba(232,201,106,0.28); }
        .pr-slider-total-name {
          font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(255,255,255,0.45); margin-bottom: 6px;
        }
        .pr-slider-total-featured .pr-slider-total-name { color: #E8C96A; }
        .pr-slider-total-value {
          font-family: var(--font-lora), Georgia, serif; font-size: 1.75rem; color: #ffffff;
        }
        .pr-slider-total-sub { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 2px; }
        input[type=range] {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 1px; border-radius: 1px;
          background: linear-gradient(to right, rgba(232,201,106,0.55) 0%, rgba(232,201,106,0.55) var(--pct,50%), rgba(255,255,255,0.12) var(--pct,50%), rgba(255,255,255,0.12) 100%);
          outline: none; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: #E8C96A; border: none;
          box-shadow: none; cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: #E8C96A; border: none; cursor: pointer;
        }
        .pr-slider-ends { display: flex; justify-content: space-between; margin-top: 8px; }
        .pr-slider-ends span { font-size: 11px; color: rgba(255,255,255,0.3); }

        /* ── Founding 100 strip ── */
        .pr-founding-wrap { padding: 0 24px 72px; }
        .pr-founding {
          max-width: 680px; margin: 0 auto;
          background: rgba(255,255,255,0.028);
          border: 1px solid rgba(232,201,106,0.3);
          border-radius: 14px; padding: 40px 34px; text-align: center;
          position: relative; overflow: hidden;
          box-shadow: none;
        }
        .pr-founding-eyebrow {
          display: inline-block; position: relative;
          font-size: 0.62rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase;
          color: rgba(232,201,106,0.7); border: none;
          border-radius: 0; padding: 0; margin-bottom: 18px;
        }
        .pr-founding h2 {
          font-family: var(--font-lora), Georgia, serif; position: relative;
          font-weight: 400; font-size: clamp(1.4rem, 3.6vw, 1.7rem);
          line-height: 1.25; letter-spacing: -0.01em; color: rgba(255,250,240,0.92); margin-bottom: 14px;
        }
        .pr-founding p {
          position: relative; font-size: 0.9375rem; line-height: 1.7;
          color: rgba(255,250,240,0.58); max-width: 40ch; margin: 0 auto 26px;
        }

        /* ── FAQ ── */
        .pr-faq-wrap { padding: 0 24px 80px; }
        .pr-faq {
          max-width: 640px; margin: 0 auto;
        }
        .pr-faq h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400; font-size: clamp(1.5rem, 4vw, 1.7rem);
          color: rgba(255,250,240,0.92); text-align: center; letter-spacing: -0.01em; margin-bottom: 40px;
        }
        .pr-faq-item {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 20px 0;
        }
        .pr-faq-item summary {
          cursor: pointer; list-style: none;
          display: flex; justify-content: space-between; align-items: center; gap: 16px;
        }
        .pr-faq-item summary::-webkit-details-marker { display: none; }
        .pr-faq-q {
          font-size: 0.9375rem; font-weight: 600; color: rgba(255,250,240,0.9); line-height: 1.4;
        }
        .pr-faq-plus { font-size: 20px; color: rgba(232,201,106,0.7); flex-shrink: 0; user-select: none; line-height: 1; }
        .pr-faq-item[open] .pr-faq-plus { transform: rotate(45deg); }
        .pr-faq-a {
          font-size: 0.9375rem; color: rgba(255,250,240,0.5); line-height: 1.75;
          margin-top: 14px; padding-right: 28px;
        }

        /* ── Closing ── */
        .pr-closing {
          text-align: center; padding: 64px 24px 96px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .pr-closing h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400; font-size: clamp(1.5rem, 4vw, 1.9rem);
          color: rgba(255,250,240,0.92); letter-spacing: -0.012em; margin-bottom: 16px;
        }
        .pr-closing-sub {
          font-size: 1.0625rem; color: rgba(255,250,240,0.58);
          line-height: 1.7; max-width: 32rem; margin: 0 auto 34px;
        }
        .pr-closing-row {
          display: inline-flex; gap: 14px; align-items: center; flex-wrap: wrap; justify-content: center;
        }

        /* ── Footer ── */
        .pr-footer {
          padding: 48px 24px 64px; text-align: center;
          color: rgba(255,255,255,0.28); font-size: 0.8125rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .pr-footer a { color: rgba(255,250,240,0.5); text-decoration: none; }

        @media (max-width: 720px) {
          .pr-cards { grid-template-columns: 1fr; gap: 18px; }
          .pr-hero { padding: 72px 22px 40px; }
          .pr-card { padding: 32px 24px; }
          .pr-slider-totals { gap: 10px; }
          .pr-nav-links { gap: 14px; }
        }
      ` }} />

      <div className="pr-bg" aria-hidden="true" />

      <div className="pr-shell">
        {/* ── NAV ── */}
        <nav className="pr-nav" aria-label="Primary">
          <div className="pr-nav-inner">
            <Link className="pr-logo" href="/montree" aria-label="Montree home">
              <MontreeLogo size={26} />
              <span className="pr-logo-word">Montree</span>
            </Link>
            <div className="pr-nav-links">
              <Link className="pr-nav-link" href="/montree">Home</Link>
              <Link className="pr-nav-link" href="/montree/login-select">Log in</Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="pr-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="pr-hero-mark"
            src="/brand/m-mark-480.webp"
            alt=""
            width={480}
            height={394}
            draggable={false}
            aria-hidden="true"
          />
          <div>
            <span className="pr-eyebrow">Pricing</span>
          </div>
          <h1>Simple, honest pricing.</h1>
          <p className="pr-hero-sub">
            Every school starts with <span className="pr-gold">7 days of Premium, free</span> — no
            card. After the week, pick your plan.
          </p>
        </section>

        {/* ── PRICING CARDS ── */}
        <section className="pr-cards-wrap">
          <div className="pr-cards">
            {/* Starter — $3 */}
            <div className="pr-card" ref={addReveal}>
              <div className="pr-card-name">Starter</div>
              <div className="pr-card-price">
                <span className="pr-card-amount">$3</span>
                <span className="pr-card-unit">/ active student / month</span>
              </div>
              <div className="pr-card-total">
                {students} students = <strong>${starterMonthly}/mo</strong>
              </div>
              <ul className="pr-card-bullets">
                <li><Check className="pr-card-check" />The complete Montree system</li>
                <li><Check className="pr-card-check" />AI reports on our fast model</li>
                <li><Check className="pr-card-check" />Unlimited photo recognition</li>
                <li><Check className="pr-card-check" />Guru teacher advisor included</li>
              </ul>
              <Link className="pr-card-cta" href="/montree/login-select?signup=true">
                Start your free week
              </Link>
            </div>

            {/* Premium — $7, featured */}
            <div className="pr-card pr-card-featured" ref={addReveal}>
              <span className="pr-card-badge">Most popular</span>
              <div className="pr-card-name">Premium</div>
              <div className="pr-card-price">
                <span className="pr-card-amount">$7</span>
                <span className="pr-card-unit">/ active student / month</span>
              </div>
              <div className="pr-card-total">
                {students} students = <strong>${premiumMonthly}/mo</strong>
              </div>
              <ul className="pr-card-bullets">
                <li><Check className="pr-card-check" />Claude Sonnet reports parents keep</li>
                <li><Check className="pr-card-check" />A second, deeper look at tricky photos</li>
                <li><Check className="pr-card-check" />Guru + Astra on Claude Sonnet</li>
                <li><Check className="pr-card-check" />Everything in Starter</li>
              </ul>
              <Link className="pr-card-cta" href="/montree/login-select?signup=true">
                Start your free week
              </Link>
            </div>
          </div>
        </section>

        {/* ── SLIDER ── */}
        <section className="pr-slider-wrap" ref={addReveal}>
          <div className="pr-slider-card">
            <div className="pr-slider-label">What will it cost my school?</div>
            <div className="pr-slider-count">{students} active students</div>
            <div className="pr-slider-totals">
              <div className="pr-slider-total">
                <div className="pr-slider-total-name">Starter</div>
                <div className="pr-slider-total-value">${starterMonthly}</div>
                <div className="pr-slider-total-sub">per month</div>
              </div>
              <div className="pr-slider-total pr-slider-total-featured">
                <div className="pr-slider-total-name">Premium</div>
                <div className="pr-slider-total-value">${premiumMonthly}</div>
                <div className="pr-slider-total-sub">per month</div>
              </div>
            </div>
            <input
              type="range" min={5} max={60} step={1} value={students}
              aria-label="Number of active students"
              style={{ '--pct': `${((students - 5) / 55) * 100}%` } as React.CSSProperties}
              onChange={(e) => setStudents(Number(e.target.value))}
            />
            <div className="pr-slider-ends">
              <span>5 students</span>
              <span>60 students</span>
            </div>
          </div>
        </section>

        {/* ── FOUNDING 100 STRIP ── */}
        <section className="pr-founding-wrap" ref={addReveal}>
          <div className="pr-founding">
            <span className="pr-founding-eyebrow">Founding 100</span>
            <h2>One month of Premium free — then Premium at $3 for life.</h2>
            <p>
              The first hundred schools we hand-pick to build Montree with lock Premium at the Starter
              price, forever. Applications are read personally. Once the hundred are in, the offer closes.
            </p>
            <a className="pr-pill pr-pill-lg pr-pill-gold" href={APPLY_MAILTO}>Apply by email</a>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pr-faq-wrap">
          <div className="pr-faq">
            <h2 ref={addReveal}>Questions</h2>
            <div ref={addReveal}>
              {FAQ.map((item, i) => (
                <details key={i} className="pr-faq-item">
                  <summary>
                    <span className="pr-faq-q">{item.q}</span>
                    <span className="pr-faq-plus">+</span>
                  </summary>
                  <p className="pr-faq-a">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLOSING CTA ── */}
        <section className="pr-closing" ref={addReveal}>
          <h2>See what one photo can do.</h2>
          <p className="pr-closing-sub">
            7 days of Premium, free. No card. No installation. No training required.
          </p>
          <div className="pr-closing-row">
            <Link className="pr-pill pr-pill-lg" href="/montree/login-select?signup=true">
              Start your free week
            </Link>
            <Link className="pr-pill pr-pill-lg pr-pill-ghost" href="/montree">
              Back to home
            </Link>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="pr-footer">
          <a href="https://montree.xyz">montree.xyz</a>
          {' · '}
          <Link href="/montree" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link>
          {' · '}
          <Link href="/montree/login-select" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Log in</Link>
        </footer>
      </div>
    </>
  );
}

// Emerald/gold check glyph for the pricing-card bullets. Colour via className.
function Check({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        fill="currentColor"
      />
    </svg>
  );
}
