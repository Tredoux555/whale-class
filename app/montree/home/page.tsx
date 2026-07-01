// /montree/home/page.tsx
// The Montree Home front door — where a first-time parent begins (vision plan,
// Jul 2 2026). No teacher account, no school, no code yet: one tap creates
// their home space via the existing /api/montree/try/instant homeschool_parent
// branch, shows their key (the login code) ONCE, then hands them to
// /montree/home/setup → First Meeting → the camera loop.
//
// Already signed in with a home session? This page is also the stable "home
// URL": it quietly forwards to the family's child page (or setup).
//
// COPY RULE: parent-facing. No jargon. One field, one button.
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, recoverSession, isHomeschoolContext } from '@/lib/montree/auth';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import AmbientParticles from '@/components/montree/home/AmbientParticles';

type Stage = 'checking' | 'welcome' | 'creating' | 'code';

export default function HomeFrontDoor() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('checking');
  const [parentName, setParentName] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const sessionRef = useRef<Record<string, unknown> | null>(null);

  // Returning family → straight to their child. New visitor → the welcome.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let sess = getSession();
      if (!sess) sess = await recoverSession();
      if (cancelled) return;
      if (sess && isHomeschoolContext(sess) && sess.classroom?.id) {
        try {
          const r = await fetch(`/api/montree/children?classroom_id=${sess.classroom.id}`);
          if (r.ok) {
            const d = await r.json();
            const kids = d.children || [];
            if (cancelled) return;
            router.replace(kids.length > 0 ? `/montree/home/${kids[0].id}` : '/montree/home/setup');
            return;
          }
        } catch { /* fall through to welcome */ }
      }
      if (!cancelled) setStage('welcome');
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleBegin = async () => {
    setError('');
    setStage('creating');
    try {
      const name = parentName.trim();
      const res = await fetch('/api/montree/try/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'homeschool_parent',
          name: name || undefined,
          schoolName: name ? `${name}'s Home` : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.code) {
        throw new Error(data.error || "We couldn't create your space — please try again.");
      }
      // Persist the session in the shape the home surfaces expect
      // (isHomeschoolContext passes on teacher.role === 'homeschool_parent').
      sessionRef.current = {
        teacher: {
          id: data.teacher?.id,
          name: data.teacher?.name || name || 'Parent',
          role: 'homeschool_parent',
          email: data.teacher?.email || null,
          password_set: false,
        },
        school: data.school,
        classroom: data.classroom || null,
        loginAt: new Date().toISOString(),
        onboarded: false,
      };
      localStorage.setItem('montree_session', JSON.stringify(sessionRef.current));
      setCode(String(data.code).toUpperCase());
      setStage('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't create your space — please try again.");
      setStage('welcome');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — the code stays on screen */ }
  };

  if (stage === 'checking') {
    return (
      <div className={`min-h-dvh flex items-center justify-center ${BIO.bg.deep}`}>
        <AmbientParticles />
        <div className="relative z-10 animate-pulse text-5xl">🌿</div>
      </div>
    );
  }

  return (
    <div className={`min-h-dvh flex items-center justify-center p-6 ${BIO.bg.deep}`}>
      <AmbientParticles />

      <div className="relative z-10 w-full max-w-sm">
        {stage === 'welcome' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#4ADE80]/10 flex items-center justify-center mb-5" style={{ boxShadow: BIO.glow.soft }}>
                <span className="text-3xl">🌿</span>
              </div>
              <h1 className={`text-2xl font-bold ${BIO.text.primary} mb-3`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
                Montree Home
              </h1>
              <p className={`text-[15px] leading-relaxed ${BIO.text.secondary}`}>
                Real Montessori at home — with a guide beside you. Point your camera at your child, and Ivy shows you what&rsquo;s really happening and what comes next.
              </p>
            </div>

            <label className={`block text-xs ${BIO.text.mint} mb-2 font-medium`}>Your first name</label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => { setParentName(e.target.value); setError(''); }}
              placeholder="So Ivy knows what to call you"
              className={`w-full px-4 py-3.5 rounded-2xl border ${BIO.border.dim} ${BIO.bg.cardSolid} ${BIO.text.primary} text-base placeholder:text-white/25 focus:outline-none focus:border-[#4ADE80]/30 focus:ring-1 focus:ring-[#4ADE80]/10`}
              onKeyDown={(e) => e.key === 'Enter' && handleBegin()}
            />

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              onClick={handleBegin}
              className={`mt-6 w-full py-4 rounded-2xl ${BIO.btn.mint} text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
              style={{ boxShadow: BIO.glow.medium }}
            >
              Begin — it&rsquo;s free <span>→</span>
            </button>

            <p className={`text-center text-xs ${BIO.text.muted} mt-5`}>
              30 days free · no card · no forms
            </p>
            <p className={`text-center text-xs ${BIO.text.muted} mt-2`}>
              Already have a code?{' '}
              <a href="/montree/login-select" className={`${BIO.text.mint} underline underline-offset-2`}>Log in</a>
            </p>
          </>
        )}

        {stage === 'creating' && (
          <div className="text-center">
            <div className="animate-pulse text-5xl mb-4">🌿</div>
            <p className={`text-sm ${BIO.text.secondary}`}>Making your space…</p>
          </div>
        )}

        {stage === 'code' && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#4ADE80]/10 flex items-center justify-center mb-5" style={{ boxShadow: BIO.glow.soft }}>
              <span className="text-3xl">🔑</span>
            </div>
            <h1 className={`text-xl font-bold ${BIO.text.primary} mb-2`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
              This is your key
            </h1>
            <p className={`text-sm leading-relaxed ${BIO.text.secondary} mb-5`}>
              It&rsquo;s how you get back in, on any device. Save it somewhere safe — it won&rsquo;t be shown again.
            </p>

            <button
              onClick={handleCopy}
              className={`w-full rounded-2xl border py-5 px-4 transition-all active:scale-[0.99] ${BIO.bg.cardSolid}`}
              style={{ borderColor: 'rgba(74,222,128,0.4)', boxShadow: BIO.glow.medium }}
              aria-label="Copy your code"
            >
              <span className={`block text-3xl font-bold tracking-[0.35em] ${BIO.text.mint}`} style={{ fontFamily: 'ui-monospace, monospace' }}>
                {code}
              </span>
              <span className={`block mt-2 text-xs ${BIO.text.muted}`}>{copied ? '✓ Copied' : 'tap to copy'}</span>
            </button>

            <button
              onClick={() => router.push('/montree/home/setup')}
              className={`mt-6 w-full py-4 rounded-2xl ${BIO.btn.mint} text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
            >
              I&rsquo;ve saved it — let&rsquo;s begin <span>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
