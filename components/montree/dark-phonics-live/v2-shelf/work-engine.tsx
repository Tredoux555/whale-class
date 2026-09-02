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
 * 🚨 transformOrigin IS 'top left' ON PURPOSE. The pile packer works in exact
 * scaled rectangles (w * s, h * s); with a centred origin the drawn card would
 * sit half an overhang off its computed box and the packing would overlap.
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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';
import type {
  WorkPiece,
  WorkSlot,
  WorkSpec,
} from '@/lib/montree/dark-phonics/v2-shelf/works';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PilePos {
  x: number;
  y: number;
  scale: number;
  rot: number;
}

export type Phase = 'answer' | 'play' | 'done';

/** Gap between cards in the pile, in device px. */
const PILE_GAP = 8;
/** How long the scatter's stagger runs before ordinary timing resumes. */
const SCATTER_MS = 1100;
/** A wrong card's flash, in ms. */
const WRONG_MS = 420;

const SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 } as const;

/* -------------------------------------------------------------------------- */
/* Typography — the paper's fit(), in the browser                              */
/* -------------------------------------------------------------------------- */

/**
 * The largest size at which `text` still sits inside `rect`, bounded by `max`.
 * Mirrors build_book_works.py's fit(): the type is sized from the string and
 * the cell, never assumed. 0.52 is the average glyph advance of the display
 * face as a fraction of its size — close enough to size confidently and cheap
 * enough to run on every measure.
 */
export function fitFont(rect: Rect | undefined, text: string, max: number): number {
  if (!rect || !text) return max;
  const byHeight = rect.h * 0.44;
  const byWidth = (rect.w - 10) / Math.max(1, text.length * 0.52);
  return Math.max(10, Math.min(max, byHeight, byWidth));
}

/* -------------------------------------------------------------------------- */
/* The pile                                                                    */
/* -------------------------------------------------------------------------- */

/** Deterministic jitter, so the same pile looks the same every time. */
function jitter(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Shelf-pack the cards into the pile box, as large as they will go.
 *
 * A pile that overflows its box would put cards under the grid or off-screen,
 * so the scale is found by bisection rather than guessed: the largest s in
 * [0.2, 1] at which every card still fits. Cards keep their own aspect — a
 * picture card stays a picture card — because they are the SAME cards that must
 * drop back into their slots.
 *
 * 🚨 THE PACKED ROWS ARE THEN CENTRED, both ways. Work 3 cuts out only the
 * words that change, so a pile can be four cards where it used to be sixteen;
 * pinned to the top-left corner of a tall tray that reads as a mistake rather
 * than as a little heap of cards. Centring costs one pass over the shelves and
 * makes a small pile and a full one look like the same material.
 */
export function packPile(
  box: Rect,
  pieces: WorkPiece[],
  slotRects: Record<string, Rect>,
  seed: number
): Record<string, PilePos> {
  const sizes = pieces.map((p) => slotRects[p.slotId]);
  if (sizes.some((s) => !s) || box.w <= 0 || box.h <= 0) return {};

  const fits = (s: number, commit: boolean): Record<string, PilePos> | boolean => {
    const rnd = jitter(seed);
    const out: Record<string, PilePos> = {};
    // Laid out relative to the tray's top-left first, then shifted once the
    // used width of each shelf and the used height of the pile are known.
    const shelves: { ids: string[]; w: number; h: number; y: number }[] = [];
    let shelf = { ids: [] as string[], w: 0, h: 0, y: 0 };
    let x = 0;
    let y = 0;
    let shelfH = 0;
    const closeShelf = () => {
      shelf.w = Math.max(0, x - PILE_GAP);
      shelf.h = shelfH;
      shelf.y = y;
      shelves.push(shelf);
    };
    for (let i = 0; i < pieces.length; i++) {
      const w = sizes[i]!.w * s;
      const h = sizes[i]!.h * s;
      if (x > 0 && x + w > box.w) {
        closeShelf();
        y += shelfH + PILE_GAP;
        x = 0;
        shelfH = 0;
        shelf = { ids: [], w: 0, h: 0, y: 0 };
      }
      if (commit) {
        // Jitter is small and always inward, so a jittered card can never leave
        // the box the packer just proved it fits in.
        const jx = rnd() * PILE_GAP * 0.7;
        const jy = rnd() * PILE_GAP * 0.7;
        out[pieces[i].id] = {
          x: x + jx,
          y: y + jy,
          scale: s,
          rot: (rnd() * 2 - 1) * 3.5,
        };
        shelf.ids.push(pieces[i].id);
      } else {
        rnd();
        rnd();
        rnd();
      }
      x += w + PILE_GAP;
      shelfH = Math.max(shelfH, h);
    }
    closeShelf();
    const total = y + shelfH;
    if (!commit) return total <= box.h;
    const dy = Math.max(0, (box.h - total) / 2);
    for (const sh of shelves) {
      const dx = Math.max(0, (box.w - sh.w) / 2);
      for (const id of sh.ids) {
        out[id].x += box.x + dx;
        out[id].y += box.y + dy;
      }
    }
    return out;
  };

  let lo = 0.2;
  let hi = 1;
  if (fits(hi, false) !== true) {
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid, false) === true) lo = mid;
      else hi = mid;
    }
  } else {
    lo = hi;
  }
  return fits(lo, true) as Record<string, PilePos>;
}

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
          fontSize: fitFont(rect, slot.fixedText, isWord ? 30 : 22),
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
          fontSize: fitFont(rect, slot.guideText, 30),
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
  faint = false,
}: {
  spec: WorkSpec;
  slotRects: Record<string, Rect>;
  /** Only the LIVE board registers slots — the control board must not
   *  overwrite the geometry it is being drawn from. */
  registerSlot?: (id: string, el: HTMLDivElement | null) => void;
  className?: string;
  /**
   * The Characters strip is a row of EMPTY boxes standing beside the book, not
   * a working sheet: it wants a faint border, the way the laminated strip on
   * the tray does, so it never competes with the page the child is reading.
   */
  faint?: boolean;
}) {
  const line = faint ? 'var(--dpl-slide-line)' : 'var(--dpl-slide-ink)';
  return (
    <div
      className={className}
      style={{
        borderColor: line,
        gridTemplateColumns: spec.colWeights.map((w) => `minmax(0,${w}fr)`).join(' '),
        gridTemplateRows: `repeat(${spec.rows}, minmax(0,1fr))`,
      }}
    >
      {spec.slots.map((slot) => {
        const rect = slotRects[slot.id];
        return (
          <div
            key={slot.id}
            ref={registerSlot ? (el) => registerSlot(slot.id, el) : undefined}
            className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden"
            style={{
              gridColumn: slot.col + 1,
              gridRow: slot.rowIndex + 1,
              borderLeft: slot.col > 0 ? `1px solid ${line}` : undefined,
              borderTop: slot.rowIndex > 0 ? `1px solid ${line}` : undefined,
            }}
          >
            {cellContent(slot, rect)}
          </div>
        );
      })}
    </div>
  );
}

/** The ink on a card. Shared, so a control card and a live card are one thing. */
export function PieceFace({ piece, rect }: { piece: WorkPiece; rect: Rect }) {
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
  return (
    <span
      className="pointer-events-none block px-[4px] text-center font-bold leading-[1.15]"
      style={{
        fontSize: fitFont(rect, piece.text ?? '', piece.kind === 'word' ? 30 : 22),
        fontFamily: 'var(--dpl-font-display)',
      }}
    >
      {piece.text}
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

  const pile = useMemo(
    () =>
      pileBox
        ? packPile(pileBox, spec.pieces, slotRects, spec.rows * 7 + spec.n)
        : {},
    [pileBox, slotRects, spec.pieces, spec.rows, spec.n]
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

  const start = useCallback(() => {
    setPlaced({});
    setPhase('play');
    setScattering(true);
    window.setTimeout(() => setScattering(false), SCATTER_MS);
  }, []);

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
    const scale = isPlaced ? 1 : inPile.scale;
    const originX = isPlaced ? home.x : inPile.x;
    const originY = isPlaced ? home.y : inPile.y;
    const relX = (here.x - originX) / Math.max(1, home.w * scale);
    const relY = (here.y - originY) / Math.max(1, home.h * scale);

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
    window.setTimeout(() => setWrong((w) => (w === piece.id ? null : w)), WRONG_MS);
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

        const target = isDragging
          ? { x: drag.x, y: drag.y, scale: 1.04, rotate: 0 }
          : isPlaced
            ? { x: home.x, y: home.y, scale: 1, rotate: 0 }
            : { x: pos.x, y: pos.y, scale: pos.scale, rotate: pos.rot };

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
              width: home.w,
              height: home.h,
              transformOrigin: 'top left',
              touchAction: 'none',
              zIndex: isDragging ? 20 : isPlaced ? 5 : 10,
              cursor: showAnswer ? 'default' : 'grab',
              background: 'var(--dpl-slide-bg)',
              borderRadius: isPlaced ? 0 : 6,
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
            <PieceFace piece={piece} rect={home} />
          </motion.div>
        );
      })}
    </>
  );
}
