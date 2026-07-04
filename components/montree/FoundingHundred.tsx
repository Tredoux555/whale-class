'use client';

import { useEffect, useState } from 'react';

// Founding 100 waitlist section for the Montree homepage (mounted directly
// below the hero). Counter reflects ADMITTED schools (cap - admitted), fetched
// from /api/montree/founding/count. Signups POST to /api/montree/founding/join.
// Dark-forest tokens, mobile-first. Copy is verbatim + English-only by design.

interface CountData {
  remaining: number;
  cap: number;
  wave: number;
  is_closed: boolean;
}

export default function FoundingHundred() {
  const [count, setCount] = useState<CountData | null>(null);
  const [school, setSchool] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [students, setStudents] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/montree/founding/count', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCount(d))
      .catch(() => setCount({ remaining: 100, cap: 100, wave: 1, is_closed: false }));
  }, []);

  const isFull = !!count && (count.is_closed || count.remaining <= 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!email.includes('@')) { setError('Please enter a valid email.'); return; }
    if (!isFull && !school.trim()) { setError('Please enter your school name.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/montree/founding/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: isFull ? '' : school,
          contact_name: name,
          email,
          country,
          student_count: students,
          website, // honeypot
        }),
      });
      if (res.status === 429) { setError('Too many attempts. Please try again in a few minutes.'); return; }
      if (!res.ok) { setError('Something went wrong. Please try again.'); return; }
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="fh" aria-label="Founding 100 waitlist">
      <style dangerouslySetInnerHTML={{ __html: `
        .fh {
          padding: 72px 24px 96px;
          display: flex;
          justify-content: center;
          position: relative;
          z-index: 1;
        }
        .fh-card {
          width: 100%;
          max-width: 560px;
          background: rgba(10, 26, 15, 0.72);
          border: 1px solid rgba(52, 211, 153, 0.22);
          border-radius: 22px;
          padding: 40px 32px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(232,201,106,0.04);
          position: relative;
          overflow: hidden;
        }
        .fh-glow {
          position: absolute; top: -120px; right: -100px;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(52,211,153,0.16) 0%, transparent 70%);
          pointer-events: none;
        }
        .fh-eyebrow {
          display: inline-block;
          font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: #E8C96A;
          border: 1px solid rgba(232,201,106,0.3);
          border-radius: 999px; padding: 5px 14px; margin-bottom: 20px;
          position: relative;
        }
        .fh-h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: clamp(1.7rem, 5vw, 2.3rem);
          font-weight: 700; color: #f4f7f5; line-height: 1.15;
          letter-spacing: -0.5px; margin: 0 0 18px; position: relative;
        }
        .fh-counter {
          display: flex; align-items: baseline; gap: 10px;
          margin-bottom: 20px; position: relative;
        }
        .fh-counter-num {
          font-family: 'Lora', Georgia, serif;
          font-size: 3rem; font-weight: 700; color: #E8C96A; letter-spacing: -1px; line-height: 1;
        }
        .fh-counter-label { font-size: 15px; color: rgba(244,247,245,0.55); }
        .fh-body {
          font-size: 15px; line-height: 1.7; color: rgba(244,247,245,0.72);
          margin: 0 0 28px; position: relative;
        }
        .fh-form { display: flex; flex-direction: column; gap: 12px; position: relative; }
        .fh-row { display: flex; gap: 12px; }
        .fh-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 12px; padding: 14px 16px;
          font-size: 16px; color: #f4f7f5;
          font-family: inherit; outline: none;
          transition: border-color 0.2s;
        }
        .fh-input::placeholder { color: rgba(244,247,245,0.4); }
        .fh-input:focus { border-color: rgba(52,211,153,0.6); box-shadow: 0 0 0 3px rgba(52,211,153,0.12); }
        .fh-hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
        .fh-cta {
          margin-top: 6px;
          background: linear-gradient(135deg, #34d399 0%, #1D6B48 100%);
          color: #06251c; font-weight: 700; font-size: 16px;
          border: none; border-radius: 12px; padding: 16px 24px;
          cursor: pointer; letter-spacing: 0.2px;
          box-shadow: 0 8px 24px rgba(52,211,153,0.28);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          min-height: 52px;
        }
        .fh-cta:hover { transform: translateY(-1px); box-shadow: 0 12px 30px rgba(52,211,153,0.34); }
        .fh-cta:disabled { opacity: 0.6; cursor: default; transform: none; }
        .fh-error { font-size: 13px; color: #fca5a5; margin: 4px 0 0; }
        .fh-success {
          text-align: center; padding: 12px 0; position: relative;
        }
        .fh-success-icon { font-size: 32px; }
        .fh-success-h { font-family: 'Lora', Georgia, serif; font-size: 1.4rem; color: #34d399; margin: 12px 0 6px; }
        .fh-success-p { font-size: 15px; color: rgba(244,247,245,0.7); line-height: 1.6; }
        @media (max-width: 480px) {
          .fh { padding: 48px 18px 72px; }
          .fh-card { padding: 32px 22px; }
          .fh-row { flex-direction: column; gap: 12px; }
        }
      ` }} />

      <div className="fh-card">
        <div className="fh-glow" />

        {submitted ? (
          <div className="fh-success">
            <div className="fh-success-icon">🌱</div>
            <div className="fh-success-h">You&apos;re on the list.</div>
            <p className="fh-success-p">
              {isFull
                ? 'Thank you — we will be in touch as spots open up.'
                : 'Thank you. We will be in touch as we open each wave of the Founding 100.'}
            </p>
          </div>
        ) : (
          <>
            <span className="fh-eyebrow">Founding 100</span>

            {isFull ? (
              <>
                <h2 className="fh-h2">The Founding 100 is full</h2>
                <p className="fh-body">
                  Every founding spot has been claimed. Join the general waitlist and we&apos;ll reach out
                  if a place opens up.
                </p>
                <form className="fh-form" onSubmit={submit}>
                  <input className="fh-hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    placeholder="Leave this empty" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  <input className="fh-input" type="email" placeholder="Your email" required
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                  {error && <p className="fh-error">{error}</p>}
                  <button className="fh-cta" type="submit" disabled={submitting}>
                    {submitting ? 'Joining…' : 'Join the general waitlist'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="fh-h2">Founding 100 Schools</h2>

                <div className="fh-counter">
                  <span className="fh-counter-num">{count ? count.remaining : '—'}</span>
                  <span className="fh-counter-label">of {count ? count.cap : 100} spots remaining</span>
                </div>

                <p className="fh-body">
                  Free for 6 months, then $3/student locked for life. Full Premium reports, founder price,
                  forever. Wave 1 opens now. Wave 2 opens when Wave 1 is delighted. Once we&apos;re full,
                  this offer closes permanently.
                </p>

                <form className="fh-form" onSubmit={submit}>
                  <input className="fh-hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    placeholder="Leave this empty" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  <input className="fh-input" placeholder="School name" required
                    value={school} onChange={(e) => setSchool(e.target.value)} />
                  <div className="fh-row">
                    <input className="fh-input" placeholder="Your name"
                      value={name} onChange={(e) => setName(e.target.value)} />
                    <input className="fh-input" type="email" placeholder="Email" required
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="fh-row">
                    <input className="fh-input" placeholder="Country"
                      value={country} onChange={(e) => setCountry(e.target.value)} />
                    <input className="fh-input" type="number" min={0} placeholder="Approx. students"
                      value={students} onChange={(e) => setStudents(e.target.value)} />
                  </div>
                  {error && <p className="fh-error">{error}</p>}
                  <button className="fh-cta" type="submit" disabled={submitting}>
                    {submitting ? 'Joining…' : 'Join the Waitlist'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
