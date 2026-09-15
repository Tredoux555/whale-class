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
 *
 * 🚨 THE STRIP HOLDS THE BOOK SHUT (2026-09-14). On the tray a child cannot
 * read on until the character they have just met is standing in its box; the
 * book and the strip are one material and the strip is the half that keeps
 * count. So this component owns the gate: it knows which page walks each
 * character on (characterIntroductions()), it knows what has been placed (the
 * board), and it hands the reader a `forwardLocked` it must obey. Turning BACK
 * is never gated — rereading is not cheating.
 *
 * The child is therefore passed as a FUNCTION rather than an element: the book
 * needs three things from the gate, and threading them through a cloned element
 * would be the same coupling with none of the types.
 */

import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  forwardLockedAt,
  type CharacterIntro,
  type WorkSpec,
} from '@/lib/montree/dark-phonics/v2-shelf/works';

import ControlCard from './ControlCard';
import {
  useWorkBoard,
  WorkAnswerPieces,
  WorkPieceLayer,
  type Rect,
} from './work-engine';
import { CompletionGlow } from './WorkDone';

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

/** What the strip hands the book so the book can obey the gate. */
export interface CharacterGate {
  /** True while a character on screen is still loose in the pile. */
  forwardLocked: boolean;
  /** The reader's settled page, and how many leaves are on screen. */
  onPage: (index: number, visible: number) => void;
  /** A forward turn was refused — nudge the box and the card. */
  onBlockedForward: () => void;
}

/** How long the refused-turn nudge runs, in ms. */
const NUDGE_MS = 280;

export default function CharacterStrip({
  spec,
  children,
  onDone,
  introductions = [],
}: {
  spec: WorkSpec;
  /** The book. It stays fully readable and flippable while this is on screen. */
  children: (gate: CharacterGate) => ReactNode;
  onDone: () => void;
  /**
   * Which reader page walks each character on. Empty means no gate at all —
   * every page turns freely, which is exactly what a book with no cast should
   * do rather than a special case somewhere below.
   */
  introductions?: readonly CharacterIntro[];
}) {
  // Destructured rather than kept as one object: `board` carries the callback
  // refs the stage and the pile are mounted with, and reading those off an
  // object during render is exactly what react-hooks/refs asks you not to do.
  const board = useWorkBoard(spec, { onDone, startScattered: true });
  // `phase` is read since 2026-09-15: until then this work alone said nothing
  // when it finished — a child boxed the last character and the material gave
  // no answer back. It flashes the same green breath every other stage does.
  const {
    setStage,
    setPile,
    registerSlot,
    slotRects,
    stageWidth,
    remaining,
    phase,
  } = board;

  /* --------------------------- the page gate --------------------------- */

  const [page, setPage] = useState({ index: 0, visible: 1 });
  /**
   * The intro being nudged, stamped so a second refusal replays the breath
   * rather than being swallowed as "the same state".
   *
   * 🚨 THE TIMER IS THE EFFECT'S, NOT A REF'S. The gate is handed to the book
   * as a render prop, which React calls DURING render; a callback that reaches
   * into a ref would then be a ref read at render time. Keying the effect on
   * the nudge itself means React's own cleanup cancels the previous timer, and
   * there is no ref to read.
   */
  const [nudge, setNudge] = useState<{ intro: CharacterIntro; at: number } | null>(
    null
  );
  useEffect(() => {
    if (!nudge) return;
    const t = window.setTimeout(() => setNudge(null), NUDGE_MS);
    return () => window.clearTimeout(t);
  }, [nudge]);

  const placedIds = useMemo(
    () => new Set(Object.keys(board.placed)),
    [board.placed]
  );
  const blocking = useMemo(
    () => forwardLockedAt(page.index, placedIds, introductions, page.visible),
    [page.index, page.visible, placedIds, introductions]
  );

  const onPage = useCallback(
    (index: number, visible: number) => setPage({ index, visible }),
    []
  );
  const onBlockedForward = useCallback(() => {
    if (!blocking) return;
    setNudge({ intro: blocking, at: Date.now() });
  }, [blocking]);

  /** Where the nudged box and the nudged card are, right now. */
  const nudgeRects = useMemo(() => {
    // The lock releases the instant the card lands, and the breath is over in
    // 280ms either way — so a nudge left over from a refusal that has just been
    // answered draws nothing.
    if (!nudge || !blocking) return [];
    const { slotId, pieceId } = nudge.intro;
    const box = slotRects[slotId];
    const card = board.placed[pieceId]
      ? slotRects[board.placed[pieceId]]
      : board.pile[pieceId];
    return [box, card].filter(Boolean) as { x: number; y: number; w: number; h: number }[];
  }, [nudge, blocking, slotRects, board.pile, board.placed]);

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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {children({
            forwardLocked: !!blocking,
            onPage,
            onBlockedForward,
          })}
        </div>

        <WorkPieceLayer spec={spec} board={board} />

        {/* The refused turn, said in the material rather than in words: the box
            that is waiting and the card that belongs in it both breathe once.
            Drawn as rings OVER the two rectangles rather than as a style on the
            card, so the drag, the settle and the flow-back keep every pixel of
            their own animation. */}
        {nudgeRects.map((r, i) => (
          <motion.div
            key={`nudge-${nudge?.at}-${i}`}
            aria-hidden
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: [0, 1, 0], scale: [0.94, 1.06, 0.94] }}
            transition={{ duration: NUDGE_MS / 1000, ease: 'easeOut' }}
            // 🚨 POSITIONED BY left/top, NOT BY transform. framer-motion owns
            // the `transform` property of anything it animates, and it animates
            // `scale` here — an inline translate would be thrown away on the
            // first frame and every ring would breathe in the top-left corner.
            className="pointer-events-none absolute rounded-[6px]"
            style={{
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              transformOrigin: 'center',
              border: '2px solid var(--dpl-slide-accent)',
              zIndex: 500,
            }}
          />
        ))}

        {/* Every character is home — the shelf's one completion breath. The
            way ONWARDS is ShelfPlayer's single Next pill, not a copy here. */}
        {phase === 'done' ? <CompletionGlow /> : null}

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
