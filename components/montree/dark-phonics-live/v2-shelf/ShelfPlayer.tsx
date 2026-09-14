'use client';

/**
 * ShelfPlayer — one lesson's whole shelf, in order.
 *
 * Letter card · Book · Work 1 · Work 2 · Work 3 · Work 4 · Tracing. The order is
 * the order the materials sit on a real shelf, left to right, easiest first —
 * and, like a real shelf, nothing is locked: the strip along the top jumps
 * anywhere, done or not.
 *
 * NOTHING IS SCORED. Every bit of state here is React state in this tab: no
 * percentage, no star, no pass mark. `visited` exists so the strip can show
 * where a child has BEEN, not how well they did.
 *
 * ONE THING IS NOW SAVED, AND ONLY ONE (rule 11 of the Tracking Constitution):
 * finishing a tracked work emits a 'done' signal — child + work key, status
 * 'practicing', source 'digital' — through the one door. It happens ONLY when
 * this player was given a `childId` AND a `letter`; without both, emitDone()
 * writes nothing and this component behaves exactly as it did before (which is
 * every caller today — ParentLedLessons opens the shelf from the family portal,
 * where no child is identified). Nothing is guessed to fill that gap.
 *
 * The tracing workbook deliberately emits NOTHING: it is not one of the five
 * tracked works, so it has no key, and rule 1 says no key, no write.
 *
 * SILENT for now — see v2-shelf/audio.ts.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { BookWorksLesson } from '@/lib/montree/dark-phonics/book-works';
import { getLiveLesson } from '@/lib/montree/dark-phonics/live-lesson';
import { emitDone, shelfWorkKey, type ShelfStageKey } from '@/lib/montree/tracking/done-signal';
import { buildShelfBook } from '@/lib/montree/dark-phonics/v2-shelf/books';
import { tracingBookFrom } from '@/lib/montree/dark-phonics/v2-shelf/tracing-book';
import {
  buildCharactersWork,
  buildWorks,
} from '@/lib/montree/dark-phonics/v2-shelf/works';

import BookReader from './BookReader';
import CharacterStrip from './CharacterStrip';
import LetterCard from './LetterCard';
import MatchWork from './MatchWork';
import ShelfStrip from './ShelfStrip';
import TraceBook from './TraceBook';
import { SHELF_STAGES } from './stages';

export default function ShelfPlayer({
  lesson,
  onClose,
  childId,
  letter,
}: {
  lesson: BookWorksLesson;
  onClose: () => void;
  /**
   * The child working the shelf, when the caller knows who that is. Undefined
   * on every parent-portal / preview surface — and undefined means NOTHING is
   * written, not "write it against somebody".
   */
  childId?: string | null;
  /**
   * The Dark Phonics letter this shelf belongs to (`s`, `ck`, `qu`…), used to
   * build `dp:<letter>:<n>`. Falls back to the lesson's own letter, which is
   * the same value for every letter book on the shelf today; passed explicitly
   * so a caller teaching a second book for a letter can be exact.
   */
  letter?: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<boolean[]>(() =>
    SHELF_STAGES.map((_, i) => i === 0)
  );

  const raw = useMemo(
    () => getLiveLesson(lesson.lessonNumber),
    [lesson.lessonNumber]
  );
  const book = useMemo(() => buildShelfBook(lesson), [lesson]);
  const works = useMemo(() => buildWorks(lesson), [lesson]);
  // The preliminary Characters work stands BESIDE the book, not after it — the
  // child places a character as each page is read. See CharacterStrip.tsx.
  const characters = useMemo(() => buildCharactersWork(lesson), [lesson]);
  // The tracing workbook is the reader with one page swapped, so it is derived
  // from the very book the child has just read — never rebuilt from the lesson.
  const workbook = useMemo(() => tracingBookFrom(book), [book]);

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(SHELF_STAGES.length - 1, i));
    setIndex(next);
    setVisited((v) => (v[next] ? v : v.map((seen, k) => seen || k === next)));
  }, []);

  const next = useCallback(() => go(index + 1), [go, index]);

  /**
   * Report one finished work. Fire-and-forget, and a no-op unless BOTH the
   * child and the key are known — the guard lives in emitDone() so no call site
   * can forget it. A failure never reaches the child's screen.
   */
  const trackedLetter = letter ?? lesson.letter ?? null;
  const reportDone = useCallback(
    (stage: ShelfStageKey) => {
      void emitDone({
        childId,
        workKey: shelfWorkKey(trackedLetter, stage),
        source: 'digital',
      });
    },
    [childId, trackedLetter]
  );

  const stage = SHELF_STAGES[index];

  /**
   * The arrows move along the shelf. They exist because the prev/next buttons
   * that used to sit under the work do not any more — the pips are the whole
   * navigation now, and a grown-up on a keyboard needs a way through that is
   * not a small round target. Ignored while a text field has the focus.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'ArrowRight') go(index + 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  return (
    <div
      className="flex min-h-[100dvh] flex-col gap-[8px] bg-[var(--dpl-bg)] px-[8px] py-[8px] text-[var(--dpl-ink)]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      {/*
        ONE BAR. It used to be three — a title strip, a row of labelled shelf
        buttons, and a prev/next row under the work — which on a tablet in a
        child's hands ate about 190px of the page before the work began. The
        shelf itself is the navigation (pips, tappable in any order, exactly as
        the labelled strip was), so the other two rows had nothing left to do.
        Nothing was removed from the model: `index`, `visited` and `go()` are
        the same state the labelled strip drove.
      */}
      <header className="flex h-[44px] flex-none items-center gap-[8px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[8px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to the shelf"
          className="relative flex h-[30px] w-[30px] flex-none touch-manipulation items-center justify-center rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] text-[var(--dpl-ink2)] after:absolute after:-inset-[6px] after:content-['']"
          style={{ background: 'var(--dpl-timer-bg)' }}
        >
          <svg viewBox="0 0 16 16" className="h-[14px] w-[14px]" aria-hidden focusable="false">
            <path
              d="M10 2 4 8l6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 items-center">
          <ShelfStrip
            compact
            stages={SHELF_STAGES}
            current={index}
            visited={visited}
            onPick={go}
          />
        </div>

        <span className="hidden flex-none whitespace-nowrap text-[10.5px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)] sm:inline">
          Lesson {lesson.lessonNumber} · {lesson.bookTitle}
        </span>
      </header>

      <section
        className="flex min-h-0 flex-1 flex-col gap-[8px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-stage-bg)] p-[var(--dpl-s3)]"
        style={{ boxShadow: 'var(--dpl-stage-shadow)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {stage.key === 'letter' ? (
              <LetterCard
                bookTitle={lesson.bookTitle}
                coverImage={lesson.coverImage}
                letter={raw?.sound ?? lesson.letter}
                catchphrase={raw?.catchphrase}
                onDone={next}
              />
            ) : null}

            {stage.key === 'book' ? (
              /* Work 1 — Characters. The strip IS the work; the reader
                 beside it is the book being read, which is not itself one of
                 the five tracked works and so reports nothing. */
              <CharacterStrip spec={characters} onDone={() => reportDone('characters')}>
                <BookReader book={book} onDone={() => undefined} />
              </CharacterStrip>
            ) : null}

            {'work' in stage ? (
              <WorkStage
                spec={works.find((w) => w.id === stage.work)}
                onDone={() => reportDone(stage.work as ShelfStageKey)}
              />
            ) : null}

            {/* Tracing has no work key (it is not one of the five), so it
                stays silent — see the note at the top of this file. */}
            {stage.key === 'trace' ? (
              <TraceBook book={workbook} onDone={() => undefined} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </section>

    </div>
  );
}

/**
 * One work stage.
 *
 * 🚨 A MISSING WORK SAYS SO. `buildWorks()` returns all four for every lesson
 * on the shelf, so an absent one means the shelf and the builder have gone out
 * of step — and falling back to `works[0]` would answer that by silently
 * teaching Work 1 twice, which looks like a working shelf and is the hardest
 * kind of bug to notice. Better a plain sentence a grown-up can report.
 */
function WorkStage({
  spec,
  onDone,
}: {
  spec?: ReturnType<typeof buildWorks>[number];
  /** Reports Works 2-5 (shelf ids work1..work4) — see done-signal.ts. */
  onDone: () => void;
}) {
  if (!spec) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[6px] text-center">
        <p
          className="text-[14px] font-bold text-[var(--dpl-ink)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          This work is not ready yet
        </p>
        <p className="max-w-[36ch] text-[12px] text-[var(--dpl-ink2)]">
          Everything else on the shelf still works — take the next one along.
        </p>
      </div>
    );
  }
  return <MatchWork key={spec.id} spec={spec} onDone={onDone} />;
}
