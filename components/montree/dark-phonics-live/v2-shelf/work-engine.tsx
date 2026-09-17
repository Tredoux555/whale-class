'use client';

/**
 * The work engine — the one drag, the one pile, the one control of error.
 *
 * 🚨 EVERY WORK ON THE SHELF SHARES THIS FILE, AND THAT IS THE POINT. The four
 * printed works and the preliminary Characters strip differ only in WHICH cells
 * are printed, which are cut out, and what frame the board stands in. The
 * interaction is one interaction, so a fix to the drag is a fix to the whole
 * shelf. It was extracted out of MatchWork.tsx on 2026-09-02 when the
 * Characters work arrived; copying the drag would have given us two of them
 * within a week.
 *
 * WHAT THE ENGINE OWNS, and why it is shaped this way:
 *
 *   1. The work opens FINISHED. A child meets the completed work first — this
 *      is the Montessori presentation: you see the thing done before you are
 *      asked to do it. It is also the honest way to explain a task to someone
 *      who cannot yet read the instruction.
 *   2. Start SCATTERS it. Every movable card flows — never teleports — out of
 *      its slot and into a jumbled pile, staggered so the eye can follow
 *      individual cards leaving. That flight IS the instruction.
 *   3. A correct card SETTLES. A wrong one FLOWS BACK to the pile, animated, in
 *      silence. Nothing is red-crossed and nothing is counted: the control of
 *      error is the material, not a mark.
 *
 * 🚨 GEOMETRY IS MEASURED, NEVER ASSUMED. Every card is exactly the size of the
 * slot it belongs in — the paper's TAB_GAP rule, which is what makes a cut card
 * drop into its cell. So the grid is laid out first, the real slot rectangles
 * are measured from the DOM, and the cards are absolutely positioned over the
 * top from those numbers. Cards are positioned by transform (x/y/scale) rather
 * than by left/top so every move is GPU-composited and framer-motion can
 * interpolate it.
 *
 * 🚨 transformOrigin IS 'top left' ON PURPOSE. The pile layout works in exact
 * rectangles; with a centred origin the drawn card would sit half an overhang
 * off its computed box and the packing would overlap.
 *
 * 🚨 A LOOSE CARD IS NOT ITS SLOT. Since 2026-09-14 (second pass) a piece has
 * two geometries: the measured home rect it fills once PLACED, and a compact
 * `pileSize` computed from its own content while it is loose — see
 * lib/…/v2-shelf/pile.ts. The card animates from one to the other on lift and
 * back on a wrong drop, which is why width/height ride in the same animate
 * target as x/y rather than being fixed style.
 *
 * 🚨 THE GRID'S LINES ARE DRAWN ABOVE THE CARDS, by WorkGridLines(), not by the
 * cells. A cell that draws its own divider is covered by whatever lands on it,
 * so the sheet's ruling used to break wherever a card sat; one overlay layer
 * with pointer-events:none means every line is the same line whether the cell
 * is empty, printed or filled.
 *
 * 🚨 A CARD BELONGS WHEREVER IT READS TRUE. A slot accepts any piece whose
 * `matchKey` equals its `accepts` (works.ts), so any "The" fits any "The" slot —
 * and `placed` therefore records WHICH slot a card landed in, not merely that it
 * landed. Everything downstream (the rect it is drawn at, what counts as
 * occupied, what counts as finished) reads that map.
 */

import { motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';
import {
  estimateTextWidth,
  fitFont as fitFontImpl,
  fitFontWrapped,
  layoutPile,
  type MeasureText,
  type PilePos,
  type Rect,
} from '@/lib/montree/dark-phonics/v2-shelf/pile';
import { gridLattice } from '@/lib/montree/dark-phonics/v2-shelf/works';
import type {
  WorkPiece,
  WorkSlot,
  WorkSpec,
} from '@/lib/montree/dark-phonics/v2-shelf/works';

/**
 * The pile's geometry lives in lib/…/v2-shelf/pile.ts — pure, and therefore
 * tested. Re-exported here so every caller that already imported it from the
 * engine still can: the engine is still the one place a work talks to.
 */
export {
  chipSize,
  estimateTextWidth,
  fitFont,
  layoutPile,
  pictureSide,
  pileFontFor,
  pileMinimumWidth,
  pileNeededWidth,
  pileSizes,
  pileTrayWidth,
  pileWidthPercent,
  PILE_FONT_MAX,
  PILE_FONT_MIN,
  PILE_GAP,
} from '@/lib/montree/dark-phonics/v2-shelf/pile';
export type {
  MeasureText,
  PilePos,
  Rect,
} from '@/lib/montree/dark-phonics/v2-shelf/pile';

export type Phase = 'answer' | 'play' | 'done';

/** How long the scatter's stagger runs before ordinary timing resumes. */
const SCATTER_MS = 1100;
/** A wrong card's flash, in ms. */
const WRONG_MS = 420;

const SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 } as const;

/* -------------------------------------------------------------------------- */
/* The sheet                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * What is PRINTED in a cell — never a card.
 *
 * Cards are drawn by the piece layer over the top, at measured coordinates, in
 * both the live board and the control board. That is what makes the control of
 * error pixel-identical to the finished work rather than a lookalike table.
 */
function cellContent(slot: WorkSlot, rect: Rect | undefined) {
  if (slot.fixedText) {
    // A printed WORD (work 3's static "The"/"sat!") must read exactly like the
    // word cards beside it — same face, same size rule — or the finished
    // sentence would come out in two typefaces.
    const isWord = slot.kind === 'word';
    return (
      <span
        className={
          isWord
            ? 'block px-[4px] text-center font-bold leading-[1.15]'
            : 'block px-[5px] text-center leading-[1.15]'
        }
        style={{
          fontSize: fitFontImpl(rect, slot.fixedText, isWord ? 30 : 22),
          fontFamily: isWord ? 'var(--dpl-font-display)' : undefined,
        }}
      >
        {slot.fixedText}
      </span>
    );
  }
  if (slot.guideText) {
    return (
      <span
        className="block px-[4px] text-center font-bold leading-[1.15]"
        style={{
          fontSize: fitFontImpl(rect, slot.guideText, 30),
          fontFamily: 'var(--dpl-font-display)',
          color: 'var(--dpl-slide-ink3)',
          opacity: 0.5,
        }}
      >
        {slot.guideText}
      </span>
    );
  }
  return null;
}

export function WorkGrid({
  spec,
  slotRects,
  registerSlot,
  className = 'grid min-h-0 flex-1 overflow-hidden rounded-[6px] border',
}: {
  spec: WorkSpec;
  slotRects: Record<string, Rect>;
  /** Only the LIVE board registers slots — the control board must not
   *  overwrite the geometry it is being drawn from. */
  registerSlot?: (id: string, el: HTMLDivElement | null) => void;
  className?: string;
}) {
  return (
    <div
      data-work-sheet={spec.id}
      className={className}
      style={{
        // The ruling is drawn by WorkGridLines(), over the top of everything.
        // The border here is kept only so the grid's content box — the thing
        // the slots are measured from — is exactly where it always was.
        borderColor: 'transparent',
        gridTemplateColumns: spec.colWeights.map((w) => `minmax(0,${w}fr)`).join(' '),
        gridTemplateRows: `repeat(${spec.rows}, minmax(0,1fr))`,
      }}
    >
      {spec.slots.map((slot) => (
        <div
          key={slot.id}
          ref={registerSlot ? (el) => registerSlot(slot.id, el) : undefined}
          className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden"
          style={{ gridColumn: slot.col + 1, gridRow: slot.rowIndex + 1 }}
        >
          {cellContent(slot, slotRects[slot.id])}
        </div>
      ))}
    </div>
  );
}

/**
 * The sheet's ruling: ONE layer, above the cards, drawing nothing else.
 *
 * 🚨 THE LINES USED TO BELONG TO THE CELLS, and that is why the finished board
 * looked hand-patched: a placed card is laid over its cell at exactly the
 * cell's rectangle with an opaque back, so it COVERED the divider it sat on and
 * the row line visibly broke at every filled column; empty target cells were
 * given a dashed inset outline to compensate, which made the same sheet carry
 * two different kinds of line at once. Drawn here instead — from the same
 * measured slotRects the cards are drawn from, with pointer-events:none, above
 * the placed layer and below the card in the hand — every line on the sheet is
 * the same line, and no card can ever cover one.
 *
 * 🚨 AND THEY ARE A LATTICE, NOT A BAG OF CELL EDGES (2026-09-16). The rows of
 * a book work do NOT all hold the same number of words — the-nap builds "The
 * ant naps." (3) beside "The potato doesn't nap!" (4) — and the first cut drew
 * each slot's own left edge and top edge, so a short row simply STOPPED where
 * it ran out of words: rows 1-6 ended two thirds across, the right-hand edge of
 * the sheet was ragged, and a divider hung in mid-air under the long row.
 *
 * The printed sheet (public/dark-phonics-books/works/<book>/…work4-sentence-
 * builder-free.pdf) answers this the way a table does: ONE rectangle, uniform
 * columns across every row, and a short row leaves its last cell BLANK. So the
 * ruling is derived from the grid's axes, not its cells — a column edge is the
 * min/max x of every slot standing in that column, a row edge the min/max y of
 * every slot in that row — and each divider is drawn the full height (or full
 * width) of the sheet. The sheet is one clean rectangle for any book, however
 * uneven its sentences.
 */
export function WorkGridLines({
  spec,
  slotRects,
  faint = false,
}: {
  spec: WorkSpec;
  slotRects: Record<string, Rect>;
  faint?: boolean;
}) {
  const line = faint ? 'var(--dpl-slide-line)' : 'var(--dpl-slide-ink)';
  // The geometry is pure and lives in works.ts — see gridLattice().
  const lattice = gridLattice(spec, slotRects);
  if (!lattice) return null;
  const { x0, y0, x1, y1, colEdges, rowEdges } = lattice;

  return (
    <div
      aria-hidden
      data-work-ruling={spec.id}
      className="pointer-events-none absolute left-0 top-0"
      style={{
        transform: `translate(${x0}px, ${y0}px)`,
        width: x1 - x0,
        height: y1 - y0,
        // Inset shadow rather than a border: an absolutely positioned child is
        // laid out from the PADDING box, so a real border would shift every
        // divider a pixel off the rect it was measured from.
        boxShadow: `inset 0 0 0 1px ${line}`,
        borderRadius: 6,
        zIndex: 300,
      }}
    >
      {/* One divider per column boundary, the FULL height of the sheet. */}
      {colEdges.map((x) => (
        <span
          key={`c${x}`}
          className="absolute"
          style={{ left: x - x0 - 1, top: 0, width: 1, height: y1 - y0, background: line }}
        />
      ))}
      {/* One divider per row boundary, the FULL width of the sheet. */}
      {rowEdges.map((y) => (
        <span
          key={`r${y}`}
          className="absolute"
          style={{ left: 0, top: y - y0 - 1, width: x1 - x0, height: 1, background: line }}
        />
      ))}
    </div>
  );
}

/**
 * The ink on a card. Shared, so a control card and a live card are one thing.
 *
 * A PLACED card sizes its type to the cell it fills (fitFontWrapped, the
 * paper's own rule plus a second line when the cell is too narrow to hold the
 * words at 14px). A LOOSE card is handed `fontPx` and, when the tray made it
 * break, the very `lines` its box was measured for — so the words on the tray
 * are the size and the shape the geometry promised, and nothing re-wraps at
 * paint time into a box that was measured for something else.
 */
export function PieceFace({
  piece,
  rect,
  fontPx,
  lines,
}: {
  piece: WorkPiece;
  rect: Rect;
  fontPx?: number;
  /** The pile's own break, when it broke. */
  lines?: string[];
}) {
  if (piece.kind === 'picture') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static public art, no known intrinsic size
      <img
        src={piece.image}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full object-contain p-[3px]"
      />
    );
  }
  const text = piece.text ?? '';
  const placed = fitFontWrapped(rect, text, piece.kind === 'word' ? 30 : 22);
  const shown = lines ?? (fontPx === undefined ? placed.lines : [text]);
  return (
    <span
      className="pointer-events-none block px-[4px] text-center font-bold leading-[1.15]"
      style={{
        fontSize: fontPx ?? placed.fontPx,
        fontFamily: 'var(--dpl-font-display)',
      }}
    >
      {shown.map((line, i) => (
        <span key={i} className="block whitespace-nowrap">
          {line}
        </span>
      ))}
    </span>
  );
}

/**
 * Every card drawn at its canonical home — the control of error's card layer.
 *
 * 🚨 IT IS THE SAME BOARD, NOT A PICTURE OF ONE. Callers reproduce the live
 * stage's inner layout behind this, and this draws every card at the SAME
 * MEASURED `slotRects` the live board uses, with the same card styling. So the
 * held overlay is pixel-identical to what the child saw before Start and will
 * see when they finish, down to the type size in each cell.
 */
export function WorkAnswerPieces({
  spec,
  slotRects,
}: {
  spec: WorkSpec;
  slotRects: Record<string, Rect>;
}) {
  return (
    <>
      {spec.pieces.map((piece) => {
        const home = slotRects[piece.slotId];
        if (!home) return null;
        return (
          <div
            key={piece.id}
            className="absolute left-0 top-0 flex select-none items-center justify-center overflow-hidden"
            style={{
              width: home.w,
              height: home.h,
              transform: `translate(${home.x}px, ${home.y}px)`,
              transformOrigin: 'top left',
              zIndex: 5,
              background: 'var(--dpl-slide-bg)',
              // Transparent, exactly as on the live board: the ruling belongs
              // to WorkGridLines() now, so a card carries no edge of its own
              // and a filled cell is the sheet's own colour, seam and all.
              border: '1px solid transparent',
            }}
          >
            <PieceFace piece={piece} rect={home} />
          </div>
        );
      })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The board                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A canvas-backed text measurer for the display face.
 *
 * The pile sizes each chip to its own string, so it has to know how wide that
 * string really is — an estimate errs wide and leaves ragged padding, and errs
 * narrow and clips. One canvas, one 2d context, cached per family: measureText
 * is cheap, and the pile is re-laid only on a resize.
 *
 * Falls back to the estimate wherever there is no DOM (SSR, the first render
 * before mount, the tests), which is why every consumer takes a MeasureText.
 */
function makeMeasurer(family: string): MeasureText {
  if (typeof document === 'undefined') return estimateTextWidth;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return estimateTextWidth;
  const cache = new Map<string, number>();
  return (text, fontPx) => {
    const key = `${fontPx}|${text}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    ctx.font = `bold ${fontPx}px ${family}`;
    const w = ctx.measureText(text).width;
    cache.set(key, w);
    return w;
  };
}

interface DragState {
  id: string;
  relX: number;
  relY: number;
  x: number;
  y: number;
}

export interface WorkBoard {
  /**
   * Callback refs, not ref objects, and deliberately so: a board is passed
   * around and read during render, and a returned `useRef` object would be
   * (correctly) flagged as a ref read at render time. Callbacks are plain
   * functions, and the elements stay private to the hook.
   */
  setStage: (el: HTMLDivElement | null) => void;
  setPile: (el: HTMLDivElement | null) => void;
  registerSlot: (id: string, el: HTMLDivElement | null) => void;
  /** The stage's measured width — what a caller's layout decisions hang off. */
  stageWidth: number;
  slotRects: Record<string, Rect>;
  pile: Record<string, PilePos>;
  placed: Record<string, string>;
  phase: Phase;
  drag: DragState | null;
  wrong: string | null;
  scattering: boolean;
  /** How many cards are still in the pile. */
  remaining: number;
  /** True until the child presses Start — the presentation is on screen. */
  showAnswer: boolean;
  start: () => void;
  restingSlot: (piece: WorkPiece) => string;
  onPieceDown: (e: ReactPointerEvent<HTMLDivElement>, piece: WorkPiece) => void;
  onPieceMove: (e: ReactPointerEvent<HTMLDivElement>, piece: WorkPiece) => void;
  onPieceUp: (piece: WorkPiece) => void;
}

/**
 * One work's live state: measurement, pile, drag, acceptance, completion.
 *
 * NOTE: there is deliberately no "reset when the work changes" effect. Callers
 * render the board with `key={spec.id}`, so a different work is a different
 * component instance and starts from `useState`'s own initial values. An effect
 * doing the same job would only be a second, slower truth.
 */
export function useWorkBoard(
  spec: WorkSpec,
  {
    onDone,
    startScattered = false,
  }: {
    onDone: () => void;
    /**
     * Skip the presentation and open with the cards already in the pile. The
     * Characters strip does this: the presentation for that work is the book
     * itself, read a page at a time with the teacher, not a finished board.
     */
    startScattered?: boolean;
  }
): WorkBoard {
  const stageEl = useRef<HTMLDivElement | null>(null);
  const pileEl = useRef<HTMLDivElement | null>(null);
  const slotEls = useRef<Record<string, HTMLDivElement | null>>({});
  const observer = useRef<ResizeObserver | null>(null);

  const [slotRects, setSlotRects] = useState<Record<string, Rect>>({});
  const [stageWidth, setStageWidth] = useState(0);
  /**
   * The display face, read off the stage rather than hard-coded: the token is a
   * CSS variable, and canvas wants a real family string. Held in state so the
   * pile re-lays once the real face is known (and its metrics with it).
   */
  const [face, setFace] = useState('');
  const [pileBox, setPileBox] = useState<Rect | null>(null);
  const [phase, setPhase] = useState<Phase>(startScattered ? 'play' : 'answer');
  /** pieceId → the slot it is currently lying in. Absent = still in the pile. */
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [scattering, setScattering] = useState(false);

  const registerSlot = useCallback((id: string, el: HTMLDivElement | null) => {
    slotEls.current[id] = el;
  }, []);

  /** Read the real geometry. Runs on layout and on every resize. */
  const measure = useCallback(() => {
    const stage = stageEl.current;
    const pile = pileEl.current;
    if (!stage || !pile) return;
    const origin = stage.getBoundingClientRect();
    const next: Record<string, Rect> = {};
    for (const slot of spec.slots) {
      const el = slotEls.current[slot.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next[slot.id] = {
        x: r.left - origin.left,
        y: r.top - origin.top,
        w: r.width,
        h: r.height,
      };
    }
    const p = pile.getBoundingClientRect();
    setFace(
      getComputedStyle(stage).getPropertyValue('--dpl-font-display').trim() ||
        'sans-serif'
    );
    setStageWidth(origin.width);
    setSlotRects(next);
    setPileBox({
      x: p.left - origin.left,
      y: p.top - origin.top,
      w: p.width,
      h: p.height,
    });
  }, [spec.slots]);

  // ResizeObserver fires once the moment it starts observing, so the first
  // measurement rides in on the same callback as every later one — no separate
  // synchronous measure pass, and one code path for "the geometry changed".
  //
  // It is (re)armed from the STAGE'S CALLBACK REF rather than from an effect on
  // a ref object: the stage element is the thing being observed, so the moment
  // it arrives is the moment to start, and the moment it leaves is the moment
  // to stop.
  //
  // 🚨 THE PILE IS OBSERVED TOO, AND THAT IS NOT BELT-AND-BRACES. A caller may
  // re-lay itself WITHOUT the stage changing size — the Characters strip stands
  // the pile and the boxes on their side below a threshold, inside a stage of
  // exactly the same rectangle. Watching only the stage left the pile packed
  // into the shape of the posture it no longer had, and the cards spilled out
  // of their tray.
  const observe = useCallback(() => {
    observer.current?.disconnect();
    observer.current = null;
    const stage = stageEl.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    if (pileEl.current) ro.observe(pileEl.current);
    observer.current = ro;
  }, [measure]);

  useLayoutEffect(() => {
    observe();
    return () => {
      observer.current?.disconnect();
      observer.current = null;
    };
  }, [observe]);

  const setStage = useCallback(
    (el: HTMLDivElement | null) => {
      stageEl.current = el;
      observe();
    },
    [observe]
  );

  const setPile = useCallback(
    (el: HTMLDivElement | null) => {
      pileEl.current = el;
      observe();
    },
    [observe]
  );

  const measureText = useMemo(() => makeMeasurer(face || 'sans-serif'), [face]);

  // 🚨 THE PILE NO LONGER DEPENDS ON slotRects. A loose card's size comes from
  // what is written on it, not from the cell it belongs in, so the tray does
  // not re-lay itself every time the sheet is re-measured.
  const pile = useMemo(
    () => (pileBox ? layoutPile(pileBox, spec.pieces, measureText) : {}),
    [pileBox, measureText, spec.pieces]
  );

  const occupied = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of spec.pieces) {
      const at = placed[p.id];
      if (at) m[at] = p.id;
    }
    return m;
  }, [placed, spec.pieces]);

  /**
   * The rectangle a piece is drawn at when it is not in the pile: the slot it
   * landed in, which need not be the one it came from. Before Start every card
   * sits in its canonical home, which is what makes the opening board and the
   * control card the same picture.
   */
  const restingSlot = useCallback(
    (piece: WorkPiece) => placed[piece.id] ?? piece.slotId,
    [placed]
  );

  /**
   * Every timer this board ever sets, so that leaving the stage cancels them.
   *
   * 🚨 A TIMER THAT OUTLIVES ITS BOARD SETS STATE ON A DEAD COMPONENT. The
   * scatter and the wrong-card flow-back both used to be bare setTimeouts: walk
   * off the work while a card is flowing back (the shelf's pips are one tap
   * away) and the callback still fires against an unmounted tree. Held in a set
   * and cleared on unmount AND whenever the work itself changes, because the
   * shelf swaps the spec without unmounting the board.
   */
  const timers = useRef(new Set<number>());
  const after = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  useEffect(() => {
    const live = timers.current;
    return () => {
      for (const id of live) window.clearTimeout(id);
      live.clear();
    };
  }, [spec.id]);

  const start = useCallback(() => {
    setPlaced({});
    setPhase('play');
    setScattering(true);
    after(() => setScattering(false), SCATTER_MS);
  }, [after]);

  /* ------------------------------- dragging ------------------------------- */

  const pointerInStage = (e: { clientX: number; clientY: number }) => {
    const stage = stageEl.current;
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPieceDown = (e: ReactPointerEvent<HTMLDivElement>, piece: WorkPiece) => {
    if (phase === 'answer') return;
    // One card at a time. A second finger landing mid-drag would replace `drag`
    // and orphan the first card: still lifted, still following nothing, and
    // never dropped — it would hang in mid-air until the work was restarted.
    if (drag) return;
    const home = slotRects[restingSlot(piece)];
    const here = pointerInStage(e);
    if (!home || !here) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not a requirement */
    }

    // Where on the card the finger landed, as a fraction — so a card that grows
    // to full size on lift still hangs off the same point.
    const isPlaced = !!placed[piece.id];
    const inPile = pile[piece.id];
    if (!isPlaced && !inPile) return;
    // Where on the card the finger landed, as a fraction of the size the card
    // is DRAWN at right now — its pile chip in the tray, its home rect in a
    // cell — so the card grows to full size under a finger that stays put.
    const from = isPlaced
      ? { x: home.x, y: home.y, w: home.w, h: home.h }
      : { x: inPile.x, y: inPile.y, w: inPile.w, h: inPile.h };
    const relX = (here.x - from.x) / Math.max(1, from.w);
    const relY = (here.y - from.y) / Math.max(1, from.h);

    if (isPlaced) {
      // Lifting frees the slot again, so an equal card may take it instead.
      setPlaced((p) => {
        const next = { ...p };
        delete next[piece.id];
        return next;
      });
    }
    setPhase((ph) => (ph === 'done' ? 'play' : ph));
    setDrag({
      id: piece.id,
      relX,
      relY,
      x: here.x - relX * home.w,
      y: here.y - relY * home.h,
    });
  };

  const onPieceMove = (e: ReactPointerEvent<HTMLDivElement>, piece: WorkPiece) => {
    if (!drag || drag.id !== piece.id) return;
    const home = slotRects[restingSlot(piece)];
    const here = pointerInStage(e);
    if (!home || !here) return;
    setDrag({
      ...drag,
      x: here.x - drag.relX * home.w,
      y: here.y - drag.relY * home.h,
    });
  };

  const onPieceUp = (piece: WorkPiece) => {
    if (!drag || drag.id !== piece.id) return;
    const home = slotRects[restingSlot(piece)];
    const current = drag;
    setDrag(null);
    if (!home) return;

    const cx = current.x + home.w / 2;
    const cy = current.y + home.h / 2;
    const hit = spec.slots.find((s) => {
      const r = slotRects[s.id];
      return r && cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
    });

    // Accepted when the slot is READING-TRUE for this card — the same word, not
    // the same card id — and nothing is lying there already.
    if (hit && hit.accepts === piece.matchKey && !occupied[hit.id]) {
      const next = { ...placed, [piece.id]: hit.id };
      setPlaced(next);
      playAudio(piece.audio.kind, piece.audio.key);
      if (spec.pieces.every((p) => next[p.id])) {
        setPhase('done');
        onDone();
      }
      return;
    }

    // Wrong slot, or an occupied one: the card flows back to the pile. No mark,
    // no sound, no counter — the material is the control of error.
    setWrong(piece.id);
    after(() => setWrong((w) => (w === piece.id ? null : w)), WRONG_MS);
  };

  return {
    setStage,
    setPile,
    registerSlot,
    stageWidth,
    slotRects,
    pile,
    placed,
    phase,
    drag,
    wrong,
    scattering,
    remaining: spec.pieces.filter((p) => !placed[p.id]).length,
    showAnswer: phase === 'answer',
    start,
    restingSlot,
    onPieceDown,
    onPieceMove,
    onPieceUp,
  };
}

/** Every card, drawn over the top of the sheet from measured geometry. */
export function WorkPieceLayer({
  spec,
  board,
}: {
  spec: WorkSpec;
  board: WorkBoard;
}) {
  const { slotRects, pile, placed, drag, wrong, scattering, showAnswer } = board;
  return (
    <>
      {spec.pieces.map((piece, i) => {
        const home = slotRects[board.restingSlot(piece)];
        if (!home) return null;
        const isDragging = drag?.id === piece.id;
        const isPlaced = showAnswer || !!placed[piece.id];
        const pos = pile[piece.id];
        if (!isPlaced && !isDragging && !pos) return null;

        // 🚨 WIDTH AND HEIGHT RIDE IN THE SAME TARGET AS x/y, so a card lifted
        // out of the pile GROWS into its slot's rectangle over the same spring
        // that carries it there, and a wrong card shrinks back to its chip on
        // the way home. A landed card is exactly the cell, to the pixel.
        const target = isDragging
          ? {
              x: drag.x,
              y: drag.y,
              width: home.w,
              height: home.h,
              scale: 1.04,
              rotate: 0,
            }
          : isPlaced
            ? {
                x: home.x,
                y: home.y,
                width: home.w,
                height: home.h,
                scale: 1,
                rotate: 0,
              }
            : {
                x: pos.x,
                y: pos.y,
                width: pos.w,
                height: pos.h,
                scale: 1,
                rotate: pos.rot,
              };

        return (
          <motion.div
            key={piece.id}
            role="button"
            tabIndex={showAnswer ? -1 : 0}
            aria-label={piece.label}
            data-work-piece={piece.id}
            onPointerDown={(e) => board.onPieceDown(e, piece)}
            onPointerMove={(e) => board.onPieceMove(e, piece)}
            onPointerUp={() => board.onPieceUp(piece)}
            onPointerCancel={() => board.onPieceUp(piece)}
            initial={false}
            animate={target}
            transition={
              isDragging
                ? { duration: 0 }
                : scattering
                  ? { ...SPRING, delay: i * 0.045 }
                  : SPRING
            }
            className="absolute left-0 top-0 flex select-none items-center justify-center overflow-hidden"
            style={{
              transformOrigin: 'top left',
              touchAction: 'none',
              // The card in the hand is above the whole heap, whatever depth
              // it was dealt at — the heap can stack fifty deep.
              zIndex: isDragging ? 400 : isPlaced ? 5 : 10 + (pos?.z ?? 0),
              cursor: showAnswer ? 'default' : 'grab',
              background: 'var(--dpl-slide-bg)',
              borderRadius: isPlaced ? 0 : 6,
              // A PLACED card draws no edge at all — the sheet's ruling is one
              // overlay above it (WorkGridLines), so a card that carried its
              // own border would double the line it landed on. Only a card in
              // the tray has an edge, because there is nothing else to give it
              // one; only a WRONG card is accented, and that inset so the
              // overlay's line still reads through.
              border:
                wrong === piece.id
                  ? '2px solid var(--dpl-slide-accent)'
                  : isPlaced
                    ? '1px solid transparent'
                    : '1px solid var(--dpl-slide-line)',
              boxShadow: isDragging
                ? '0 14px 30px -12px rgba(0,0,0,0.55)'
                : isPlaced
                  ? 'none'
                  : '0 4px 12px -8px rgba(0,0,0,0.5)',
            }}
          >
            <PieceFace
              piece={piece}
              rect={home}
              fontPx={isPlaced || isDragging ? undefined : pos?.fontPx}
              lines={isPlaced || isDragging ? undefined : pos?.lines}
            />
          </motion.div>
        );
      })}
    </>
  );
}
