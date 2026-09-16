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

import type { CSSProperties } from 'react';

import type { WorkPiece, WorkSpec } from '@/lib/montree/dark-phonics/v2-shelf/works';

import ControlCard from './ControlCard';
import { CompletionGlow } from './WorkDone';
import {
  useWorkBoard,
  WorkAnswerPieces,
  WorkGrid,
  WorkGridLines,
  WorkPieceLayer,
  pileTrayWidth,
  type Rect,
} from './work-engine';

/**
 * The pile tray, in both postures — ONE function, called by the live stage and
 * by the control board, because those two must land on the same pixels. It
 * used to be a class string copied into both with a "change one, change the
 * other" note above it; the cast widening from four cards to seven is exactly
 * the kind of edit that note loses.
 *
 * 🚨 THE WIDTH IS A BUDGET FOR CARDS, NOT A TASTE, and it is derived from what
 * is WRITTEN on them rather than from how many there are. The tray used to take
 * 42% of the stage for a big cast, which left the working sheet (the thing
 * being read) squeezed into the rest; then it took "20% + 1% per card", which
 * gave a dozen sentences the same tray as a dozen three-letter words and made
 * the sentences clip. Since 2026-09-14 it is pileTrayWidth(spec.pieces) —
 * min(28%, max(widest chip + 24px, 22%)) — so the sheet always keeps at least
 * 72%, and a cast too long for that tray is answered by a smaller pile face,
 * never by a clipped one. See v2-shelf/pile.ts.
 *
 * The class string is static (Tailwind's scanner can see every literal); the
 * one number that varies rides in as a custom property, so the phone posture
 * (a full-width row above the sheet) is untouched by it.
 */
// 🚨 THE PHONE HEIGHT WAS RAISED FROM clamp(110px,24vh,210px) ON 2026-09-14.
// In the portrait posture the tray is a strip across the top, and 210px could
// not hold a dozen cards at any pitch that left their words showing — the pile
// fell back to an even spread and buried half of every sentence. The sheet
// below keeps the rest, and a card you cannot read is worth less than a row of
// the grid you can already see is empty.
const PILE_TRAY_CLASS =
  'h-[clamp(140px,32vh,280px)] w-full flex-none rounded-[8px] border border-dashed sm:h-auto sm:w-[var(--dpl-pile-w)]';

function pileTrayStyle(pieces: readonly WorkPiece[]): CSSProperties {
  return {
    borderColor: 'var(--dpl-slide-line)',
    ['--dpl-pile-w' as string]: pileTrayWidth(pieces),
  } as CSSProperties;
}

/**
 * The control of error: the work, finished.
 *
 * The layout below repeats the live stage's own flex line, because the finished
 * board must land on exactly the pixels the live one occupies. The one thing
 * that could silently drift — the pile tray, whose width now depends on how
 * many cards the work has — is shared as PILE_TRAY_CLASS + pileTrayStyle() rather than copied.
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
      <div className={PILE_TRAY_CLASS} style={pileTrayStyle(spec.pieces)} />
      <div className="flex min-h-0 flex-1 flex-col">
        <WorkGrid spec={spec} slotRects={slotRects} />
      </div>
      <WorkAnswerPieces spec={spec} slotRects={slotRects} />
      <WorkGridLines spec={spec} slotRects={slotRects} />
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
      {/*
        🚨 NO "WORK N · TITLE" HERE. The shelf's own bar already names the work,
        and it numbers it by the Sep 6 renumbering (1 Characters, 2 Picture
        match, 3 Sentence & picture, 4 guided builder, 5 free builder) while
        spec.n still carries the older printed-works numbering the tracker and
        the PDF filenames are keyed to. Two headings, two numbers, one work —
        so the heading that was wrong is the one that goes. The DATA is left
        exactly as it is; only the display drops the prefix.
      */}
      <header className="flex flex-none flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
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
          data-pile-tray
          className={PILE_TRAY_CLASS}
          style={pileTrayStyle(spec.pieces)}
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

        {/* the sheet's ruling, one layer, above every card — see work-engine */}
        <WorkGridLines spec={spec} slotRects={slotRects} />

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

        {/* The completion glow — one breath, then it is gone. SHARED since
            2026-09-15: this was the original, and it is now what every stage on
            the shelf says, from ./WorkDone.tsx. The way ONWARDS is not here —
            ShelfPlayer draws the one Next pill over the stage. */}
        {phase === 'done' ? <CompletionGlow /> : null}

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
