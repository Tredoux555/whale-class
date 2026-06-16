// components/montree/home/StepCard.tsx
// The hand-held Step Card — the centerpiece of the home loop. Ivy chooses the
// one next work; this is how the parent actually does it tonight. Presentational
// only (data comes from the companion route's `step_card` SSE event).
'use client';

import { useState } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';

export interface StepCardData {
  work_name: string;
  area_label: string;
  why_now: string;
  what_you_need: string[];
  set_it_up: string[];
  show_it: string[];
  say: string[];
  dont_say: string[];
  yes_looks_like: string[];
  not_yet_looks_like: string[];
  is_template?: boolean;
}

function Section({ icon, title, items, ordered, tone }: {
  icon: string; title: string; items: string[]; ordered?: boolean; tone?: 'good' | 'gentle' | 'warn';
}) {
  if (!items || items.length === 0) return null;
  const titleColor = tone === 'good' ? BIO.text.mint : tone === 'warn' ? BIO.text.amber : BIO.text.secondary;
  return (
    <div className="mt-3.5">
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${titleColor}`}>
        <span className="text-sm">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="mt-1.5 space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            {ordered ? (
              <span className={`shrink-0 w-5 h-5 rounded-full ${BIO.bg.mintSubtle} ${BIO.text.mint} text-[11px] font-bold flex items-center justify-center mt-0.5`}>{i + 1}</span>
            ) : (
              <span className={`shrink-0 mt-2 w-1.5 h-1.5 rounded-full`} style={{ background: tone === 'warn' ? BIO.amber : BIO.mint, opacity: 0.7 }} />
            )}
            <p className={`text-[13px] leading-relaxed ${BIO.text.primary}`}>{it}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StepCard({ card }: { card: StepCardData }) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={`rounded-2xl border ${BIO.border.glow} ${BIO.bg.cardSolid} overflow-hidden`}
      style={{ boxShadow: BIO.glow.medium }}
    >
      {/* Header */}
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${BIO.bg.mintSubtle} ${BIO.text.mint}`}>
            Next step
          </span>
          <span className={`text-[10px] uppercase tracking-wider ${BIO.text.muted}`}>{card.area_label}</span>
          <span className={`ml-auto ${BIO.text.muted} text-xs`}>{open ? '▾' : '▸'}</span>
        </div>
        <h3 className={`mt-1.5 text-base font-semibold ${BIO.text.primary}`}>{card.work_name}</h3>
        {card.why_now && (
          <p className={`mt-1 text-[13px] leading-relaxed ${BIO.text.secondary}`}>{card.why_now}</p>
        )}
      </button>

      {open && (
        <div className={`px-4 pb-4 border-t ${BIO.border.subtle} pt-1`}>
          <Section icon="🧺" title="What you'll need" items={card.what_you_need} />
          <Section icon="🌿" title="Set it up" items={card.set_it_up} ordered />
          <Section icon="👐" title="Show it — slowly, few words" items={card.show_it} ordered />
          <Section icon="💬" title="What to say" items={card.say} />
          <Section icon="🤫" title="Better not to" items={card.dont_say} tone="warn" />
          <Section icon="✅" title="It landed when…" items={card.yes_looks_like} tone="good" />
          <Section icon="🌱" title="Not yet — and that's okay" items={card.not_yet_looks_like} tone="gentle" />
          <p className={`mt-4 text-[11px] ${BIO.text.muted}`}>
            When you&apos;ve tried it, tell me how it went — a word or a photo. I&apos;ll take it from there.
          </p>
        </div>
      )}
    </div>
  );
}
