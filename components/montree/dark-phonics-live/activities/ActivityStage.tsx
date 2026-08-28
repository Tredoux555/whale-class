'use client';

/**
 * ActivityStage — the Writing Shelf tray currently on the live stage.
 *
 * Shared presenter for BOTH classroom surfaces (same contract as Stage): the
 * teacher passes `onPatch` and drives; the parent passes nothing and mirrors.
 * Content is derived deterministically from the lesson number on each side —
 * only the cursor (wordIndex/step/revealed/sayNonce + the shelf-2 fields
 * laid/punct/order/marks/text) crosses the wire.
 *
 * TTS: the teacher's "Say it" on the word trays both speaks locally AND bumps
 * `sayNonce`; the parent surface watches the nonce and speaks the same word
 * there (~2s later, after at least one user gesture — joining the call — has
 * unlocked audio). The composition trays (5–8) carry their own 🔊 buttons,
 * which always speak locally on whichever screen is tapped.
 */

import { useEffect, useRef } from 'react';

import SoundBoxes from '@/components/montree/dark-phonics-live/activities/SoundBoxes';
import WordBuilder from '@/components/montree/dark-phonics-live/activities/WordBuilder';
import WordChains from '@/components/montree/dark-phonics-live/activities/WordChains';
import Dictation from '@/components/montree/dark-phonics-live/activities/Dictation';
import SentenceBuilder from '@/components/montree/dark-phonics-live/activities/SentenceBuilder';
import StoryBooks from '@/components/montree/dark-phonics-live/activities/StoryBooks';
import AuthorsChair from '@/components/montree/dark-phonics-live/activities/AuthorsChair';
import GrammarSymbols from '@/components/montree/dark-phonics-live/activities/GrammarSymbols';
import { speakSlow, speakWord } from '@/lib/montree/dark-phonics/speech';
import type { LiveActivityState, WritingShelfActivity } from '@/lib/montree/dark-phonics/live-activities';

export interface ActivityStageProps {
  activity: WritingShelfActivity;
  state: LiveActivityState;
  role: 'teacher' | 'parent';
  /** Teacher only — merge a partial cursor into the synced activity state. */
  onPatch?: (patch: Partial<LiveActivityState>) => void;
}

/** Trays whose main object is a WORD LIST (shelf 1). */
const WORD_TRAYS = new Set(['sound-boxes', 'word-builder', 'word-chains', 'dictation']);

export default function ActivityStage({ activity, state, role, onPatch }: ActivityStageProps) {
  const isTeacher = role === 'teacher';
  const words = activity.words;
  const isChain = activity.type === 'word-chains';
  const isWordTray = WORD_TRAYS.has(activity.type);
  const wordIndex = Math.min(Math.max(state.wordIndex, 0), Math.max(words.length - 1, 0));
  const current = isChain
    ? words[Math.max(0, Math.min(state.step, words.length - 1))]
    : isWordTray
      ? words[wordIndex]
      : undefined;

  /* Parent surface: speak when the teacher fires TTS on a word tray. */
  const lastNonce = useRef<number | null>(null);
  useEffect(() => {
    if (isTeacher) return;
    if (lastNonce.current === null) {
      lastNonce.current = state.sayNonce; // never speak on mount/join
      return;
    }
    if (state.sayNonce !== lastNonce.current) {
      lastNonce.current = state.sayNonce;
      if (current) speakWord(current.word);
    }
  }, [state.sayNonce, isTeacher, current]);

  const say = () => {
    if (current) speakWord(current.word);
    onPatch?.({ sayNonce: state.sayNonce + 1 });
  };

  const goWord = (delta: number, resetExtras = true) => {
    const listLength =
      activity.type === 'story-books'
        ? activity.sequences?.length ?? 0
        : activity.type === 'grammar-symbols'
          ? activity.sentences?.length ?? 0
          : words.length;
    const next = Math.min(Math.max(state.wordIndex + delta, 0), Math.max(listLength - 1, 0));
    if (next === state.wordIndex) return;
    onPatch?.({
      wordIndex: next,
      step: 0,
      revealed: false,
      ...(resetExtras ? { order: [], marks: [] } : {}),
    });
  };

  const progress = (() => {
    switch (activity.type) {
      case 'word-chains':
        return `link ${Math.min(state.step + 1, words.length)} / ${words.length}`;
      case 'sentence-builder':
        return `${(state.laid ?? []).length} on the line`;
      case 'story-books':
        return `set ${Math.min(state.wordIndex + 1, activity.sequences?.length ?? 1)} / ${activity.sequences?.length ?? 1}`;
      case 'authors-chair':
        return state.text ? `${state.text.trim().split(/\s+/).filter(Boolean).length} words told` : 'listening';
      case 'grammar-symbols':
        return (state.laid ?? []).length > 0
          ? 'his own sentence'
          : `sentence ${Math.min(state.wordIndex + 1, activity.sentences?.length ?? 1)} / ${activity.sentences?.length ?? 1}`;
      default:
        return `word ${wordIndex + 1} / ${words.length}`;
    }
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[18px]">
      {/* tray header */}
      <div className="flex items-center gap-[12px]">
        <span
          className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-[var(--dpl-slide-accent)] text-[15px] font-bold text-[var(--dpl-slide-accent)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          {activity.trayNumber}
        </span>
        <div className="min-w-0">
          <div
            className="text-[16px] font-bold text-[var(--dpl-slide-ink)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            {activity.title}
            <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--dpl-slide-ink3)]">
              Writing Shelf · {progress}
            </span>
          </div>
          {isTeacher ? (
            <div className="truncate text-[12px] italic text-[var(--dpl-slide-ink3)]">“{activity.script}”</div>
          ) : null}
        </div>
      </div>

      {/* tray body */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto">
        <TrayBody activity={activity} current={current} wordIndex={wordIndex} state={state} role={role} onPatch={onPatch} />
      </div>

      {/* teacher controls */}
      {isTeacher ? (
        <div className="flex flex-wrap items-center justify-center gap-[8px]">
          <TrayControls
            activity={activity}
            state={state}
            wordIndex={wordIndex}
            words={words}
            onPatch={onPatch}
            onSay={say}
            onGoWord={goWord}
            currentWord={current?.word}
          />
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TrayControls({
  activity,
  state,
  wordIndex,
  words,
  onPatch,
  onSay,
  onGoWord,
  currentWord,
}: {
  activity: WritingShelfActivity;
  state: LiveActivityState;
  wordIndex: number;
  words: WritingShelfActivity['words'];
  onPatch?: (patch: Partial<LiveActivityState>) => void;
  onSay: () => void;
  onGoWord: (delta: number) => void;
  currentWord?: string;
}) {
  switch (activity.type) {
    case 'word-chains':
      return (
        <>
          <Ctl label="◀ Back a link" onClick={() => onPatch?.({ step: Math.max(0, state.step - 1) })} disabled={state.step <= 0} />
          <Ctl
            label="Next link ▶"
            onClick={() => onPatch?.({ step: Math.min(words.length - 1, state.step + 1) })}
            disabled={state.step >= words.length - 1}
            accent
          />
          <Ctl label="🔊 Say it" onClick={onSay} />
          <Ctl label="🐌 Slowly" onClick={() => currentWord && speakSlow(currentWord)} />
        </>
      );
    case 'sentence-builder':
      return (
        <Ctl
          label="Clear the line"
          onClick={() => onPatch?.({ laid: [], punct: 0 })}
          disabled={(state.laid ?? []).length === 0 && !(state.punct ?? 0)}
        />
      );
    case 'story-books':
      return (
        <>
          <Ctl label="◀ Prev set" onClick={() => onGoWord(-1)} disabled={state.wordIndex <= 0} />
          <Ctl
            label="Next set ▶"
            onClick={() => onGoWord(1)}
            disabled={state.wordIndex >= (activity.sequences?.length ?? 1) - 1}
            accent
          />
          <Ctl label="Start the story over" onClick={() => onPatch?.({ order: [] })} disabled={(state.order ?? []).length === 0} />
        </>
      );
    case 'authors-chair':
      return (
        <Ctl label="New story" onClick={() => onPatch?.({ text: '' })} disabled={!(state.text ?? '').length} />
      );
    case 'grammar-symbols': {
      const hasOwnSentence = (state.laid ?? []).length > 0;
      return (
        <>
          {!hasOwnSentence ? (
            <>
              <Ctl label="◀ Prev sentence" onClick={() => onGoWord(-1)} disabled={state.wordIndex <= 0} />
              <Ctl
                label="Next sentence ▶"
                onClick={() => onGoWord(1)}
                disabled={state.wordIndex >= (activity.sentences?.length ?? 1) - 1}
                accent
              />
            </>
          ) : (
            <Ctl label="Use bank sentences" onClick={() => onPatch?.({ laid: [], punct: 0, marks: [], revealed: false })} />
          )}
          <Ctl
            label={state.revealed ? 'Hide control card' : 'Control card ✨'}
            onClick={() => onPatch?.({ revealed: !state.revealed })}
          />
          <Ctl label="Clear symbols" onClick={() => onPatch?.({ marks: [] })} disabled={!(state.marks ?? []).some(Boolean)} />
        </>
      );
    }
    default:
      // shelf 1 word trays: sound-boxes, word-builder, dictation
      return (
        <>
          <Ctl label="◀ Prev" onClick={() => onGoWord(-1)} disabled={wordIndex <= 0} />
          <Ctl label="Next word ▶" onClick={() => onGoWord(1)} disabled={wordIndex >= words.length - 1} accent />
          <Ctl label={state.revealed ? 'Hide answer' : 'Reveal ✨'} onClick={() => onPatch?.({ revealed: !state.revealed })} />
          <Ctl label="🔊 Say it" onClick={onSay} />
          <Ctl label="🐌 Slowly" onClick={() => currentWord && speakSlow(currentWord)} />
        </>
      );
  }
}

function TrayBody({
  activity,
  current,
  wordIndex,
  state,
  role,
  onPatch,
}: {
  activity: WritingShelfActivity;
  current: WritingShelfActivity['words'][number] | undefined;
  wordIndex: number;
  state: LiveActivityState;
  role: 'teacher' | 'parent';
  onPatch?: (patch: Partial<LiveActivityState>) => void;
}) {
  switch (activity.type) {
    case 'sound-boxes':
      return current ? <SoundBoxes word={current} state={state} role={role} onPatch={onPatch} /> : null;
    case 'word-builder':
      return current ? (
        <WordBuilder
          word={current}
          bank={activity.letterBanks?.[wordIndex] ?? current.graphemes}
          state={state}
          role={role}
          onPatch={onPatch}
        />
      ) : null;
    case 'word-chains':
      return <WordChains chain={activity.words} state={state} role={role} />;
    case 'dictation':
      return current ? <Dictation word={current} state={state} role={role} /> : null;
    case 'sentence-builder':
      return <SentenceBuilder activity={activity} state={state} role={role} onPatch={onPatch} />;
    case 'story-books':
      return <StoryBooks activity={activity} state={state} role={role} onPatch={onPatch} />;
    case 'authors-chair':
      return <AuthorsChair state={state} role={role} onPatch={onPatch} />;
    case 'grammar-symbols':
      return <GrammarSymbols activity={activity} state={state} role={role} onPatch={onPatch} />;
  }
}

function Ctl({
  label,
  onClick,
  disabled,
  accent,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-[var(--dpl-r-sm)] border px-[14px] py-[8px] text-[12px] font-semibold transition-opacity disabled:opacity-40',
        accent
          ? 'border-[var(--dpl-slide-accent)] bg-[var(--dpl-slide-accent)] text-[var(--dpl-slide-on-accent)]'
          : 'border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] text-[var(--dpl-slide-ink2)]',
      ].join(' ')}
      style={{ fontFamily: 'var(--dpl-font-display)' }}
    >
      {label}
    </button>
  );
}
