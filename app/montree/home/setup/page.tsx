// /montree/home/setup/page.tsx
// Minimal child creation: name + age only
// After creation, redirects to Portal where Guru handles the rest
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import AmbientParticles from '@/components/montree/home/AmbientParticles';

const AGE_OPTIONS = [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

export default function SetupPage() {
  const router = useRouter();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(3.5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.replace('/montree/login');
      return;
    }
    setSession(sess);
  }, [router]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your child\'s name');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Validate classroom exists before API call
      const classroomId = session?.classroom?.id;
      if (!classroomId) {
        setError('Session error — please log in again.');
        setSaving(false);
        return;
      }

      // Create child using existing onboarding endpoint
      const res = await fetch('/api/montree/onboarding/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          students: [{
            name: trimmedName,
            age,
            progress: {}, // No curriculum picker — Guru handles this
          }],
        }),
      });

      if (!res.ok) {
        let errorMsg = 'Failed to create child';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch { /* Non-JSON error response */ }
        throw new Error(errorMsg);
      }

      const data = await res.json();

      // Update session to mark as onboarded
      const sessionData = localStorage.getItem('montree_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.onboarded = true;
        localStorage.setItem('montree_session', JSON.stringify(parsed));
      }

      // Get the created child ID
      // The onboarding endpoint returns { success: true, children: [...] }
      let childId: string | null = null;
      if (data.children && data.children.length > 0) {
        childId = data.children[data.children.length - 1].id;
      }

      if (!childId) {
        // Fallback: fetch children to get the ID
        try {
          const childrenRes = await fetch(`/api/montree/children?classroom_id=${classroomId}`);
          if (childrenRes.ok) {
            const childrenData = await childrenRes.json();
            const kids = childrenData.children || [];
            if (kids.length > 0) {
              childId = kids[kids.length - 1].id;
            }
          }
        } catch { /* Fallback fetch failed — will redirect to dashboard */ }
      }

      if (childId) {
        // Clear any stale greeting cache
        localStorage.removeItem(`montree_greeting_${childId}`);
        router.push(`/montree/home/${childId}`);
      } else {
        router.push('/montree/dashboard');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${BIO.bg.deep}`}>
      <AmbientParticles />

      <div className="relative z-10 w-full max-w-sm">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#4ADE80]/10 flex items-center justify-center mb-4"
               style={{ boxShadow: BIO.glow.soft }}>
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className={`text-2xl font-bold ${BIO.text.primary} mb-2`}>
            Let&apos;s begin
          </h1>
          <p className={`text-sm ${BIO.text.secondary}`}>
            Tell us a little about your child
          </p>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label className={`block text-xs ${BIO.text.mint} mb-2 font-medium`}>
            Child&apos;s name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="e.g. Emma"
            className={`w-full px-4 py-3.5 rounded-2xl border ${BIO.border.dim} ${BIO.bg.cardSolid} ${BIO.text.primary} text-base placeholder:text-white/25 focus:outline-none focus:border-[#4ADE80]/30 focus:ring-1 focus:ring-[#4ADE80]/10`}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {/* Age picker */}
        <div className="mb-8">
          <label className={`block text-xs ${BIO.text.mint} mb-3 font-medium`}>
            How old?
          </label>
          <div className="grid grid-cols-5 gap-2">
            {AGE_OPTIONS.map(a => (
              <button
                key={a}
                onClick={() => setAge(a)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  age === a
                    ? `${BIO.btn.mint} scale-105`
                    : `${BIO.bg.card} border ${BIO.border.dim} ${BIO.text.secondary} hover:border-[#4ADE80]/20`
                }`}
                style={age === a ? { boxShadow: BIO.glow.soft } : undefined}
              >
                {a === 6 ? '6+' : a}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className={`w-full py-4 rounded-2xl ${BIO.btn.mint} text-base transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          style={{ boxShadow: saving ? undefined : BIO.glow.medium }}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-[#0A1F1C]/30 border-t-[#0A1F1C] animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Meet Your Guide
              <span>→</span>
            </>
          )}
        </button>

        <p className={`text-center text-xs ${BIO.text.muted} mt-6`}>
          Your guide will help set up everything else
        </p>
      </div>
    </div>
  );
}
