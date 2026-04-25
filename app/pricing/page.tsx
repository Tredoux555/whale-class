'use client';

import { useEffect, useRef, useState } from 'react';

// /app/pricing/page.tsx — Montree public pricing page
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

  const guideMonthly = students * 3;
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
          .tier-grid { grid-template-columns: 1fr !important; max-width: 420px !important; margin: 0 auto !important; }
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
              <a href="/montree" style={{ fontSize: 13, fontWeight: 600, padding: '9px 20px', borderRadius: 10, background: '#064e3b', color: 'white', textDecoration: 'none', letterSpacing: '0.2px' }}>
                Request a Demo
              </a>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ paddingTop: 120, paddingBottom: 64, textAlign: 'center', padding: '120px 24px 56px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 24 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', letterSpacing: 1.5, textTransform: 'uppercase' }}>Transparent pricing</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.2rem, 6vw, 3.4rem)', fontWeight: 700, color: '#064e3b', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20 }}>
              Choose how much intelligence<br />
              <em style={{ color: '#10b981', fontStyle: 'italic' }}>your classroom deserves.</em>
            </h1>
            <p style={{ fontSize: '1.05rem', color: '#78716c', fontWeight: 300, lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
              Three tiers. Same platform. We tell you exactly which AI model powers each tier — and why it matters.
            </p>
          </div>
        </section>

        {/* ── STUDENT SLIDER ── */}
        <section ref={addReveal} style={{ maxWidth: 600, margin: '0 auto 56px', padding: '0 24px' }}>
          <div style={{ background: 'white', borderRadius: 20, padding: '28px 32px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Students in your classroom</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: '#064e3b' }}>{students}</span>
            </div>
            <input
              type="range" min={5} max={60} step={1} value={students}
              style={{ '--pct': `${((students - 5) / 55) * 100}%` } as React.CSSProperties}
              onChange={(e) => setStudents(Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 24 }}>
              <span style={{ fontSize: 11, color: '#a8a29e' }}>5</span>
              <span style={{ fontSize: 11, color: '#a8a29e' }}>60</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 12, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Seed</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: '#374151' }}>$0</div>
                <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 2 }}>forever free</div>
              </div>
              <div style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 12, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Guide</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: '#065f46' }}>${guideMonthly}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>/ month</div>
              </div>
              <div style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 12, background: '#064e3b', border: '1px solid #064e3b' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bloom</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: 'white' }}>${bloomMonthly}</div>
                <div style={{ fontSize: 11, color: '#a7f3d0', marginTop: 2 }}>/ month</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING CARDS ── */}
        <section style={{ padding: '0 24px 72px' }}>
          <div className="tier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 980, margin: '0 auto', alignItems: 'start' }}>

            {/* SEED */}
            <div ref={addReveal} className="pricing-card" style={{ background: 'white', borderRadius: 20, padding: '32px 28px', border: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>Seed</div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.8rem', fontWeight: 700, color: '#1c1917', letterSpacing: '-2px' }}>$0</span>
              </div>
              <div style={{ fontSize: 13, color: '#a8a29e', marginBottom: 10 }}>Free forever</div>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f3f4f6', marginBottom: 24 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>No AI</span>
              </div>
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

            {/* GUIDE */}
            <div ref={addReveal} className="pricing-card" style={{
              background: 'white', borderRadius: 20, padding: '32px 28px',
              border: '2px solid #10b981',
              boxShadow: '0 8px 32px rgba(16,185,129,0.13)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                background: '#10b981', color: 'white',
                fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 20,
                textTransform: 'uppercase', letterSpacing: 1.5, whiteSpace: 'nowrap',
              }}>
                Most popular
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>Guide</div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.8rem', fontWeight: 700, color: '#1c1917', letterSpacing: '-2px' }}>$3</span>
                <span style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>/student/mo</span>
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
                {students} students = <strong style={{ color: '#065f46' }}>${guideMonthly}/mo</strong>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 24 }}>
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>Powered by Claude Haiku</span>
              </div>
              <p style={{ fontSize: 14, color: '#44403c', lineHeight: 1.65, marginBottom: 24 }}>
                The full AI classroom. Take a photo — AI identifies the work, tracks progress, fills your shelf, and writes the weekly admin docs.
              </p>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 28 }}>
                <CheckItem text="Everything in Seed, plus:" bold green />
                <CheckItem text="Instant photo identification" green />
                <CheckItem text="Weekly Smart Shelf per child" green />
                <CheckItem text="Game plan & learning nudges" green />
                <CheckItem text="Auto-filled weekly admin docs" green />
                <CheckItem text="AI Guru advisor" green />
                <CheckItem text="Classroom intelligence panels" green />
                <CheckItem text="Parent portal" green />
                <CheckItem text="Self-learning visual memory" green />
              </div>
              <a href="/montree/login-select" className="cta-btn" style={{
                display: 'block', textAlign: 'center', padding: '13px 24px',
                borderRadius: 12, background: '#10b981', color: 'white',
                fontWeight: 600, fontSize: 14, textDecoration: 'none', letterSpacing: '0.2px',
                boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
              }}>
                Start 60-day trial
              </a>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 10 }}>No credit card required</p>
            </div>

            {/* BLOOM */}
            <div ref={addReveal} className="pricing-card" style={{
              background: 'linear-gradient(160deg, #064e3b 0%, #065f46 60%, #047857 100%)',
              borderRadius: 20, padding: '32px 28px',
              boxShadow: '0 12px 40px rgba(6,78,59,0.25)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative glow */}
              <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

              <div style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14, position: 'relative' }}>Bloom</div>
              <div style={{ marginBottom: 6, position: 'relative' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.8rem', fontWeight: 700, color: 'white', letterSpacing: '-2px' }}>$7</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginLeft: 6 }}>/student/mo</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 10, position: 'relative' }}>
                {students} students = <strong style={{ color: '#6ee7b7' }}>${bloomMonthly}/mo</strong>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)', marginBottom: 24, position: 'relative' }}>
                <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 500 }}>Powered by Claude Sonnet</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, marginBottom: 24, position: 'relative' }}>
                Same features as Guide. The difference is the brain. Sonnet writes richer reports, gives deeper developmental insight, and catches photos Haiku misses.
              </p>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginBottom: 28, position: 'relative' }}>
                <CheckItem text="Everything in Guide, upgraded:" bold light />
                <CheckItem text="Teacher reports — full Sonnet analysis" light />
                <CheckItem text="Parent narratives — rich personal letters" light />
                <CheckItem text="Developmental flags & sensitive periods" light />
                <CheckItem text="Normalisation & concentration notes" light />
                <CheckItem text="Area-by-area progress guidance" light />
                <CheckItem text="Semester PPTX progress reports" light />
                <CheckItem text="Advanced recognition (Pass 3)" light />
              </div>
              <a href="/montree/login-select" className="cta-btn" style={{
                display: 'block', textAlign: 'center', padding: '13px 24px',
                borderRadius: 12, background: 'white', color: '#065f46',
                fontWeight: 700, fontSize: 14, textDecoration: 'none', letterSpacing: '0.2px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                position: 'relative',
              }}>
                Start 60-day trial
              </a>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10, position: 'relative' }}>No credit card required</p>
            </div>

          </div>
        </section>

        {/* ── THE REAL DIFFERENCE ── */}
        <section style={{ padding: '0 24px 72px', background: '#faf9f7' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 64 }}>
            <div ref={addReveal} style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#064e3b', letterSpacing: '-0.5px', marginBottom: 12 }}>
                What does the <em>upgrade actually do?</em>
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#78716c', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
                Guide and Bloom have identical features. The difference is the AI model — and in Montessori, where every observation matters, that difference is felt.
              </p>
            </div>

            <div ref={addReveal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 48 }}>
              {[
                {
                  icon: '📄',
                  title: 'Teacher reports',
                  guide: 'Haiku generates a structured summary: flags, areas, recommendations.',
                  bloom: 'Sonnet writes a full analytical narrative — developmental stage, normalisation arc, sensitive period context, and specific guidance per work.',
                },
                {
                  icon: '💌',
                  title: 'Parent narratives',
                  guide: 'Haiku writes a warm, factual parent letter covering the week\'s works.',
                  bloom: 'Sonnet writes a detailed personal letter — storytelling tone, educational context per work, and a developmental arc parents actually understand.',
                },
                {
                  icon: '📸',
                  title: 'Photo identification',
                  guide: 'Haiku two-pass: describe → match. Strong on clear photos.',
                  bloom: 'Haiku + Sonnet discriminator (Pass 3): when Haiku is uncertain, Sonnet examines the top candidates with visual memory and picks definitively.',
                },
                {
                  icon: '🧠',
                  title: 'Guru advisor',
                  guide: 'Haiku: fast, accurate Montessori guidance on works and progress.',
                  bloom: 'Sonnet: deeper reasoning, richer context, nuanced answers to complex developmental questions.',
                },
              ].map((item, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 16, padding: '24px 22px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', marginBottom: 16 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 1.55 }}>
                    <span style={{ fontWeight: 600, color: '#059669' }}>Guide: </span>{item.guide}
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>
                    <span style={{ fontWeight: 600, color: '#064e3b' }}>Bloom: </span>{item.bloom}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section style={{ padding: '0 24px 72px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <h2 ref={addReveal} style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', color: '#064e3b', textAlign: 'center', marginBottom: 32, letterSpacing: '-0.5px' }}>
              Full comparison
            </h2>
            <div ref={addReveal} style={{ background: 'white', borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <table className="compare-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#064e3b' }}>
                    <th style={{ padding: '16px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 500, fontSize: 12 }}>Feature</th>
                    <th style={{ padding: '16px 14px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontWeight: 500, fontSize: 12 }}>Seed</th>
                    <th style={{ padding: '16px 14px', textAlign: 'center', color: '#6ee7b7', fontWeight: 700, fontSize: 12 }}>Guide</th>
                    <th style={{ padding: '16px 14px', textAlign: 'center', color: '#34d399', fontWeight: 700, fontSize: 12 }}>Bloom</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { f: 'Photo capture & manual tagging', s: '✓', g: '✓', b: '✓' },
                    { f: 'Student profiles & progress', s: '✓', g: '✓', b: '✓' },
                    { f: 'Classroom builder', s: '✓', g: '✓', b: '✓' },
                    { f: 'Teacher notes', s: '✓', g: '✓', b: '✓' },
                    { f: 'Photo identification', s: 'Manual', g: 'Haiku', b: 'Haiku + Sonnet' },
                    { f: 'Smart Shelf (weekly)', s: '—', g: 'Haiku', b: 'Sonnet' },
                    { f: 'Game plans & nudges', s: '—', g: 'Haiku', b: 'Sonnet' },
                    { f: 'Teacher reports', s: '—', g: '—', b: 'Sonnet ✦' },
                    { f: 'Parent narrative letters', s: '—', g: '—', b: 'Sonnet ✦' },
                    { f: 'Developmental flags', s: '—', g: '—', b: 'Sonnet ✦' },
                    { f: 'Sensitive period analysis', s: '—', g: '—', b: 'Sonnet ✦' },
                    { f: 'Weekly admin docs (auto-fill)', s: 'Manual', g: 'Haiku', b: 'Sonnet' },
                    { f: 'Guru advisor (AI chat)', s: '—', g: 'Haiku', b: 'Sonnet' },
                    { f: 'Parent portal', s: '—', g: '✓', b: '✓' },
                    { f: 'Intelligence panels', s: '—', g: '✓', b: '✓' },
                    { f: 'Self-learning visual memory', s: '—', g: '✓', b: '✓' },
                    { f: 'Semester PPTX reports', s: '—', g: '—', b: '✓' },
                    { f: 'Advanced recognition (Pass 3)', s: '—', g: '—', b: 'Sonnet' },
                  ].map((row, i) => {
                    const isLast = i === 17;
                    return (
                      <tr key={i} style={{ borderBottom: isLast ? 'none' : '1px solid #f9fafb', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 500, color: '#374151', textAlign: 'left' }}>{row.f}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: row.s === '✓' ? '#10b981' : '#d1d5db', fontWeight: row.s === '✓' ? 700 : 400 }}>{row.s}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: row.g === '—' ? '#d1d5db' : '#059669', fontWeight: row.g !== '—' ? 600 : 400 }}>{row.g}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: row.b === '—' ? '#d1d5db' : '#065f46', fontWeight: row.b !== '—' ? 700 : 400 }}>{row.b}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p ref={addReveal} style={{ fontSize: 12, color: '#a8a29e', textAlign: 'center', marginTop: 14 }}>
              ✦ Bloom-exclusive: the full analytical layer that turns data into developmental guidance.&nbsp;
              Montree uses <a href="https://www.anthropic.com/claude" target="_blank" rel="noopener noreferrer" style={{ color: '#059669' }}>Anthropic&apos;s Claude</a>.
            </p>
          </div>
        </section>

        {/* ── TRIAL BANNER ── */}
        <section ref={addReveal} style={{ padding: '0 24px 72px' }}>
          <div style={{
            maxWidth: 680, margin: '0 auto',
            background: '#064e3b',
            borderRadius: 24, padding: '44px 40px',
            textAlign: 'center',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(6,78,59,0.22)',
          }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, background: 'radial-gradient(circle, rgba(110,231,183,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)', color: 'white', marginBottom: 14, letterSpacing: '-0.5px', position: 'relative' }}>
              Try before you choose
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 28px', position: 'relative' }}>
              Every new school gets a <strong style={{ color: '#6ee7b7' }}>60-day free trial</strong> of Bloom —
              the full Sonnet experience. When the trial ends, you can stay on Bloom, step down to Guide, or use Seed free forever.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', position: 'relative' }}>
              <a href="/montree/login-select" className="cta-btn" style={{
                padding: '13px 28px', borderRadius: 12, background: 'white',
                color: '#064e3b', fontWeight: 700, fontSize: 14,
                textDecoration: 'none', letterSpacing: '0.2px',
              }}>
                Start free trial
              </a>
              <a href="/montree" className="cta-btn" style={{
                padding: '13px 28px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 14,
                textDecoration: 'none', letterSpacing: '0.2px',
              }}>
                See how it works
              </a>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 18, position: 'relative' }}>No credit card. No contracts. No setup fees.</p>
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
                  q: 'What\'s the difference between Haiku and Sonnet?',
                  a: 'Both are Claude AI models by Anthropic. Haiku is fast and highly accurate for structured tasks like photo identification and shelf generation. Sonnet is more capable for open-ended reasoning — it writes richer, more personal parent reports and provides deeper developmental analysis. For most photo identification and admin tasks, you won\'t notice a difference. For the analytical layer (teacher reports, parent letters, developmental flags), Sonnet is noticeably better.',
                },
                {
                  q: 'Can I switch tiers at any time?',
                  a: 'Yes. You can upgrade or downgrade any time. Downgrading to Seed means AI features stop generating new content, but everything you\'ve already produced stays in your account. Your students\' progress history, photos, and past reports are never affected by a tier change.',
                },
                {
                  q: 'How does the 60-day trial work?',
                  a: 'You get full Bloom access for 60 days, no credit card required. At day 60, you\'ll be asked to choose a tier. If you do nothing, your school automatically moves to Seed (free forever). Your data is never deleted.',
                },
                {
                  q: 'Does Core (Guide) include parent reports?',
                  a: 'Guide generates the weekly Smart Shelf, game plans, and auto-fills the admin docs — but it does not generate the detailed teacher reports or parent narrative letters. Those are Bloom-exclusive because they require Sonnet\'s analytical depth. The weekly Wrap still runs on Guide — teachers get the shelf and plan, parents just don\'t get the personalised letter.',
                },
                {
                  q: 'What is the self-learning visual memory system?',
                  a: 'Every time a teacher corrects a photo identification ("That\'s not Cutting — that\'s Sewing"), Montree updates the classroom\'s visual memory. Over time, the system gets measurably more accurate for your specific classroom and the works you have. This moat is per-classroom — it grows with you and can\'t be copied.',
                },
                {
                  q: 'Is there a per-classroom or per-school pricing?',
                  a: 'Pricing is per-student across your school. If you have 40 students across two classrooms, you pay for 40 students — not per classroom.',
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
                Request a Demo
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

function CheckItem({ text, bold, green, light }: { text: string; bold?: boolean; green?: boolean; light?: boolean }) {
  return (
    <div className="check-row">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          fill={light ? '#6ee7b7' : green ? '#10b981' : '#9ca3af'} />
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
