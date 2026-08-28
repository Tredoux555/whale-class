'use client';

/**
 * Tray 2 — Movable Alphabet, digitised.
 *
 * The child says the word, hunts each SOUND in the scrambled letter bank, and
 * the teacher places it as the child calls it. Clicking the correct grapheme
 * in the bank advances the build; a wrong chip wiggles and stays. Reveal
 * completes the word and celebrates.
 */

import { useEffect, useState } from 'react';
import { speakPhoneme } from '@/lib/montree/dark-phonics/speech';
import type { ActivityWord, LiveActivityState } from '@/lib/montree/dark-phonics/live-activities';

export default function WordBuilder({
  word,
  bank,
  state,
  role,
  onPatch,
}: {
  word: ActivityWord;
  /** Scrambled graphemes for THIS word (deterministic on both surfaces). */
  bank: string[];
  state: LiveActivityState;
  role: 'teacher' | 'parent';
  onPatch?: (patch: Partial<LiveActivityState>) => void;
}) {
  const isTeacher = role === 'teacher';
  const placed = state.revealed ? word.graphemes.length : Math.min(state.step, word.graphemes.length);
  const [wiggle, setWiggle] = useState<number | null>(null);

  // The LITERAL bank chips clicked, in order — value-based scanning would dim
  // the wrong twin tile on double-letter words like "egg" (audit finding 2).
  const [chosen, setChosen] = useState<number[]>([]);
  useEffect(() => {
    setChosen([]); // new word (or word change) = fresh bank
  }, [word.word]);

  // Consumed chips: the actually-clicked indices when we have them (teacher,
  // uninterrupted); otherwise (parent mirror, mid-word refresh, reveal) fall
  // back to first-unused-occurrence per placed grapheme — cosmetically the
  // same count of dimmed tiles.
  const consumed = new Set<number>();
  if (chosen.length === placed && placed > 0 && !state.revealed) {
    for (const i of chosen) consumed.add(i);
  } else {
    for (let p = 0; p < placed; p++) {
      const g = word.graphemes[p];
      for (let b = 0; b < bank.length; b++) {
        if (bank[b] === g && !consumed.has(b)) {
          consumed.add(b);
          break;
        }
      }
    }
  }

  const clickChip = (bankIndex: number) => {
    if (!isTeacher || !onPatch || consumed.has(bankIndex) || placed >= word.graphemes.length) return;
    const expected = word.graphemes[placed];
    if (bank[bankIndex] === expected) {
      speakPhoneme(expected);
      setChosen((c) => (c.length === placed ? [...c, bankIndex] : c));
      onPatch({ step: placed + 1 });
    } else {
      setWiggle(bankIndex);
      window.setTimeout(() => setWiggle(null), 400);
    }
  };

  return (
    <div className="flex flex-col items-center gap-[30px]">
      {/* build slots */}
      <div className="flex items-center gap-[12px]">
        {word.graphemes.map((g, i) => {
          const done = i < placed;
          return (
            <span
              key={i}
              className={[
                'flex h-[104px] min-w-[92px] items-center justify-center rounded-[var(--dpl-r-md)] border-2 px-4',
                done
                  ? 'border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)] text-[var(--dpl-chip-on-ink)]'
                  : 'border-dashed border-[var(--dpl-slide-line)] bg-[var(--dpl-chip-bg)] text-transparent',
              ].join(' ')}
              style={{ fontFamily: 'var(--dpl-font-display)', fontSize: 42, fontWeight: 700 }}
            >
              {done ? g : '·'}
            </span>
          );
        })}
      </div>

      {/* letter bank */}
      <div className="flex flex-wrap items-center justify-center gap-[10px]">
        {bank.map((g, i) => {
          const used = consumed.has(i);
          return (
            <button
              key={i}
              type="button"
              disabled={!isTeacher || used}
              onClick={() => clickChip(i)}
              className={[
                'rounded-[var(--dpl-r-sm)] border px-[18px] py-[10px] text-[30px] font-bold transition-all',
                used
                  ? 'scale-90 border-transparent bg-transparent text-[var(--dpl-slide-ink3)] opacity-30'
                  : 'border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)] text-[var(--dpl-slide-ink)]',
                wiggle === i ? 'translate-x-[3px] rotate-3' : '',
                isTeacher && !used ? 'cursor-pointer hover:-translate-y-[2px]' : '',
              ].join(' ')}
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              {g}
            </button>
          );
        })}
      </div>

      <p className="text-[14px] text-[var(--dpl-slide-ink3)]">
        {placed >= word.graphemes.length
          ? '✨ Read it back!'
          : `What sound comes ${placed === 0 ? 'first' : 'next'}?`}
      </p>
    </div>
  );
}
