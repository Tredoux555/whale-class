'use client';

import { useEffect, useRef } from 'react';

// /montree/page.tsx — Montree landing page
// "A teacher takes a photo. Montree does the rest."

export default function MontreeLanding() {
  const revealRefs = useRef<HTMLElement[]>([]);

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
              <a href="/montree/login-select" className="text-sm font-medium no-underline hidden sm:inline" style={{ color: '#78716c' }}>
                Log in
              </a>
              <a
                href="mailto:tredoux555@gmail.com?subject=Montree Demo Request"
                className="text-sm font-semibold no-underline px-4 py-2 rounded-lg transition-all hover:-translate-y-0.5"
                style={{ background: '#064e3b', color: 'white', letterSpacing: '0.3px' }}
              >
                Request a Demo
              </a>
            </div>
          </div>
        </nav>

        {/* ========== HERO ========== */}
        <section className="flex items-center justify-center text-center px-6" style={{ marginTop: 60, minHeight: '90vh', position: 'relative' }}>
          <div style={{ maxWidth: 800 }}>
            <div
              className="inline-block px-4 py-1.5 rounded-full text-xs font-medium mb-8"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#059669', letterSpacing: '0.5px' }}
            >
              Built by a Montessori teacher, for Montessori teachers
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.6rem, 7vw, 4.2rem)', fontWeight: 700, lineHeight: 1.1, color: '#064e3b', marginBottom: '1.5rem', letterSpacing: '-1.5px' }}>
              A teacher takes a photo.<br />
              <em style={{ color: '#10b981' }}>Montree does the rest.</em>
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#78716c', maxWidth: 560, margin: '0 auto', fontWeight: 300, lineHeight: 1.7 }}>
              The first classroom management system that actually understands Montessori. No data entry. No spreadsheets. No templates. Just one photo — and everything appears automatically.
            </p>
          </div>
          {/* Scroll line */}
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 1, height: 80, background: 'linear-gradient(to bottom, transparent, rgba(16,185,129,0.3))' }} />
        </section>

        {/* ========== THE MOMENT ========== */}
        <section style={{ padding: '5rem 1.5rem', background: '#064e3b', color: 'white', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -200, right: -200, width: 500, height: 500, background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 3 }}>
              What happens when you take one photo
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', fontWeight: 400, lineHeight: 1.35, color: 'rgba(255,255,255,0.95)', marginBottom: '3rem' }}>
              A child is working on the Pink Tower. You take a picture. Before you&apos;ve moved to the next child,{' '}
              <strong style={{ color: '#6ee7b7', fontWeight: 700 }}>
                Montree has already identified the work, recorded the observation, updated the child&apos;s progress, determined what she should work on next, and started writing her parent report.
              </strong>
            </h2>

            <div ref={addReveal} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
              {[
                { n: '01 — Capture', t: 'You snap a photo', d: 'A child is concentrating on Montessori materials. You capture the moment.', time: '1 second' },
                { n: '02 — Recognize', t: 'AI identifies the work', d: '"Pink Tower — Sensorial." The system knows what it\'s seeing. It learns your classroom.', time: 'Instant' },
                { n: '03 — Track', t: 'Progress updates itself', d: 'Presented → Practicing → Mastered. Curriculum mapping. Sensitive periods. All automatic.', time: 'Automatic' },
                { n: '04 — Report', t: 'Parents receive real insight', d: 'Not a template. A genuine, personal account of what their child learned and why it matters.', time: 'End of week' },
              ].map((s, i) => (
                <div key={i} className="py-6 px-5" style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6ee7b7', letterSpacing: 2 }}>{s.n}</div>
                  <div className="text-lg font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: 'white' }}>{s.t}</div>
                  <div className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{s.d}</div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)', color: '#6ee7b7' }}>
                    {s.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== THE DIFFERENCE ========== */}
        <section style={{ padding: '5rem 1.5rem', background: '#faf9f7' }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: '#78716c', letterSpacing: 3 }}>
              The difference
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#064e3b', marginBottom: '2.5rem', letterSpacing: '-0.5px', lineHeight: 1.3 }}>
              Every other system asks the teacher to describe what happened. Montree already knows.
            </h2>

            <div ref={addReveal} className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              {/* THEM */}
              <div className="p-8" style={{ background: '#f5f0eb' }}>
                <div className="text-xs font-bold uppercase tracking-widest pb-4 mb-6" style={{ color: '#a8a29e', letterSpacing: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  Traditional Systems
                </div>
                {[
                  { t: 'Type observations manually', d: 'Teacher stops, opens laptop, types what they saw. Loses the moment.' },
                  { t: 'Check boxes on a spreadsheet', d: 'Presented? Practicing? Mastered? Click, click, click. For every child. Every work.' },
                  { t: 'Write reports from memory', d: 'Friday evening. 20 children. What did Amy do on Tuesday? What was Eric working on?' },
                  { t: 'Guess what comes next', d: "Teacher intuition is beautiful. But alone, it doesn't scale to 20 children across 5 areas." },
                ].map((item, i) => (
                  <div key={i} className="mb-5 last:mb-0">
                    <div className="text-sm font-semibold mb-1" style={{ color: '#a8a29e' }}>{item.t}</div>
                    <div className="text-sm" style={{ color: '#c4b5a5', lineHeight: 1.6 }}>{item.d}</div>
                  </div>
                ))}
              </div>
              {/* US */}
              <div className="p-8" style={{ background: 'white', borderLeft: '3px solid #10b981' }}>
                <div className="text-xs font-bold uppercase tracking-widest pb-4 mb-6" style={{ color: '#10b981', letterSpacing: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  Montree
                </div>
                {[
                  { t: 'Take a photo', d: 'The AI sees the work, identifies it, records the observation. Teacher stays with the child.' },
                  { t: 'Progress tracks itself', d: 'Photo count drives status. 1 photo = Presented. Multiple = Practicing. Teacher confirms mastery.' },
                  { t: 'Reports write themselves', d: 'Every parent gets a genuine, personal letter. With photos. With developmental context. Automatically.' },
                  { t: 'AI plans the next step', d: 'The Smart Shelf: 5 works, 5 areas, personalized per child. Based on mastery, readiness, and sensitive periods.' },
                ].map((item, i) => (
                  <div key={i} className="mb-5 last:mb-0">
                    <div className="text-sm font-semibold mb-1" style={{ color: '#44403c' }}>{item.t}</div>
                    <div className="text-sm" style={{ color: '#78716c', lineHeight: 1.6 }}>{item.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========== FIVE THINGS ONLY MONTREE DOES ========== */}
        <section style={{ padding: '5rem 1.5rem', background: '#fefdfb' }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: '#78716c', letterSpacing: 3 }}>
              What makes us different
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#064e3b', marginBottom: '0.8rem', letterSpacing: '-0.5px' }}>
              Five things no other system can do
            </h2>
            <p style={{ color: '#78716c', fontSize: '1rem', marginBottom: '2.5rem', maxWidth: 600 }}>
              These aren&apos;t features. They&apos;re fundamental capabilities that require a completely different architecture.
            </p>

            {[
              {
                n: '01',
                title: 'Visual Work Recognition',
                desc: 'The camera sees a child with Montessori materials and identifies the specific work — "Sandpaper Letters," "Golden Beads," "Pouring Water." No barcodes. No QR codes. No manual selection from a dropdown. The AI sees what the teacher sees.',
              },
              {
                n: '02',
                title: 'A Brain That Gets Smarter Every Day',
                desc: 'Every teacher correction teaches the system. "That\'s not Cutting — that\'s Sewing." Now it knows. The more your teachers use it, the more accurate it becomes. Your classroom builds its own visual memory. No other system learns from its mistakes.',
              },
              {
                n: '03',
                title: 'Parent Reports That Are Actually Personal',
                desc: 'Not "Your child had a great week!" Not a template with a name swapped in. A genuine letter explaining what your child worked on, what they\'re developing, what comes next, and why it matters — written from the photos the teacher took that week.',
              },
              {
                n: '04',
                title: 'The Smart Shelf',
                desc: "For every child, every week: five works across five curriculum areas, chosen by AI based on what they've mastered, what they're ready for, and which sensitive periods are active. The teacher opens the app and sees exactly what to present next. Like GPS for Montessori progression.",
              },
              {
                n: '05',
                title: 'A Montessori Expert on Demand',
                desc: 'A parent asks: "Why is my child doing the same work every day?" Instead of a 20-minute email, Montree answers instantly — with developmental context, sensitive period awareness, and specific reference to their child\'s activity.',
              },
            ].map((cap, i) => (
              <div
                key={i}
                ref={addReveal}
                className="grid gap-5 py-6"
                style={{ gridTemplateColumns: '50px 1fr', borderTop: '1px solid rgba(0,0,0,0.05)', borderBottom: i === 4 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
              >
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#10b981', fontWeight: 700, lineHeight: 1 }}>{cap.n}</div>
                <div>
                  <div className="text-base font-bold mb-1" style={{ color: '#064e3b' }}>{cap.title}</div>
                  <div className="text-sm" style={{ color: '#78716c', lineHeight: 1.7 }}>{cap.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========== THE TEACHER WHO BUILT IT ========== */}
        <section style={{ padding: '5rem 1.5rem', background: '#064e3b', color: 'white' }}>
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>
              Origin
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 400, lineHeight: 1.4, color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
              This wasn&apos;t built in a tech lab. It was built{' '}
              <strong style={{ color: '#6ee7b7', fontWeight: 700 }}>in a classroom</strong>, by a teacher who got tired of choosing between paperwork and children.
            </h2>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, marginBottom: '2.5rem' }}>
              Montree is used every day in a real Montessori classroom with 20 children. Every feature exists because a working teacher needed it. Every bug was found because a working teacher hit it. This isn&apos;t theoretical — it&apos;s battle-tested.
            </p>
            <div className="flex flex-wrap justify-center gap-8 mt-6">
              {[
                { val: '20', label: 'Children daily' },
                { val: '5', label: 'Curriculum areas' },
                { val: '384', label: 'Works recognized' },
                { val: '0', label: 'Hours of paperwork' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold" style={{ color: '#6ee7b7' }}>{s.val}</div>
                  <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== THE BRAIN — THE MOAT ========== */}
        <section style={{ padding: '5rem 1.5rem', background: '#faf9f7' }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: '#78716c', letterSpacing: 3 }}>
              The invisible advantage
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#064e3b', marginBottom: '1rem', letterSpacing: '-0.5px' }}>
              A system that gets smarter in silence
            </h2>
            <p style={{ color: '#78716c', fontSize: '1rem', marginBottom: '2.5rem', maxWidth: 620, lineHeight: 1.7 }}>
              Most software stays the same. Montree improves every day, invisibly, from every interaction in every classroom. The more your teachers use it, the more valuable it becomes.
            </p>
            <div
              ref={addReveal}
              className="rounded-2xl p-8"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #10b981, #059669, #064e3b)' }} />
              <div className="flex flex-wrap items-center justify-center gap-3 py-4">
                {[
                  { text: 'Teacher takes photo', type: 'action' },
                  { text: 'AI identifies work', type: 'learn' },
                  { text: 'Teacher confirms or corrects', type: 'action' },
                  { text: 'AI learns the correction', type: 'improve' },
                  { text: 'Next photo is more accurate', type: 'learn' },
                ].map((node, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="px-4 py-3 rounded-xl text-sm font-semibold text-center"
                      style={{
                        minWidth: 130,
                        ...(node.type === 'action'
                          ? { background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.15)' }
                          : node.type === 'learn'
                          ? { background: '#064e3b', color: '#6ee7b7' }
                          : { background: 'rgba(16,185,129,0.15)', color: '#064e3b', border: '1px solid rgba(16,185,129,0.25)' }),
                      }}
                    >
                      {node.text}
                    </div>
                    {i < 4 && <span style={{ color: '#10b981', fontSize: '1.1rem' }}>→</span>}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm italic mt-6" style={{ color: '#78716c' }}>
                Every correction makes the system permanently smarter. Your school&apos;s AI brain is unique to your classroom.
              </p>
            </div>
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section style={{ padding: '5rem 1.5rem', background: '#fefdfb' }} className="text-center">
          <div style={{ maxWidth: 550, margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 5vw, 2.8rem)', color: '#064e3b', marginBottom: '1.2rem', letterSpacing: '-0.5px' }}>
              See what one photo can do
            </h2>
            <p style={{ color: '#78716c', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.7 }}>
              15 minutes. No installation. No training required. We&apos;ll show you what happens when a teacher is free to just teach.
            </p>
            <a
              href="mailto:tredoux555@gmail.com?subject=Montree Demo Request"
              className="inline-block px-8 py-4 rounded-xl text-base font-semibold no-underline transition-all hover:-translate-y-0.5"
              style={{ background: '#064e3b', color: 'white', letterSpacing: '0.3px', boxShadow: '0 8px 24px rgba(6,78,59,0.15)' }}
            >
              Request a Demo
            </a>
            <p className="text-xs mt-4" style={{ color: '#a8a29e' }}>
              Built by a teacher. Used every day. Ready for your school.
            </p>

            <div className="flex flex-col gap-3 mt-12 sm:flex-row sm:justify-center">
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
        <footer className="text-center py-8 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <p className="text-sm" style={{ color: '#a8a29e' }}>
            <a href="https://montree.xyz" className="no-underline" style={{ color: '#10b981' }}>montree.xyz</a>
            {' '}— The future of Montessori classroom management
          </p>
        </footer>
      </div>
    </>
  );
}
