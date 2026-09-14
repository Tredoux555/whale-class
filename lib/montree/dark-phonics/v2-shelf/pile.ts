/**
 * The pile — the loose heap of cut-out cards, as pure geometry.
 *
 * 🚨 THIS IS THE ENGINE'S GEOMETRY, LIFTED OUT OF IT ON 2026-09-14 SO IT CAN BE
 * TESTED. work-engine.tsx still exports every name below, so nothing that used
 * to import them had to change; what changed is that the packing rules — which
 * decide whether a four-year-old can READ the word on a card — are now plain
 * functions with no React, no DOM and no framer-motion around them, and are
 * asserted in tests/dark-phonics-v2-shelf.test.ts rather than eyeballed.
 *
 * THE RULE THAT MATTERS: A CARD IS NOT ALLOWED TO SHRINK INTO ILLEGIBILITY.
 * The packer used to bisect one global scale down to 0.2 to make everything fit
 * side by side in the tray, which on a seven-row free builder rendered a word
 * card's type at about six pixels. So the scale now has a FLOOR, and when the
 * cards will not fit at the floor they stop tiling and start HEAPING — fanned,
 * overlapping rows, exactly like a real pile of laminated cards on a tray, each
 * card's top edge still showing so a finger can pull it out.
 */

import type { WorkPiece } from './works';

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
  /** Stacking order within the pile — later cards lie on top. */
  z: number;
}

/** Gap between cards in the pile, in device px. */
export const PILE_GAP = 8;

/**
 * The smallest a WORD card may be drawn in the pile. Below about this the
 * display face stops being a word and becomes a smudge — and the whole work is
 * "read the card, find its home".
 */
export const MIN_PILE_SCALE = 0.62;
/** Pictures survive smaller than type does. */
export const MIN_PICTURE_SCALE = 0.5;
/** The smallest type may render at ON SCREEN, after the pile's own scale. */
export const MIN_PIECE_FONT_PX = 15;

/**
 * The tray's width budget, as a percentage of the stage.
 *
 * 🚨 RAISED FROM 14%/1.2%/26%/96px ON 2026-09-14: that budget was tuned
 * against a TEXT-only cast, and it quietly halved the tray for a
 * picture-bearing work — work1/work2's picture cards used to get a flat 34%
 * (see MatchWork.tsx's old pileTrayClass()) and dropped to ~21-24% under the
 * count-aware formula, which is a regression a director can see: the picture
 * cards got smaller than before, not just differently laid out. Pictures
 * survive smaller TYPE than words do (MIN_PICTURE_SCALE), but a smaller BOX is
 * a smaller picture regardless, so the floor here is set from the picture
 * casts' own old width rather than the word casts'.
 */
export const PILE_BASE_PCT = 20;
export const PILE_PCT_PER_PIECE = 1;
/** The grid keeps at least 70%(ish) of the stage, so the tray never passes this. */
export const PILE_MAX_PCT = 28;
/** …and never gets so narrow that a single card cannot lie in it. */
export const PILE_MIN_PX = 120;

/** A heaped row is offset by this much of a card's height. */
export const HEAP_ROW_PITCH = 0.58;
/** …and tilted by up to this many degrees, deterministically. */
export const HEAP_TILT = 3;

/* -------------------------------------------------------------------------- */
/* The tray's width                                                            */
/* -------------------------------------------------------------------------- */

/**
 * How wide the tray should be for this many cards, as a percentage of the
 * stage. One helper, called by the live board and by the control board, so the
 * two can never drift — and tunable in one place.
 */
export function pileWidthPercent(pieceCount: number): number {
  const pct = PILE_BASE_PCT + PILE_PCT_PER_PIECE * Math.max(0, pieceCount);
  return Math.min(PILE_MAX_PCT, Math.max(PILE_BASE_PCT, Math.round(pct * 10) / 10));
}

/** The same number as a CSS width, floored so a card always fits across it. */
export function pileTrayWidth(pieceCount: number): string {
  return `clamp(${PILE_MIN_PX}px, ${pileWidthPercent(pieceCount)}%, ${PILE_MAX_PCT}%)`;
}

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

/**
 * fitFont(), but honouring the size the card is actually DRAWN at.
 *
 * 🚨 A CARD IN THE PILE IS DRAWN THROUGH A CSS SCALE, so its type renders at
 * fontSize × scale — and fitFont(), which knows only the full-size home slot,
 * cheerfully returned 24px for a card being drawn at 0.3 and put six-pixel
 * words in the tray. When that happens the size is pushed back up until it
 * renders at MIN_PIECE_FONT_PX, but never past what the card's own WIDTH can
 * hold (the width rule is the one that decides whether a word is cut off) nor
 * far past its height. It is a floor, never a shrink: a card that already reads
 * well keeps exactly the size fitFont gave it.
 */
export function pieceFontSize(
  rect: Rect | undefined,
  text: string,
  max: number,
  scale = 1
): number {
  const base = fitFont(rect, text, max);
  if (!rect || !text || scale <= 0 || scale >= 1) return base;
  if (base * scale >= MIN_PIECE_FONT_PX) return base;
  const wanted = MIN_PIECE_FONT_PX / scale;
  const byWidth = (rect.w - 10) / Math.max(1, text.length * 0.52);
  // A little taller than fitFont's own 0.44 allowance: the cap letters of the
  // display face sit well inside this, and a word that reads is the point.
  const byHeight = rect.h * 0.72;
  return Math.max(base, Math.min(wanted, byWidth, byHeight));
}

/* -------------------------------------------------------------------------- */
/* The pack                                                                    */
/* -------------------------------------------------------------------------- */

/** Deterministic jitter, so the same pile looks the same every time. */
function jitter(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** A stable 0..1 from a card's id, so its tilt is its own and never moves. */
function hashUnit(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 8) / 0x1000000;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}

/** The floor this pile may not shrink below: type is stricter than pictures. */
export function pileScaleFloor(pieces: readonly WorkPiece[]): number {
  const anyText = pieces.some((p) => p.kind !== 'picture');
  return anyText ? MIN_PILE_SCALE : MIN_PICTURE_SCALE;
}

/**
 * Shelf-pack the cards into the pile box, as large as they will go.
 *
 * A pile that overflows its box would put cards under the grid or off-screen,
 * so the scale is found by bisection rather than guessed: the largest s in
 * [floor, 1] at which every card still fits. Cards keep their own aspect — a
 * picture card stays a picture card — because they are the SAME cards that must
 * drop back into their slots.
 *
 * 🚨 THE PACKED ROWS ARE THEN CENTRED, both ways. Work 3 cuts out only the
 * words that change, so a pile can be four cards where it used to be sixteen;
 * pinned to the top-left corner of a tall tray that reads as a mistake rather
 * than as a little heap of cards. Centring costs one pass over the shelves and
 * makes a small pile and a full one look like the same material.
 *
 * 🚨 AND THE JITTERED CARD IS THEN CLAMPED BACK INSIDE THE TRAY. The jitter
 * used to be called "always inward", which was only true while there was slack
 * to be inward INTO. A pile that fits is a promise the packer makes; it keeps
 * it here rather than in a comment.
 *
 * 🚨 AND IF EVEN THE FLOOR WILL NOT TILE, THE CARDS HEAP. See heapPile().
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
    /** Each committed card's DRAWN size, so the shift pass can clamp it. */
    const drawn: Record<string, { w: number; h: number }> = {};
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
          z: i,
        };
        drawn[pieces[i].id] = { w, h };
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
        const size = drawn[id];
        // Clamped, not merely offset: the jitter is the only thing that can
        // push a card past the edge the bisection proved it fits inside, and a
        // full tray has no slack to absorb it. See the header note.
        const maxX = box.x + Math.max(0, box.w - size.w);
        const maxY = box.y + Math.max(0, box.h - size.h);
        out[id].x = Math.min(out[id].x + box.x + dx, maxX);
        out[id].y = Math.min(out[id].y + box.y + dy, maxY);
      }
    }
    return out;
  };

  const floor = pileScaleFloor(pieces);
  if (fits(1, false) === true) return fits(1, true) as Record<string, PilePos>;
  if (fits(floor, false) !== true) {
    // Not even the floor tiles. Heap them rather than shrink the words away.
    return heapPile(box, pieces, sizes as Rect[], floor);
  }
  let lo = floor;
  let hi = 1;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid, false) === true) lo = mid;
    else hi = mid;
  }
  return fits(lo, true) as Record<string, PilePos>;
}

/**
 * The heap: fanned, overlapping stacks, at the scale floor.
 *
 * This is what a real tray of laminated cards looks like when there are more of
 * them than the tray has room to lay out flat — and it is the honest answer to
 * "there is no room", because the alternative the packer used to give (keep
 * bisecting) answers it by making the words unreadable, which breaks the work.
 * Each row overlaps the one above by a little under half a card, so every
 * card's top edge — where the word is — stays visible and grabbable, and later
 * cards lie on top of earlier ones the way a dealt pile does.
 */
function heapPile(
  box: Rect,
  pieces: readonly WorkPiece[],
  sizes: readonly Rect[],
  s: number
): Record<string, PilePos> {
  const w = Math.max(...sizes.map((z) => z.w)) * s;
  const h = Math.max(...sizes.map((z) => z.h)) * s;
  const cols = Math.max(1, Math.floor((box.w + PILE_GAP) / Math.max(1, w + PILE_GAP)));
  const rows = Math.max(1, Math.ceil(pieces.length / cols));
  const colPitch =
    cols > 1 ? Math.min(w + PILE_GAP, Math.max(0, box.w - w) / (cols - 1)) : 0;
  const rowPitch =
    rows > 1
      ? Math.min(h * HEAP_ROW_PITCH, Math.max(0, box.h - h) / (rows - 1))
      : 0;
  const usedW = w + colPitch * (cols - 1);
  const usedH = h + rowPitch * (rows - 1);
  const originX = box.x + Math.max(0, (box.w - usedW) / 2);
  const originY = box.y + Math.max(0, (box.h - usedH) / 2);

  const out: Record<string, PilePos> = {};
  pieces.forEach((piece, i) => {
    const size = sizes[i];
    const cw = size.w * s;
    const ch = size.h * s;
    const col = i % cols;
    const row = Math.floor(i / cols);
    out[piece.id] = {
      x: clamp(originX + col * colPitch, box.x, box.x + Math.max(0, box.w - cw)),
      y: clamp(originY + row * rowPitch, box.y, box.y + Math.max(0, box.h - ch)),
      scale: s,
      rot: (hashUnit(piece.id) * 2 - 1) * HEAP_TILT,
      z: i,
    };
  });
  return out;
}
