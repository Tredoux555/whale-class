/**
 * render/geometry.ts — THE single source of every locked print constant.
 *
 * Ported verbatim from:
 *   - components/card-generator/print-utils.ts  (square 3-part + strip layout)
 *   - public/tools/picture-bingo-generator.html  (bingo boards + duplex cards)
 *   - docs/curriculum/tools/build_week01_pack.py  (house geometry the packs use)
 *   - docs/curriculum/tools/build_week01_book.py  (A5-landscape book)
 *
 * 🚨 No builder may hard-code a magic number. Everything comes from here.
 * All values in centimetres unless the name ends in _MM / _PT / _PX.
 */

// ── Page ────────────────────────────────────────────────────────────────
export const A4_WIDTH_CM = 21;
export const A4_HEIGHT_CM = 29.7;

// ── Shared frame technique ──────────────────────────────────────────────
/** Coloured frame width around every card (the "white border" padding). */
export const WHITE_BORDER_CM = 0.5;
/** Card corner radius. */
export const CARD_BORDER_RADIUS_CM = 0.4;

// ── Design language ─────────────────────────────────────────────────────
/** Print-material frame colour (CardGenerator default). */
export const FRAME_COLOR = '#2D5A27';
/** Card text ink (house). */
export const INK = '#1f2937';
/** Montessori vowel blue. */
export const VOWEL_BLUE = '#2456c7';
/** Book palette (dark forest / gold / emerald glow). */
export const BOOK_FOREST = '#0a1a0f';
export const BOOK_FOREST_DEEP = '#070f0a';
export const BOOK_GOLD = '#E8C96A';
export const BOOK_EMERALD = '#34d399';

/** Kids font stack — Andika bundled via @font-face, Comic Sans fallback. */
export const KIDS_FONT = "'Andika', 'Comic Sans MS', 'Comic Sans', cursive";
/** Heading font used on bingo headers (matches the HTML generator). */
export const HEADING_FONT = "'Nunito', system-ui, sans-serif";
/** Book body font. */
export const BOOK_FONT = "'Andika', 'Comic Sans MS', sans-serif";

/** The five vowels (lower-case) — vowel-wall + colouring rules. */
export const VOWELS = ['a', 'e', 'i', 'o', 'u'] as const;

// ── 3-part square cards (DEFAULT_CARD_SIZE_CM = 7.5) ─────────────────────
export const DEFAULT_CARD_SIZE_CM = 7.5;

export interface SquareLayout {
  cols: number;
  pictureRows: number;
  controlRows: number;
  labelRows: number;
  picturePerPage: number;
  controlPerPage: number;
  labelPerPage: number;
  labelHeight: number;
  labelInternal: number;
  controlHeight: number;
  cardSize: number;
  fontSize: number;
}

/** Port of print-utils.ts computeLayout(). */
export function computeSquareLayout(cardSizeCm: number = DEFAULT_CARD_SIZE_CM): SquareLayout {
  const s = cardSizeCm;
  const cols = Math.max(1, Math.floor(A4_WIDTH_CM / s));
  const pictureRows = Math.max(1, Math.floor(A4_HEIGHT_CM / s));

  const labelHeight = Math.max(2, Math.round(s * 0.32 * 10) / 10);
  const labelInternal = Math.max(1.4, labelHeight - 0.6);

  const controlHeight = s + labelHeight;
  const controlRows = Math.max(1, Math.floor(A4_HEIGHT_CM / controlHeight));

  const picturePerPage = cols * pictureRows;
  const controlPerPage = cols * controlRows;

  const labelRows = Math.max(1, Math.floor(A4_HEIGHT_CM / labelHeight));
  const labelPerPage = cols * labelRows;

  const fontSize = Math.max(12, Math.min(36, Math.round(s * 3.2)));

  return {
    cols, pictureRows, controlRows, labelRows,
    picturePerPage, controlPerPage, labelPerPage,
    labelHeight, labelInternal, controlHeight,
    cardSize: s, fontSize,
  };
}

// ── Sentence strips (cardSizeCm = 6.5) ──────────────────────────────────
export const DEFAULT_STRIP_SIZE_CM = 6.5;

export interface StripLayout {
  stripHeight: number;
  stripWidth: number;
  sentenceWidth: number;
  pictureSize: number;
  internalGap: number;
  stripsPerPage: number;
  picCols: number;
  picRows: number;
  picPerPage: number;
  fontSize: number;
}

/** Port of print-utils.ts computeStripLayout(). */
export function computeStripLayout(cardSizeCm: number = DEFAULT_STRIP_SIZE_CM): StripLayout {
  const stripHeight = cardSizeCm;             // 6.5cm
  const stripWidth = A4_WIDTH_CM;             // 21cm — full A4 width (control card width)
  const pictureSize = stripHeight;            // 6.5×6.5cm square picture
  const sentenceWidth = stripWidth - pictureSize; // 14.5cm
  const internalGap = WHITE_BORDER_CM * 2;    // 1cm gap inside control

  const stripsPerPage = Math.max(1, Math.floor(A4_HEIGHT_CM / stripHeight));
  const picCols = Math.max(1, Math.floor(A4_WIDTH_CM / pictureSize));
  const picRows = Math.max(1, Math.floor(A4_HEIGHT_CM / pictureSize));
  const picPerPage = picCols * picRows;

  const fontSize = Math.max(28, Math.min(72, Math.round(stripHeight * 12)));

  return {
    stripHeight, stripWidth, sentenceWidth, pictureSize, internalGap,
    stripsPerPage, picCols, picRows, picPerPage, fontSize,
  };
}

// ── Bingo (picture-bingo-generator.html) ────────────────────────────────
/** Board grid is 4×4 by default. */
export const BINGO_GRID_SIZE = 4;
/** Board border width (mm) — EXTRA THICK: boards get cut + laminated (2× cards). */
export const BINGO_BOARD_BORDER_MM = 6;      // 0.60cm in the python pack
/** Calling-card border width (mm) — 4× thick vs the thin default. */
export const BINGO_CARD_BORDER_MM = 5.6;     // 0.56cm in the python pack
/** Calling cards print 3×3 duplex (short-edge flip). */
export const BINGO_CALLING_COLS = 3;
/** Locked calling-card header height (mm) — identical front/back for duplex align. */
export const BINGO_HEADER_MM = 18;
/** Bingo grid printable width. */
export const BINGO_GRID_WIDTH_MM = 190;
/** Corner radius used inside the bingo grid (px). */
export const BINGO_RADIUS_PX = 8;

// ── Book (A5 landscape) ─────────────────────────────────────────────────
export const BOOK_WIDTH_MM = 210;
export const BOOK_HEIGHT_MM = 148;

// ── Tracing / letter strokes ────────────────────────────────────────────
/** Band (grey model glyph) stroke width, in the 0..100 viewBox units. */
export const LETTER_BAND_WIDTH = 11;
/** Guide (arrowed order stroke) width. */
export const LETTER_GUIDE_WIDTH = 2.6;
/** Green Montessori "start here" dot radius. */
export const LETTER_START_DOT_R = 4.6;
/** Grey band tint. */
export const LETTER_BAND_TINT = '#d1d5db';
/** Faint trace-row tint. */
export const LETTER_TRACE_TINT = '#e5e7eb';
