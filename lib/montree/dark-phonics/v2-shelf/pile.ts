/**
 * The pile — the loose heap of cut-out cards, as pure geometry.
 *
 * 🚨 A CARD IN THE PILE IS NOT A SHRUNKEN SLOT. That was the mistake this file
 * carried until 2026-09-14 (second pass): a piece was drawn at its HOME
 * RECTANGLE — the cell it belongs in, which for a sentence is a 630×135 strip
 * of the working sheet — and then squeezed by a CSS scale until the whole cast
 * fitted the tray. Two things follow from that and both were visible on glass:
 * the card keeps the slot's ASPECT, so a sentence card is a wide flat ribbon
 * that only fits the tray edge-to-edge and must therefore be heaped on top of
 * its neighbours; and the type inside rides the same scale down, so the words
 * were clipped to their tail ("…the pit!") with the beginning under the card
 * above. A child cannot choose a card they cannot read.
 *
 * SO A PIECE NOW HAS TWO GEOMETRIES, and only one of them comes from the sheet:
 *
 *   homeRect  the measured slot. What the card is drawn at once it is PLACED,
 *             and what it grows into while it is being dragged. Unchanged.
 *   pileSize  what the card is drawn at while it is loose in the tray, computed
 *             from its CONTENT: a word/sentence chip is exactly as wide as its
 *             own text at a fixed legible pile face, a picture is a square.
 *
 * Nothing scales. A chip is drawn at its own size with its own font size, so
 * there is no compounding "font × scale" to reason about and no size at which
 * the words disappear.
 *
 * AND THE PILE IS TIDY BEFORE IT IS A HEAP. The cards flow — top to bottom,
 * left to right, 8px apart, the block centred in the tray, each card given a
 * two-degree tilt so it reads as laid by hand rather than typeset. Only when
 * that flow genuinely will not fit the tray's height do the rows start to
 * OVERLAP, and even then the overlap eats the BOTTOM of the card above, never
 * its text: a row advances by at least its own height minus 4px.
 */

import type { WorkPiece } from './works';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where and how big one card is drawn while it is loose in the tray. */
export interface PilePos {
  x: number;
  y: number;
  /** The card's PILE size — its content's size, not its slot's. */
  w: number;
  h: number;
  /** Degrees. Small, deterministic, hand-laid. */
  rot: number;
  /** Stacking order within the pile — later cards lie on top. */
  z: number;
  /** The type size this chip is drawn at. Pictures carry the row's size too. */
  fontPx: number;
  /**
   * The chip's text, already broken into the lines it is drawn on — one line
   * normally, two when one would not fit the tray at the 16px floor. Absent on
   * a picture. The renderer draws exactly these and never re-wraps.
   */
  lines?: string[];
}

/* -------------------------------------------------------------------------- */
/* The numbers                                                                 */
/* -------------------------------------------------------------------------- */

/** Gap between cards in the pile, in device px. */
export const PILE_GAP = 8;

/**
 * The pile's own type size. A card in the tray is read at arm's length off a
 * tray, not fitted to a cell, so it has ONE size rather than a per-card fit.
 */
export const PILE_FONT_MAX = 22;
/** Dropped to this before the pile is allowed to start overlapping. */
export const PILE_FONT_MIN = 18;
/**
 * THE FLOOR, and it is absolute (raised from 13px, 2026-09-17).
 *
 * 🚨 A CHIP IS NEVER CLIPPED AND NEVER SET SMALLER THAN THIS. The old rule
 * answered a narrow tray by shrinking the type to 13px and then, when even that
 * did not fit, by capping the chip's BOX at the tray width — and the face is
 * `white-space: nowrap` inside an `overflow: hidden` card, so the last letters
 * were simply cut off. Measured on the rig: a 640px-wide stage put lesson 16's
 * "Apple chased the rat." at 13px in a 160px box needing 144px — legal by one
 * pixel, and one longer sentence away from being cut mid-letter.
 *
 * The order of degradation is now 22 → 18 → pictures smaller → 16 on ONE line →
 * 16 on TWO lines (see chipLines) → a WIDER TRAY (pileTrayWidth's hard cap) →
 * and only then the heap, which eats a card's bottom edge and never its text.
 */
export const PILE_FONT_FIT_MIN = 16;

/** A chip's padding around its single line of text. */
export const PILE_PAD_X = 14;
export const PILE_PAD_Y = 8;
/** The display face's line box, as a multiple of its size. */
export const PILE_LINE = 1.25;

/** A picture card is a square, between these. Two fit across a roomy tray. */
export const PILE_PICTURE_MIN = 72;
export const PILE_PICTURE_MAX = 120;
/** …and may be pressed this small, but only to avoid heaping pictures. */
export const PILE_PICTURE_FLOOR = 48;

/** The hand-laid tilt, in degrees. */
export const PILE_TILT = 2;

/**
 * The most of a card's height the row below may cover when the pile has run out
 * of room. Four pixels of the card's bottom edge — never a pixel of its text.
 */
export const HEAP_MAX_BITE = 4;
/** Pictures have no baseline to protect, so they may stack half-deep. */
export const HEAP_PICTURE_PITCH = 0.5;

/** The tray never takes less of the stage than this… */
export const PILE_MIN_PCT = 22;
/** …nor more, so the working sheet always keeps at least 72%. */
export const PILE_MAX_PCT = 28;
/**
 * …except that a chip a child cannot read is worse than a narrower sheet. When
 * even two lines at the 16px floor will not fit in 28%, the tray is allowed to
 * grow to this, and no further. Only ever reached by a book with a genuinely
 * long sentence on a genuinely narrow landscape stage.
 */
export const PILE_HARD_MAX_PCT = 40;
/** Slack around the widest chip, so the tray is never exactly its content. */
export const PILE_TRAY_SLACK = 24;

/* -------------------------------------------------------------------------- */
/* Measuring text                                                              */
/* -------------------------------------------------------------------------- */

/**
 * How wide `text` is at `fontPx` in the display face.
 *
 * The live board passes a canvas-backed measurer (see work-engine.tsx) so the
 * chip is exactly as wide as the glyphs it holds; everything that has no DOM —
 * the tests, the first render before mount — uses the estimate below.
 */
export type MeasureText = (text: string, fontPx: number) => number;

/**
 * The display face's average advance is about 0.56em at these sizes. Used only
 * where there is no canvas; it errs WIDE, so a chip sized from it is roomy
 * rather than clipped.
 */
export const estimateTextWidth: MeasureText = (text, fontPx) =>
  text.length * fontPx * 0.56;

/* -------------------------------------------------------------------------- */
/* One card's pile size                                                        */
/* -------------------------------------------------------------------------- */

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}

/** The side of a picture card in a tray this wide: two across when they fit. */
export function pictureSide(trayInnerW: number, floor = PILE_PICTURE_MIN): number {
  const twoAcross = Math.floor((trayInnerW - PILE_GAP) / 2);
  return Math.min(trayInnerW, clamp(twoAcross, floor, PILE_PICTURE_MAX));
}

/**
 * How `text` breaks onto at most `maxLines` lines inside `innerW` px at
 * `fontPx`, or `null` when it genuinely will not go.
 *
 * BALANCED, NEAR THE MIDDLE. A sentence card is read as a phrase, so the break
 * that reads best is the one that leaves the two lines most nearly equal —
 * "Apple chased" / "the rat." rather than "Apple chased the" / "rat." Every
 * space is tried and the split with the smallest wider-line width wins; ties go
 * to the earlier break, which puts the longer half on top the way a printed
 * caption does. A single word is never broken: there is no hyphenation in a
 * book for four-year-olds.
 */
export function chipLines(
  text: string,
  fontPx: number,
  innerW: number,
  measure: MeasureText,
  maxLines = 2
): string[] | null {
  const whole = text.trim();
  if (!whole) return null;
  if (measure(whole, fontPx) <= innerW) return [whole];
  if (maxLines < 2) return null;

  const words = whole.split(/\s+/u);
  if (words.length < 2) return null;
  let best: { lines: string[]; wider: number } | null = null;
  for (let cut = 1; cut < words.length; cut += 1) {
    const a = words.slice(0, cut).join(' ');
    const b = words.slice(cut).join(' ');
    const wa = measure(a, fontPx);
    const wb = measure(b, fontPx);
    const wider = Math.max(wa, wb);
    if (wider > innerW) continue;
    if (!best || wider < best.wider) best = { lines: [a, b], wider };
  }
  return best ? best.lines : null;
}

/**
 * A chip's box for `text` at `fontPx` — one line, or two when one will not fit.
 *
 * 🚨 IT NO LONGER CAPS THE BOX AT THE TRAY AND HOPES. That cap is exactly what
 * cut the words off: the box stopped at the tray's edge while the face inside
 * it kept its nowrap line. `null` now means "this size does not fit", which is
 * an answer layoutPile() can act on, and the box that comes back is always big
 * enough for every line it reports.
 */
export function chipBox(
  text: string,
  fontPx: number,
  trayInnerW: number,
  measure: MeasureText,
  maxLines = 2
): { w: number; h: number; lines: string[] } | null {
  const innerW = Math.max(1, trayInnerW - PILE_PAD_X * 2);
  const lines = chipLines(text, fontPx, innerW, measure, maxLines);
  if (!lines) return null;
  const w = Math.ceil(Math.max(...lines.map((l) => measure(l, fontPx)))) + PILE_PAD_X * 2;
  const h = Math.ceil(fontPx * PILE_LINE * lines.length) + PILE_PAD_Y * 2;
  return { w: Math.min(w, Math.max(1, trayInnerW)), h, lines };
}

/**
 * A chip's box for ONE line of `text` at `fontPx`, never wider than the tray.
 *
 * SUPERSEDED by chipBox() for layout — kept because it is the honest answer to
 * "how big is this chip on one line", which the tray-width budget still asks.
 */
export function chipSize(
  text: string,
  fontPx: number,
  trayInnerW: number,
  measure: MeasureText
): { w: number; h: number } {
  const w = Math.min(
    Math.max(1, trayInnerW),
    Math.ceil(measure(text, fontPx)) + PILE_PAD_X * 2
  );
  return { w, h: Math.ceil(fontPx * PILE_LINE) + PILE_PAD_Y * 2 };
}

/**
 * The largest pile type size at which the LONGEST card in the cast still fits
 * the tray on one line. Capped at PILE_FONT_MAX, floored at PILE_FONT_FIT_MIN.
 */
export function pileFontFor(
  pieces: readonly WorkPiece[],
  trayInnerW: number,
  measure: MeasureText = estimateTextWidth,
  max = PILE_FONT_MAX
): number {
  const avail = Math.max(1, trayInnerW - PILE_PAD_X * 2);
  let font = max;
  for (const piece of pieces) {
    const text = piece.kind === 'picture' ? '' : (piece.text ?? '');
    if (!text) continue;
    const wide = measure(text, max);
    if (wide <= avail) continue;
    font = Math.min(font, Math.floor((max * avail) / wide));
  }
  return clamp(font, PILE_FONT_FIT_MIN, max);
}

/**
 * Every card's pile size, at one type size, one picture side and a line budget.
 *
 * `null` when ANY chip will not fit at that size in that many lines — which is
 * the whole point: the caller then tries the next rung of the ladder instead of
 * quietly handing back a box too small for its own words.
 */
export function pileSizes(
  pieces: readonly WorkPiece[],
  opts: {
    trayInnerW: number;
    fontPx: number;
    side: number;
    measure?: MeasureText;
    maxLines?: number;
  }
): Record<string, PileBox> | null {
  const measure = opts.measure ?? estimateTextWidth;
  const out: Record<string, PileBox> = {};
  for (const piece of pieces) {
    if (piece.kind === 'picture') {
      out[piece.id] = { w: opts.side, h: opts.side };
      continue;
    }
    const box = chipBox(
      piece.text ?? '',
      opts.fontPx,
      opts.trayInnerW,
      measure,
      opts.maxLines ?? 2
    );
    if (!box) return null;
    out[piece.id] = box;
  }
  return out;
}

/** A card's box in the pile, with the lines its text is broken onto. */
export interface PileBox {
  w: number;
  h: number;
  lines?: string[];
}

/* -------------------------------------------------------------------------- */
/* The tray's width                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The px the tray needs for its widest card, plus slack.
 *
 * 🚨 DERIVED FROM THE CONTENT, NOT FROM THE COUNT. Twelve short word cards and
 * twelve sentences are the same number and want very different trays; the old
 * "20% + 1% per card" gave them the same one, which is why lesson 5's sentence
 * work had to heap and clip. A picture-only cast asks only for one column of
 * squares — pictures tile happily two-up in whatever is left.
 */
export function pileNeededWidth(
  pieces: readonly WorkPiece[],
  measure: MeasureText = estimateTextWidth
): number {
  let widest = 0;
  for (const piece of pieces) {
    if (piece.kind === 'picture') {
      widest = Math.max(widest, PILE_PICTURE_MIN);
      continue;
    }
    const text = piece.text ?? '';
    if (!text) continue;
    widest = Math.max(
      widest,
      Math.ceil(measure(text, PILE_FONT_MAX)) + PILE_PAD_X * 2
    );
  }
  return Math.ceil(widest) + PILE_TRAY_SLACK;
}

/**
 * The px the tray needs so that NOTHING is ever set below the 16px floor: the
 * widest card's best two-line break at 16px, plus padding and slack.
 *
 * This is the hard requirement — the number the tray is allowed to break the
 * 28% cap for. It is roughly half a long sentence's one-line width, so on any
 * ordinary stage it asks for less than the preferred budget below and changes
 * nothing; it only bites on a narrow landscape stage, which is exactly where
 * the 13px clipping used to happen.
 */
export function pileMinimumWidth(
  pieces: readonly WorkPiece[],
  measure: MeasureText = estimateTextWidth
): number {
  let widest = 0;
  for (const piece of pieces) {
    if (piece.kind === 'picture') {
      widest = Math.max(widest, PILE_PICTURE_FLOOR);
      continue;
    }
    const text = (piece.text ?? '').trim();
    if (!text) continue;
    const words = text.split(/\s+/u);
    let best = measure(text, PILE_FONT_FIT_MIN);
    for (let cut = 1; cut < words.length; cut += 1) {
      const wider = Math.max(
        measure(words.slice(0, cut).join(' '), PILE_FONT_FIT_MIN),
        measure(words.slice(cut).join(' '), PILE_FONT_FIT_MIN)
      );
      best = Math.min(best, wider);
    }
    widest = Math.max(widest, Math.ceil(best) + PILE_PAD_X * 2);
  }
  return Math.ceil(widest) + PILE_TRAY_SLACK;
}

/**
 * The tray's width as CSS: `min(28%, max(<needed>px, 22%))`.
 *
 * The cap is the important half — the working sheet is the thing being read, so
 * it keeps at least 72% of the stage however long the sentences are, and a cast
 * too long for the tray at 22px is answered by a smaller pile face (never by a
 * clipped one). One helper, called by the live board and by the control board,
 * so the two can never drift.
 *
 * Also accepts a bare piece COUNT, which is what the pre-2026-09-14 callers and
 * their tests pass; that path keeps the old count-derived percentage.
 */
export function pileTrayWidth(
  pieces: readonly WorkPiece[] | number,
  measure: MeasureText = estimateTextWidth
): string {
  if (typeof pieces === 'number') {
    return `clamp(120px, ${pileWidthPercent(pieces)}%, ${PILE_MAX_PCT}%)`;
  }
  const need = pileNeededWidth(pieces, measure);
  const preferred = `min(${PILE_MAX_PCT}%, max(${need}px, ${PILE_MIN_PCT}%))`;
  // …but never narrower than the 16px floor needs, and never past the hard cap.
  const hard = pileMinimumWidth(pieces, measure);
  return `min(${PILE_HARD_MAX_PCT}%, max(${preferred}, ${hard}px))`;
}

/**
 * SUPERSEDED by pileNeededWidth(): the tray's width used to grow with the
 * number of cards rather than with what is written on them. Kept because the
 * numeric form of pileTrayWidth() above still uses it, and because the
 * count-derived budget is still the honest answer when there is nothing to
 * measure (a cast of bare pictures asks the same of the tray whatever its size).
 */
export function pileWidthPercent(pieceCount: number): number {
  const pct = 20 + Math.max(0, pieceCount);
  return Math.min(PILE_MAX_PCT, Math.max(20, Math.round(pct * 10) / 10));
}

/* -------------------------------------------------------------------------- */
/* Typography on a PLACED card                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The largest size at which `text` still sits inside `rect`, bounded by `max`.
 * Mirrors build_book_works.py's fit(): the type is sized from the string and
 * the cell, never assumed. 0.52 is the average glyph advance of the display
 * face as a fraction of its size — close enough to size confidently and cheap
 * enough to run on every measure.
 *
 * This is the PLACED card's rule and the printed cell's rule. A card in the
 * pile does not use it: it has its own size and its own face size.
 */
export function fitFont(rect: Rect | undefined, text: string, max: number): number {
  if (!rect || !text) return max;
  const byHeight = rect.h * 0.44;
  const byWidth = (rect.w - 10) / Math.max(1, text.length * 0.52);
  return Math.max(10, Math.min(max, byHeight, byWidth));
}

/** The smallest a PLACED card's type may be before it wraps instead. */
export const PLACED_WRAP_BELOW = 14;

/**
 * A placed card's type size AND its lines.
 *
 * A card in a cell is fitted to the cell (fitFont). On a phone the cells of a
 * five-column sheet are narrow, and fitting "doesn't" into one drives the type
 * under 14px — at which point a second line is the better trade, exactly as it
 * is in the pile. Only a multi-word text can wrap; a single word is fitted and
 * left alone.
 */
export function fitFontWrapped(
  rect: Rect | undefined,
  text: string,
  max: number
): { fontPx: number; lines: string[] } {
  const one = fitFont(rect, text, max);
  const words = text.trim().split(/\s+/u);
  if (!rect || one >= PLACED_WRAP_BELOW || words.length < 2) {
    return { fontPx: one, lines: [text] };
  }
  // Two lines share the height, so each line is fitted to half the cell.
  const half: Rect = { ...rect, h: rect.h / 2 };
  let best: { fontPx: number; lines: string[] } | null = null;
  for (let cut = 1; cut < words.length; cut += 1) {
    const lines = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
    const fontPx = Math.min(...lines.map((l) => fitFont(half, l, max)));
    if (!best || fontPx > best.fontPx) best = { fontPx, lines };
  }
  return best && best.fontPx > one ? best : { fontPx: one, lines: [text] };
}

/* -------------------------------------------------------------------------- */
/* The layout                                                                  */
/* -------------------------------------------------------------------------- */

/** A stable 0..1 from a card's id, so its tilt is its own and never moves. */
function hashUnit(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 8) / 0x1000000;
}

interface Row {
  ids: string[];
  w: number;
  h: number;
  /** True when any card in the row carries type whose baseline must show. */
  text: boolean;
}

/**
 * The order the tray is filled in: every picture square, then every chip.
 *
 * 🚨 NOT THE CAST ORDER. works.ts interleaves a work's pieces the way the sheet
 * reads them — picture, sentence, picture, sentence — and a greedy flow laid out
 * in that order puts one 230px chip on a row of its own, then one 120px square
 * on a row of its own, and wastes half the tray on ragged ends. Grouped, the
 * squares tile two or three across and the chips stack one per row, which is
 * both tidier and MUCH shorter, so a pile that would have had to overlap fits
 * flat instead. A loose heap of cut-out cards has no canonical order anyway;
 * within each kind the cast's own order is kept, so the pile is still stable.
 */
function pileOrder(pieces: readonly WorkPiece[]): WorkPiece[] {
  return [
    ...pieces.filter((p) => p.kind === 'picture'),
    ...pieces.filter((p) => p.kind !== 'picture'),
  ];
}

/** Greedy shelf rows, left to right, in pile order. */
function rowsFor(
  pieces: readonly WorkPiece[],
  sizes: Record<string, PileBox>,
  boxW: number
): Row[] {
  const rows: Row[] = [];
  let row: Row = { ids: [], w: 0, h: 0, text: false };
  for (const piece of pieces) {
    const size = sizes[piece.id];
    if (!size) continue;
    const next = row.ids.length ? row.w + PILE_GAP + size.w : size.w;
    if (row.ids.length && next > boxW) {
      rows.push(row);
      row = { ids: [], w: 0, h: 0, text: false };
    }
    row.w = row.ids.length ? row.w + PILE_GAP + size.w : size.w;
    row.h = Math.max(row.h, size.h);
    row.text = row.text || piece.kind !== 'picture';
    row.ids.push(piece.id);
  }
  if (row.ids.length) rows.push(row);
  return rows;
}

/** The height the rows want when nothing overlaps. */
function flowHeight(rows: readonly Row[]): number {
  if (!rows.length) return 0;
  return rows.reduce((t, r) => t + r.h, 0) + PILE_GAP * (rows.length - 1);
}

/**
 * How far the row after row `i` may be pulled up: never past the point where it
 * would cover that row's text.
 */
function minAdvance(row: Row): number {
  return row.text
    ? Math.max(1, row.h - HEAP_MAX_BITE)
    : Math.max(1, row.h * HEAP_PICTURE_PITCH);
}

/** Place the rows, given a per-row advance, and centre the block. */
function placeRows(
  box: Rect,
  rows: readonly Row[],
  sizes: Record<string, PileBox>,
  advances: readonly number[],
  fontPx: number
): Record<string, PilePos> {
  const total =
    rows.length === 0
      ? 0
      : advances.slice(0, rows.length - 1).reduce((t, a) => t + a, 0) +
        rows[rows.length - 1].h;
  const dy = Math.max(0, (box.h - total) / 2);
  const out: Record<string, PilePos> = {};
  let y = box.y + dy;
  let z = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let x = box.x + Math.max(0, (box.w - row.w) / 2);
    for (const id of row.ids) {
      const size = sizes[id];
      out[id] = {
        // Clamped, not merely offset: a tray with no slack must still hold
        // every card inside itself.
        x: clamp(x, box.x, box.x + Math.max(0, box.w - size.w)),
        y: clamp(
          y + (row.h - size.h) / 2,
          box.y,
          box.y + Math.max(0, box.h - size.h)
        ),
        w: size.w,
        h: size.h,
        rot: (hashUnit(id) * 2 - 1) * PILE_TILT,
        z: z++,
        fontPx,
        lines: size.lines,
      };
      x += size.w + PILE_GAP;
    }
    y += advances[i] ?? row.h;
  }
  return out;
}

/**
 * Lay the loose cards out in the tray.
 *
 * THE LADDER, and it stops at the first rung that fits:
 *
 *   1. the tidy flow at the pile's full face — 22px, one line;
 *   2. the same flow at 18px, one line;
 *   3. the same flow with the picture squares pressed down towards 48px, since
 *      a picture survives being small in a way that type does not;
 *   4. 16px, one line — the floor;
 *   5. 18px on TWO lines, then 16px on two lines: a sentence chip breaks near
 *      its middle rather than getting smaller, because 16px is the smallest a
 *      four-year-old should be asked to read;
 *   6. the HEAP: the rows pulled together until they fit, each row still
 *      showing everything but the last 4px of the row above.
 *
 * 🚨 THE TYPE NEVER GOES BELOW 16px AND THE TEXT IS NEVER CUT. Below the floor
 * the answer is a WIDER TRAY, and that is pileTrayWidth()'s job (it budgets for
 * rung 5 and may take up to PILE_HARD_MAX_PCT of the stage) — by the time the
 * pile is laid out the tray is as wide as it is going to get. The one case this
 * cannot answer is a SINGLE WORD wider than the whole tray, which no book has;
 * it is laid at the floor at its natural width and allowed to overhang, because
 * a word a child can read sticking out past a dashed line beats a word cut in
 * half inside it.
 */
export function layoutPile(
  box: Rect,
  pieces: readonly WorkPiece[],
  measure: MeasureText = estimateTextWidth,
  opts: { fontMax?: number } = {}
): Record<string, PilePos> {
  if (!pieces.length || box.w <= 0 || box.h <= 0) return {};

  const laid = pileOrder(pieces);
  const attempt = (fontPx: number, side: number, maxLines: number) => {
    const sizes = pileSizes(laid, {
      trayInnerW: box.w,
      fontPx,
      side,
      measure,
      maxLines,
    });
    if (!sizes) return null;
    const rows = rowsFor(laid, sizes, box.w);
    return { sizes, rows, fontPx, height: flowHeight(rows) };
  };

  const big = pileFontFor(pieces, box.w, measure, opts.fontMax ?? PILE_FONT_MAX);
  const mid = Math.min(big, PILE_FONT_MIN);
  const wide = pictureSide(box.w);
  const sides: number[] = [];
  for (let side = wide - 8; side >= PILE_PICTURE_FLOOR; side -= 8) sides.push(side);
  const tightest = sides.length ? sides[sides.length - 1] : wide;

  const ladder: Array<{ font: number; side: number; lines: number }> = [
    { font: big, side: wide, lines: 1 },
  ];
  if (mid < big) ladder.push({ font: mid, side: wide, lines: 1 });
  for (const side of sides) ladder.push({ font: mid, side, lines: 1 });
  if (PILE_FONT_FIT_MIN < mid) ladder.push({ font: PILE_FONT_FIT_MIN, side: tightest, lines: 1 });
  // Wrapping comes AFTER every one-line size and BEFORE any size below 16.
  ladder.push({ font: PILE_FONT_MIN, side: tightest, lines: 2 });
  ladder.push({ font: PILE_FONT_FIT_MIN, side: tightest, lines: 2 });
  // A tray so narrow that even two lines will not go: more lines before less
  // type. Three is as far as a chip is ever broken.
  ladder.push({ font: PILE_FONT_FIT_MIN, side: tightest, lines: 3 });

  const tries = ladder
    .map((rung) => attempt(rung.font, rung.side, rung.lines))
    .filter((t): t is NonNullable<typeof t> => t !== null);

  for (const t of tries) {
    if (t.height <= box.h) {
      return placeRows(
        box,
        t.rows,
        t.sizes,
        t.rows.map((r) => r.h + PILE_GAP),
        t.fontPx
      );
    }
  }

  // Nothing on the ladder even fits the tray's WIDTH — a single word wider than
  // the whole tray. Lay it at the floor, at its own width, overhanging.
  const last = tries.length
    ? tries[tries.length - 1]
    : (() => {
        const sizes: Record<string, PileBox> = {};
        for (const piece of laid) {
          sizes[piece.id] =
            piece.kind === 'picture'
              ? { w: tightest, h: tightest }
              : {
                  w:
                    Math.ceil(measure(piece.text ?? '', PILE_FONT_FIT_MIN)) +
                    PILE_PAD_X * 2,
                  h: Math.ceil(PILE_FONT_FIT_MIN * PILE_LINE) + PILE_PAD_Y * 2,
                  lines: [piece.text ?? ''],
                };
        }
        const rows = rowsFor(laid, sizes, box.w);
        return { sizes, rows, fontPx: PILE_FONT_FIT_MIN, height: flowHeight(rows) };
      })();

  // The heap. Pull the rows together as far as the text allows, no further.
  const { rows, sizes, fontPx } = last;
  const natural = rows.map((r) => r.h + PILE_GAP);
  const tight = rows.map((r) => minAdvance(r));
  const lastH = rows[rows.length - 1]?.h ?? 0;
  const sum = (a: readonly number[]) =>
    a.slice(0, Math.max(0, rows.length - 1)).reduce((t, v) => t + v, 0) + lastH;
  const hi = sum(natural);
  const lo = sum(tight);
  if (lo > box.h) {
    // Even the tight heap will not fit — more cards than the tray has room for
    // at any honest pitch. Spread them evenly over exactly the height there is,
    // rather than clamping the tail into one stack at the bottom: the pile is
    // then deep, but it is still ordered top to bottom and every card is still
    // grabbable by its own edge.
    const even = Math.max(1, (box.h - lastH) / Math.max(1, rows.length - 1));
    return placeRows(box, rows, sizes, rows.map(() => even), fontPx);
  }
  const t = hi > lo ? clamp((hi - box.h) / (hi - lo), 0, 1) : 1;
  const advances = natural.map((n, i) => n + (tight[i] - n) * t);
  return placeRows(box, rows, sizes, advances, fontPx);
}
