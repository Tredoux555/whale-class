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
            AI built for the Montessori classroom
          </div>
          <h1 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(2.4rem, 6vw, 3.75rem)', fontWeight: 600, lineHeight: 1.15, color: '#111827', marginBottom: 24, letterSpacing: '-1px' }}>
            A teacher takes a photo.<br />
            <em style={{ fontStyle: 'italic', color: '#059669' }}>Montree does the rest.</em>
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: 520, fontWeight: 300, lineHeight: 1.75, marginBottom: 40 }}>
            Observations recorded. Progress tracked. Reports written. Parents informed. The work that used to consume evenings and weekends — done in seconds, while the teacher is still in the classroom.
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
              { n: '01', t: 'Capture', d: 'One photo. That\'s the teacher\'s only job. Everything that follows is Montree\'s.' },
              { n: '02', t: 'Recognise', d: 'The AI identifies the work instantly — Sandpaper Letters, Golden Beads, whatever the child has chosen. No input required.' },
              { n: '03', t: 'Track', d: 'Progress builds automatically across all five curriculum areas. Every child. Every work. Every week.' },
              { n: '04', t: 'Report', d: 'Parents receive a detailed, personal account of their child\'s week — written, evidenced, and sent without the teacher lifting a pen.' },
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
            &ldquo;Other systems ask the teacher to describe what happened.<br />Montree already knows.&rdquo;
          </p>
        </section>

        {/* ── COMPARISON ── */}
        <section style={{ background: '#f9fafb', padding: '80px 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div ref={addReveal} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <div style={{ padding: '32px 28px', background: '#ffffff' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>Traditional</div>
                {[
                  '15–20 hours of admin every week',
                  'Reports written from memory on Friday night',
                  'Parent meetings to explain what you hope they understand',
                  'Guessing what each child should do next',
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
                  '15–20 hours returned to the teacher, every week',
                  'Reports written, evidenced, and ready — automatically',
                  'Parents already know. No meeting needed.',
                  'Smart Shelf: the right work, for the right child, right now',
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

        {/* ── PULL QUOTE ── */}
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 0' }}>
          <p ref={addReveal} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 400, fontStyle: 'italic', color: '#111827', lineHeight: 1.6, letterSpacing: '-0.3px' }}>
            &ldquo;Imagine Maria Montessori as a personal assistant — present in every classroom, supporting every teacher, answering every question a parent hasn&rsquo;t thought to ask yet. That&rsquo;s what Montree does.&rdquo;
          </p>
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
                desc: 'The AI sees Sandpaper Letters or Golden Beads from a single photo. No barcodes. No typing. No dropdowns. What takes a teacher a second to notice, Montree records in the same second.',
              },
              {
                title: 'A System That Learns Your School',
                desc: 'Every classroom is different. Every teacher notices things differently. Montree learns from corrections and builds a visual memory that belongs to your school — and grows more accurate with every use.',
              },
              {
                title: 'The Smart Shelf',
                desc: 'Five works. Five curriculum areas. Personalised for every child, every week. Calibrated to mastery, readiness, and sensitive periods. Not a guess — a recommendation backed by evidence.',
              },
              {
                title: 'Parent Communication. Solved.',
                desc: 'Parents receive detailed, photo-evidenced reports on their child\'s development — written in clear, warm language that sells the school and builds trust. The difficult conversation that used to require a meeting now doesn\'t happen, because the parent already knows.',
              },
            ].map((cap, i) => (
              <div key={i} ref={addReveal} style={{ paddingTop: 28, paddingBottom: 28, borderTop: '1px solid #f3f4f6', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.95rem', fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>{cap.title}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.75 }}>{cap.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TIME SAVED ── */}
        <section style={{ background: '#111827', padding: '80px 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div ref={addReveal}>
              <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 600, color: '#ffffff', lineHeight: 1, marginBottom: 12 }}>
                15–20
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6ee7b7', marginBottom: 20 }}>
                Hours returned to the teacher, every week
              </div>
              <p style={{ fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.75 }}>
                That&rsquo;s not a rounding error. It&rsquo;s the hours spent writing observations, compiling reports, preparing for parent meetings, tracking progress across 20 children. Montree handles all of it — so the teacher doesn&rsquo;t have to.
              </p>
            </div>
            <div ref={addReveal} style={{ borderLeft: '1px solid #374151', paddingLeft: 60 }}>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.1rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, marginBottom: 20 }}>
                &ldquo;The question isn&rsquo;t whether your school can afford Montree. It&rsquo;s what you&rsquo;re spending 15 hours a week on instead.&rdquo;
              </p>
              <a href="/pricing" style={{ display: 'inline-block', fontSize: '0.875rem', fontWeight: 500, padding: '11px 22px', borderRadius: 8, background: 'transparent', color: '#6ee7b7', border: '1px solid #374151' }}>
                See pricing →
              </a>
            </div>
          </div>
        </section>

        {/* ── ORIGIN ── */}
        <section style={{ background: '#f9fafb', padding: '80px 24px' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <p ref={addReveal} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', fontWeight: 400, color: '#374151', lineHeight: 1.75, marginBottom: 40 }}>
              Built by a teacher, inside a real classroom, because the tools didn&rsquo;t exist. Not a product designed around Montessori — a system built from it, tested on 20 children every day, refined through real teaching.
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

        {/* ── FOR THE TEACHER ── */}
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
          <div ref={addReveal} style={{ marginBottom: 56 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 20 }}>For the teacher</div>
            <h2 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 500, color: '#111827', lineHeight: 1.4, letterSpacing: '-0.3px' }}>
              Monday morning confidence.<br />Friday afternoon back.
            </h2>
          </div>
          <div>
            {[
              {
                day: 'Monday',
                title: 'The guidance is already better than you could have written it yourself.',
                desc: 'Open the app. The shelf is ready — five works across five areas, calibrated to where each child actually is. Not a hunch. Not what you remember from last week. Evidence-based, Montessori-aligned, ready before the day starts.',
              },
              {
                day: 'Anytime',
                title: 'A work you\'ve never presented? Thirty seconds.',
                desc: 'The Montessori curriculum is 100 years deep. Even experienced teachers haven\'t presented everything in it. When the shelf suggests something unfamiliar, the quick guide sets you straight — method, materials, what the child should discover, and why it matters at this stage of development.',
              },
              {
                day: 'Always',
                title: 'It does the work you never had time to do well.',
                desc: 'Parent reports that are detailed, warm, and professional. Progress tracked across every child without a single spreadsheet. Difficult conversations that don\'t happen because parents already know. Montree does this better than a tired teacher on a Friday afternoon ever could — and does it automatically, while the teacher is still in the room.',
              },
              {
                day: 'Friday',
                title: 'The desk is clear. The week is done.',
                desc: 'No reports to write. No admin backlog. No preparing for parent meetings that shouldn\'t need to happen. The hours that used to drain the end of every week are gone — and what\'s left is just the teaching.',
              },
            ].map((item, i) => (
              <div key={i} ref={addReveal} style={{ paddingTop: 28, paddingBottom: 28, borderTop: '1px solid #f3f4f6', display: 'grid', gridTemplateColumns: '100px 1fr', gap: 24, alignItems: 'start' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', paddingTop: 3 }}>{item.day}</div>
                <div>
                  <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.95rem', fontWeight: 500, color: '#111827', marginBottom: 8, lineHeight: 1.4 }}>{item.title}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.75 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOUR STAKEHOLDERS ── */}
        <section style={{ background: '#f9fafb', padding: '80px 24px' }}>
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            <div ref={addReveal} style={{ textAlign: 'center', marginBottom: 56 }}>
              <h2 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 500, color: '#111827', letterSpacing: '-0.3px', lineHeight: 1.4, marginBottom: 16 }}>
                One system. Every person it touches.
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#6b7280', maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>
                Montree doesn&rsquo;t just make admin easier. It upgrades the whole school — from the classroom out.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
              {[
                {
                  who: 'Principal',
                  headline: 'Complete visibility. A school that fills itself.',
                  body: 'Every classroom, every child, every week — at a glance. A school that communicates beautifully is a school that earns referrals.',
                },
                {
                  who: 'Parents',
                  headline: 'Informed. Trusting. Recommending.',
                  body: 'They already know what their child did this week. The difficult question doesn\'t get asked. The difficult meeting doesn\'t happen. And satisfied parents tell other parents.',
                },
                {
                  who: 'Teachers',
                  headline: 'More time. More confidence. Better at the job.',
                  body: 'The admin is gone. The guidance is better than memory. Teachers who use Montree teach better — because that\'s all they have to do.',
                },
                {
                  who: 'Students',
                  headline: 'The right work, at the right time, every time.',
                  body: 'Progress calibrated to each child. No work left on a shelf because the teacher forgot it existed. Every child learning exactly as Montessori intended.',
                },
              ].map((s, i) => (
                <div key={i} ref={addReveal} style={{ background: '#ffffff', padding: '28px 24px', borderRadius: 2 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#059669', marginBottom: 14 }}>{s.who}</div>
                  <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.95rem', fontWeight: 500, color: '#111827', marginBottom: 10, lineHeight: 1.4 }}>{s.headline}</div>
                  <div style={{ fontSize: '0.83rem', color: '#6b7280', lineHeight: 1.7 }}>{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── THREE IN ONE ── */}
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
          <div ref={addReveal} style={{ marginBottom: 48 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 20 }}>The real return</div>
            <h2 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 500, color: '#111827', lineHeight: 1.4, letterSpacing: '-0.3px' }}>
              Three budget lines.<br />One monthly cost.
            </h2>
          </div>
          {[
            {
              label: 'Advertising',
              text: 'A school that keeps parents beautifully informed is a school they recommend. Every report Montree writes is a reason to stay — and a reason to tell someone. That\'s a referral engine that runs every week, automatically.',
            },
            {
              label: 'Teacher training',
              text: 'Every work in the curriculum, with a step-by-step guide, available in seconds. A new teacher walks in and presents like a veteran. An experienced teacher gets reminded of works they\'ve never tried. The entire Montessori curriculum, fully accessible, for every teacher, on day one.',
            },
            {
              label: 'Teacher support',
              text: 'Observations. Progress tracking. Parent reports. Shelf planning. Everything a teacher struggles with at the end of a hard week — done automatically, and done better than any person could do it tired. That\'s not a tool. That\'s support.',
            },
          ].map((item, i) => (
            <div key={i} ref={addReveal} style={{ paddingTop: 28, paddingBottom: 28, borderTop: '1px solid #f3f4f6', display: 'grid', gridTemplateColumns: '140px 1fr', gap: 24, alignItems: 'start' }}>
              <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.88rem', fontWeight: 500, color: '#111827', paddingTop: 2 }}>{item.label}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.75 }}>{item.text}</div>
            </div>
          ))}
        </section>

        {/* ── PERSONAL PROMISE ── */}
        <section style={{ background: '#f9fafb', padding: '64px 24px' }}>
          <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
            <p ref={addReveal} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.2rem, 2.8vw, 1.6rem)', fontWeight: 400, fontStyle: 'italic', color: '#111827', lineHeight: 1.65, marginBottom: 20 }}>
              &ldquo;If there&rsquo;s something Montree can&rsquo;t do yet — just ask. It&rsquo;s a matter of time. And it will be built just for you.&rdquo;
            </p>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', letterSpacing: '0.04em' }}>— Tredoux, builder &amp; teacher</p>
          </div>
        </section>

        {/* ── DIVIDER ── */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6' }} />
        </div>

        {/* ── PRICING TEASER ── */}
        <section style={{ maxWidth: 640, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <h2 ref={addReveal} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 500, color: '#111827', marginBottom: 16, letterSpacing: '-0.3px', lineHeight: 1.35 }}>
            A personal assistant and a Montessori expert,<br />for every teacher, in every classroom.
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
            Not a subscription to software. An upgrade to how a school operates — from the classroom out. Transparent pricing. And when you measure it against 15 hours of staff time each week, it isn&rsquo;t a cost at all.
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
              15 minutes. No installation. No training required.<br />Just a classroom, a camera, and a different way of working.
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
