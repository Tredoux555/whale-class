// components/montree/home/FirstMeeting.tsx
// The first meeting — Ivy's guided placement chat (vision plan, Jul 2 2026).
// Five warm tap-chip questions, then the final "question" is the first photo —
// onboarding teaches the core gesture in minute one. Answers are composed into
// a natural-language transcript and sent to the EXISTING onboard extraction
// brain (/api/montree/children/[childId]/onboard) — one brain, no fork.
//
// COPY RULE: parent-facing. No jargon, no curriculum language.
'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import { compressImage } from '@/lib/montree/cache';

interface FirstMeetingProps {
  childId: string;
  childName: string;
  classroomId?: string;
  onComplete: (firstPhoto?: File) => void;
}

const AGE_CHIPS = ['2', '3', '4', '5', '6'];
const INDEPENDENT_CHIPS = ['Gets dressed', 'Pours a drink', 'Helps cook', 'Tidies up toys', 'Washes hands alone', 'Not sure yet'];
const LOVES_CHIPS = ['Water play', 'Drawing', 'Animals', 'Building things', 'Being outside', 'Books and stories', 'Helping around the house'];
const HARD_CHIPS = ['Keeps trying', 'Gets frustrated', 'Asks for help', 'Walks away'];

type Step = 'intro' | 'age' | 'independent' | 'loves' | 'hard' | 'extra' | 'thinking' | 'photo';

function Chip({ label, selected, onClick }: { label: string; selected?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
      style={{
        border: `1px solid ${selected ? 'rgba(74,222,128,0.7)' : 'rgba(74,222,128,0.35)'}`,
        background: selected ? 'rgba(74,222,128,0.18)' : 'transparent',
        color: selected ? '#c9f5df' : '#a7ecd0',
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {label}
    </button>
  );
}

export default function FirstMeeting({ childId, childName, classroomId, onComplete }: FirstMeetingProps) {
  const firstName = childName.split(' ')[0] || 'your child';
  const [step, setStep] = useState<Step>('intro');
  const [age, setAge] = useState<string | null>(null);
  const [independent, setIndependent] = useState<string[]>([]);
  const [loves, setLoves] = useState<string[]>([]);
  const [lovesText, setLovesText] = useState('');
  const [hard, setHard] = useState<string | null>(null);
  const [extra, setExtra] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };

  const submitProfile = useCallback(async () => {
    setStep('thinking');
    const lovesAll = [...loves, lovesText.trim()].filter(Boolean).join(', ');
    const indep = independent.filter((x) => x !== 'Not sure yet');
    const parts = [
      `${firstName} is ${age || 'a few'} years old. This is a home setting — a parent working with their own child, not a classroom.`,
      indep.length > 0
        ? `On their own they happily: ${indep.map((s) => s.toLowerCase()).join(', ')}.`
        : `The parent isn't sure yet what the child does fully independently — they're still finding their feet.`,
      lovesAll ? `Right now they're loving: ${lovesAll.toLowerCase()}.` : '',
      hard ? `When something is hard, they usually ${hard.toLowerCase()}.` : '',
      extra.trim() ? `The parent also shared: ${extra.trim()}` : '',
    ].filter(Boolean);

    try {
      const r = await fetch(`/api/montree/children/${childId}/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: parts.join(' '), classroom_id: classroomId, locale: 'en' }),
      });
      if (!r.ok) throw new Error(`onboard ${r.status}`);
      setStep('photo');
    } catch (err) {
      console.error('[FirstMeeting] onboard failed:', err);
      toast.error("That didn't save — but you can start anyway. Ivy will learn as you go.");
      setStep('photo');
    }
  }, [age, independent, loves, lovesText, hard, extra, childId, classroomId, firstName]);

  const handlePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Dialog cancelled or a bad pick → stay on the photo step (Skip is right
    // there); never silently "complete" as if the photo went through.
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose a photo.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('That photo is too large.'); return; }
    const compressed = await compressImage(file).catch(() => file);
    onComplete(compressed);
  }, [onComplete]);

  const stepNum: Record<Step, number> = { intro: 0, age: 1, independent: 2, loves: 3, hard: 4, extra: 5, thinking: 5, photo: 5 };

  return (
    <div className={`h-full overflow-y-auto px-5 py-6 ${BIO.bg.gradient}`}>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center rounded-full" style={{ width: 46, height: 46, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', boxShadow: BIO.glow.soft }}>
            <span className="text-xl">🌿</span>
          </div>
          {step === 'intro' ? (
            <p className={`mt-3 text-[15px] leading-relaxed ${BIO.text.primary}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
              I&rsquo;m Ivy. I&rsquo;ll be beside you the whole way — one small step at a time, never a lecture. First, tell me a little about {firstName}.
            </p>
          ) : (
            <p className={`mt-2 text-xs ${BIO.text.muted}`}>Getting to know {firstName}</p>
          )}
        </div>

        {step === 'intro' && (
          <div className="text-center">
            <button onClick={() => setStep('age')} className={`px-6 py-2.5 rounded-full text-sm ${BIO.btn.mint}`}>
              Let&rsquo;s begin
            </button>
          </div>
        )}

        {step === 'age' && (
          <div className={`rounded-2xl border ${BIO.border.glow} ${BIO.bg.card} px-4 py-3.5`} style={{ boxShadow: BIO.glow.soft }}>
            <p className={`text-sm m-0 ${BIO.text.primary}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>How old is {firstName}?</p>
            <div className="mt-2.5">
              {AGE_CHIPS.map((a) => (
                <Chip key={a} label={a} selected={age === a} onClick={() => { setAge(a); setStep('independent'); }} />
              ))}
            </div>
          </div>
        )}

        {step === 'independent' && (
          <div className={`rounded-2xl border ${BIO.border.glow} ${BIO.bg.card} px-4 py-3.5`} style={{ boxShadow: BIO.glow.soft }}>
            <p className={`text-sm m-0 ${BIO.text.primary}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>What does {firstName} happily do without your help? Pick any.</p>
            <div className="mt-2.5">
              {INDEPENDENT_CHIPS.map((c) => (
                <Chip key={c} label={c} selected={independent.includes(c)} onClick={() => toggle(independent, setIndependent, c)} />
              ))}
            </div>
            <div className="mt-2 text-right">
              <button onClick={() => setStep('loves')} className={`px-4 py-1.5 rounded-full text-xs ${BIO.btn.mint}`}>Next</button>
            </div>
          </div>
        )}

        {step === 'loves' && (
          <div className={`rounded-2xl border ${BIO.border.glow} ${BIO.bg.card} px-4 py-3.5`} style={{ boxShadow: BIO.glow.soft }}>
            <p className={`text-sm m-0 ${BIO.text.primary}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>What is {firstName} loving right now?</p>
            <div className="mt-2.5">
              {LOVES_CHIPS.map((c) => (
                <Chip key={c} label={c} selected={loves.includes(c)} onClick={() => toggle(loves, setLoves, c)} />
              ))}
            </div>
            <input
              value={lovesText}
              onChange={(e) => setLovesText(e.target.value)}
              placeholder="or in your own words…"
              className={`mt-2 w-full px-3 py-2 rounded-xl border ${BIO.border.dim} ${BIO.bg.cardSolid} ${BIO.text.primary} placeholder:text-white/30 focus:outline-none`}
              style={{ fontSize: 16 }}
            />
            <div className="mt-2.5 text-right">
              <button onClick={() => setStep('hard')} className={`px-4 py-1.5 rounded-full text-xs ${BIO.btn.mint}`}>Next</button>
            </div>
          </div>
        )}

        {step === 'hard' && (
          <div className={`rounded-2xl border ${BIO.border.glow} ${BIO.bg.card} px-4 py-3.5`} style={{ boxShadow: BIO.glow.soft }}>
            <p className={`text-sm m-0 ${BIO.text.primary}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>When something is hard, {firstName} usually…</p>
            <div className="mt-2.5">
              {HARD_CHIPS.map((c) => (
                <Chip key={c} label={c} selected={hard === c} onClick={() => { setHard(c); setStep('extra'); }} />
              ))}
            </div>
          </div>
        )}

        {step === 'extra' && (
          <div className={`rounded-2xl border ${BIO.border.glow} ${BIO.bg.card} px-4 py-3.5`} style={{ boxShadow: BIO.glow.soft }}>
            <p className={`text-sm m-0 ${BIO.text.primary}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>Anything else you&rsquo;d like me to know about {firstName}? Optional.</p>
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              rows={3}
              placeholder="Whatever comes to mind…"
              className={`mt-2.5 w-full px-3 py-2 rounded-xl border ${BIO.border.dim} ${BIO.bg.cardSolid} ${BIO.text.primary} placeholder:text-white/30 resize-none focus:outline-none`}
              style={{ fontSize: 16 }}
            />
            <div className="mt-2 text-right">
              <button onClick={submitProfile} className={`px-5 py-2 rounded-full text-sm ${BIO.btn.mint}`}>Done</button>
            </div>
          </div>
        )}

        {step === 'thinking' && (
          <div className="text-center mt-8">
            <div className="animate-pulse text-3xl mb-3">🌿</div>
            <p className={`text-sm ${BIO.text.secondary}`}>Ivy is getting to know {firstName}…</p>
          </div>
        )}

        {step === 'photo' && (
          <div className={`rounded-2xl border px-4 py-4 text-center`} style={{ borderColor: 'rgba(74,222,128,0.4)', background: 'rgba(255,255,255,0.045)', boxShadow: BIO.glow.medium }}>
            <p className={`text-sm m-0 ${BIO.text.primary}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
              Last one — show me. Snap a photo of {firstName} playing, anything at all.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button onClick={() => fileInputRef.current?.click()} className={`px-5 py-2.5 rounded-full text-sm ${BIO.btn.mint}`}>
                📷 Open camera
              </button>
              <button onClick={() => onComplete()} className={`text-xs ${BIO.text.muted} hover:text-white/60`}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step !== 'intro' && step !== 'thinking' && step !== 'photo' && (
          <p className={`mt-4 text-center text-[11px] ${BIO.text.muted}`}>{stepNum[step]} of 5 · about a minute</p>
        )}

        <input ref={fileInputRef} type="file" accept="image/jpeg,.jpg,.jpeg" capture="environment" className="hidden" onChange={handlePhoto} />
      </div>
    </div>
  );
}
