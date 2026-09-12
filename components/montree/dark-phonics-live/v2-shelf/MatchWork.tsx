'use client';

/**
 * MatchWork — all four manipulative works, one component.
 *
 * The four printed works differ only in WHICH cells are printed and WHICH are
 * cut out (see lib/montree/dark-phonics/v2-shelf/works.ts, which reads the PDF
 * pipeline and turns each one into slots + pieces). So there is one interaction
 * here, not four — and since 2026-09-02 that interaction lives in
 * ./work-engine.tsx, shared with the preliminary Characters work, so a fix to
 * the drag is a fix to the whole shelf. Read that file's header for the pile,
 * the measured geometry and the acceptance rule; this file is the FRAME the
 * four printed works stand in: a pile tray on the left, the working sheet on
 * the right, a Start button over the presentation and a control card.
 */

import { motion } from 'framer-motion';

import type { WorkSpec } from '@/lib/montree/dark-phonics/v2-shelf/works';

import ControlCard from './ControlCard';
import {
  useWorkBoard,
  WorkAnswerPieces,
  WorkGrid,
  WorkPieceLayer,
  type Rect,
} from './work-engine';

/**
 * The pile tray, in both postures — ONE function, called by the live stage and
 * by the control board, because those two must land on the same pixels. It
 * used to be a class string copied into both with a "change one, change the
 * other" note above it; the cast widening from four cards to seven is exactly
 * the kind of edit that note loses.
 *
 * 🚨 THE WIDTH IS A BUDGET FOR CARDS, NOT A TASTE, so it grows with how many
 * there are. A four-row picture match scatters 8 cards; the-mat's SEVEN-row
 * free builder scatters closer to 50, and a tray cut for the small pile packs
 * the big one down to crumbs. packPile() re-bisects against whatever rectangle
 * it is handed, so widening the tray is the whole fix — nothing else has to
 * know the count. The grid keeps the rest, and never less than half the stage.
 *
 * (Both literals are written out in full so Tailwind's scanner can see them.)
 */
function pileTrayClass(pieceCount: number): string {
  const width =
    pieceCount > 24
      ? 'sm:w-[42%]'
      : pieceCount > 12
        ? 'sm:w-[38%]'
        : 'sm:w-[34%]';
  return `h-[clamp(110px,24vh,210px)] flex-none rounded-[8px] border border-dashed sm:h-auto sm:min-w-[150px] ${width}`;
}

/**
 * The control of error: the work, finished.
 *
 * The layout below repeats the live stage's own flex line, because the finished
 * board must land on exactly the pixels the live one occupies. The one thing
 * that could silently drift — the pile tray, whose width now depends on how
 * many cards the work has — is shared as `pileTrayClass()` rather than copied.
 */
function AnswerBoard({
  spec,
  slotRects,
}: {
  spec: WorkSpec;
  slotRects: Record<string, Rect>;
}) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col gap-[8px] p-[10px] sm:flex-row"
      style={{ background: 'var(--dpl-slide-bg)', color: 'var(--dpl-slide-ink)' }}
    >
      <div
        className={pileTrayClass(spec.pieces.length)}
        style={{ borderColor: 'var(--dpl-slide-line)' }}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <WorkGrid spec={spec} slotRects={slotRects} />
      </div>
      <WorkAnswerPieces spec={spec} slotRects={slotRects} />
    </div>
  );
}

export default function MatchWork({
  spec,
  onDone,
}: {
  spec: WorkSpec;
  /** The child has rebuilt the whole work. */
  onDone: () => void;
}) {
  // Destructured rather than kept as one object: `board` carries the callback
  // refs the stage and the pile are mounted with, and reading those off an
  // object during render is exactly what react-hooks/refs asks you not to do.
  const board = useWorkBoard(spec, { onDone });
  const {
    setStage,
    setPile,
    registerSlot,
    slotRects,
    phase,
    showAnswer,
    remaining,
    start,
  } = board;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[8px]">
      <header className="flex flex-none flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
        <h2
          className="text-[14px] font-bold text-[var(--dpl-ink)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          Work {spec.n} · {spec.title}
        </h2>
        <p className="text-[12px] text-[var(--dpl-ink2)]">
          {showAnswer
            ? 'Look at the finished work, then press Start.'
            : spec.instruction}
        </p>
      </header>

      <div
        ref={setStage}
        className="relative flex min-h-0 flex-1 flex-col gap-[8px] overflow-hidden rounded-[var(--dpl-r-md)] border p-[10px] sm:flex-row"
        style={{
          background: 'var(--dpl-slide-bg)',
          borderColor: 'var(--dpl-slide-edge)',
          color: 'var(--dpl-slide-ink)',
        }}
      >
        {/* the pile — a tray, not a slot: nothing here is a target */}
        <div
          ref={setPile}
          aria-hidden
          className={pileTrayClass(spec.pieces.length)}
          style={{ borderColor: 'var(--dpl-slide-line)' }}
        />

        {/* the working sheet */}
        <div className="flex min-h-0 flex-1 flex-col">
          <WorkGrid
            spec={spec}
            slotRects={slotRects}
            registerSlot={registerSlot}
          />
        </div>

        <WorkPieceLayer spec={spec} board={board} />

        {/* the presentation: the work, finished, with one way in */}
        {showAnswer ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center pb-[14px]">
            <button
              type="button"
              onClick={start}
              className="pointer-events-auto min-h-[56px] rounded-[var(--dpl-r-pill)] px-[34px] text-[15px] font-bold uppercase tracking-[0.12em]"
              style={{
                background: 'var(--dpl-slide-accent)',
                color: 'var(--dpl-slide-on-accent)',
                fontFamily: 'var(--dpl-font-display)',
                boxShadow: '0 12px 28px -14px rgba(0,0,0,0.7)',
              }}
            >
              Start
            </button>
          </div>
        ) : null}

        {/* the completion glow — one breath, then it is gone */}
        {phase === 'done' ? (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, times: [0, 0.25, 1] }}
            className="pointer-events-none absolute inset-0 z-20 rounded-[var(--dpl-r-md)]"
            style={{ boxShadow: 'inset 0 0 60px -6px var(--dpl-slide-accent-2)' }}
          />
        ) : null}

        {!showAnswer ? (
          <ControlCard>
            <AnswerBoard spec={spec} slotRects={slotRects} />
          </ControlCard>
        ) : null}
      </div>

      <p
        aria-live="polite"
        className="flex-none text-center text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]"
      >
        {showAnswer
          ? 'This is the finished work'
          : remaining === 0
            ? 'All done'
            : `${remaining} card${remaining === 1 ? '' : 's'} to go`}
      </p>
    </div>
  );
}
