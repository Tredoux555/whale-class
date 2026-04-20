'use client';

import { useEffect, useRef, useState } from 'react';

// /montree/page.tsx — Montree landing page
// "A teacher takes a photo. Montree does the rest."

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) { setError('Please enter a valid email'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch('/api/montree/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, school, email }),
      });
      if (res.ok) { setSent(true); }
      else { setError('Something went wrong. Please try again.'); }
    } catch { setError('Connection error. Please try again.'); }
    setSending(false);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 20, padding: '2.5rem', maxWidth: 420, width: '100%', position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#a8a29e' }}>×</button>

        {sent ? (
          <div className="text-center py-4">
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#064e3b', marginBottom: 8 }}>
              We&apos;ll be in touch
            </h3>
            <p style={{ color: '#78716c', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Thank you for your interest in Montree. I&apos;ll reach out within 24 hours to arrange a demonstration.
            </p>
            <p style={{ color: '#a8a29e', fontSize: '0.8rem', marginTop: 16 }}>— Tredoux</p>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#064e3b', marginBottom: 4 }}>
              Request a Demo
            </h3>
            <p style={{ color: '#78716c', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
              15 minutes. I&apos;ll show you what one photo can do for your classroom.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
                style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, outline: 'none', fontFamily: "'Inter', sans-serif" }}
              />
              <input
                type="text" placeholder="School name" value={school} onChange={(e) => setSchool(e.target.value)}
                style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, outline: 'none', fontFamily: "'Inter', sans-serif" }}
              />
              <input
                type="email" placeholder="Email address *" required value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, outline: 'none', fontFamily: "'Inter', sans-serif" }}
              />
              {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
              <button
                type="submit" disabled={sending}
                style={{ padding: '14px 0', borderRadius: 12, background: '#064e3b', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.7 : 1, letterSpacing: '0.3px', fontFamily: "'Inter', sans-serif", marginTop: 4 }}
              >
                {sending ? 'Sending...' : 'Request a Demo'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function MontreeLanding() {
  const revealRefs = useRef<HTMLElement[]>([]);
  const [demoOpen, setDemoOpen] = useState(false);

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
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
      `}</style>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />

      <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif", background: '#fefdfb', color: '#44403c' }}>
        {/* ========== NAV ========== */}
        <nav
          className="fixed top-0 w-full z-50 border-b"
          style={{
            background: 'rgba(254,253,251,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(0,0,0,0.04)',
          }}
        >
          <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <a href="/montree" className="text-2xl font-bold no-underline" style={{ fontFamily: "'Playfair Display', serif", color: '#064e3b', letterSpacing: '-0.5px' }}>
              Mon<span style={{ color: '#10b981' }}>tree</span>
            </a>
            <div className="flex items-center gap-4">
              <a href="/pricing" className="text-sm font-medium no-underline hidden sm:inline" style={{ color: '#78716c' }}>
                Pricing
              </a>
              <a href="/montree/library" className="text-sm font-medium no-underline hidden sm:inline" style={{ color: '#78716c' }}>
                Library
              </a>
              <a href="/montree/login-select" className="text-sm font-medium no-underline hidden sm:inline" style={{ color: '#78716c' }}>
                Log in
              </a>
              <button
                onClick={() => setDemoOpen(true)}
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:-translate-y-0.5"
                style={{ background: '#064e3b', color: 'white', letterSpacing: '0.3px', border: 'none', cursor: 'pointer' }}
              >
                Request a Demo
              </button>
            </div>
          </div>
        </nav>

        {/* ========== HERO ========== */}
        <section className="flex items-center justify-center text-center px-6" style={{ marginTop: 60, minHeight: '85vh', position: 'relative' }}>
          <div style={{ maxWidth: 700 }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.6rem, 7vw, 4.2rem)', fontWeight: 700, lineHeight: 1.1, color: '#064e3b', marginBottom: '1.5rem', letterSpacing: '-1.5px' }}>
              A teacher takes a photo.<br />
              <em style={{ color: '#10b981' }}>Montree does the rest.</em>
            </h1>
            <p style={{ fontSize: '1.15rem', color: '#78716c', maxWidth: 520, margin: '0 auto', fontWeight: 300, lineHeight: 1.7 }}>
              No data entry. No spreadsheets. No templates. Just one photo — and everything appears automatically.
            </p>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 1, height: 60, background: 'linear-gradient(to bottom, transparent, rgba(16,185,129,0.3))' }} />
        </section>

        {/* ========== HOW IT WORKS ========== */}
        <section style={{ padding: '4rem 1.5rem', background: '#064e3b', color: 'white', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -200, right: -200, width: 500, height: 500, background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div className="max-w-4xl mx-auto relative z-10">
            <div ref={addReveal} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
              {[
                { n: '01', t: 'Capture', d: 'Snap a photo of a child working.', time: '1 second' },
                { n: '02', t: 'Recognize', d: 'AI identifies the Montessori work instantly.', time: 'Instant' },
                { n: '03', t: 'Track', d: 'Progress updates across all 5 curriculum areas.', time: 'Automatic' },
                { n: '04', t: 'Report', d: 'Parents get a personal letter with photos and context.', time: 'End of week' },
              ].map((s, i) => (
                <div key={i} className="py-5 px-5" style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6ee7b7', letterSpacing: 2 }}>{s.n}</div>
                  <div className="text-base font-semibold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: 'white' }}>{s.t}</div>
                  <div className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{s.d}</div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)', color: '#6ee7b7' }}>
                    {s.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== THEM vs US ========== */}
        <section style={{ padding: '4rem 1.5rem', background: '#faf9f7' }}>
          <div className="max-w-4xl mx-auto">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#064e3b', marginBottom: '2rem', letterSpacing: '-0.5px', lineHeight: 1.3, textAlign: 'center' }}>
              Other systems ask the teacher to describe what happened.<br />
              <em style={{ color: '#10b981' }}>Montree already knows.</em>
            </h2>

            <div ref={addReveal} className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="p-6" style={{ background: '#f5f0eb' }}>
                <div className="text-xs font-bold uppercase tracking-widest pb-3 mb-4" style={{ color: '#a8a29e', letterSpacing: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  Traditional
                </div>
                {[
                  'Type observations manually',
                  'Check boxes on spreadsheets',
                  'Write reports from memory on Friday night',
                  'Guess what each child should do next',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 mb-3 last:mb-0">
                    <span style={{ color: '#d4a8a8', fontSize: 14, marginTop: 1 }}>&#x2717;</span>
                    <span className="text-sm" style={{ color: '#a8a29e' }}>{item}</span>
                  </div>
                ))}
              </div>
              <div className="p-6" style={{ background: 'white', borderLeft: '3px solid #10b981' }}>
                <div className="text-xs font-bold uppercase tracking-widest pb-3 mb-4" style={{ color: '#10b981', letterSpacing: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  Montree
                </div>
                {[
                  'Take a photo — AI records the observation',
                  'Progress tracks itself from photo evidence',
                  'Reports write themselves, with photos',
                  'Smart Shelf tells you exactly what to present next',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 mb-3 last:mb-0">
                    <span style={{ color: '#10b981', fontSize: 14, marginTop: 1 }}>&#x2713;</span>
                    <span className="text-sm" style={{ color: '#44403c' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========== THE EDGE ========== */}
        <section style={{ padding: '4rem 1.5rem', background: '#fefdfb' }}>
          <div className="max-w-3xl mx-auto">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#064e3b', marginBottom: '2rem', letterSpacing: '-0.5px', textAlign: 'center' }}>
              What only Montree can do
            </h2>

            <div ref={addReveal} className="space-y-0">
              {[
                {
                  title: 'Visual Work Recognition',
                  desc: 'The AI sees "Sandpaper Letters" or "Golden Beads" from a photo. No barcodes. No dropdowns. It sees what you see.',
                },
                {
                  title: 'A Brain That Learns Your Classroom',
                  desc: 'Every correction teaches the system. "That\'s not Cutting — that\'s Sewing." Now it knows. Permanently. Your school builds its own visual memory.',
                },
                {
                  title: 'The Smart Shelf',
                  desc: 'Five works, five areas, personalized per child, every week. Based on mastery, readiness, and sensitive periods. GPS for Montessori progression.',
                },
                {
                  title: 'A Montessori Expert on Demand',
                  desc: 'A parent asks "Why is my child doing the same work every day?" Montree answers instantly — with developmental context specific to their child.',
                },
              ].map((cap, i) => (
                <div
                  key={i}
                  className="py-5"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                >
                  <div className="text-sm font-bold mb-1" style={{ color: '#064e3b' }}>{cap.title}</div>
                  <div className="text-sm" style={{ color: '#78716c', lineHeight: 1.6 }}>{cap.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== ORIGIN ========== */}
        <section style={{ padding: '4rem 1.5rem', background: '#064e3b', color: 'white' }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 400, lineHeight: 1.4, color: 'rgba(255,255,255,0.9)', marginBottom: '1.2rem' }}>
              Built{' '}
              <strong style={{ color: '#6ee7b7', fontWeight: 700 }}>in a classroom</strong>,
              by a teacher who got tired of choosing between paperwork and children.
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: '2rem' }}>
              Used every day in a real Montessori classroom with 20 children. Not theoretical — battle-tested.
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              {[
                { val: '20', label: 'Children daily' },
                { val: '5', label: 'Curriculum areas' },
                { val: '384', label: 'Works recognized' },
                { val: '0', label: 'Hours of paperwork' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: '#6ee7b7' }}>{s.val}</div>
                  <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== PRICING TEASER ========== */}
        <section style={{ padding: '3.5rem 1.5rem', background: '#faf9f7' }} className="text-center">
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', color: '#064e3b', marginBottom: '0.8rem', letterSpacing: '-0.5px' }}>
              Free to start. Transparent pricing.
            </h2>
            <p style={{ color: '#78716c', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Three tiers. Same platform. Choose how much AI intelligence you want behind it.
              We tell you exactly which AI model powers each tier and why.
            </p>
            <a
              href="/pricing"
              className="inline-block px-6 py-3 rounded-xl text-sm font-semibold no-underline transition-all hover:-translate-y-0.5"
              style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              View pricing &amp; tiers
            </a>
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section style={{ padding: '4rem 1.5rem', background: '#fefdfb' }} className="text-center">
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', color: '#064e3b', marginBottom: '1rem', letterSpacing: '-0.5px' }}>
              See what one photo can do
            </h2>
            <p style={{ color: '#78716c', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              15 minutes. No installation. No training required.
            </p>
            <button
              onClick={() => setDemoOpen(true)}
              className="inline-block px-8 py-4 rounded-xl text-base font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: '#064e3b', color: 'white', letterSpacing: '0.3px', boxShadow: '0 8px 24px rgba(6,78,59,0.15)', border: 'none', cursor: 'pointer' }}
            >
              Request a Demo
            </button>

            <div className="flex flex-col gap-3 mt-8 sm:flex-row sm:justify-center">
              <a
                href="/montree/try"
                className="px-6 py-3 rounded-xl text-sm font-semibold no-underline transition-all"
                style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.15)' }}
              >
                Try Montree free
              </a>
              <a
                href="/montree/login-select"
                className="px-6 py-3 rounded-xl text-sm font-semibold no-underline transition-all"
                style={{ background: 'rgba(0,0,0,0.03)', color: '#78716c', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                I already have an account
              </a>
            </div>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="text-center py-6 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <p className="text-sm" style={{ color: '#a8a29e' }}>
            <a href="https://montree.xyz" className="no-underline" style={{ color: '#10b981' }}>montree.xyz</a>
          </p>
        </footer>
      </div>
    </>
  );
}
