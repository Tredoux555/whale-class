'use client';

import { useEffect, useState } from 'react';

// Founding 100 section for the Montree homepage (mounted directly below the
// hero). Counter reflects ADMITTED schools (cap - admitted), fetched from
// /api/montree/founding/count. Applications now come in BY EMAIL (mailto CTA) —
// Tredoux reads each personally and admits from super-admin. The old self-serve
// waitlist form (POST /api/montree/founding/join) is retired; the route stays
// on disk, uncalled. Dark-forest tokens, mobile-first. Copy is English-only by
// design (a deliberate, personal, non-i18n voice for the founder offer).

interface CountData {
  remaining: number;
  cap: number;
  wave: number;
  is_closed: boolean;
}

// Pre-filled application email. Body is a light template the applicant fills
// in. encodeURIComponent on each part so newlines (%0A) and the em-dash in the
// subject survive across mail clients.
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

export default function FoundingHundred() {
  const [count, setCount] = useState<CountData | null>(null);

  useEffect(() => {
    fetch('/api/montree/founding/count', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCount(d))
      .catch(() => setCount({ remaining: 100, cap: 100, wave: 1, is_closed: false }));
  }, []);

  const isFull = !!count && (count.is_closed || count.remaining <= 0);

  return (
    <section className="fh" aria-label="Founding 100">
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
          background: radial-gradient(circle, rgba(232,201,106,0.11) 0%, transparent 70%);
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
          font-family: var(--font-lora), 'Lora', Georgia, serif;
          font-size: clamp(1.55rem, 4.6vw, 2.1rem);
          font-weight: 500; color: #f4f7f5; line-height: 1.22;
          letter-spacing: -0.4px; margin: 0 0 18px; position: relative;
        }
        .fh-counter {
          display: flex; align-items: baseline; gap: 10px;
          margin-bottom: 22px; position: relative;
        }
        .fh-counter-num {
          font-family: var(--font-lora), 'Lora', Georgia, serif;
          font-size: 3rem; font-weight: 400; color: #E8C96A; letter-spacing: -1px; line-height: 1;
          text-shadow: 0 0 28px rgba(232,201,106,0.25);
        }
        .fh-counter-label { font-size: 15px; color: rgba(244,247,245,0.55); }
        .fh-body {
          font-size: 15px; line-height: 1.7; color: rgba(244,247,245,0.72);
          margin: 0 0 16px; position: relative;
        }
        .fh-list {
          list-style: none; margin: 0 0 28px; padding: 0; position: relative;
          display: flex; flex-direction: column; gap: 9px;
        }
        .fh-list li {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 14px; line-height: 1.55; color: rgba(244,247,245,0.68);
        }
        .fh-list-dot {
          flex-shrink: 0; margin-top: 8px;
          width: 5px; height: 5px; border-radius: 999px; background: #E8C96A;
          box-shadow: 0 0 8px rgba(232,201,106,0.5);
        }
        /* Gold pill — the founder offer wears the founder colour, and the
           999-radius matches every other CTA on the site. */
        .fh-cta {
          display: inline-flex; align-items: center; justify-content: center;
          margin-top: 4px; position: relative;
          background: linear-gradient(135deg, #E8C96A 0%, #cfa93f 100%);
          color: #1a1208; font-weight: 600; font-size: 16px;
          border: 1px solid rgba(232,201,106,0.4);
          border-radius: 999px; padding: 16px 30px;
          cursor: pointer; letter-spacing: 0.2px; text-decoration: none;
          box-shadow: 0 10px 28px -8px rgba(232,201,106,0.45);
          transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
          min-height: 52px;
        }
        .fh-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 34px -8px rgba(232,201,106,0.55);
          filter: brightness(1.04);
        }
        .fh-hint {
          font-size: 12.5px; color: rgba(244,247,245,0.4); margin: 14px 0 0;
          position: relative; line-height: 1.5;
        }
        @media (max-width: 480px) {
          .fh { padding: 48px 18px 72px; }
          .fh-card { padding: 32px 22px; }
          .fh-cta { width: 100%; }
        }
      ` }} />

      <div className="fh-card">
        <div className="fh-glow" />

        <span className="fh-eyebrow">Founding 100</span>

        {isFull ? (
          <>
            <h2 className="fh-h2">The Founding 100 is full</h2>
            <p className="fh-body">
              Every founding place has been claimed. If you&apos;d still like to work with us, email us
              and we&apos;ll add you to the general list — we&apos;ll reach out if a place opens up.
            </p>
            <a className="fh-cta" href={APPLY_MAILTO}>Email us</a>
          </>
        ) : (
          <>
            <h2 className="fh-h2">
              One month of Premium, free.<br />Then Premium locked at $3 per student — for life.
            </h2>

            <div className="fh-counter">
              <span className="fh-counter-num">{count ? count.remaining : '—'}</span>
              <span className="fh-counter-label">
                of {count ? count.cap : 100} founding places remaining
              </span>
            </div>

            <p className="fh-body">
              We&apos;re hand-picking the first hundred schools to build Montree with. Applications are
              reviewed personally and schools are enrolled in small batches of 10–15.
            </p>

            <ul className="fh-list">
              <li><span className="fh-list-dot" />One month of Premium free, then Premium at $3/student — locked for life.</li>
              <li><span className="fh-list-dot" />Every application read personally. No forms, no bots.</li>
              <li><span className="fh-list-dot" />In exchange: help us validate Montree — your feedback and a testimonial.</li>
            </ul>

            <a className="fh-cta" href={APPLY_MAILTO}>Apply by email</a>
            <p className="fh-hint">
              Opens your email with a short template — school name, country, student count, and why you want in.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
