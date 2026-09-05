// lib/montree/writing-shelf/generator/cut-guides.ts
//
// RULE A — "CUT ONCE" — ported constant-for-constant from
// scripts/curriculum/writing-shelf/cutmarks.py, which is the locked standard
// for every Writing Shelf card sheet (see CLAUDE.md, "WRITING SHELF PRINT
// RULES — LOCKED", and docs/handoffs/HANDOFF_SHELF_PRINT_FIX_2026-09-05.md §8).
//
//   1. cards BUTT against each other — no gutters anywhere;
//   2. every cut line runs the FULL width or FULL height of the page, edge to
//      edge, so one stroke of the blade separates the cards on both sides of
//      it at once;
//   3. the lines are light-grey 0.25 mm HAIRLINES — they are cut away, so a
//      line may cross a card edge: it IS the card edge;
//   4. at both ends of every line, where it meets the PAGE EDGE, a small black
//      TRIANGLE points along the line, sitting at the 5.5 mm printer-safe
//      margin (a hairline dies in the last few mm of any printer; a filled
//      triangle does not);
//   5. card CONTENT stops 4 mm inside every card edge;
//   6. one footer line: "Cut along every grey line · N cards".
//
// Coordinates in this module are MILLIMETRES FROM THE BOTTOM-LEFT of the page,
// exactly as in cutmarks.py, so the port can be read line against line. The
// conversion to CSS top-left coordinates happens only inside the renderers.

/** Printer-safe margin: the triangles sit on it. No BLACK ink may go outside. */
export const SAFE_MM = 5.5;
/** The cut line itself. */
export const HAIR_W_MM = 0.25;
/** Triangle height, along the line. */
export const MARK_H_MM = 2.6;
/** Triangle base, across the line. */
export const MARK_W_MM = 2.4;
/** Card content stops this far inside every card edge. */
export const CONTENT_CLEAR_MM = 4.0;

export const HAIR_COLOR = '#BFB8AE'; // light grey — the cut line
export const MARK_COLOR = '#141110'; // the house ink — the triangles
export const FOOT_COLOR = '#8C857B'; // the footer prose
export const AMBER = '#E5A11B'; // the v2 palette's one meaningful colour
/** The house ink, by the name the drawing code uses. */
export const INK = MARK_COLOR;

export interface VLine {
  x: number;
  y0: number;
  y1: number;
}
export interface HLine {
  y: number;
  x0: number;
  x1: number;
}
export interface CutLines {
  vlines: VLine[];
  hlines: HLine[];
}

/** Port of cutmarks.grid_lines(): cols+1 verticals, rows+1 horizontals. */
export function gridLines(
  x0: number,
  y0: number,
  cols: number,
  rows: number,
  cw: number,
  ch: number,
  pageW: number,
  pageH: number,
  fullV = true,
  fullH = true
): CutLines {
  const xs: number[] = [];
  for (let i = 0; i <= cols; i++) xs.push(x0 + i * cw);
  const ys: number[] = [];
  for (let j = 0; j <= rows; j++) ys.push(y0 + j * ch);
  const vy: [number, number] = fullV ? [0, pageH] : [y0, y0 + rows * ch];
  const hx: [number, number] = fullH ? [0, pageW] : [x0, x0 + cols * cw];
  return {
    vlines: xs.map((x) => ({ x, y0: vy[0], y1: vy[1] })),
    hlines: ys.map((y) => ({ y, x0: hx[0], x1: hx[1] })),
  };
}

/** Cut lines for one centred rectangle (the sound-frame mat's trim). */
export function trimLines(
  x0: number,
  y0: number,
  w: number,
  h: number,
  pageW: number,
  pageH: number
): CutLines {
  return gridLines(x0, y0, 1, 1, w, h, pageW, pageH);
}

export function countCutLines(lines: CutLines): number {
  return lines.vlines.length + lines.hlines.length;
}

/** How many triangles a set of lines will draw — one per end that reaches a page edge. */
export function countMarks(lines: CutLines, pageW: number, pageH: number): number {
  let marks = 0;
  for (const v of lines.vlines) {
    if (v.y0 <= 0.01) marks += 1;
    if (v.y1 >= pageH - 0.01) marks += 1;
  }
  for (const h of lines.hlines) {
    if (h.x0 <= 0.01) marks += 1;
    if (h.x1 >= pageW - 0.01) marks += 1;
  }
  return marks;
}

function tri(style: string): string {
  return `<div class="cut-mark" style="${style}"></div>`;
}

/**
 * The hairlines and their triangles, as absolutely positioned divs.
 * `pageH` converts the bottom-left millimetres above into CSS top offsets.
 */
export function renderCutGuides(lines: CutLines, pageW: number, pageH: number): string {
  const out: string[] = [];
  const half = MARK_W_MM / 2;

  for (const v of lines.vlines) {
    const top = pageH - v.y1;
    const height = v.y1 - v.y0;
    out.push(
      `<div class="cut-v" style="left:${v.x}mm;top:${top}mm;height:${height}mm;"></div>`
    );
    if (v.y0 <= 0.01) {
      // apex at (x, SAFE) pointing DOWN, body above it
      out.push(
        tri(
          `left:${v.x - half}mm;top:${pageH - SAFE_MM - MARK_H_MM}mm;` +
            `border-left:${half}mm solid transparent;border-right:${half}mm solid transparent;` +
            `border-top:${MARK_H_MM}mm solid ${MARK_COLOR};`
        )
      );
    }
    if (v.y1 >= pageH - 0.01) {
      // apex at (x, pageH - SAFE) pointing UP, body below it
      out.push(
        tri(
          `left:${v.x - half}mm;top:${SAFE_MM}mm;` +
            `border-left:${half}mm solid transparent;border-right:${half}mm solid transparent;` +
            `border-bottom:${MARK_H_MM}mm solid ${MARK_COLOR};`
        )
      );
    }
  }

  for (const h of lines.hlines) {
    const top = pageH - h.y;
    const width = h.x1 - h.x0;
    out.push(
      `<div class="cut-h" style="left:${h.x0}mm;top:${top}mm;width:${width}mm;"></div>`
    );
    if (h.x0 <= 0.01) {
      // apex at (SAFE, y) pointing LEFT, body to its right
      out.push(
        tri(
          `left:${SAFE_MM}mm;top:${top - half}mm;` +
            `border-top:${half}mm solid transparent;border-bottom:${half}mm solid transparent;` +
            `border-right:${MARK_H_MM}mm solid ${MARK_COLOR};`
        )
      );
    }
    if (h.x1 >= pageW - 0.01) {
      // apex at (pageW - SAFE, y) pointing RIGHT, body to its left
      out.push(
        tri(
          `left:${pageW - SAFE_MM - MARK_H_MM}mm;top:${top - half}mm;` +
            `border-top:${half}mm solid transparent;border-bottom:${half}mm solid transparent;` +
            `border-left:${MARK_H_MM}mm solid ${MARK_COLOR};`
        )
      );
    }
  }

  return out.join('');
}

/** Port of cutmarks.cards_line(). */
export function cardsLine(n: number, unit = 'card'): string {
  return `Cut along every grey line · ${n} ${unit}${n === 1 ? '' : 's'}`;
}

/**
 * The footer, in the margin. `x`/`y` are millimetres from the bottom-left, as
 * in the Python builders. Adult text must start at least 14 mm from a page
 * edge and 3 mm clear of any vertical cut line — the callers honour that.
 */
export function renderFooter(x: number, y: number, text: string, sizePt = 5.5): string {
  return (
    `<div class="cut-foot" style="left:${x}mm;bottom:${y}mm;font-size:${sizePt}pt;">` +
    `${escapeHtml(text)}</div>`
  );
}

/** The CSS the renderers above depend on. Included once per document. */
export const CUT_GUIDE_CSS = `
  .cut-v { position:absolute; width:${HAIR_W_MM}mm; background:${HAIR_COLOR}; transform:translateX(-50%); }
  .cut-h { position:absolute; height:${HAIR_W_MM}mm; background:${HAIR_COLOR}; transform:translateY(-50%); }
  .cut-mark { position:absolute; width:0; height:0; }
  .cut-foot { position:absolute; color:${FOOT_COLOR}; white-space:nowrap; }
`;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
