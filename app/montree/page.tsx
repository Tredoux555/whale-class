'use client';

import { useEffect, useRef, useState } from 'react';

// /montree/page.tsx — Montree landing page (dark redesign)

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
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 20, padding: '2.5rem', maxWidth: 440, width: '100%', position: 'relative', boxShadow: '0 40px 120px rgba(0,0,0,0.4)' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>✕</button>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: 22 }}>✓</div>
            <h3 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.4rem', color: '#111827', marginBottom: 8, fontWeight: 500 }}>
              We&apos;ll be in touch.
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Thank you for reaching out. I&apos;ll write to you within 24 hours to arrange a time.
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: 16 }}>— Tredoux</p>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.35rem', color: '#111827', marginBottom: 4, fontWeight: 500 }}>
              Request a Demo
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: 24, lineHeight: 1.6 }}>
              15 minutes. I&apos;ll show you what one photo can do for your classroom.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#f9fafb', color: '#111827' }} />
              <input type="text" placeholder="School name" value={school} onChange={(e) => setSchool(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#f9fafb', color: '#111827' }} />
              <input type="email" placeholder="Email address *" required value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#f9fafb', color: '#111827' }} />
              {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
              <button type="submit" disabled={sending}
                style={{ padding: '13px 0', borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #14b8a6)', color: 'white', fontSize: 14, fontWeight: 500, border: 'none', cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.6 : 1, letterSpacing: '0.2px', marginTop: 4 }}>
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
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      revealRefs.current.push(el);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; background: #0f172a; }
        a { text-decoration: none; }
        .m-cta {
          transition: opacity 0.18s ease, transform 0.18s ease !important;
          display: inline-block;
        }
        .m-cta:hover {
          opacity: 0.88 !important;
          transform: translateY(-1px) !important;
        }
      `}</style>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />

      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        background: 'linear-gradient(150deg, #0f172a 0%, #064e3b 55%, #134e4a 100%)',
        minHeight: '100vh',
        color: 'white',
        position: 'relative',
        overflowX: 'hidden',
      }}>

        {/* Ambient glow — adds depth to the gradient */}
        <div style={{
          position: 'fixed', top: '-20%', right: '-10%', width: '60vw', height: '60vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{
          position: 'fixed', bottom: '-10%', left: '-10%', width: '50vw', height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(20,184,166,0.06) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* ── NAV ── */}
        <nav style={{
          position: 'fixed', top: 0, width: '100%', zIndex: 50,
          background: 'rgba(15,23,42,0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            maxWidth: 1120, margin: '0 auto', padding: '0 32px',
            height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', zIndex: 1,
          }}>

            {/* Logo */}
            <a href="/montree" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'linear-gradient(135deg, #34d399, #14b8a6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, flexShrink: 0,
              }}>🌿</div>
              <span style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: '1.2rem', fontWeight: 500,
                background: 'linear-gradient(135deg, #34d399, #14b8a6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.2px',
              }}>Montree</span>
            </a>

            {/* Single CTA */}
            <a href="/montree/login-select?signup=true" className="m-cta" style={{
              fontSize: '0.875rem', fontWeight: 500,
              padding: '9px 24px', borderRadius: 100,
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
              color: 'white', letterSpacing: '0.01em',
            }}>
              Get started
            </a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '140px 24px 100px',
          textAlign: 'center',
          position: 'relative', zIndex: 1,
        }}>
          <div ref={addReveal} style={{ maxWidth: 660 }}>

            {/* Category label */}
            <div style={{
              fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(52,211,153,0.65)', marginBottom: 36, fontWeight: 400,
            }}>
              Montessori classroom management
            </div>

            {/* Hero headline */}
            <h1 style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 'clamp(3rem, 7.5vw, 5.2rem)',
              fontWeight: 400, color: '#ffffff',
              lineHeight: 1.1, letterSpacing: '-1.5px',
              marginBottom: 28,
            }}>
              The magic of Montree.
            </h1>

            {/* Subtext */}
            <p style={{
              fontSize: '1.05rem',
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.8, marginBottom: 52,
            }}>
              A teacher takes a photo. Montree does the rest.
            </p>

            {/* Primary CTA */}
            <button onClick={() => setDemoOpen(true)} className="m-cta" style={{
              fontSize: '1rem', fontWeight: 500,
              padding: '16px 40px', borderRadius: 100,
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
              color: 'white', border: 'none', cursor: 'pointer',
              letterSpacing: '0.01em', marginBottom: 18,
              boxShadow: '0 8px 32px rgba(16,185,129,0.25)',
            }}>
              Experience it free for 30 days
            </button>

            {/* Micro copy */}
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>
              One classroom &nbsp;·&nbsp; No credit card
            </div>
          </div>
        </section>

        {/* ── THREE STATEMENTS ── */}
        <section style={{
          padding: '40px 24px 180px',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>

            {[
              {
                label: 'For the teacher',
                headline: 'No more paperwork. No more writing.',
                body: 'Montree identifies the work in every photo, records the observation, and tracks each child across all five curriculum areas. Automatically.',
              },
              {
                label: 'For parents',
                headline: 'Reports that actually say something.',
                body: 'Not templates. Genuine, personalised accounts of what each child is learning and why it matters — written every week.',
              },
              {
                label: 'For the principal',
                headline: 'A complete view of the school.',
                body: 'Every classroom. Every child. A built-in Montessori expert available at any hour to answer any question.',
              },
            ].map((item, i) => (
              <div
                key={i}
                ref={addReveal}
                style={{
                  paddingTop: i === 0 ? 0 : 72,
                  paddingBottom: 72,
                  borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                {/* Label */}
                <div style={{
                  fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: 'rgba(52,211,153,0.65)', marginBottom: 18, fontWeight: 400,
                }}>
                  {item.label}
                </div>

                {/* Serif headline */}
                <h2 style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.25, letterSpacing: '-0.4px',
                  marginBottom: 18,
                }}>
                  {item.headline}
                </h2>

                {/* Body */}
                <p style={{
                  fontSize: '0.95rem',
                  color: 'rgba(255,255,255,0.38)',
                  lineHeight: 1.85,
                  maxWidth: 500,
                }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CLOSING CTA ── */}
        <section style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '130px 24px 140px',
          textAlign: 'center',
          position: 'relative', zIndex: 1,
        }}>
          <div ref={addReveal} style={{ maxWidth: 520, margin: '0 auto' }}>

            <h2 style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 'clamp(2.2rem, 5.5vw, 3.4rem)',
              fontWeight: 400, color: '#ffffff',
              letterSpacing: '-1px', lineHeight: 1.12,
              marginBottom: 22,
            }}>
              Experience the magic.
            </h2>

            <p style={{
              fontSize: '0.95rem',
              color: 'rgba(255,255,255,0.38)',
              lineHeight: 1.85, marginBottom: 44,
            }}>
              One month free. Then $7 per child, per month.<br />
              One plan. No tiers. No contracts.
            </p>

            <button onClick={() => setDemoOpen(true)} className="m-cta" style={{
              fontSize: '0.95rem', fontWeight: 500,
              padding: '15px 38px', borderRadius: 100,
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
              color: 'white', border: 'none', cursor: 'pointer',
              letterSpacing: '0.01em',
              boxShadow: '0 8px 32px rgba(16,185,129,0.2)',
            }}>
              Start your free trial
            </button>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '28px 24px',
          textAlign: 'center',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg, #34d399, #14b8a6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, flexShrink: 0,
            }}>🌿</div>
            <span style={{
              fontSize: '0.78rem',
              color: 'rgba(255,255,255,0.18)',
              letterSpacing: '0.05em',
            }}>
              Montree &nbsp;·&nbsp; montree.xyz
            </span>
          </div>
        </footer>

      </div>
    </>
  );
}
