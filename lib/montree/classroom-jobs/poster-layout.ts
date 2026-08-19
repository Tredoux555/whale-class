// lib/montree/classroom-jobs/poster-layout.ts
// ============================================================================
// NAMES-MODE CARD SIZING — pure, testable. crop-geometry.ts's sibling: no
// I/O, no React, just the arithmetic a printed wall poster depends on.
// ============================================================================
//
// Design brief (the founder's, Aug 2026): a kindergarten wall poster read by
// non-reading children needs a visual hierarchy — JOB PICTURE biggest (how a
// child who cannot read yet finds their job), CHILD PHOTO second, CHILD NAME
// readable from 2-3m, JOB LABEL modest (mostly for the adults). Every size on
// a printed card is expressed as a fraction of ONE number, the card's own
// height (`cardH`) — see `ClassroomJobsTool.tsx`'s `posterCss()`, where each
// of those fractions becomes a CSS `calc()` off a `--jp-card-h` custom
// property. Keeping the fraction table in one place (this file) and the
// actual pixels in one place (the `<style>` tag) is what keeps the hierarchy
// from drifting out of proportion with itself as either changes.
//
// 🚨 `cardH` IS NOT A CONSTANT ANYMORE. Fixing every jobs chart at one card
// height (the old 34mm, no matter the room) meant a 2-job room and a 20-job
// room got the identical tiny card. `computeNamesLayout` derives the height
// that actually fills the page for THIS room's active job count, so a small
// chart gets big, warm cards and a large one still fits — falling back to
// today's natural multi-sheet page-break only once cards would have to drop
// below the 34mm floor to keep fitting one sheet.

/** A4 portrait content box, in millimetres — the page minus its margins.
 *  Mirrors `PORTRAIT_MARGIN_MM`/`PORTRAIT_W_MM`/`PORTRAIT_H_MM` in
 *  ClassroomJobsTool.tsx, which imports these three under those names so the
 *  two never have a chance to drift apart. */
export const PAGE_MARGIN_MM = 12;
export const PAGE_W_MM = 210 - PAGE_MARGIN_MM * 2; // 186
export const PAGE_H_MM = 297 - PAGE_MARGIN_MM * 2; // 273

/** Names mode is always 2 columns — see `computeNamesLayout`'s own note on
 *  why a 1-job chart still gets a column-width card rather than a full-width
 *  one. */
const COLUMNS = 2;
export const CARD_GAP_MM = 5;
export const CARD_W_MM = (PAGE_W_MM - CARD_GAP_MM) / COLUMNS; // 90.5

/** The floor this used to be fixed at, and the ceiling past which a card
 *  stops being "big" and starts being a poster of one job. */
export const MIN_CARD_H_MM = 34;
export const MAX_CARD_H_MM = 80;

// ── the masthead, derived rather than guessed ────────────────────────────
// Every value below mirrors a rule `posterCss()` actually sets on `.jp-head`
// and its children in ClassroomJobsTool.tsx — see that function's own CSS.
// Keep the two in sync if either changes; a masthead that grows without this
// shrinking with it is the exact "guessed constant" bug this file exists to
// stop doing (the old flat `HEAD_H_MM = 32` estimate this replaces).
const EMBLEM_H_MM = 16;
const HEAD_PADDING_BOTTOM_MM = 3;
const HEAD_MARGIN_BOTTOM_MM = 6;
const HEAD_BORDER_MM = 0.8;
const TITLE_FONT_PT = 26;
const TITLE_LINE_HEIGHT = 1.1;
const ROOM_FONT_PT = 9.5;
const ROOM_MARGIN_TOP_MM = 1.6;
/** Not set explicitly by `.jp-room`, so this is the browser default for a
 *  short single line of that font stack — close enough that the emblem's
 *  own fixed 16mm height is what actually sets the masthead's content
 *  height either way (see `mastheadHeightMM`'s `Math.max`). */
const ROOM_LINE_HEIGHT = 1.2;
const PT_TO_MM = 25.4 / 72;

/**
 * The masthead's own footprint in millimetres: its text stack (or the
 * emblem, whichever is taller — they sit side by side, `align-items:
 * center`), plus the padding/border/margin `.jp-head` adds beneath it. A
 * measurement, not a round number — the "derive, don't guess" the design
 * brief asked for.
 *
 * `hasRoom` always meaning "assume the room-name line is present" would
 * slightly undersize the available space for a chart with no room name set;
 * this takes the real value instead so a chart's cards do not visibly resize
 * the moment a teacher types (or clears) the classroom name box.
 */
export function mastheadHeightMM(hasRoom: boolean): number {
  const titleH = TITLE_FONT_PT * TITLE_LINE_HEIGHT * PT_TO_MM;
  const roomH = hasRoom ? ROOM_MARGIN_TOP_MM + ROOM_FONT_PT * ROOM_LINE_HEIGHT * PT_TO_MM : 0;
  const textStackH = titleH + roomH;
  // The emblem is 16mm regardless of whether one happens to be uploaded —
  // sizing as if it might be present avoids cards that would overflow under
  // the masthead the moment a school adds a logo.
  const contentH = Math.max(EMBLEM_H_MM, textStackH);
  return contentH + HEAD_PADDING_BOTTOM_MM + HEAD_BORDER_MM + HEAD_MARGIN_BOTTOM_MM;
}

export interface NamesLayout {
  /** Always 2 — the grid never reflows to a single wide column, including
   *  when there is only one active job (it gets a column-width card, not a
   *  stretched full-width one — `grid-template-columns` in `posterCss()`
   *  sets a fixed `${CARD_W_MM}mm` per column, never `1fr`). */
  columns: number;
  /** ceil(activeCount / columns), floored at 1 so an empty chart still has a
   *  legal (if unused) layout. */
  rows: number;
  /** The height every card renders at, in millimetres — clamped to
   *  [MIN_CARD_H_MM, MAX_CARD_H_MM]. */
  cardH: number;
  /** True once `cardH` has hit the 34mm floor — from here the chart
   *  page-breaks onto further sheets exactly like it always has, rather than
   *  shrinking cards past the floor to force everything onto one page. */
  overflowing: boolean;
}

/**
 * The one function that turns "how many active jobs" into "how big is each
 * card". Never throws and never returns a non-finite number — a count of 0
 * (or a negative/NaN caller error) still produces a legal layout rather than
 * a divide-by-zero NaN reaching a CSS custom property a browser then has to
 * silently ignore.
 */
export function computeNamesLayout(activeCount: number, hasRoom: boolean): NamesLayout {
  const n = Number.isFinite(activeCount) && activeCount > 0 ? Math.floor(activeCount) : 0;
  const rows = Math.max(1, Math.ceil(n / COLUMNS));
  const available = PAGE_H_MM - mastheadHeightMM(hasRoom);
  const rawCardH = Math.floor(available / rows) - CARD_GAP_MM;
  const cardH = Math.min(MAX_CARD_H_MM, Math.max(MIN_CARD_H_MM, rawCardH));
  return {
    columns: COLUMNS,
    rows,
    cardH,
    overflowing: rawCardH < MIN_CARD_H_MM,
  };
}

/**
 * How many A4 sheets the names-mode chart comes out on, under the new
 * adaptive card height. An honest number shown on screen, not a layout
 * constraint (same posture as the old `sheetEstimate` it replaces the names
 * branch of): a chart is sized to fit one sheet whenever it can, and only
 * once `computeNamesLayout` reports `overflowing` does this fall back to
 * packing rows at the 34mm floor and paginating, exactly the way the old
 * fixed-height estimate always worked.
 */
export function namesSheetCount(activeCount: number, hasRoom: boolean): number {
  const n = Number.isFinite(activeCount) && activeCount > 0 ? Math.floor(activeCount) : 0;
  if (n === 0) return 1;

  const layout = computeNamesLayout(n, hasRoom);
  if (!layout.overflowing) return 1;

  const rowH = MIN_CARD_H_MM + CARD_GAP_MM;
  const first = Math.max(1, Math.floor((PAGE_H_MM - mastheadHeightMM(hasRoom)) / rowH));
  const rest = Math.max(1, Math.floor(PAGE_H_MM / rowH));
  return layout.rows <= first ? 1 : 1 + Math.ceil((layout.rows - first) / rest);
}
