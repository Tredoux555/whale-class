'use client';

import { useEffect, useRef, useState } from 'react';

// /app/pricing/page.tsx — Montree public pricing page
// Two tiers only: Seed (free) and Bloom (full Sonnet magic)
// Accessible at montree.xyz/pricing — already in publicPaths middleware

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
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .pricing-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .pricing-card:hover { transform: translateY(-4px); }
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
          background: linear-gradient(to right, #10b981 0%, #10b981 var(--pct,50%), #d1d5db var(--pct,50%), #d1d5db 100%);
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
        @media (max-width: 768px) {
          .tier-grid { grid-template-columns: 1fr !important; max-width: 440px !important; margin: 0 auto !important; }
          .compare-table { font-size: 12px !important; }
          .compare-table td, .compare-table th { padding: 10px 10px !important; }
        }
      `}</style>

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
              <a href="/montree" style={{ fontSize: 13, fontWeight: 500, color: '#78716c', textDecoration: 'none' }} className="hidden sm:inline">Home</a>
              <a href="/montree/login-select" style={{ fontSize: 13, fontWeight: 500, color: '#78716c', textDecoration: 'none' }} className="hidden sm:inline">Log in</a>
              <a href="/montree/login-select" style={{ fontSize: 13, fontWeight: 600, padding: '9px 20px', borderRadius: 10, background: '#064e3b', color: 'white', textDecoration: 'none', letterSpacing: '0.2px' }}>
                Start free trial
              </a>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ paddingTop: 120, paddingBottom: 64, textAlign: 'center', padding: '120px 24px 56px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 24 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', letterSpacing: 1.5, textTransform: 'uppercase' }}>Simple pricing</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.2rem, 6vw, 3.4rem)', fontWeight: 700, color: '#064e3b', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20 }}>
              Free forever,<br />
              <em style={{ color: '#10b981', fontStyle: 'italic' }}>or experience the magic.</em>
            </h1>
            <p style={{ fontSize: '1.05rem', color: '#78716c', fontWeight: 300, lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
              No compromise tiers. Seed organises your classroom for free. Bloom is the full AI experience — the one that makes teachers cry happy tears on a Friday evening.
            </p>
          </div>
        </section>

        {/* ── PRICING CARDS ── */}
        <section style={{ padding: '0 24px 72px' }}>
          <div className="tier-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.55fr', gap: 20, maxWidth: 860, margin: '0 auto', alignItems: 'start' }}>

            {/* SEED */}
            <div ref={addReveal} className="pricing-card" style={{ background: 'white', borderRadius: 20, padding: '36px 30px', border: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>Seed</div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 700, color: '#1c1917', letterSpacing: '-2px' }}>$0</span>
              </div>
              <div style={{ fontSize: 13, color: '#a8a29e', marginBottom: 24 }}>Free forever. No credit card.</div>
              <p style={{ fontSize: 14, color: '#78716c', lineHeight: 1.65, marginBottom: 24 }}>
                Your classroom, organised. Everything you do on paper — but digital, searchable, and always with you.
              </p>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 28 }}>
                <CheckItem text="Photo capture & tagging" />
                <CheckItem text="Progress tracking (5 areas)" />
                <CheckItem text="Student profiles" />
                <CheckItem text="Classroom builder" />
                <CheckItem text="Photo gallery & library" />
                <CheckItem text="Teacher notes" />
                <CheckItem text="Curriculum browser" />
              </div>
              <a href="/montree/login-select" className="cta-btn" style={{
                display: 'block', textAlign: 'center', padding: '13px 24px',
                borderRadius: 12, border: '2px solid #d1d5db',
                color: '#374151', fontWeight: 600, fontSize: 14,
                textDecoration: 'none', letterSpacing: '0.2px',
              }}>
                Get started free
              </a>
            </div>

            {/* BLOOM */}
            <div ref={addReveal} className="pricing-card" style={{
              background: 'linear-gradient(160deg, #064e3b 0%, #065f46 60%, #047857 100%)',
              borderRadius: 20, padding: '36px 32px',
              boxShadow: '0 16px 48px rgba(6,78,59,0.28)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative glows */}
              <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -60, left: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(110,231,183,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

              {/* 60-day trial badge */}
              <div style={{
                position: 'absolute', top: 20, right: 24,
                background: 'rgba(110,231,183,0.15)', border: '1px solid rgba(110,231,183,0.3)',
                borderRadius: 20, padding: '4px 12px',
                fontSize: 11, fontWeight: 700, color: '#6ee7b7',
                letterSpacing: 1, textTransform: 'uppercase',
              }}>
                60-day free trial
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14, position: 'relative' }}>Bloom</div>

              {/* Slider integrated into Bloom card */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 700, color: 'white', letterSpacing: '-2px' }}>$7</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>/student/mo</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
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

              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)', marginBottom: 24, position: 'relative' }}>
                <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 500 }}>✦ Powered by Claude Sonnet — Anthropic&apos;s most capable model</span>
              </div>

              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 24, position: 'relative' }}>
                Take a photo. The system identifies the work, records the observation, tracks the child&apos;s progress, fills the weekly shelf, writes the admin docs, and delivers a personal letter to every parent. This is the full experience.
              </p>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginBottom: 28, position: 'relative' }}>
                <CheckItem text="Everything in Seed, plus:" bold light />
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
                <CheckItem text="Semester PPTX progress reports" light />
                <CheckItem text="Self-learning visual memory" light />
              </div>

              <a href="/montree/login-select" className="cta-btn" style={{
                display: 'block', textAlign: 'center', padding: '15px 24px',
                borderRadius: 12, background: 'white', color: '#065f46',
                fontWeight: 700, fontSize: 15, textDecoration: 'none', letterSpacing: '0.2px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                position: 'relative',
              }}>
                Start 60-day free trial
              </a>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 10, position: 'relative' }}>No credit card. Cancel any time.</p>
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

            <div ref={addReveal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20, marginBottom: 48 }}>
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

        {/* ── COMPARISON TABLE ── */}
        <section style={{ padding: '0 24px 72px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <h2 ref={addReveal} style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', color: '#064e3b', textAlign: 'center', marginBottom: 32, letterSpacing: '-0.5px' }}>
              Full comparison
            </h2>
            <div ref={addReveal} style={{ background: 'white', borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <table className="compare-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#064e3b' }}>
                    <th style={{ padding: '16px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.45)', fontWeight: 500, fontSize: 12 }}>Feature</th>
                    <th style={{ padding: '16px 18px', textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontWeight: 500, fontSize: 12 }}>Seed</th>
                    <th style={{ padding: '16px 18px', textAlign: 'center', color: '#6ee7b7', fontWeight: 700, fontSize: 12 }}>Bloom</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { f: 'Photo capture & manual tagging', s: '✓', b: '✓' },
                    { f: 'Student profiles & progress tracking', s: '✓', b: '✓' },
                    { f: 'Classroom builder', s: '✓', b: '✓' },
                    { f: 'Teacher notes', s: '✓', b: '✓' },
                    { f: 'Curriculum browser & library', s: '✓', b: '✓' },
                    { f: 'Photo identification (AI)', s: '—', b: 'Haiku + Sonnet' },
                    { f: 'Smart Shelf (weekly work plan)', s: '—', b: 'Sonnet ✦' },
                    { f: 'Game plans & learning nudges', s: '—', b: 'Sonnet ✦' },
                    { f: 'Teacher reports', s: '—', b: 'Sonnet ✦' },
                    { f: 'Parent narrative letters', s: '—', b: 'Sonnet ✦' },
                    { f: 'Developmental flags', s: '—', b: 'Sonnet ✦' },
                    { f: 'Sensitive period analysis', s: '—', b: 'Sonnet ✦' },
                    { f: 'Weekly admin docs (auto-fill)', s: 'Manual', b: 'Sonnet' },
                    { f: 'Guru advisor (AI chat)', s: '—', b: 'Sonnet ✦' },
                    { f: 'Parent portal', s: '—', b: '✓' },
                    { f: 'Intelligence panels & daily brief', s: '—', b: '✓' },
                    { f: 'Self-learning visual memory', s: '—', b: '✓' },
                    { f: 'Semester PPTX progress reports', s: '—', b: '✓' },
                  ].map((row, i) => {
                    const isLast = i === 17;
                    return (
                      <tr key={i} style={{ borderBottom: isLast ? 'none' : '1px solid #f9fafb', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 500, color: '#374151', textAlign: 'left' }}>{row.f}</td>
                        <td style={{ padding: '12px 18px', textAlign: 'center', color: row.s === '✓' ? '#10b981' : '#d1d5db', fontWeight: row.s === '✓' ? 700 : 400 }}>{row.s}</td>
                        <td style={{ padding: '12px 18px', textAlign: 'center', color: row.b === '—' ? '#d1d5db' : '#065f46', fontWeight: row.b !== '—' ? 700 : 400 }}>{row.b}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p ref={addReveal} style={{ fontSize: 12, color: '#a8a29e', textAlign: 'center', marginTop: 14 }}>
              ✦ Bloom-exclusive: Sonnet&apos;s full analytical depth.&nbsp;
              Montree uses <a href="https://www.anthropic.com/claude" target="_blank" rel="noopener noreferrer" style={{ color: '#059669' }}>Anthropic&apos;s Claude</a>.
            </p>
          </div>
        </section>

        {/* ── TRIAL BANNER ── */}
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
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', letterSpacing: 1.5, textTransform: 'uppercase' }}>60-day free trial</span>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', color: 'white', marginBottom: 16, letterSpacing: '-0.5px' }}>
                Your first 60 days are full Bloom.
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, maxWidth: 460, margin: '0 auto 28px' }}>
                Every new school starts with the complete experience — every report, every parent letter, every AI feature running on Sonnet. Feel the magic first. Decide after.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                <a href="/montree/login-select" className="cta-btn" style={{
                  padding: '14px 32px', borderRadius: 12, background: 'white',
                  color: '#064e3b', fontWeight: 700, fontSize: 14,
                  textDecoration: 'none', letterSpacing: '0.2px',
                }}>
                  Start free trial
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
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 18 }}>No credit card. No contracts. No setup fees.</p>
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
                  q: 'What happens after the 60-day trial?',
                  a: 'At day 60, you\'ll be asked to subscribe to Bloom at $7/student/month. If you choose not to, your school automatically moves to Seed — the free tier — and all your data stays intact. Your students\' progress history, photos, and past reports are never deleted.',
                },
                {
                  q: 'Why only two tiers?',
                  a: 'Because we believe the AI is either worth experiencing fully, or it isn\'t. A middle tier that does "some AI" risks giving you a watered-down impression of what Montree can do. Seed is honest about what it is: a great digital classroom organiser with no AI. Bloom is the full experience. We\'d rather you know exactly what you\'re getting.',
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
                  a: 'Per student, across your school. If you have 40 students across two classrooms, you pay for 40 students — not per classroom.',
                },
                {
                  q: 'Can I cancel at any time?',
                  a: 'Yes. There are no annual contracts. You\'re billed monthly and can cancel at any time — at which point your school moves to Seed. Nothing is ever deleted.',
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
                Start free trial
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

function CheckItem({ text, bold, light }: { text: string; bold?: boolean; green?: boolean; light?: boolean }) {
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
