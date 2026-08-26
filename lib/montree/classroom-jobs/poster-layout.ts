// lib/montree/classroom-jobs/poster-layout.ts
// ============================================================================
// NAMES-MODE CARD SIZING — pure, testable. crop-geometry.ts's sibling: no
// I/O, no React, just the arithmetic a printed wall poster depends on.
// ============================================================================
//
// Design brief (the founder's, Aug 2026, corrected twice): a kindergarten
// wall poster read by non-reading children needs a visual hierarchy — JOB
// PICTURE biggest, CHILD PHOTO second, CHILD NAME readable from 2-3m, JOB
// LABEL modest. Every size on a printed card is expressed as a fraction of
// ONE number, the card's own height (`cardH`) — see `ClassroomJobsTool.tsx`'s
// `posterCss()`, where each fraction becomes a CSS `calc()` off a
// `--jp-card-h` custom property.
//
// ROUND 8 BUDGETED HEIGHT AND IGNORED WIDTH. ROUND 9 FIXED THE ZONE WIDTHS
// BUT STILL SIZED TYPE OFF CARDH ALONE, NEVER THE STRING. "LINE LEADER" and
// "BATHROOM HELPER" clipped to "LINE …" / "BATH…" the moment a job's real
// name ran longer than whatever cardH-derived font the CSS assumed — a fixed
// font-size has no idea how long the string sitting inside it is. This round
// adds LENGTH-AWARE TYPE SIZING (`fontFor`, below): the actual font-size for
// a job's label and a child's name is now computed PER CARD, in JS, from the
// real string length and the real zone width available to it — shrinking
// toward a floor as text runs long, with word-wrap to a second line (never a
// silent clip) as the final fallback once even the floor won't fit.

/** A4 portrait content box, in millimetres — the page minus its margins.
 *  Mirrors PORTRAIT_MARGIN_MM/PORTRAIT_W_MM/PORTRAIT_H_MM in
 *  ClassroomJobsTool.tsx, which imports these three under those names so the
 *  two never have a chance to drift apart. */
export const PAGE_MARGIN_MM = 12;
export const PAGE_W_MM = 210 - PAGE_MARGIN_MM * 2; // 186
export const PAGE_H_MM = 297 - PAGE_MARGIN_MM * 2; // 273

/** The physical sheet, in millimetres.
 *
 *  🚨 THESE EXIST BECAUSE `@page { margin: 0 }` IS NOW THE PRINT RULE. A
 *  non-zero `@page` margin is exactly where Chrome/Edge/Safari draw their own
 *  header and footer — the date, the tab title, the URL, "1/3" — which is the
 *  "strange printing information" a teacher sees at the top of a poster they
 *  only ever asked for a poster from. Browsers suppress that furniture when
 *  the page margin is zero, so the margin moved INTO the document: every
 *  printed page is an explicit `.jp-sheet` box of exactly SHEET_W_MM ×
 *  SHEET_H_MM with SHEET_PAD_MM of padding, and the printer is handed a
 *  full-bleed page it draws nothing of its own on.
 *
 *  The second reason is pagination. Padding on a single long flow applies
 *  only at the START of the first fragment and the END of the last, so with a
 *  zero page margin every continuation page would have started hard against
 *  the paper edge. An explicit page-sized box per sheet gives every page the
 *  same padding, and lets this tool decide exactly which jobs land on which
 *  sheet instead of leaving it to the browser's break heuristics. */
export const SHEET_W_MM = 210;
export const SHEET_H_MM = 297;
/** The white border inside each sheet. Deliberately the SAME number the old
 *  `@page` margin used, so nothing about how the poster sits on the paper
 *  changed when the margin moved inside the document. */
export const SHEET_PAD_MM = PAGE_MARGIN_MM;

export const CARD_GAP_MM = 5;

/** Two-column (n >= 4) regime's card width: the page split evenly with one
 *  gap between the columns. */
const GRID_COLUMNS = 2;
export const CARD_W_MM = (PAGE_W_MM - CARD_GAP_MM) / GRID_COLUMNS; // 90.5

/** One-column (n <= 3) regime's card width: the full content width. */
export const WIDE_CARD_W_MM = PAGE_W_MM; // 186

/** Two-column regime's height clamp. The 52mm cap keeps the right column's
 *  label+photo+name stack always narrower than it is tall, so a two-column
 *  card can never run its picture and photo circle out of width the way
 *  round 8's fixed 80mm cap did. */
export const GRID_MIN_H_MM = 34;
export const GRID_MAX_H_MM = 52;

/** One-column regime's height clamp. */
export const WIDE_MIN_H_MM = 60;
export const WIDE_MAX_H_MM = 90;

// -- the masthead, derived rather than guessed (unchanged since round 8) ---
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
 * adds beneath it.
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
  /** The width every card renders at, in millimetres. */
  cardW: number;
  /** The height every card renders at, in millimetres — clamped to this
   *  regime's own [min, max]. */
  cardH: number;
  /** ceil(activeCount / columns), floored at 1. */
  rows: number;
  /** How many A4 sheets this chart prints on. */
  sheets: number;
}

/**
 * The one function that turns "how many active jobs" into "how big is each
 * card, and how many of them fit in a row."
 */
export function computeNamesLayout(activeCount: number, hasRoom: boolean): NamesLayout {
  const n = normalizeCount(activeCount);
  const available = PAGE_H_MM - mastheadHeightMM(hasRoom);

  if (n > 0 && n <= 3) {
    const rows = n;
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

function gridSheets(rows: number, hasRoom: boolean): number {
  const rowH = GRID_MIN_H_MM + CARD_GAP_MM;
  const first = Math.max(1, Math.floor((PAGE_H_MM - mastheadHeightMM(hasRoom)) / rowH));
  const rest = Math.max(1, Math.floor(PAGE_H_MM / rowH));
  return rows <= first ? 1 : 1 + Math.ceil((rows - first) / rest);
}

export function namesSheetCount(activeCount: number, hasRoom: boolean): number {
  if (normalizeCount(activeCount) === 0) return 1;
  return computeNamesLayout(activeCount, hasRoom).sheets;
}

/**
 * How many CARDS names mode puts on its first sheet (the one carrying the
 * masthead) and on every sheet after it.
 *
 * 🚨 THIS EXISTS FOR THE SAME REASON THE SWAP CHUNKING DOES: with
 * `@page { margin: 0 }` and one explicit page-sized `.jp-sheet` box per
 * printed page, the tool decides where a page ends rather than the browser.
 * The row budget is the same arithmetic `gridSheets` above already uses to
 * COUNT sheets — deliberately conservative (it charges a full CARD_GAP_MM to
 * every row including the last), so a sheet always has a little room left
 * over rather than a hair too little and a clipped final row.
 */
export function namesCardsPerSheet(
  cardH: number,
  columns: 1 | 2,
  hasRoom: boolean
): { first: number; rest: number } {
  const rowH = Math.max(1, cardH + CARD_GAP_MM);
  const firstRows = Math.max(1, Math.floor((PAGE_H_MM - mastheadHeightMM(hasRoom)) / rowH));
  const restRows = Math.max(1, Math.floor(PAGE_H_MM / rowH));
  return { first: firstRows * columns, rest: restRows * columns };
}

/**
 * Split a list into the per-sheet groups a printed poster is made of: the
 * first group gets `first` items (it shares its sheet with the masthead),
 * every group after it gets `rest`. An empty list still yields one group, so
 * a poster with nothing on it still prints its masthead rather than nothing
 * at all.
 */
export function paginate<T>(items: T[], first: number, rest: number): T[][] {
  const firstN = Math.max(1, Math.floor(first));
  const restN = Math.max(1, Math.floor(rest));
  if (items.length === 0) return [[]];
  const pages: T[][] = [items.slice(0, firstN)];
  for (let i = firstN; i < items.length; i += restN) {
    pages.push(items.slice(i, i + restN));
  }
  return pages;
}

// -- per-element size tables -------------------------------------------------
// One source of truth for every fraction posterCss() turns into a
// calc(var(--jp-card-h) * ...) rule (geometry) or a per-card --jp-*-fs custom
// property (type — see fontFor below). ROUND 9's wide-regime allocation gave
// the picture+photo circle so much of the card's width that "LINE LEADER"
// had ~44mm left to print in; this round's 0.72H/0.44H split leaves the
// middle zone ~62mm at H=90 while the picture (64.8mm) is still the loudest
// element on the card.

const WIDE_PAD_FRAC = 0.06;
const WIDE_ZONE_GAP_FRAC = 0.045; // between icon | mid | photo (two gaps)
const WIDE_PICTURE_FRAC = 0.72; // of cardH directly, not (H - 2*pad)
const WIDE_PICTURE_RADIUS_FRAC = 0.1; // of the picture's own side
const WIDE_ICON_FONT_FRAC = 0.62; // of the picture's own side
const WIDE_PHOTO_FRAC = 0.44; // of cardH directly
const WIDE_LABEL_BASE_FRAC = 0.075;
const WIDE_LABEL_FLOOR_MM = 4.2;
const WIDE_NAME_BASE_FRAC = 0.18;
const WIDE_NAME_FLOOR_MM = 9;

export interface WideCardSizes {
  pad: number;
  zoneGap: number;
  pictureSide: number;
  pictureRadius: number;
  photoDiameter: number;
  labelBaseMM: number;
  labelFloorMM: number;
  nameBaseMM: number;
  nameFloorMM: number;
  /** The label/name column's available width when this job's photo circle
   *  DOES render this card (child assigned, "show photos" on, roster has a
   *  photo for them). */
  midZoneWidthWithPhoto: number;
  /** ...and when it does not: one flex item and one gap fewer, so the middle
   *  zone reclaims the width the circle would otherwise have used. */
  midZoneWidthNoPhoto: number;
}

/** Every geometry size on a one-column (n <= 3) card, at a given cardH.
 *  Font sizes are NOT here — see fontFor, which needs the actual string. */
export function wideCardSizes(cardH: number): WideCardSizes {
  const pad = cardH * WIDE_PAD_FRAC;
  const zoneGap = cardH * WIDE_ZONE_GAP_FRAC;
  const pictureSide = cardH * WIDE_PICTURE_FRAC;
  const photoDiameter = cardH * WIDE_PHOTO_FRAC;
  const fixedWithPhoto = pad * 2 + pictureSide + photoDiameter + zoneGap * 2;
  const fixedNoPhoto = pad * 2 + pictureSide + zoneGap;
  return {
    pad,
    zoneGap,
    pictureSide,
    pictureRadius: pictureSide * WIDE_PICTURE_RADIUS_FRAC,
    photoDiameter,
    labelBaseMM: cardH * WIDE_LABEL_BASE_FRAC,
    labelFloorMM: WIDE_LABEL_FLOOR_MM,
    nameBaseMM: cardH * WIDE_NAME_BASE_FRAC,
    nameFloorMM: WIDE_NAME_FLOOR_MM,
    midZoneWidthWithPhoto: Math.max(0, WIDE_CARD_W_MM - fixedWithPhoto),
    midZoneWidthNoPhoto: Math.max(0, WIDE_CARD_W_MM - fixedNoPhoto),
  };
}

const GRID_PAD_FRAC = 0.07;
const GRID_ICON_GAP_FRAC = 0.05; // between icon and the right column
const GRID_STACK_GAP_FRAC = 0.03; // between label/photo/name (two gaps)
const GRID_PICTURE_RADIUS_FRAC = 0.1;
const GRID_ICON_FONT_FRAC = 0.62;
const GRID_PHOTO_FRAC = 0.34;
const GRID_LABEL_BASE_FRAC = 0.11;
const GRID_LABEL_FLOOR_MM = 4.2;
const GRID_NAME_BASE_FRAC = 0.16;
const GRID_NAME_FLOOR_MM = 6;

export interface GridCardSizes {
  pad: number;
  iconGap: number;
  stackGap: number;
  pictureSide: number;
  pictureRadius: number;
  photoDiameter: number;
  labelBaseMM: number;
  labelFloorMM: number;
  nameBaseMM: number;
  nameFloorMM: number;
  /** The right column's available width — the SAME zone the label and the
   *  name each individually have (they stack, not share, so neither has to
   *  divide this width with the other). */
  rightColWidth: number;
}

/** Every geometry size on a two-column (n >= 4) card, at a given cardH. */
export function gridCardSizes(cardH: number): GridCardSizes {
  const pad = cardH * GRID_PAD_FRAC;
  const iconGap = cardH * GRID_ICON_GAP_FRAC;
  const pictureSide = cardH - 2 * pad;
  const rightColWidth = Math.max(0, CARD_W_MM - 2 * pad - pictureSide - iconGap);
  return {
    pad,
    iconGap,
    stackGap: cardH * GRID_STACK_GAP_FRAC,
    pictureSide,
    pictureRadius: pictureSide * GRID_PICTURE_RADIUS_FRAC,
    photoDiameter: cardH * GRID_PHOTO_FRAC,
    labelBaseMM: cardH * GRID_LABEL_BASE_FRAC,
    labelFloorMM: GRID_LABEL_FLOOR_MM,
    nameBaseMM: cardH * GRID_NAME_BASE_FRAC,
    nameFloorMM: GRID_NAME_FLOOR_MM,
    rightColWidth,
  };
}

// Icon font-size fractions exported so posterCss()'s emoji-fallback rule can
// share the exact ratio (both unchanged from round 9).
export const WIDE_ICON_FONT_OF_SIDE = WIDE_ICON_FONT_FRAC;
export const GRID_ICON_FONT_OF_SIDE = GRID_ICON_FONT_FRAC;

// -- length-aware type sizing -------------------------------------------------
// The actual fix for round 9's clipped text: a font-size that is NOT purely
// a function of cardH, but of the real string sitting inside it. Computed
// per card, in JS, from job.name.length / the assigned child's first-name
// length — then passed to React as a NUMBER through inline CSS custom
// properties (--jp-label-fs, --jp-name-fs), the same safety posture as
// --jp-card-h: a computed length, never a string built from what a teacher
// typed, ever reaches the stylesheet.

/** How many millimetres of line-box one character costs, roughly, at 1mm of
 *  font-size — calibrated conservatively (erring wide) against the actual
 *  card fonts: uppercase, letterspaced 0.16em for the job label; bold,
 *  ordinary tracking for the child's name. Shared by both regimes — the
 *  type styles are identical, only the zone each sits in differs. */
export const LABEL_CHAR_K = 0.72;
export const NAME_CHAR_K = 0.55;

/** .jp-child's actual CSS line-height (see ClassroomJobsTool.tsx's
 *  posterCss) — 1.22, not the label's tighter 1.05, because a lowercase
 *  name has descenders ("y", "g", "j") that this rounded display font
 *  clips without the extra headroom. Any stack-height budget in this file
 *  (or its harness) that includes a name box must use THIS number, not
 *  guess a line-height of its own, or the two could silently drift apart
 *  the way the un-exported guess this replaces briefly did. The label's
 *  own 1.05 stays a local literal in posterCss()/the harness — it has no
 *  descenders to budget for, so there is nothing here worth a name for. */
export const NAME_LINE_HEIGHT = 1.22;

/** How many characters, AT THE BASE FONT SIZE, fit across a zone this wide —
 *  the length past which `fontFor` starts shrinking. */
export function maxCharsFor(zoneWidthMM: number, k: number, baseMM: number): number {
  if (baseMM <= 0 || k <= 0) return 0;
  return Math.floor(zoneWidthMM / (k * baseMM));
}

/**
 * The one function that turns "how long is this string" into "what font-size
 * does it get." Short text (at or under `maxChars`) prints at `baseMM`, full
 * size. Longer text shrinks in direct proportion to how far over the
 * character budget it runs — and is never allowed below `floorMM`, no
 * matter how long the string is. A string that still cannot fit one line
 * even at the floor is CSS's problem from here, not this function's: see
 * `.jp-job`/`.jp-child`'s line-clamp:2 in ClassroomJobsTool.tsx's
 * posterCss(), which wraps to a second line before it ever ellipsizes.
 */
export function fontFor(textLen: number, baseMM: number, maxChars: number, floorMM: number): number {
  const len = textLen > 0 ? textLen : 1;
  const scaled = baseMM * Math.min(1, maxChars / len);
  return Math.max(floorMM, scaled);
}


// ── the swap-cards system ────────────────────────────────────────────────
// Mode 2's replacement, Aug 2026: print the poster ONCE (job tiles with an
// empty slot) and ONE photo card per child in the roster, ONCE — a teacher
// laminates both and physically swaps a child's card into a job's slot each
// week. No reprinting, ever, unlike the label-strip system it replaces.
// Every size below is a FIXED millimetre value, not a fraction of anything —
// interchangeability is the whole point, so a card cut this week must still
// drop into any slot printed any other week.

/** The child card: 60×74mm, independent of job count. */
export const SWAP_CARD_W_MM = 60;
export const SWAP_CARD_H_MM = 74;
export const SWAP_CARD_PAD_MM = 3;
/** The name/photo zone inside the card's border+padding — 60 − 2×3. */
export const SWAP_CARD_ZONE_MM = SWAP_CARD_W_MM - 2 * SWAP_CARD_PAD_MM; // 54
export const SWAP_CARD_PHOTO_MM = 54;
export const SWAP_CARD_NAME_BASE_MM = 8;
export const SWAP_CARD_NAME_FLOOR_MM = 5;
/** Between the name line and the photo square. */
export const SWAP_CARD_INNER_GAP_MM = 2;

/** The slot a card drops into: card + ~1mm tolerance on every side, so a
 *  laminated card (which is very slightly thicker than the paper it was cut
 *  from) still seats without forcing. */
export const SWAP_SLOT_W_MM = SWAP_CARD_W_MM + 2; // 62
export const SWAP_SLOT_H_MM = SWAP_CARD_H_MM + 2; // 76

/** THREE TILES TO A SHEET, always — the number the founder's colleague was
 *  reaching for when she printed the two-up sheets and cut and pasted them
 *  into threes by hand. Fixed, like every other size in this section: a chart
 *  printed this term must line up with one printed next term.
 *
 *  🚨 THE WHOLE VERTICAL BUDGET, IN ONE PLACE — change one number here and
 *  check this sum still holds, because a sheet is a fixed-height box now and
 *  an overflowing third tile is CLIPPED, not pushed to the next page:
 *
 *    page 1 content height   = SHEET_H_MM - 2 * SHEET_PAD_MM        = 273.0
 *    masthead (emblem-sized) = mastheadHeightMM(true)               ≈  25.8
 *    three tiles + two gaps  = 3 * 77 + 2 * 7                       = 245.0
 *                                                          ────────────────
 *                                              25.8 + 245.0 = 270.8 ≤ 273 ✓
 *
 *  and inside one tile, the taller of its two columns must fit its 77mm:
 *
 *    left  = label (2 lines at 5.5mm × 1.05) + 2mm gap + 63mm picture ≈ 76.6
 *    right = SWAP_SLOT_H_MM                                           = 76.0
 *                                                          ────────────────
 *                                                         76.6 ≤ 77 ✓
 *
 *  Continuation sheets carry no masthead and so have 28mm to spare; they use
 *  the same tile height and gap regardless, so every printed page of a chart
 *  has the identical rhythm. */
export const SWAP_TILES_PER_SHEET = 3;
export const SWAP_TILE_H_MM = 77;
/** Zero: at three to a sheet the tile IS its content box, and the ~0.5mm of
 *  slack around the 76mm slot is all the breathing room there is inside a
 *  tile. The whitespace between jobs is SWAP_TILE_GAP_MM's job. */
export const SWAP_TILE_PAD_MM = 0;
/** Between the job label and the picture beneath it. */
export const SWAP_TILE_INNER_GAP_MM = 2;
/** Between the left (label+picture) block and the slot, in the same row. */
export const SWAP_PAIR_GAP_MM = 12;
/** Between the tiles stacked on one sheet. */
export const SWAP_TILE_GAP_MM = 7;
export const SWAP_PICTURE_MM = 63;
export const SWAP_LABEL_BASE_MM = 5.5;
export const SWAP_LABEL_FLOOR_MM = 4;

/** The cards sheet: A4 portrait, a plain 3×3 grid, no masthead — it exists to
 *  be cut apart, so a title on it would only ever get thrown away with the
 *  trimmings. */
export const CARDS_COLS = 3;
export const CARDS_ROWS = 3;
export const CARDS_PER_SHEET = CARDS_COLS * CARDS_ROWS; // 9
export const SWAP_CARD_GAP_MM = 3;

/** How many A4 sheets the swap poster's job tiles print on — always exactly
 *  SWAP_TILES_PER_SHEET tiles per sheet (see that constant's note for the
 *  arithmetic proving three fit even the first, masthead-reduced sheet), so
 *  this is plain `ceil(n/3)` with nothing to get wrong. The component chunks
 *  the job list by the same constant, so this count and the number of
 *  `.jp-sheet` boxes actually rendered can never disagree. */
export function swapPosterSheets(activeJobCount: number): number {
  const n = normalizeCount(activeJobCount);
  if (n === 0) return 1;
  return Math.max(1, Math.ceil(n / SWAP_TILES_PER_SHEET));
}

/** How many A4 sheets the roster's photo cards print on, at 9 per sheet. */
export function swapCardsSheets(rosterCount: number): number {
  const n = normalizeCount(rosterCount);
  if (n === 0) return 1;
  return Math.max(1, Math.ceil(n / CARDS_PER_SHEET));
}
