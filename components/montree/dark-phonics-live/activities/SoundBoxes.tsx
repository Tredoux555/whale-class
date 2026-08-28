'use client';

/**
 * Tray 1 — Sound Boxes (Elkonin boxes), digitised.
 *
 * The child HEARS the word (never sees it until reveal), says it slowly, and
 * for every sound a counter is pushed into a box. The teacher drives: clicking
 * a box fills up to it, clicking the last filled box takes one back. Reveal
 * drops the graphemes into the boxes so the child maps sound → letters.
 */

import { speakPhoneme } from '@/lib/montree/dark-phonics/speech';
import type { ActivityWord, LiveActivityState } from '@/lib/montree/dark-phonics/live-activities';

export default function SoundBoxes({
  word,
  state,
  role,
  onPatch,
}: {
  word: ActivityWord;
  state: LiveActivityState;
  role: 'teacher' | 'parent';
  onPatch?: (patch: Partial<LiveActivityState>) => void;
}) {
  const boxes = word.graphemes.length;
  const filled = Math.min(state.step, boxes);
  const isTeacher = role === 'teacher';

  const clickBox = (i: number) => {
    if (!isTeacher || !onPatch) return;
    // Clicking box i fills through i; clicking the last filled box empties it.
    onPatch({ step: i + 1 === filled ? filled - 1 : i + 1 });
  };

  return (
    <div className="flex flex-col items-center gap-[26px]">
      <div className="flex items-center gap-[14px]">
        {word.graphemes.map((g, i) => {
          const done = i < filled;
          return (
            <button
              key={i}
              type="button"
              disabled={!isTeacher}
              onClick={() => clickBox(i)}
              className={[
                'relative flex h-[120px] w-[110px] items-center justify-center rounded-[var(--dpl-r-md)] border-2 transition-colors',
                done
                  ? 'border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)]'
                  : 'border-dashed border-[var(--dpl-slide-line)] bg-[var(--dpl-chip-bg)]',
                isTeacher ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
              aria-label={`sound box ${i + 1}${done ? ', filled' : ''}`}
            >
              {state.revealed ? (
                <span
                  className="text-[44px] font-bold text-[var(--dpl-slide-ink)]"
                  style={{ fontFamily: 'var(--dpl-font-display)' }}
                >
                  {g}
                </span>
              ) : done ? (
                <span className="block h-[38px] w-[38px] rounded-full bg-[var(--dpl-slide-accent)] shadow-md" />
              ) : null}
            </button>
          );
        })}
      </div>

      {state.revealed ? (
        <div className="flex items-center gap-[10px]">
          {word.graphemes.map((g, i) => (
            <button
              key={i}
              type="button"
              onClick={() => speakPhoneme(g)}
              className="rounded-full border border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] px-[14px] py-[6px] text-[15px] font-semibold text-[var(--dpl-slide-ink2)]"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              /{g}/ 🔊
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[14px] text-[var(--dpl-slide-ink3)]">
          {filled === 0
            ? 'Listen… say it slowly… how many sounds?'
            : `${filled} sound${filled === 1 ? '' : 's'} so far`}
        </p>
      )}
    </div>
  );
}
