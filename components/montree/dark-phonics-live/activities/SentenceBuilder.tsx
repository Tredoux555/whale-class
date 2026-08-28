'use client';

/**
 * Tray 5 — Sentence Builder, digitised.
 *
 * FREE composition, not a scrambled-target puzzle: the word tin (sorted
 * naming / doing / little+describing, exactly like the physical compartments)
 * feeds a sentence line; the sentence ends with a punctuation tile; the
 * control of error is READING IT BACK (the 🔊 button speaks the line).
 * Then the pencil: the child copies the finished line onto a paper strip.
 *
 * Synced cursor: `laid` = indices into tin.all, `punct` = tile index.
 */

import { speakSentence, speakWord } from '@/lib/montree/dark-phonics/speech';
import { PUNCTUATION_TILES } from '@/lib/montree/dark-phonics/writing-shelf-language';
import type { LiveActivityState, WritingShelfActivity } from '@/lib/montree/dark-phonics/live-activities';

export function laidSentenceText(
  tin: NonNullable<WritingShelfActivity['tin']>,
  laid: number[],
  punct: number
): string {
  const words = laid.map((i) => tin.all[i]?.word).filter(Boolean);
  if (words.length === 0) return '';
  return words.join(' ') + (PUNCTUATION_TILES[punct] ?? '');
}

export default function SentenceBuilder({
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
  const tin = activity.tin;
  if (!tin) return null;
  const isTeacher = role === 'teacher';
  const laid = (state.laid ?? []).filter((i) => i < tin.all.length);
  const punct = Math.min(state.punct ?? 0, PUNCTUATION_TILES.length - 1);

  const addWord = (tinIndex: number) => {
    if (!isTeacher || !onPatch || laid.length >= 12) return;
    speakWord(tin.all[tinIndex].word);
    onPatch({ laid: [...laid, tinIndex] });
  };

  const removeAt = (pos: number) => {
    if (!isTeacher || !onPatch) return;
    onPatch({ laid: laid.filter((_, i) => i !== pos) });
  };

  const setPunct = (i: number) => {
    if (!isTeacher || !onPatch) return;
    onPatch({ punct: i === punct ? 0 : i });
  };

  const sentence = laidSentenceText(tin, laid, punct);

  return (
    <div className="flex w-full flex-col gap-[22px]">
      {/* ---- the sentence line ---- */}
      <div className="flex min-h-[92px] flex-wrap items-center gap-[10px] rounded-[var(--dpl-r-md)] border-b-4 border-[var(--dpl-slide-line)] bg-[var(--dpl-trace-bg)] px-[16px] py-[14px]">
        {laid.length === 0 ? (
          <span className="text-[14px] italic text-[var(--dpl-slide-ink3)]">
            the sentence line — lay your words here, no pencil yet
          </span>
        ) : (
          laid.map((tinIndex, pos) => (
            <button
              key={`${tinIndex}-${pos}`}
              type="button"
              disabled={!isTeacher}
              onClick={() => removeAt(pos)}
              title={isTeacher ? 'tap to take this word off the line' : undefined}
              className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)] px-[16px] py-[10px] text-[26px] font-bold text-[var(--dpl-slide-ink)]"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              {tin.all[tinIndex].word}
            </button>
          ))
        )}
        {punct > 0 ? (
          <span
            className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)] px-[14px] py-[10px] text-[26px] font-bold text-[var(--dpl-chip-on-ink)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            {PUNCTUATION_TILES[punct]}
          </span>
        ) : null}
        {sentence ? (
          <button
            type="button"
            onClick={() => speakSentence(sentence)}
            className="ml-auto rounded-full border border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] px-[14px] py-[8px] text-[13px] font-semibold text-[var(--dpl-slide-ink2)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            🔊 Read it back
          </button>
        ) : null}
      </div>

      {/* ---- the word tin, three compartments ---- */}
      <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-3">
        <TinCompartment label="things" words={tin.naming.map((w) => w.word)} tin={tin} onPick={addWord} isTeacher={isTeacher} />
        <TinCompartment
          label="what they do"
          words={tin.doing.map((w) => w.word)}
          tin={tin}
          onPick={addWord}
          isTeacher={isTeacher}
        />
        <TinCompartment
          label="little words"
          words={[...tin.little, ...tin.describing].map((w) => w.word)}
          tin={tin}
          onPick={addWord}
          isTeacher={isTeacher}
        />
      </div>

      {/* ---- punctuation tiles ---- */}
      <div className="flex items-center justify-center gap-[10px]">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-slide-ink3)]">end it:</span>
        {PUNCTUATION_TILES.slice(1).map((tile, i) => (
          <button
            key={tile}
            type="button"
            disabled={!isTeacher}
            onClick={() => setPunct(i + 1)}
            className={[
              'h-[52px] w-[52px] rounded-[var(--dpl-r-sm)] border-2 text-[26px] font-bold',
              punct === i + 1
                ? 'border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)] text-[var(--dpl-chip-on-ink)]'
                : 'border-[var(--dpl-slide-line)] bg-[var(--dpl-chip-bg)] text-[var(--dpl-slide-ink)]',
            ].join(' ')}
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            {tile}
          </button>
        ))}
        <span className="ml-3 text-[12px] text-[var(--dpl-slide-ink3)]">
          {sentence
            ? punct > 0
              ? 'Read it aloud, finger under each word — then copy it onto a strip.'
              : 'Every sentence ends with a mark!'
            : ''}
        </span>
      </div>
    </div>
  );
}

function TinCompartment({
  label,
  words,
  tin,
  onPick,
  isTeacher,
}: {
  label: string;
  words: string[];
  tin: NonNullable<WritingShelfActivity['tin']>;
  onPick: (tinIndex: number) => void;
  isTeacher: boolean;
}) {
  return (
    <div className="flex min-h-[120px] flex-col gap-[8px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] p-[10px]">
      <span className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--dpl-slide-ink3)]">{label}</span>
      <div className="flex max-h-[168px] flex-wrap content-start gap-[6px] overflow-y-auto">
        {words.map((word) => {
          const tinIndex = tin.all.findIndex((w) => w.word === word);
          return (
            <button
              key={word}
              type="button"
              disabled={!isTeacher}
              onClick={() => onPick(tinIndex)}
              className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)] px-[10px] py-[6px] text-[17px] font-semibold text-[var(--dpl-slide-ink)] hover:-translate-y-[1px]"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              {word}
            </button>
          );
        })}
      </div>
    </div>
  );
}
