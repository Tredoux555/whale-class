'use client';

/**
 * CharacterStrip — the preliminary "Characters" work, which accompanies the
 * Book (stage 2) rather than replacing it.
 *
 * THE PHYSICAL MATERIAL, which is the thing this reproduces:
 *
 *   The book lies open on a tray. Standing to its LEFT is a strip of blank,
 *   bordered boxes — one per character, top to bottom, in the order they first
 *   appear in the story (ant first … cat last). The strip's BACK is the control:
 *   the same boxes with the characters printed in them. Further left, in a
 *   loose pile, lie the characters themselves — 3D-printed figures, or laminated
 *   picture tabs. The child reads a page with the teacher, finds that character
 *   and drops it into the next box down. Same-to-same matching, one small reward
 *   per page, and the reward is the placing.
 *
 * SO ON GLASS: the strip stands immediately left of the book, sized to the
 * book's height, boxes equal and faintly bordered; the pieces sit further left
 * in a heap; the book keeps every page turn it had. Nothing here takes the book
 * away — a child must be able to read the page they are about to place.
 *
 * 🚨 IT REUSES THE WORKS' OWN ENGINE, IT DOES NOT COPY IT. The strip is a
 * one-column WorkSpec (`buildCharactersWork()`), so the drag, the measured
 * geometry, the settle, the flow-back, the deterministic pile and the control
 * card are the four printed works' own — see ./work-engine.tsx.
 *
 * 🚨 IT OPENS SCATTERED, and that is the one deliberate difference. Every other
 * work opens finished, because a child cannot be told an instruction they cannot
 * read. Here the presentation is the BOOK: the teacher reads a page and the
 * child places that character. Showing the strip already filled would give the
 * whole answer away before the first page is read.
 *
 * ON A PHONE the strip lies as a ROW ABOVE the book instead of a column beside
 * it — a column of six boxes plus a readable page will not both fit across a
 * portrait screen, and the strip is the thing that can turn sideways.
 */

import type { ReactNode } from 'react';

import type { WorkSpec } from '@/lib/montree/dark-phonics/v2-shelf/works';

import ControlCard from './ControlCard';
import {
  useWorkBoard,
  WorkAnswerPieces,
  WorkPieceLayer,
  type Rect,
} from './work-engine';

/**
 * Below this stage width the strip lies across the top instead of down the
 * side. It is the reader's own spread threshold minus the strip and pile the
 * side-by-side layout needs — i.e. the width at which a book and a strip stop
 * both fitting.
 */
const SIDE_BY_SIDE_MIN = 760;

/** The loose heap's tray, in each posture — shared by the live and control boards. */
//
// 🚨 THE WIDTHS ARE A BUDGET, NOT A TASTE. The book beside them must still be
// wide enough to open as a SPREAD (SPREAD_MIN_WIDTH, 720px) on a 1024px
// tablet — a single page here would put the text and its picture on separate
// turns, which is the one thing the printed booklet's pagination exists to
// prevent. Pile + strip + the two gaps therefore have about 210px to live in.
// `self-stretch` rather than `h-full`: the stage's height comes from its own
// flex line, so a percentage height on a child resolves against nothing.
const PILE_COLUMN =
  'w-[clamp(72px,11%,132px)] flex-none self-stretch rounded-[8px] border border-dashed border-[var(--dpl-slide-line)]';
const PILE_ROW =
  'h-[clamp(64px,14vh,110px)] w-full flex-none rounded-[8px] border border-dashed border-[var(--dpl-slide-line)]';

/** The strip, filled — the back of the laminated strip on the tray. */
function ControlStrip({
  spec,
  slotRects,
  column,
}: {
  spec: WorkSpec;
  slotRects: Record<string, Rect>;
  column: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 flex p-[8px] ${
        column ? 'flex-row gap-[8px]' : 'flex-col gap-[8px]'
      }`}
      style={{ background: 'var(--dpl-slide-bg)' }}
    >
      {/* The live stage's own layout, repeated so the filled strip lands on
          exactly the pixels the empty one occupies. Change one, change both. */}
      <div className={column ? PILE_COLUMN : PILE_ROW} />
      <StripGrid spec={spec} column={column} />
      <div className="min-h-0 min-w-0 flex-1" />
      <WorkAnswerPieces spec={spec} slotRects={slotRects} />
    </div>
  );
}

/**
 * The boxes. One column of N on a tablet, one row of N on a phone — the same
 * slots either way, so the strip is one material in two postures.
 */
function StripGrid({
  spec,
  registerSlot,
  column,
}: {
  spec: WorkSpec;
  /** Only the LIVE strip registers slots — the control must not overwrite the
   *  geometry it is being drawn from. */
  registerSlot?: (id: string, el: HTMLDivElement | null) => void;
  column: boolean;
}) {
  // The boxes are drawn here rather than through the works' WorkGrid because
  // this material turns: the same one-column spec is read down the page on a
  // tablet and across it on a phone, which a fixed grid template cannot do.
  return (
    <div
      className={
        column
          ? 'flex w-[clamp(58px,8.5%,104px)] flex-none flex-col self-stretch overflow-hidden rounded-[6px] border'
          : 'flex h-[clamp(64px,16vh,110px)] w-full flex-none overflow-hidden rounded-[6px] border'
      }
      style={{ borderColor: 'var(--dpl-slide-line)' }}
      data-character-strip
    >
      {spec.slots.map((slot, i) => (
        <div
          key={slot.id}
          ref={registerSlot ? (el) => registerSlot(slot.id, el) : undefined}
          data-character-box={i + 1}
          className="min-h-0 min-w-0 flex-1"
          style={{
            borderTop:
              column && i > 0 ? '1px solid var(--dpl-slide-line)' : undefined,
            borderLeft:
              !column && i > 0 ? '1px solid var(--dpl-slide-line)' : undefined,
          }}
        />
      ))}
    </div>
  );
}

export default function CharacterStrip({
  spec,
  children,
  onDone,
}: {
  spec: WorkSpec;
  /** The book. It stays fully readable and flippable while this is on screen. */
  children: ReactNode;
  onDone: () => void;
}) {
  // Destructured rather than kept as one object: `board` carries the callback
  // refs the stage and the pile are mounted with, and reading those off an
  // object during render is exactly what react-hooks/refs asks you not to do.
  const board = useWorkBoard(spec, { onDone, startScattered: true });
  const { setStage, setPile, registerSlot, slotRects, stageWidth, remaining } =
    board;

  // The posture is decided from the very rectangle the card geometry is read
  // from — the engine already measures the stage on every resize, so there is
  // one measurement here, not two that can disagree. Before the first measure
  // the stage is assumed wide: a tablet is the common case, and the strip
  // re-lays the moment the real width lands.
  const column = stageWidth === 0 || stageWidth >= SIDE_BY_SIDE_MIN;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[8px]">
      <header className="flex flex-none flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
        <h2
          className="text-[14px] font-bold text-[var(--dpl-ink)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          {spec.title}
        </h2>
        <p className="text-[12px] text-[var(--dpl-ink2)]">{spec.instruction}</p>
      </header>

      <div
        ref={setStage}
        className={`relative flex min-h-0 flex-1 overflow-hidden rounded-[var(--dpl-r-md)] border p-[8px] ${
          column ? 'flex-row gap-[8px]' : 'flex-col gap-[8px]'
        }`}
        style={{
          background: 'var(--dpl-slide-bg)',
          borderColor: 'var(--dpl-slide-edge)',
          color: 'var(--dpl-slide-ink)',
        }}
      >
        {/* the loose heap, furthest from the book */}
        <div
          ref={setPile}
          aria-hidden
          className={column ? PILE_COLUMN : PILE_ROW}
        />

        {/* the strip: immediately beside the book, sized to it */}
        <StripGrid
          spec={spec}
          registerSlot={registerSlot}
          column={column}
        />

        {/* the book itself — untouched, and still the thing on the tray */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>

        <WorkPieceLayer spec={spec} board={board} />

        <ControlCard>
          <ControlStrip
            spec={spec}
            slotRects={slotRects}
            column={column}
          />
        </ControlCard>
      </div>

      <p
        aria-live="polite"
        className="flex-none text-center text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]"
      >
        {remaining === 0
          ? 'Every character is home'
          : `${remaining} character${board.remaining === 1 ? '' : 's'} to place`}
      </p>
    </div>
  );
}
