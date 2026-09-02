'use client';

/**
 * ShelfPlayer — one lesson's whole shelf, in order.
 *
 * Letter card · Book · Work 1 · Work 2 · Work 3 · Work 4 · Tracing. The order is
 * the order the materials sit on a real shelf, left to right, easiest first —
 * and, like a real shelf, nothing is locked: the strip along the top jumps
 * anywhere, done or not.
 *
 * NOTHING IS SAVED AND NOTHING IS SCORED. Every bit of state here is React
 * state in this tab. There is no server write, no progress row, no percentage
 * and no star. `visited` exists so the strip can show where a child has BEEN,
 * not how well they did.
 *
 * SILENT for now — see v2-shelf/audio.ts.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useMemo, useState } from 'react';

import type { BookWorksLesson } from '@/lib/montree/dark-phonics/book-works';
import { getLiveLesson } from '@/lib/montree/dark-phonics/live-lesson';
import { buildShelfBook } from '@/lib/montree/dark-phonics/v2-shelf/books';
import { tracingBookFrom } from '@/lib/montree/dark-phonics/v2-shelf/tracing-book';
import { buildWorks } from '@/lib/montree/dark-phonics/v2-shelf/works';

import BookReader from './BookReader';
import LetterCard from './LetterCard';
import MatchWork from './MatchWork';
import ShelfStrip from './ShelfStrip';
import TraceBook from './TraceBook';
import { SHELF_STAGES } from './stages';

export default function ShelfPlayer({
  lesson,
  onClose,
}: {
  lesson: BookWorksLesson;
  onClose: () => void;
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
  // The tracing workbook is the reader with one page swapped, so it is derived
  // from the very book the child has just read — never rebuilt from the lesson.
  const workbook = useMemo(() => tracingBookFrom(book), [book]);

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(SHELF_STAGES.length - 1, i));
    setIndex(next);
    setVisited((v) => (v[next] ? v : v.map((seen, k) => seen || k === next)));
  }, []);

  const next = useCallback(() => go(index + 1), [go, index]);

  const stage = SHELF_STAGES[index];
  const atEnd = index === SHELF_STAGES.length - 1;

  return (
    <div
      className="flex min-h-[100dvh] flex-col gap-[10px] bg-[var(--dpl-bg)] px-[12px] py-[12px] text-[var(--dpl-ink)]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      <div className="flex flex-none flex-wrap items-center gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[12px] py-[8px]">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
          Shelf · Lesson {lesson.lessonNumber} · {lesson.bookTitle}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto min-h-[40px] rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[12px] py-[7px] text-[11px] font-semibold text-[var(--dpl-ink2)]"
          style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
        >
          Back to the shelf
        </button>
      </div>

      <div className="flex-none">
        <ShelfStrip
          stages={SHELF_STAGES}
          current={index}
          visited={visited}
          onPick={go}
        />
      </div>

      <section
        className="flex min-h-0 flex-1 flex-col gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-stage-bg)] p-[var(--dpl-s3)]"
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
              <BookReader book={book} onDone={() => undefined} />
            ) : null}

            {'work' in stage ? (
              <WorkStage spec={works.find((w) => w.id === stage.work)} />
            ) : null}

            {stage.key === 'trace' ? (
              <TraceBook book={workbook} onDone={() => undefined} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </section>

      <div className="flex flex-none items-center justify-between gap-[10px]">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="min-h-[56px] rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[20px] text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--dpl-ink2)] disabled:opacity-35"
          style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={atEnd ? onClose : next}
          className="min-h-[56px] rounded-[var(--dpl-r-sm)] px-[26px] text-[12px] font-bold uppercase tracking-[0.12em]"
          style={{
            background: 'var(--dpl-accent)',
            color: 'var(--dpl-accent-ink)',
            fontFamily: 'var(--dpl-font-display)',
          }}
        >
          {atEnd ? 'Finish' : 'Next'}
        </button>
      </div>
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
function WorkStage({ spec }: { spec?: ReturnType<typeof buildWorks>[number] }) {
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
  return <MatchWork key={spec.id} spec={spec} onDone={() => undefined} />;
}
