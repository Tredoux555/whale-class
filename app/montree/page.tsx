'use client';

import { useEffect, useRef, useState } from 'react';

// /montree/page.tsx — Montree landing page

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
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 16, padding: '2.5rem', maxWidth: 440, width: '100%', position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,0.12)' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>✕</button>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: 22 }}>✓</div>
            <h3 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.4rem', color: '#111827', marginBottom: 8, fontWeight: 600 }}>
              We&apos;ll be in touch.
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Thank you for reaching out. I&apos;ll write to you within 24 hours to arrange a time.
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: 16 }}>— Tredoux</p>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.35rem', color: '#111827', marginBottom: 4, fontWeight: 600 }}>
              Request a Demo
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: 24, lineHeight: 1.6 }}>
              15 minutes. I&apos;ll show you what one photo can do for your classroom.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#f9fafb', color: '#111827' }} />
              <input type="text" placeholder="School name" value={school} onChange={(e) => setSchool(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#f9fafb', color: '#111827' }} />
              <input type="email" placeholder="Email address *" required value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#f9fafb', color: '#111827' }} />
              {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
              <button type="submit" disabled={sending}
                style={{ padding: '13px 0', borderRadius: 8, background: '#111827', color: 'white', fontSize: 14, fontWeight: 500, border: 'none', cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.6 : 1, letterSpacing: '0.2px', marginTop: 4 }}>
                {sending ? 'Sending…' : 'Request a Demo'}
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
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    revealRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const addReveal = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.65s ease, transform 0.65s ease';
      revealRefs.current.push(el);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; }
        .nav-link:hover { color: #111827 !important; }
        .cta-btn:hover { background: #1f2937 !important; }
        .ghost-btn:hover { background: #f3f4f6 !important; }
      `}</style>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />

      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#ffffff', color: '#374151', lineHeight: 1.6 }}>

        {/* ── NAV ── */}
        <nav style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/montree" style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.25rem', fontWeight: 600, color: '#111827', letterSpacing: '-0.3px' }}>
              Montree
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <a href="/pricing" className="nav-link" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 400 }}>Pricing</a>
              <a href="/montree/library" className="nav-link" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 400 }}>Library</a>
              <a href="/montree/login-select" className="nav-link" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 400 }}>Log in</a>
              <button onClick={() => setDemoOpen(true)} className="cta-btn"
                style={{ fontSize: '0.875rem', fontWeight: 500, padding: '8px 18px', borderRadius: 8, background: '#111827', color: 'white', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                Request a Demo
              </button>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ paddingTop: 140, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 28, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
            Montessori classroom management
          </div>
          <h1 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(2.4rem, 6vw, 3.75rem)', fontWeight: 600, lineHeight: 1.15, color: '#111827', marginBottom: 24, letterSpacing: '-1px' }}>
            A teacher takes a photo.<br />
            <em style={{ fontStyle: 'italic', color: '#059669' }}>Montree does the rest.</em>
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: 500, fontWeight: 300, lineHeight: 1.75, marginBottom: 40 }}>
            No data entry. No spreadsheets. No templates. Just one photo — and everything appears automatically.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setDemoOpen(true)} className="cta-btn"
              style={{ fontSize: '0.9rem', fontWeight: 500, padding: '13px 28px', borderRadius: 8, background: '#111827', color: 'white', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
              Request a Demo
            </button>
            <a href="/montree/try" className="ghost-btn"
              style={{ fontSize: '0.9rem', fontWeight: 500, padding: '13px 28px', borderRadius: 8, background: 'transparent', color: '#374151', border: '1px solid #e5e7eb', transition: 'background 0.15s', display: 'inline-block' }}>
              Try free
            </a>
          </div>
        </section>

        {/* ── DIVIDER ── */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6' }} />
        </div>

        {/* ── HOW IT WORKS ── */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px' }}>
          <div ref={addReveal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0 }}>
            {[
              { n: '01', t: 'Capture', d: 'Snap a photo of a child at work. That\'s the only step required from you.' },
              { n: '02', t: 'Recognise', d: 'The AI identifies the Montessori material — no barcodes, no dropdowns.' },
              { n: '03', t: 'Track', d: 'Progress updates across all five curriculum areas. Automatically.' },
              { n: '04', t: 'Report', d: 'Parents receive a personal letter with photos and developmental context.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '32px 28px', borderRight: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 16 }}>{s.n}</div>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.05rem', fontWeight: 500, color: '#111827', marginBottom: 10 }}>{s.t}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.7 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── DIVIDER ── */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6' }} />
        </div>

        {/* ── STATEMENT ── */}
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <p ref={addReveal} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 400, fontStyle: 'italic', color: '#111827', lineHeight: 1.5, letterSpacing: '-0.3px' }}>
            &ldquo;Other systems ask the teacher to describe what happened. Montree already knows.&rdquo;
          </p>
        </section>

        {/* ── COMPARISON ── */}
        <section style={{ background: '#f9fafb', padding: '80px 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div ref={addReveal} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <div style={{ padding: '32px 28px', background: '#ffffff' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>Traditional</div>
                {[
                  'Type observations manually',
                  'Check boxes on spreadsheets',
                  'Write reports from memory Friday night',
                  'Guess what each child should do next',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                    <span style={{ color: '#d1d5db', fontSize: 13, marginTop: 2, flexShrink: 0 }}>—</span>
                    <span style={{ fontSize: '0.875rem', color: '#9ca3af', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '32px 28px', background: '#ffffff', borderLeft: '2px solid #059669' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#059669', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f0fdf4' }}>Montree</div>
                {[
                  'One photo — AI records the observation',
                  'Progress tracks itself from photo evidence',
                  'Reports write themselves, with photos',
                  'Smart Shelf tells you exactly what to present next',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                    <span style={{ color: '#059669', fontSize: 13, marginTop: 2, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CAPABILITIES ── */}
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
          <h2 ref={addReveal} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 500, color: '#111827', marginBottom: 48, letterSpacing: '-0.3px' }}>
            What only Montree can do
          </h2>
          <div>
            {[
              {
                title: 'Visual Work Recognition',
                desc: 'The AI sees Sandpaper Letters or Golden Beads from a photo. No barcodes. No dropdowns. It sees what the teacher sees.',
              },
              {
                title: 'A Classroom That Learns',
                desc: '"That\'s not Cutting — that\'s Sewing." One correction and the system knows. Permanently. Your school builds its own visual memory over time.',
              },
              {
                title: 'The Smart Shelf',
                desc: 'Five works, five areas, personalised per child, every week. Built on mastery, readiness, and sensitive periods — not the teacher\'s memory.',
              },
              {
                title: 'A Montessori Expert on Demand',
                desc: 'A parent asks why their child keeps choosing the same work. Montree answers with developmental context specific to that child, instantly.',
              },
            ].map((cap, i) => (
              <div key={i} ref={addReveal} style={{ paddingTop: 28, paddingBottom: 28, borderTop: '1px solid #f3f4f6', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.95rem', fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>{cap.title}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.75 }}>{cap.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ORIGIN ── */}
        <section style={{ background: '#f9fafb', padding: '80px 24px' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <p ref={addReveal} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', fontWeight: 400, color: '#374151', lineHeight: 1.75, marginBottom: 40 }}>
              Built in a classroom, by a teacher who got tired of choosing between paperwork and children. Used every day with 20 students — not theoretical.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid #e5e7eb', paddingTop: 36 }}>
              {[
                { val: '20', label: 'Children daily' },
                { val: '5', label: 'Curriculum areas' },
                { val: '384', label: 'Works tracked' },
                { val: '0', label: 'Hours of paperwork' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '0 12px', borderRight: i < 3 ? '1px solid #e5e7eb' : 'none' }}>
                  <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.75rem', fontWeight: 600, color: '#111827', marginBottom: 4 }}>{s.val}</div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING TEASER ── */}
        <section style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <h2 ref={addReveal} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.2rem, 2.8vw, 1.6rem)', fontWeight: 500, color: '#111827', marginBottom: 14, letterSpacing: '-0.3px' }}>
            Free to start. Transparent pricing.
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.75, marginBottom: 24 }}>
            Three tiers. Same platform. Choose how much AI intelligence you want behind it.
          </p>
          <a href="/pricing"
            style={{ display: 'inline-block', fontSize: '0.875rem', fontWeight: 500, color: '#059669', borderBottom: '1px solid #bbf7d0', paddingBottom: 2 }}>
            View pricing and tiers →
          </a>
        </section>

        {/* ── CTA ── */}
        <section style={{ background: '#111827', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <h2 ref={addReveal} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 500, color: '#ffffff', marginBottom: 14, letterSpacing: '-0.5px', lineHeight: 1.3 }}>
              See what one photo can do.
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 32, lineHeight: 1.7 }}>
              15 minutes. No installation. No training required.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setDemoOpen(true)}
                style={{ fontSize: '0.9rem', fontWeight: 500, padding: '13px 28px', borderRadius: 8, background: '#ffffff', color: '#111827', border: 'none', cursor: 'pointer' }}>
                Request a Demo
              </button>
              <a href="/montree/login-select"
                style={{ fontSize: '0.9rem', fontWeight: 500, padding: '13px 28px', borderRadius: 8, background: 'transparent', color: '#9ca3af', border: '1px solid #374151', display: 'inline-block' }}>
                I have an account
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
          <a href="https://montree.xyz" style={{ fontSize: '0.8rem', color: '#9ca3af' }}>montree.xyz</a>
        </footer>

      </div>
    </>
  );
}
