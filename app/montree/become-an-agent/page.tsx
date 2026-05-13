'use client';

// /montree/become-an-agent
//
// Phase 3 of agent system fix plan — proper public recruitment landing
// for prospective Montree agents. Replaces the redirect stub.
//
// Structure (single scroll):
//   1. Nav
//   2. Hero — agent recruitment angle, two CTAs (Apply / How it works)
//   3. The maths — earnings table (carried over from /for-teachers — best asset)
//   4. How it works — 4 steps (Apply → Review → Issue → Earn)
//   5. The rules — agent-flavoured
//   6. Application form
//   7. Confirmation state (replaces form after successful submit)
//   8. Footer
//
// Form posts to POST /api/montree/become-an-agent/apply.
// Honeypot field `website_url_hp` for bot filtering.

import { useRef, useEffect, useState, FormEvent } from 'react';

interface FormState {
  name: string;
  email: string;
  country: string;
  affiliation: string;
  current_role: string;
  why_good_fit: string;
  website_url_hp: string; // honeypot — leave empty
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  country: '',
  affiliation: '',
  current_role: '',
  why_good_fit: '',
  website_url_hp: '',
};

const EARNINGS = [
  { students: 20, monthly: 140, share: 28, annual: 336, label: 'Small classroom' },
  { students: 60, monthly: 420, share: 84, annual: 1008, label: 'Typical school' },
  { students: 120, monthly: 840, share: 168, annual: 2016, label: 'Large school' },
];

export default function BecomeAnAgentPage() {
  const revealRefs = useRef<HTMLElement[]>([]);
  const formSectionRef = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const update =
    (field: keyof FormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: ev.target.value }));
    };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/montree/become-an-agent/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Could not submit application.');
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch (err) {
      console.error('[become-an-agent] submit failed:', err);
      setErrorMsg('Network error. Try again in a moment.');
      setStatus('error');
    }
  };

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
        .ba-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #E8C96A;
          font-weight: 500;
        }
        .ba-pill {
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
        .ba-pill:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .ba-pill-lg { padding: 18px 34px; font-size: 1rem; }
        .ba-pill-ghost {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: none;
        }
        .ba-pill-ghost:hover { background: rgba(255,255,255,0.04); }
        .ba-pill[disabled] { opacity: 0.55; cursor: not-allowed; transform: none; }
        .ba-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(8,26,18,0.72);
          backdrop-filter: saturate(180%) blur(14px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ba-nav-inner {
          max-width: 1180px; margin: 0 auto;
          padding: 18px 32px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ba-logo {
          display: inline-flex; align-items: center; gap: 10px;
          text-decoration: none;
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 500; font-size: 1.125rem;
          background: linear-gradient(90deg, #62C396 0%, #47AB7E 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ba-hero {
          padding: 96px 32px 80px;
          max-width: 920px; margin: 0 auto;
          text-align: center;
        }
        .ba-hero h1 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 500;
          font-size: clamp(2.4rem, 6vw, 3.6rem);
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin: 22px 0 22px;
        }
        .ba-hero-sub {
          font-size: clamp(1rem, 1.6vw, 1.125rem);
          line-height: 1.55;
          color: rgba(255,255,255,0.55);
          max-width: 580px;
          margin: 0 auto 36px;
        }
        .ba-cta-row {
          display: inline-flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
        }
        .ba-table-wrap {
          padding: 32px 32px 72px;
          max-width: 920px; margin: 0 auto;
        }
        .ba-table-inner {
          background: rgba(8,20,12,0.55);
          border: 1px solid rgba(130,217,174,0.14);
          border-radius: 14px;
          padding: 30px;
        }
        .ba-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 18px;
          font-size: 0.9375rem;
        }
        .ba-table th, .ba-table td {
          padding: 14px 6px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ba-table th {
          font-weight: 500;
          color: rgba(255,255,255,0.45);
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ba-table td.accent {
          color: #82d9ae;
          font-weight: 500;
        }
        .ba-steps {
          max-width: 760px; margin: 0 auto;
          padding: 32px;
        }
        .ba-step {
          display: grid;
          grid-template-columns: 56px 1fr;
          gap: 22px;
          margin-bottom: 28px;
          align-items: flex-start;
        }
        .ba-step-num {
          width: 40px; height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(232,201,106,0.4);
          color: #E8C96A;
          font-family: var(--font-lora), Georgia, serif;
          font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
        }
        .ba-step h3 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 500;
          font-size: 1.25rem;
          color: #ffffff;
          margin-bottom: 8px;
        }
        .ba-step p {
          color: rgba(255,255,255,0.55);
          font-size: 0.9375rem;
          line-height: 1.6;
        }
        .ba-rules { max-width: 720px; margin: 0 auto; padding: 32px; border-top: 1px solid rgba(255,255,255,0.06); }
        .ba-rule {
          display: grid;
          grid-template-columns: 16px 1fr;
          gap: 14px;
          margin-bottom: 18px;
          align-items: start;
        }
        .ba-rule-dot {
          width: 6px; height: 6px;
          border-radius: 999px;
          background: #E8C96A;
          margin-top: 9px;
        }
        .ba-rule p {
          color: rgba(255,255,255,0.55);
          font-size: 0.9375rem;
          line-height: 1.6;
        }
        .ba-rule strong { color: rgba(255,255,255,0.85); font-weight: 500; }
        .ba-form-wrap {
          padding: 64px 32px;
          max-width: 720px; margin: 0 auto;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .ba-form-card {
          background: rgba(8,20,12,0.6);
          border: 1px solid rgba(130,217,174,0.18);
          border-radius: 16px;
          padding: 36px;
        }
        .ba-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 16px;
        }
        @media (max-width: 540px) {
          .ba-form-row { grid-template-columns: 1fr; }
        }
        .ba-form-label {
          display: block;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .ba-form-input,
        .ba-form-textarea {
          width: 100%;
          padding: 12px 14px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(130,217,174,0.18);
          border-radius: 10px;
          color: #ffffff;
          font-size: 0.9375rem;
          font-family: inherit;
          line-height: 1.5;
          transition: border-color 200ms ease, background 200ms ease;
        }
        .ba-form-input:focus,
        .ba-form-textarea:focus {
          outline: none;
          border-color: rgba(130,217,174,0.5);
          background: rgba(0,0,0,0.35);
        }
        .ba-form-textarea { resize: vertical; min-height: 110px; }
        .ba-form-honeypot {
          position: absolute;
          left: -10000px;
          width: 1px;
          height: 1px;
          opacity: 0;
        }
        .ba-form-error {
          color: #f87171;
          font-size: 0.875rem;
          margin-top: 14px;
          padding: 12px;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.25);
          border-radius: 8px;
        }
        .ba-form-success {
          padding: 36px;
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.3);
          border-radius: 16px;
          text-align: center;
        }
        .ba-form-success h3 {
          font-family: var(--font-lora), Georgia, serif;
          font-weight: 500;
          font-size: 1.5rem;
          color: #ffffff;
          margin-bottom: 14px;
        }
        .ba-form-success p {
          color: rgba(255,255,255,0.65);
          font-size: 0.9375rem;
          line-height: 1.6;
          max-width: 460px;
          margin: 0 auto;
        }
        .ba-footer {
          padding: 60px 32px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 0.8125rem;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden="true">
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
            radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
            linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
          `,
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Nav */}
        <nav className="ba-nav">
          <div className="ba-nav-inner">
            <a className="ba-logo" href="/montree">🌿 Montree</a>
            <button className="ba-pill" onClick={scrollToForm}>Apply now</button>
          </div>
        </nav>

        {/* Hero */}
        <section className="ba-hero">
          <div ref={addReveal} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="ba-label" style={{ marginBottom: 30 }}>Montree agent programme</span>
            <h1>Bring Montree to schools.<br />Earn from every one.</h1>
            <p className="ba-hero-sub">
              You introduce schools to Montree. When they subscribe, 20% of every monthly payment comes back to you — for as long as they stay.
            </p>
            <div className="ba-cta-row">
              <button className="ba-pill ba-pill-lg" onClick={scrollToForm}>Apply now</button>
              <a className="ba-pill ba-pill-lg ba-pill-ghost" href="#how-it-works">How it works</a>
            </div>
            <p style={{ marginTop: 20, fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>
              No quota · Work at your own pace · Personal review of every application
            </p>
          </div>
        </section>

        {/* The maths */}
        <div className="ba-table-wrap" ref={addReveal}>
          <div className="ba-table-inner">
            <span className="ba-label">What you could earn</span>
            <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.45)', fontSize: '0.9375rem' }}>
              Montree charges $7 per student, per month. Your share is 20% of that, every month, for as long as the school stays.
            </p>
            <table className="ba-table">
              <thead>
                <tr>
                  <th>School size</th>
                  <th>School pays</th>
                  <th>You earn / mo</th>
                  <th>You earn / yr</th>
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((row) => (
                  <tr key={row.students}>
                    <td>{row.label} · {row.students} students</td>
                    <td>${row.monthly}/mo</td>
                    <td className="accent">${row.share}/mo</td>
                    <td className="accent">${row.annual}/yr</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 20, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              Bring three schools the size of the typical school above — that's $252/mo recurring. Bring a large school — that's $168/mo from one introduction.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="ba-steps" id="how-it-works" ref={addReveal}>
          <span className="ba-label">How it works</span>
          <div className="ba-step" style={{ marginTop: 40 }}>
            <div className="ba-step-num">1</div>
            <div>
              <h3>Apply</h3>
              <p>Tell us a bit about yourself. We read every application personally. If you're a Montessori teacher, trainer, consultant, or just someone with deep connections in the Montessori world — you're who we're looking for.</p>
            </div>
          </div>
          <div className="ba-step">
            <div className="ba-step-num">2</div>
            <div>
              <h3>Get reviewed</h3>
              <p>Within a few days we'll be in touch. If we're a good fit, you'll receive your personal agent code and a short onboarding doc.</p>
            </div>
          </div>
          <div className="ba-step">
            <div className="ba-step-num">3</div>
            <div>
              <h3>Pitch your way</h3>
              <p>Generate referral codes one per pitch from your agent dashboard. Share them with schools as part of your normal conversations. You decide who, how, and when.</p>
            </div>
          </div>
          <div className="ba-step">
            <div className="ba-step-num">4</div>
            <div>
              <h3>Earn every month</h3>
              <p>When a school you pitched subscribes, 20% of their monthly payment is yours — paid directly to your bank via Stripe Connect Express. No cap, no expiry, no minimum activity required.</p>
            </div>
          </div>
        </div>

        {/* The rules */}
        <div className="ba-rules" ref={addReveal}>
          <span className="ba-label">The rules</span>
          <div style={{ marginTop: 28 }}>
            {[
              { strong: '20% of the school\'s monthly subscription.', rest: ' Locked at the moment you bring them in. Per-school rate stays the same even if our pricing changes later.' },
              { strong: 'No cap, no expiry.', rest: ' Bring 50 schools, earn from all 50. As long as they keep paying, you keep earning.' },
              { strong: 'Paid monthly to your bank.', rest: ' Stripe Connect Express handles the payout. Your bank, your tax setup — we never see those details.' },
              { strong: 'One agent per school.', rest: ' The first agent whose code is redeemed at signup is permanently linked to that school. Revenue share doesn\'t fork.' },
              { strong: 'No targets, no quotas.', rest: ' Pitch at your own pace. We\'re looking for genuine introductions, not high-volume affiliate marketing.' },
            ].map((rule, i) => (
              <div className="ba-rule" key={i}>
                <div className="ba-rule-dot" />
                <p><strong>{rule.strong}</strong>{rule.rest}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <section className="ba-form-wrap" ref={(el) => { addReveal(el); formSectionRef.current = el; }}>
          <span className="ba-label">Apply</span>
          <h2 style={{
            fontFamily: 'var(--font-lora), Georgia, serif',
            fontWeight: 500,
            fontSize: 'clamp(1.6rem, 3vw, 2.1rem)',
            color: '#ffffff',
            margin: '14px 0 28px',
          }}>
            Tell us about yourself.
          </h2>

          {status === 'success' ? (
            <div className="ba-form-success">
              <h3>Application received.</h3>
              <p>
                Thanks for applying. I read every application personally — you'll hear back from me within a few days. If we're a good fit, I'll send your agent code and walk you through getting set up.
              </p>
              <p style={{ marginTop: 18, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
                — Tredoux
              </p>
            </div>
          ) : (
            <form className="ba-form-card" onSubmit={submit} noValidate>
              <div className="ba-form-row">
                <div>
                  <label className="ba-form-label" htmlFor="ba-name">Your name *</label>
                  <input
                    id="ba-name"
                    className="ba-form-input"
                    type="text"
                    autoComplete="name"
                    required
                    value={form.name}
                    onChange={update('name')}
                    disabled={status === 'submitting'}
                  />
                </div>
                <div>
                  <label className="ba-form-label" htmlFor="ba-email">Email *</label>
                  <input
                    id="ba-email"
                    className="ba-form-input"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={update('email')}
                    disabled={status === 'submitting'}
                  />
                </div>
              </div>

              <div className="ba-form-row">
                <div>
                  <label className="ba-form-label" htmlFor="ba-country">Country</label>
                  <input
                    id="ba-country"
                    className="ba-form-input"
                    type="text"
                    autoComplete="country-name"
                    value={form.country}
                    onChange={update('country')}
                    disabled={status === 'submitting'}
                  />
                </div>
                <div>
                  <label className="ba-form-label" htmlFor="ba-aff">School / organisation</label>
                  <input
                    id="ba-aff"
                    className="ba-form-input"
                    type="text"
                    placeholder="(or independent)"
                    value={form.affiliation}
                    onChange={update('affiliation')}
                    disabled={status === 'submitting'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="ba-form-label" htmlFor="ba-role">Your current role</label>
                <input
                  id="ba-role"
                  className="ba-form-input"
                  type="text"
                  placeholder="e.g. Lead teacher, AMI trainer, school consultant"
                  value={form.current_role}
                  onChange={update('current_role')}
                  disabled={status === 'submitting'}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="ba-form-label" htmlFor="ba-pitch">Why you'd be a good agent *</label>
                <textarea
                  id="ba-pitch"
                  className="ba-form-textarea"
                  required
                  rows={5}
                  placeholder="Your background, your connections in the Montessori world, the schools you'd think of first…"
                  value={form.why_good_fit}
                  onChange={update('why_good_fit')}
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Honeypot — hidden from real users, bots will fill */}
              <div className="ba-form-honeypot" aria-hidden="true">
                <label htmlFor="ba-hp">Leave this blank</label>
                <input
                  id="ba-hp"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website_url_hp}
                  onChange={update('website_url_hp')}
                />
              </div>

              {status === 'error' && errorMsg && (
                <div className="ba-form-error">{errorMsg}</div>
              )}

              <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  className="ba-pill ba-pill-lg"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? 'Sending…' : 'Send application'}
                </button>
                <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
                  Reviewed personally · No automated rejections
                </span>
              </div>
            </form>
          )}
        </section>

        {/* Footer */}
        <footer className="ba-footer">
          🌿 Montree · <a href="https://montree.xyz" style={{ color: 'rgba(130,217,174,0.7)', textDecoration: 'none' }}>montree.xyz</a>
        </footer>
      </div>
    </>
  );
}
