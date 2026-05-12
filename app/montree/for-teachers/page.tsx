'use client';

// /montree/for-teachers/page.tsx — Teacher Revenue Share programme

import { useRef, useEffect } from 'react';

export default function ForTeachersPage() {
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

  const earnings = [
    { students: 20, monthly: 140, share: 28, annual: 336, label: 'Small classroom' },
    { students: 60, monthly: 420, share: 84, annual: 1008, label: 'Typical school' },
    { students: 120, monthly: 840, share: 168, annual: 2016, label: 'Large school' },
  ];

  return (
    <>
      <style jsx global>{`
* { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: rgba(255,255,255,0.85);
          background: #06140e;
          -webkit-font-smoothing: antialiased;
          line-height: 1.5;
          overflow-x: hidden;
        }
        .ft-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #E8C96A;
          font-weight: 500;
        }
        .ft-pill {
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
          transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease;
          box-shadow: 0 1px 0 rgba(130,217,174,0.22) inset, 0 10px 28px -12px rgba(6,20,14,0.85);
          white-space: nowrap;
          font-family: inherit;
        }
        .ft-pill:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .ft-pill-lg { padding: 18px 34px; font-size: 1rem; }
        .ft-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(8,26,18,0.72);
          backdrop-filter: saturate(180%) blur(14px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ft-nav-inner {
          max-width: 1180px; margin: 0 auto;
          padding: 18px 32px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ft-logo {
          display: inline-flex; align-items: center; gap: 10px;
          text-decoration: none;
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 500; font-size: 1.125rem;
          background: linear-gradient(90deg, #62C396 0%, #47AB7E 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ft-hero {
          min-height: calc(100vh - 70px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 120px 32px 140px;
        }
        .ft-hero h1 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(3rem, 7.5vw, 5.5rem);
          line-height: 1.06; letter-spacing: -0.025em;
          color: #ffffff; margin-bottom: 28px; max-width: 16ch;
        }
        .ft-hero-sub {
          font-size: 1.125rem; color: rgba(255,255,255,0.5);
          line-height: 1.6; margin-bottom: 44px; max-width: 38ch;
        }
        .ft-section {
          padding: 80px 32px;
          max-width: 720px; margin: 0 auto;
        }
        .ft-section h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.875rem, 3.6vw, 2.5rem);
          line-height: 1.18; letter-spacing: -0.018em;
          color: rgba(255,255,255,0.92); margin-bottom: 22px;
        }
        .ft-section p {
          color: rgba(255,255,255,0.42); line-height: 1.85; font-size: 1.0625rem;
        }
        .ft-steps {
          padding: 80px 32px;
          max-width: 720px; margin: 0 auto;
        }
        .ft-step {
          display: grid; grid-template-columns: 48px 1fr;
          gap: 24px; padding: 40px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          align-items: start;
        }
        .ft-step:last-child { border-bottom: 0; }
        .ft-step-num {
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(39,129,90,0.4) 0%, rgba(12,36,25,0.7) 100%);
          border: 1px solid rgba(130,217,174,0.22);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-lora), Georgia, serif;
          font-size: 1.125rem; color: rgba(130,217,174,0.85);
          flex-shrink: 0;
        }
        .ft-step h3 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400; font-size: 1.375rem;
          color: rgba(255,255,255,0.90); margin-bottom: 10px;
          letter-spacing: -0.012em;
        }
        .ft-step p { color: rgba(255,255,255,0.42); line-height: 1.75; font-size: 1rem; }
        .ft-table-wrap {
          padding: 80px 32px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .ft-table-inner { max-width: 720px; margin: 0 auto; }
        .ft-table {
          width: 100%; border-collapse: collapse; margin-top: 40px;
        }
        .ft-table th {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em;
          color: rgba(255,255,255,0.28); font-weight: 500;
          padding: 0 20px 16px; text-align: right;
        }
        .ft-table th:first-child { text-align: left; }
        .ft-table td {
          padding: 20px; text-align: right;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.9375rem; color: rgba(255,255,255,0.6);
        }
        .ft-table td:first-child { text-align: left; color: rgba(255,255,255,0.75); }
        .ft-table td.accent {
          color: #62C396; font-weight: 500;
        }
        .ft-table tr:hover td { background: rgba(255,255,255,0.02); }
        .ft-rules {
          padding: 80px 32px;
          border-top: 1px solid rgba(255,255,255,0.06);
          max-width: 720px; margin: 0 auto;
        }
        .ft-rule {
          display: flex; gap: 16px; padding: 22px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .ft-rule:last-child { border-bottom: 0; }
        .ft-rule-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #E8C96A; flex-shrink: 0; margin-top: 8px;
        }
        .ft-rule p { color: rgba(255,255,255,0.45); line-height: 1.75; font-size: 1rem; }
        .ft-rule strong { color: rgba(255,255,255,0.78); font-weight: 500; }
        .ft-closing {
          padding: 160px 32px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .ft-closing h2 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 400; font-size: clamp(2.25rem, 5vw, 3.2rem);
          line-height: 1.1; letter-spacing: -0.022em;
          color: #ffffff; margin-bottom: 24px;
        }
        .ft-closing-sub {
          color: rgba(255,255,255,0.5); font-size: 1.0625rem;
          line-height: 1.7; max-width: 44ch;
          margin: 0 auto 40px;
        }
        .ft-footer {
          padding: 48px 32px; text-align: center;
          color: rgba(255,255,255,0.25); font-size: 0.78rem;
          letter-spacing: 0.02em;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        @media (max-width: 640px) {
          .ft-nav-inner { padding: 14px 20px; }
          .ft-hero { padding: 80px 24px 100px; }
          .ft-section, .ft-steps, .ft-rules { padding: 60px 24px; }
          .ft-table-wrap { padding: 60px 24px; }
          .ft-closing { padding: 100px 24px; }
        }
      `}</style>

      {/* Background gradient */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
          radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
          linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Nav */}
        <nav className="ft-nav">
          <div className="ft-nav-inner">
            <a className="ft-logo" href="/montree">🌿 Montree</a>
            <a className="ft-pill" href="/montree/try">Start for free</a>
          </div>
        </nav>

        {/* Hero */}
        <section className="ft-hero">
          <div ref={addReveal} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="ft-label" style={{ marginBottom: 40 }}>Teacher revenue share</span>
            <h1>You found it.<br />Now earn from it.</h1>
            <p className="ft-hero-sub">
              Bring Montree to your school. Every month it stays,<br />
              20% of what they pay comes back to you.
            </p>
            <a className="ft-pill ft-pill-lg" href="/montree/try">Start your free trial</a>
            <p style={{ marginTop: 20, fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>
              No credit card · One classroom · 30 days free
            </p>
          </div>
        </section>

        {/* How it works */}
        <div className="ft-steps" ref={addReveal}>
          <span className="ft-label">How it works</span>
          <div className="ft-step" style={{ marginTop: 40 }}>
            <div className="ft-step-num">1</div>
            <div>
              <h3>Start your free trial</h3>
              <p>Sign up as a teacher. One classroom, 30 days free. Use Montree with your students — let it do the paperwork, the observations, the parent reports.</p>
            </div>
          </div>
          <div className="ft-step">
            <div className="ft-step-num">2</div>
            <div>
              <h3>Introduce it to your school</h3>
              <p>Show your principal what Montree does. When the school subscribes — whether that's your classroom or the whole building — you become the founding teacher.</p>
            </div>
          </div>
          <div className="ft-step">
            <div className="ft-step-num">3</div>
            <div>
              <h3>Earn 20% every month</h3>
              <p>As long as your school is a paying Montree subscriber and you're on staff, 20% of their monthly subscription is yours. No cap. No expiry. Paid monthly.</p>
            </div>
          </div>
        </div>

        {/* The maths */}
        <div className="ft-table-wrap" ref={addReveal}>
          <div className="ft-table-inner">
            <span className="ft-label">The maths</span>
            <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem' }}>
              Montree charges $7 per student, per month.
            </p>
            <table className="ft-table">
              <thead>
                <tr>
                  <th>School size</th>
                  <th>School pays</th>
                  <th>You earn / mo</th>
                  <th>You earn / yr</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((row) => (
                  <tr key={row.students}>
                    <td>{row.label} · {row.students} students</td>
                    <td>${row.monthly}/mo</td>
                    <td className="accent">${row.share}/mo</td>
                    <td className="accent">${row.annual}/yr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Why this matters */}
        <section className="ft-section" ref={addReveal}>
          <span className="ft-label">The reasoning</span>
          <h2 style={{ marginTop: 22 }}>Teachers are the ones who actually decide.</h2>
          <p>
            Principals approve budgets. Teachers choose tools. If a teacher loves Montree enough to bring it to their school, they've done something no sales team could do — they've given it credibility, shown it in action, and built trust with the people who matter. That deserves more than a thank-you email.
          </p>
        </section>

        {/* Rules */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '80px 32px' }} ref={addReveal}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <span className="ft-label">The rules</span>
            <div style={{ marginTop: 32 }}>
              {[
                { strong: 'You must be the founding teacher.', rest: ' The teacher who started the trial that became the school plan. First one in, for that school.' },
                { strong: 'You must remain on staff.', rest: ' The revenue share is tied to your employment at the school. If you leave, it stays with the school.' },
                { strong: 'No cap, no expiry.', rest: ' As long as the school is paying and you\'re there, the 20% is yours. Month after month.' },
                { strong: 'Paid monthly.', rest: ' We\'ll contact you to set up payment once your school converts to a paid plan.' },
                { strong: 'One founding teacher per school.', rest: ' If multiple teachers sign up individually before a school plan exists, the first one who brought the trial counts.' },
              ].map((rule, i) => (
                <div className="ft-rule" key={i}>
                  <div className="ft-rule-dot" />
                  <p><strong>{rule.strong}</strong>{rule.rest}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Closing CTA */}
        <section className="ft-closing" ref={addReveal}>
          <h2>Start with one classroom.</h2>
          <p className="ft-closing-sub">
            30 days free. No credit card. If your school loves it as much as you do, you'll be earning before the trial ends.
          </p>
          <a className="ft-pill ft-pill-lg" href="/montree/try">
            Get started free
          </a>
        </section>

        {/* Footer */}
        <footer className="ft-footer">
          🌿 Montree · montree.xyz
        </footer>
      </div>
    </>
  );
}
