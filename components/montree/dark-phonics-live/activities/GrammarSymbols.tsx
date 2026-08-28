'use client';

/**
 * Tray 8 — Grammar Symbols, digitised. A game first, a material second.
 *
 * The sentence comes from the child's OWN work when it can: a sentence laid
 * on Tray 5 carries over (the teacher switches trays and the line follows).
 * Otherwise the decodable sentence bank supplies one. The child reads it,
 * puts the black triangle on the naming word, the red circle on the doing
 * word (blue triangle for describing); tapping a word cycles its symbol.
 * Reveal lifts the CONTROL CARD — the same sentence with its symbols already
 * placed — so the child checks himself, not the teacher.
 *
 * Synced cursor: `wordIndex` = bank sentence, `laid`/`punct` = carried Tray-5
 * sentence (wins when present), `marks` = symbol per word, `revealed` = card.
 */

import { speakSentence, speakWord } from '@/lib/montree/dark-phonics/speech';
import { PUNCTUATION_TILES, WORD_CLASSES, type WordClass } from '@/lib/montree/dark-phonics/writing-shelf-language';
import type { LiveActivityState, WritingShelfActivity } from '@/lib/montree/dark-phonics/live-activities';

/** Mark values: 0 none · 1 naming · 2 doing · 3 describing. */
const MARK_FOR_CLASS: Record<WordClass, number> = { naming: 1, doing: 2, describing: 3, little: 0 };

function classOf(word: string): WordClass | null {
  return WORD_CLASSES[word === 'I' ? 'I' : word.toLowerCase()] ?? null;
}

export default function GrammarSymbols({
  activity,
  state,
  role,
  onPatch,
}: {
  activity: WritingShelfActivity;
  state: LiveActivityState;
  role: 'teacher' | 'parent';
  onPatch?: (patch: Partial<LiveActivityState>) => void;
}) {
  const isTeacher = role === 'teacher';
  const bank = activity.sentences ?? [];
  const tin = activity.tin;

  // The child's own Tray-5 sentence wins; the bank is the fallback.
  const laid = (state.laid ?? []).filter((i) => tin && i < tin.all.length);
  const fromTray5 = tin && laid.length > 0;
  const words = fromTray5
    ? laid.map((i) => tin.all[i].word)
    : bank[Math.min(state.wordIndex, Math.max(bank.length - 1, 0))]?.words ?? [];
  const punct = fromTray5
    ? PUNCTUATION_TILES[Math.min(state.punct ?? 0, 3)]
    : bank[Math.min(state.wordIndex, Math.max(bank.length - 1, 0))]?.punct ?? '.';

  if (words.length === 0) return null;

  const marks = words.map((_, i) => state.marks?.[i] ?? 0);

  const cycle = (i: number) => {
    if (!isTeacher || !onPatch) return;
    speakWord(words[i]);
    const next = [...marks];
    next[i] = (next[i] + 1) % 4;
    onPatch({ marks: next });
  };

  return (
    <div className="flex w-full flex-col items-center gap-[24px]">
      {fromTray5 ? (
        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-slide-accent)]">
          his own sentence, from tray 5
        </span>
      ) : null}

      {/* the sentence, a symbol slot above every word */}
      <div className="flex flex-wrap items-end justify-center gap-[14px]">
        {words.map((word, i) => (
          <div key={`${word}-${i}`} className="flex flex-col items-center gap-[8px]">
            <span className="flex h-[46px] items-end justify-center">
              <Symbol mark={marks[i]} />
            </span>
            <button
              type="button"
              disabled={!isTeacher}
              onClick={() => cycle(i)}
              className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)] px-[16px] py-[10px] text-[28px] font-bold text-[var(--dpl-slide-ink)]"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              {word}
            </button>
            {state.revealed ? (
              <span className="flex h-[36px] items-start justify-center opacity-90">
                <Symbol mark={MARK_FOR_CLASS[classOf(word) ?? 'little']} small />
              </span>
            ) : null}
          </div>
        ))}
        <span className="pb-[10px] text-[28px] font-bold text-[var(--dpl-slide-ink)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
          {punct}
        </span>
      </div>

      {state.revealed ? (
        <p className="text-[12.5px] text-[var(--dpl-slide-ink3)]">
          ⬆ your symbols · control card below each word ⬇ — he lifts the card to check, not you
        </p>
      ) : null}

      <div className="flex items-center gap-[10px]">
        <button
          type="button"
          onClick={() => speakSentence(words.join(' ') + punct)}
          className="rounded-full border border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] px-[16px] py-[8px] text-[13px] font-semibold text-[var(--dpl-slide-ink2)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          🔊 Read the sentence
        </button>
        <Legend />
      </div>
    </div>
  );
}

/** The Montessori symbols: black triangle, red circle, small blue triangle. */
function Symbol({ mark, small }: { mark: number; small?: boolean }) {
  const s = small ? 22 : 34;
  if (mark === 1) {
    return (
      <svg width={s} height={s} viewBox="0 0 34 34" aria-label="naming word">
        <polygon points="17,3 32,31 2,31" fill="#1b1720" />
      </svg>
    );
  }
  if (mark === 2) {
    return (
      <svg width={s} height={s} viewBox="0 0 34 34" aria-label="doing word">
        <circle cx="17" cy="17" r="14" fill="#D64545" />
      </svg>
    );
  }
  if (mark === 3) {
    const t = small ? 16 : 24;
    return (
      <svg width={t} height={t} viewBox="0 0 34 34" aria-label="describing word">
        <polygon points="17,3 32,31 2,31" fill="#2C4FA3" />
      </svg>
    );
  }
  return <span className="block h-[10px] w-[10px] rounded-full border border-dashed border-[var(--dpl-slide-line)]" />;
}

function Legend() {
  return (
    <span className="flex items-center gap-[10px] text-[11px] text-[var(--dpl-slide-ink3)]">
      <span className="flex items-center gap-[4px]"><Symbol mark={1} small /> naming</span>
      <span className="flex items-center gap-[4px]"><Symbol mark={2} small /> doing</span>
      <span className="flex items-center gap-[4px]"><Symbol mark={3} small /> describing</span>
    </span>
  );
}
