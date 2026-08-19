// lib/montree/classroom-jobs/poster-layout.ts
// ============================================================================
// NAMES-MODE CARD SIZING — pure, testable. crop-geometry.ts's sibling: no
// I/O, no React, just the arithmetic a printed wall poster depends on.
// ============================================================================
//
// Design brief (the founder's, Aug 2026, corrected): a kindergarten wall
// poster read by non-reading children needs a visual hierarchy — JOB PICTURE
// biggest, CHILD PHOTO second, CHILD NAME readable from 2-3m, JOB LABEL
// modest (mostly for the adults). Every size on a printed card is expressed
// as a fraction of ONE number, the card's own height (`cardH`) — see
// `ClassroomJobsTool.tsx`'s `posterCss()`, where each fraction becomes a CSS
// `calc()` off a `--jp-card-h` custom property.
//
// ROUND 8 OF THIS FILE BUDGETED HEIGHT AND IGNORED WIDTH. At cardH=80 in a
// 90.5mm-wide 2-column card, an 0.84H (67mm) square picture left ~10mm for
// everything else — label clipped to one letter, photo crushed to a sliver,
// name invisible. This round fixes that by making the LAYOUT ITSELF switch
// on job count, not just the numbers inside one fixed layout:
//
//   n <= 3  -> ONE COLUMN, full-width (186mm) cards, three horizontal zones:
//              job picture (left) | job label + child name (middle, flexes) |
//              child photo circle (right, own zone -- never squeezed by text).
//   n >= 4  -> TWO COLUMNS, 90.5mm cards, job picture (left) | a right column
//              that STACKS label / photo / name top-to-bottom instead of
//              racing them for width -- the 52mm height cap on this regime is
//              exactly what keeps that stack always narrower than it is tall,
//              so cardH can never again outrun what 90.5mm can hold sideways.
//
// Every element that used to be sized off height alone now also has its own
// width budget asserted in this file's throwaway harness (see the mission
// report) -- for each layout at its min and max cardH, the sum of the FIXED
// -size zones (pictures, photo circles, padding, gaps) must fit inside the
// card's width, leaving a non-negative remainder for the flexible text zone.
// That check is what would have caught round 8.

/** A4 portrait content box, in millimetres -- the page minus its margins.
 *  Mirrors PORTRAIT_MARGIN_MM/PORTRAIT_W_MM/PORTRAIT_H_MM in
 *  ClassroomJobsTool.tsx, which imports these three under those names so the
 *  two never have a chance to drift apart. */
export const PAGE_MARGIN_MM = 12;
export const PAGE_W_MM = 210 - PAGE_MARGIN_MM * 2; // 186
export const PAGE_H_MM = 297 - PAGE_MARGIN_MM * 2; // 273

export const CARD_GAP_MM = 5;

/** Two-column (n >= 4) regime's card width: the page split evenly with one
 *  gap between the columns. */
const GRID_COLUMNS = 2;
export const CARD_W_MM = (PAGE_W_MM - CARD_GAP_MM) / GRID_COLUMNS; // 90.5

/** One-column (n <= 3) regime's card width: the full content width -- a small
 *  chart's cards read as wall-poster-sized rows, not a stretched single
 *  column of the old 90.5mm card. */
export const WIDE_CARD_W_MM = PAGE_W_MM; // 186

/** Two-column regime's height clamp. The 52mm cap (down from round 8's 80mm)
 *  is the width fix: at 52mm tall the right column's label+photo+name stack
 *  always has more height to spend than the 90.5mm card has width to run out
 *  of, so a two-column card can never again re-create the round 8 crush. */
export const GRID_MIN_H_MM = 34;
export const GRID_MAX_H_MM = 52;

/** One-column regime's height clamp -- full-width cards can afford to be
 *  taller, since nothing beside the picture is fighting it for horizontal
 *  room anymore. */
export const WIDE_MIN_H_MM = 60;
export const WIDE_MAX_H_MM = 90;

// -- the masthead, derived rather than guessed (unchanged from round 8) ----
// Every value below mirrors a rule posterCss() actually sets on .jp-head
// and its children in ClassroomJobsTool.tsx -- see that function's own CSS.
const EMBLEM_H_MM = 16;
const HEAD_PADDING_BOTTOM_MM = 3;
const HEAD_MARGIN_BOTTOM_MM = 6;
const HEAD_BORDER_MM = 0.8;
const TITLE_FONT_PT = 26;
const TITLE_LINE_HEIGHT = 1.1;
const ROOM_FONT_PT = 9.5;
const ROOM_MARGIN_TOP_MM = 1.6;
const ROOM_LINE_HEIGHT = 1.2;
const PT_TO_MM = 25.4 / 72;

/**
 * The masthead's own footprint in millimetres: its text stack (or the
 * emblem, whichever is taller), plus the padding/border/margin .jp-head
 * adds beneath it. A measurement, not a round number.
 */
export function mastheadHeightMM(hasRoom: boolean): number {
  const titleH = TITLE_FONT_PT * TITLE_LINE_HEIGHT * PT_TO_MM;
  const roomH = hasRoom ? ROOM_MARGIN_TOP_MM + ROOM_FONT_PT * ROOM_LINE_HEIGHT * PT_TO_MM : 0;
  const textStackH = titleH + roomH;
  const contentH = Math.max(EMBLEM_H_MM, textStackH);
  return contentH + HEAD_PADDING_BOTTOM_MM + HEAD_BORDER_MM + HEAD_MARGIN_BOTTOM_MM;
}

function clamp(min: number, value: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeCount(activeCount: number): number {
  return Number.isFinite(activeCount) && activeCount > 0 ? Math.floor(activeCount) : 0;
}

export interface NamesLayout {
  /** 1 for a small chart (n <= 3, full-width cards), 2 otherwise. */
  columns: 1 | 2;
  /** The width every card renders at, in millimetres -- 186 for columns=1,
   *  90.5 for columns=2. */
  cardW: number;
  /** The height every card renders at, in millimetres -- clamped to this
   *  regime's own [min, max]. */
  cardH: number;
  /** ceil(activeCount / columns), floored at 1 so an empty chart still has a
   *  legal (if unused) layout. */
  rows: number;
  /** How many A4 sheets this chart prints on. Always 1 for the one-column
   *  regime (n <= 3 never has enough rows to force the height clamp) -- see
   *  this file's harness for why that is provably true, not just observed. */
  sheets: number;
}

/**
 * The one function that turns "how many active jobs" into "how big is each
 * card, and how many of them fit in a row." Never throws and never returns a
 * non-finite number.
 */
export function computeNamesLayout(activeCount: number, hasRoom: boolean): NamesLayout {
  const n = normalizeCount(activeCount);
  const available = PAGE_H_MM - mastheadHeightMM(hasRoom);

  if (n > 0 && n <= 3) {
    const rows = n; // one column => one row per active job
    const rawCardH = Math.floor(available / rows) - CARD_GAP_MM;
    const cardH = clamp(WIDE_MIN_H_MM, rawCardH, WIDE_MAX_H_MM);
    return { columns: 1, cardW: WIDE_CARD_W_MM, cardH, rows, sheets: 1 };
  }

  const rows = Math.max(1, Math.ceil(n / GRID_COLUMNS));
  const rawCardH = Math.floor(available / rows) - CARD_GAP_MM;
  const cardH = clamp(GRID_MIN_H_MM, rawCardH, GRID_MAX_H_MM);
  const overflowing = rawCardH < GRID_MIN_H_MM;
  const sheets = overflowing ? gridSheets(rows, hasRoom) : 1;
  return { columns: 2, cardW: CARD_W_MM, cardH, rows, sheets };
}

/** Paginates the two-column regime at its 34mm floor, exactly the way the
 *  fixed-height layout this replaces always did once a chart stopped fitting
 *  one sheet. */
function gridSheets(rows: number, hasRoom: boolean): number {
  const rowH = GRID_MIN_H_MM + CARD_GAP_MM;
  const first = Math.max(1, Math.floor((PAGE_H_MM - mastheadHeightMM(hasRoom)) / rowH));
  const rest = Math.max(1, Math.floor(PAGE_H_MM / rowH));
  return rows <= first ? 1 : 1 + Math.ceil((rows - first) / rest);
}

/**
 * How many A4 sheets the names-mode chart comes out on. Thin wrapper kept so
 * ClassroomJobsTool.tsx's sheetEstimate doesn't need to know which regime a
 * job count falls into.
 */
export function namesSheetCount(activeCount: number, hasRoom: boolean): number {
  if (normalizeCount(activeCount) === 0) return 1;
  return computeNamesLayout(activeCount, hasRoom).sheets;
}

// -- per-element size tables -------------------------------------------------
// One source of truth for every fraction posterCss() turns into a
// calc(var(--jp-card-h) * ...) rule, so the harness can assert the same
// numbers the browser will actually render -- including the width budgets
// round 8 never checked.

const WIDE_PAD_FRAC = 0.06;
const WIDE_ZONE_GAP_FRAC = 0.04; // between icon | mid | photo (two gaps)
const WIDE_PICTURE_RADIUS_FRAC = 0.1; // of the picture's own side
const WIDE_ICON_FONT_FRAC = 0.62; // of the picture's own side
const WIDE_LABEL_FRAC = 0.11;
const WIDE_LABEL_CAP_MM = 10;
const WIDE_NAME_FRAC = 0.22;
const WIDE_NAME_CAP_MM = 20;
const WIDE_PHOTO_FRAC = 0.5;
const WIDE_PHOTO_CAP_MM = 45;

export interface WideCardSizes {
  pad: number;
  zoneGap: number;
  pictureSide: number;
  pictureRadius: number;
  labelFontMM: number;
  nameFontMM: number;
  photoDiameter: number;
}

/** Every size on a one-column (n <= 3) card, at a given cardH. */
export function wideCardSizes(cardH: number): WideCardSizes {
  const pad = cardH * WIDE_PAD_FRAC;
  const pictureSide = cardH - 2 * pad;
  return {
    pad,
    zoneGap: cardH * WIDE_ZONE_GAP_FRAC,
    pictureSide,
    pictureRadius: pictureSide * WIDE_PICTURE_RADIUS_FRAC,
    labelFontMM: Math.min(WIDE_LABEL_CAP_MM, cardH * WIDE_LABEL_FRAC),
    nameFontMM: Math.min(WIDE_NAME_CAP_MM, cardH * WIDE_NAME_FRAC),
    photoDiameter: Math.min(WIDE_PHOTO_CAP_MM, cardH * WIDE_PHOTO_FRAC),
  };
}

const GRID_PAD_FRAC = 0.07;
const GRID_ICON_GAP_FRAC = 0.05; // between icon and the right column
const GRID_STACK_GAP_FRAC = 0.03; // between label/photo/name (two gaps)
const GRID_PICTURE_RADIUS_FRAC = 0.1;
const GRID_ICON_FONT_FRAC = 0.62;
const GRID_LABEL_FRAC = 0.11;
const GRID_LABEL_FLOOR_MM = 4.2;
const GRID_PHOTO_FRAC = 0.34;
const GRID_NAME_FRAC = 0.16;
const GRID_NAME_FLOOR_MM = 6;

export interface GridCardSizes {
  pad: number;
  iconGap: number;
  stackGap: number;
  pictureSide: number;
  pictureRadius: number;
  labelFontMM: number;
  photoDiameter: number;
  nameFontMM: number;
}

/** Every size on a two-column (n >= 4) card, at a given cardH. */
export function gridCardSizes(cardH: number): GridCardSizes {
  const pad = cardH * GRID_PAD_FRAC;
  const pictureSide = cardH - 2 * pad;
  return {
    pad,
    iconGap: cardH * GRID_ICON_GAP_FRAC,
    stackGap: cardH * GRID_STACK_GAP_FRAC,
    pictureSide,
    pictureRadius: pictureSide * GRID_PICTURE_RADIUS_FRAC,
    labelFontMM: Math.max(GRID_LABEL_FLOOR_MM, cardH * GRID_LABEL_FRAC),
    photoDiameter: cardH * GRID_PHOTO_FRAC,
    nameFontMM: Math.max(GRID_NAME_FLOOR_MM, cardH * GRID_NAME_FRAC),
  };
}

// Icon font-size fractions exported so posterCss()'s emoji-fallback rule can
// share the exact ratio the harness checks, rather than a second guess
// living only in the stylesheet.
export const WIDE_ICON_FONT_OF_SIDE = WIDE_ICON_FONT_FRAC;
export const GRID_ICON_FONT_OF_SIDE = GRID_ICON_FONT_FRAC;
