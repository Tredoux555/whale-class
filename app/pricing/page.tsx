'use client';

import { useEffect, useRef, useState } from 'react';

// /app/pricing/page.tsx — Montree public pricing page
// One plan. Subscription from day 1. First month on us.

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

  const bloomMonthly = students * 7;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .cta-btn { transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important; }
        .faq-item summary { cursor: pointer; list-style: none; }
        .faq-item summary::-webkit-details-marker { display: none; }
        .check-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 11px; }
        input[type=range] {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 4px;
          background: linear-gradient(to right, #10b981 0%, #10b981 var(--pct,50%), rgba(255,255,255,0.2) var(--pct,50%), rgba(255,255,255,0.2) 100%);
          outline: none;
          cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          border: 2px solid #10b981;
          box-shadow: 0 2px 8px rgba(16,185,129,0.3);
          cursor: pointer;
          transition: transform 0.15s;
        }
        input[type=range]::-webkit-slider-thumb:active { transform: scale(1.2); }
      `}} />

      <div style={{ fontFamily: "'Inter', sans-serif", background: '#fefdfb', color: '#44403c', minHeight: '100vh' }}>

        {/* ── NAV ── */}
        <nav style={{
          position: 'fixed', top: 0, width: '100%', zIndex: 50,
          background: 'rgba(254,253,251,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/montree" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.45rem', fontWeight: 700, color: '#064e3b', textDecoration: 'none', letterSpacing: '-0.5px' }}>
              Mon<span style={{ color: '#10b981' }}>tree</span>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <a href="/montree" style={{ fontSize: 13, fontWeight: 500, color: '#78716c', textDecoration: 'none' }}>Home</a>
              <a href="/montree/login-select" style={{ fontSize: 13, fontWeight: 500, color: '#78716c', textDecoration: 'none' }}>Log in</a>
              <a href="/montree/login-select" style={{ fontSize: 13, fontWeight: 600, padding: '9px 20px', borderRadius: 10, background: '#064e3b', color: 'white', textDecoration: 'none', letterSpacing: '0.2px' }}>
                Get started
              </a>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ paddingTop: 120, paddingBottom: 56, textAlign: 'center', padding: '120px 24px 56px' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 24 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', letterSpacing: 1.5, textTransform: 'uppercase' }}>Simple pricing</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.2rem, 6vw, 3.4rem)', fontWeight: 700, color: '#064e3b', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20 }}>
              Simple pricing.<br />
              <em style={{ color: '#10b981', fontStyle: 'italic' }}>Founder pricing for early schools.</em>
            </h1>
            <p style={{ fontSize: '1.05rem', color: '#78716c', fontWeight: 300, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
              Core is $3 per student a month. Premium — full Sonnet reports — is $7. The first 100 schools lock Premium at the $3 Core price, for life. Your first month is free while you set up.
            </p>
          </div>
        </section>

        {/* ── PRICING CARD ── */}
        <section style={{ padding: '0 24px 72px' }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div ref={addReveal} style={{
              background: 'linear-gradient(160deg, #064e3b 0%, #065f46 60%, #047857 100%)',
              borderRadius: 24, padding: '44px 40px',
              boxShadow: '0 20px 60px rgba(6,78,59,0.3)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative glows */}
              <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -60, left: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(110,231,183,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

              {/* First-month-included badge */}
              <div style={{
                position: 'absolute', top: 24, right: 28,
                background: 'rgba(110,231,183,0.15)', border: '1px solid rgba(110,231,183,0.3)',
                borderRadius: 20, padding: '4px 12px',
                fontSize: 11, fontWeight: 700, color: '#6ee7b7',
                letterSpacing: 1, textTransform: 'uppercase',
              }}>
                First month included
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20, position: 'relative' }}>Bloom</div>

              {/* Price + Slider */}
              <div style={{ position: 'relative', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '3.2rem', fontWeight: 700, color: 'white', letterSpacing: '-2px' }}>$7</span>
                  <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>/student/mo</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{students} students</span>
                  {' = '}
                  <strong style={{ color: '#6ee7b7', fontSize: 15 }}>${bloomMonthly}/mo</strong>
                </div>
                <input
                  type="range" min={5} max={60} step={1} value={students}
                  style={{ '--pct': `${((students - 5) / 55) * 100}%` } as React.CSSProperties}
                  onChange={(e) => setStudents(Number(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>5 students</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>60 students</span>
                </div>
              </div>

              {/* How it works — clear and honest */}
              <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, position: 'relative' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>How it works</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#6ee7b7', fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Card on file at signup</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#6ee7b7', fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>First month on us — no charge while you set up</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#6ee7b7', fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>$7 per active student / month, billed monthly</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#6ee7b7', fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Cancel anytime — no contracts</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)', marginBottom: 24, position: 'relative' }}>
                <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 500 }}>✦ Powered by Claude Sonnet — Anthropic&apos;s most capable model</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginBottom: 28, position: 'relative' }}>
                <CheckItem text="AI photo identification (Haiku + Sonnet)" light />
                <CheckItem text="Smart Shelf — weekly work plan per child" light />
                <CheckItem text="Game plans & developmental nudges" light />
                <CheckItem text="Full teacher reports — Sonnet analysis" light />
                <CheckItem text="Parent narrative letters — rich & personal" light />
                <CheckItem text="Developmental flags & sensitive periods" light />
                <CheckItem text="Auto-filled weekly admin docs" light />
                <CheckItem text="AI Guru advisor (Sonnet)" light />
                <CheckItem text="Intelligence panels & daily brief" light />
                <CheckItem text="Parent portal" light />
                <CheckItem text="Semester progress reports (PPTX)" light />
                <CheckItem text="Self-learning visual memory" light />
                <CheckItem text="Progress tracking (5 areas)" light />
                <CheckItem text="Photo gallery & library" light />
                <CheckItem text="Teacher notes & curriculum browser" light />
              </div>

              <a href="/montree/login-select" className="cta-btn" style={{
                display: 'block', textAlign: 'center', padding: '16px 24px',
                borderRadius: 12, background: 'white', color: '#065f46',
                fontWeight: 700, fontSize: 15, textDecoration: 'none', letterSpacing: '0.2px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                position: 'relative',
              }}>
                Get started
              </a>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12, position: 'relative' }}>
                One subscription · Card on file · First month included
              </p>
            </div>
          </div>
        </section>

        {/* ── WHAT BLOOM ACTUALLY DOES ── */}
        <section style={{ padding: '0 24px 72px', background: '#faf9f7' }}>
          <div style={{ maxWidth: 840, margin: '0 auto', paddingTop: 64 }}>
            <div ref={addReveal} style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#064e3b', letterSpacing: '-0.5px', marginBottom: 14 }}>
                What Bloom <em>actually does</em>
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#78716c', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
                This isn&apos;t software that helps you do your job. It&apos;s software that does your job — so you can give the children everything you were trained to give them.
              </p>
            </div>

            <div ref={addReveal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 }}>
              {[
                {
                  icon: '📸',
                  title: 'A photo becomes a record',
                  body: 'The teacher takes a picture of a child working. The system identifies the work, records the observation, tracks progress, and determines what comes next. No typing. No admin.',
                },
                {
                  icon: '💌',
                  title: 'Personal letters to every parent',
                  body: 'Not templates. Sonnet writes a genuine, detailed account of what their child is learning and why it matters — in a voice that sounds like their teacher, not a software company.',
                },
                {
                  icon: '📄',
                  title: 'Teacher reports that think',
                  body: 'Full analytical reports per child: developmental stage, normalisation arc, sensitive period context, and specific guidance per curriculum area. Ready every Friday.',
                },
                {
                  icon: '🧠',
                  title: 'A Montessori expert in the room',
                  body: 'Ask anything. The Guru knows every child, every work, every observation. Backed by Sonnet — it gives nuanced answers to complex developmental questions in seconds.',
                },
              ].map((item, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 16, padding: '26px 24px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: 26, marginBottom: 12 }}>{item.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#064e3b', marginBottom: 10, lineHeight: 1.3 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: '#78716c', lineHeight: 1.65 }}>{item.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FIRST-MONTH CLARITY BANNER ── */}
        <section ref={addReveal} style={{ padding: '0 24px 72px' }}>
          <div style={{
            maxWidth: 680, margin: '0 auto',
            background: '#064e3b',
            borderRadius: 24, padding: '48px 40px',
            textAlign: 'center',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(6,78,59,0.22)',
          }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, background: 'radial-gradient(circle, rgba(110,231,183,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.25)', marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', letterSpacing: 1.5, textTransform: 'uppercase' }}>First month included</span>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', color: 'white', marginBottom: 16, letterSpacing: '-0.5px' }}>
                Feel the magic from day one.
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, maxWidth: 460, margin: '0 auto 12px' }}>
                Card on file at signup. No charge for your first month while you set up. The full Montree experience — every report, every parent letter, every AI feature — from the first day.
              </p>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 28px' }}>
                $7 per active student per month. Cancel anytime before day 30 and never get charged. Your classroom data is never deleted.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                <a href="/montree/login-select" className="cta-btn" style={{
                  padding: '14px 32px', borderRadius: 12, background: 'white',
                  color: '#064e3b', fontWeight: 700, fontSize: 14,
                  textDecoration: 'none', letterSpacing: '0.2px',
                }}>
                  Get started
                </a>
                <a href="/montree" className="cta-btn" style={{
                  padding: '14px 32px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 14,
                  textDecoration: 'none', letterSpacing: '0.2px',
                }}>
                  See how it works
                </a>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 18 }}>One subscription · Card on file · First month on us · No contracts.</p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ padding: '0 24px 72px', background: '#faf9f7' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: 64 }}>
            <h2 ref={addReveal} style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', color: '#064e3b', textAlign: 'center', marginBottom: 40, letterSpacing: '-0.5px' }}>
              Questions
            </h2>
            <div ref={addReveal} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                {
                  q: 'How does the first month work?',
                  a: 'You sign up with a card on file. We do not charge that card for the first 30 days. Use everything — AI photo identification, parent letters, teacher reports, the Guru, Smart Shelf — to set up your classroom and feel the magic. On day 31, the first month\'s subscription begins at $7 per active student. Cancel anytime before then and you are never charged.',
                },
                {
                  q: 'Why do you ask for a card upfront?',
                  a: 'Two reasons. Honest: we are a real subscription service, not a freemium product, and we want the relationship to start as one. Practical: it removes a friction at month-end so the work you set up keeps running without anyone having to remember to add a card. If you decide Montree is not for you, cancel from your dashboard before day 30 and the card is never charged.',
                },
                {
                  q: 'What does "one classroom" mean?',
                  a: 'Your subscription covers your whole school — every classroom, every student in those classrooms. The pricing is per active student across the school. If you start with one classroom, you pay only for those students; add a second classroom and your bill grows by exactly those new students.',
                },
                {
                  q: 'What is the difference between Core and Premium?',
                  a: 'Core ($3 per student / month) is the full Montree workflow — AI photo identification, Smart Shelf, progress tracking, parent portal — with reports written by a fast model. Premium ($7 per student / month) upgrades the teacher reports and parent letters to Claude Sonnet, our most capable model, for the richest, most personal writing. Both are the real product; Premium simply writes with more depth.',
                },
                {
                  q: 'What is the Founding 100?',
                  a: 'The first 100 schools to join lock in full Premium reports at the Core price — $3 per student, for life — and get their first six months free. It is our thank-you to the schools who back us early. Once 100 schools are in, the offer closes permanently.',
                },
                {
                  q: 'What is Claude Sonnet?',
                  a: 'Claude Sonnet is Anthropic\'s most capable AI model — the same company that published the constitutional AI safety research. Sonnet is what writes the parent letters, the teacher reports, and the developmental analysis that teachers describe as "magic." It reasons deeply, writes with genuine warmth, and understands Montessori philosophy in a way that shows in every output.',
                },
                {
                  q: 'How does the self-learning visual memory work?',
                  a: 'Every time a teacher corrects a photo identification ("That\'s not Cutting — that\'s Sewing"), Montree updates the classroom\'s visual memory. Over time, the system gets measurably more accurate for your specific classroom and the exact works you have on your shelves. This moat is per-classroom — it grows with you, and it can\'t be copied.',
                },
                {
                  q: 'Is pricing per classroom or per school?',
                  a: 'Per active student across your whole school. If you have 40 students across two classrooms, you pay for 40 students — not per classroom. Add or close classrooms freely; the bill follows your actual student count.',
                },
                {
                  q: 'Can I cancel at any time?',
                  a: 'Yes. No annual contracts. You\'re billed monthly and can cancel at any time. Your classroom data is never deleted.',
                },
              ].map((item, i) => (
                <details key={i} className="faq-item" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 20, paddingBottom: 20 }}>
                  <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1c1917', lineHeight: 1.4, paddingRight: 20 }}>{item.q}</span>
                    <span style={{ fontSize: 18, color: '#10b981', flexShrink: 0, userSelect: 'none' }}>+</span>
                  </summary>
                  <p style={{ fontSize: 14, color: '#78716c', lineHeight: 1.7, marginTop: 14, paddingRight: 32 }}>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section style={{ padding: '64px 24px 80px', textAlign: 'center' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <h2 ref={addReveal} style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', color: '#064e3b', letterSpacing: '-0.5px', marginBottom: 14 }}>
              See what one photo can do
            </h2>
            <p ref={addReveal} style={{ fontSize: '0.95rem', color: '#78716c', lineHeight: 1.7, marginBottom: 28 }}>
              15 minutes. No installation. No training required.
            </p>
            <div ref={addReveal} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <a href="/montree/login-select" className="cta-btn" style={{
                padding: '14px 32px', borderRadius: 12, background: '#064e3b',
                color: 'white', fontWeight: 600, fontSize: 14,
                textDecoration: 'none', letterSpacing: '0.3px',
                boxShadow: '0 8px 24px rgba(6,78,59,0.15)',
              }}>
                Get started
              </a>
              <a href="/montree" className="cta-btn" style={{
                padding: '14px 32px', borderRadius: 12,
                background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
                color: '#059669', fontWeight: 600, fontSize: 14,
                textDecoration: 'none', letterSpacing: '0.3px',
              }}>
                Back to home
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 13, color: '#a8a29e' }}>
            <a href="https://montree.xyz" style={{ color: '#10b981', textDecoration: 'none' }}>montree.xyz</a>
            {' · '}
            <a href="/montree" style={{ color: '#a8a29e', textDecoration: 'none' }}>Home</a>
            {' · '}
            <a href="/montree/login-select" style={{ color: '#a8a29e', textDecoration: 'none' }}>Log in</a>
          </p>
        </footer>

      </div>
    </>
  );
}

function CheckItem({ text, bold, light }: { text: string; bold?: boolean; light?: boolean }) {
  return (
    <div className="check-row">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          fill={light ? '#6ee7b7' : '#9ca3af'} />
      </svg>
      <span style={{
        fontSize: 13,
        color: light ? 'rgba(255,255,255,0.75)' : '#374151',
        fontWeight: bold ? 600 : 400,
        lineHeight: 1.4,
      }}>
        {text}
      </span>
    </div>
  );
}
