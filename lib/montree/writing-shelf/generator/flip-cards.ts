// lib/montree/writing-shelf/generator/flip-cards.ts
//
// Sheets 02 (chain cards) and 03 (dictation photo cards) — the same physical
// work with different backs, so they share one layout module.
//
//   FRONT of a card: the photograph.
//   BACK of a card:  02 — the five-line word chain, the letter that changed
//                    picked out in amber;
//                    03 — the single word, large.
//
// Printed card 80 x 120 mm. Every card on this shelf is hand-mounted on a
// coloured backing card with a 1 cm border, so PRINTED = FINISHED - 20 mm and
// the finished card is 100 x 140, which is what the owner's card stands take
// (CLAUDE.md, "WRITING SHELF PRINT RULES — LOCKED", rule 2).
//
// Four cards BUTT into a 160 x 240 block centred on an A4 portrait sheet:
// 25 mm side margins, 28.5 mm head and foot — room for the triangles and the
// footer, and no ink anywhere near the printer-safe margin.
//
// ── DUPLEX, and the one thing this file exists to encode ────────────────────
//
// Short-edge flip of a PORTRAIT sheet is (x, y) -> (x, H - y): top and bottom
// swap, left and right do not. So the card printed at front (col c, row r) is
// backed by the card printed at back (col c, rows - 1 - r) — the back grid is
// the front grid MIRRORED TOP TO BOTTOM. And because the flip turns the sheet
// over about a horizontal axis, whatever the printer lays down upright on the
// back reads UPSIDE DOWN once flipped, so each card's back content is drawn
// ROTATED 180° in the back page's own frame; it then reads upright behind its
// picture. Both halves of that are `backSlot()` below, and it is unit-tested.

import {
  AMBER,
  CONTENT_CLEAR_MM,
  INK,
  cardsLine,
  countCutLines,
  escapeHtml,
  gridLines,
  renderCutGuides,
  renderFooter,
} from './cut-guides';
import { pageSize, printDocument, type Paper } from './page-shell';

export const CARD_W_MM = 80;
export const CARD_H_MM = 120;
export const COLS = 2;
export const ROWS = 2;
/** Photo width on the card = card less the 4 mm clearance on both sides. */
export const PHOTO_MM = CARD_W_MM - 2 * CONTENT_CLEAR_MM; // 72

/** Adult text in the bottom margin, clear of every cut line. */
const FOOT_X_MM = 30;
const FOOT_Y_MM = 13;

/** Andika's cap height as a fraction of the em, and the target for sheet 03. */
const CAP_RATIO = 0.7;
const TARGET_CAP_MM = 20;
const LINE_H = 1.05;
const CHAR_W_RATIO = 0.6;

export interface FlipCard {
  /** The word on the front — used for the alt text and the no-photo placeholder. */
  word: string;
  /** Photo bank URL. Absent -> a clear "no photo" placeholder, word only. */
  photoUrl?: string;
  /**
   * What goes on the back. One entry -> the single big word of sheet 03; five
   * entries -> the word chain of sheet 02, with the changed letter picked out.
   */
  backLines: string[];
}

export interface FlipCardsConfig {
  cards: FlipCard[];
  paper?: Paper;
  /** Pick out the letter that changed from the line before, in amber. */
  highlightChanges?: boolean;
  /** Duplex calibration CSS for BACK pages (mirror: 'vertical'). */
  backPageStyle?: string;
  title?: string;
  /** Override the @font-face rules (used to inline the face in the samples). */
  fontFaceCss?: string;
}

export interface GridPos {
  col: number;
  row: number;
}

/** Front slot for the i-th card on a page: row 0 is the TOP row. */
export function frontSlot(index: number, cols = COLS): GridPos {
  return { col: index % cols, row: Math.floor(index / cols) };
}

/**
 * The back-page slot that lands behind a front slot under a SHORT-EDGE flip
 * of a portrait sheet: same column, row mirrored top-to-bottom. The content
 * placed there is rotated 180°.
 */
export function backSlot(front: GridPos, rows = ROWS): GridPos {
  return { col: front.col, row: rows - 1 - front.row };
}

/** The inverse: which card index belongs in back slot (col, row) on a page. */
export function cardIndexForBackSlot(slot: GridPos, cols = COLS, rows = ROWS): number {
  const frontRow = rows - 1 - slot.row;
  return frontRow * cols + slot.col;
}

/**
 * For each line, the index of the letter that changed from the line before.
 * -1 for the first line and for any line that is not a single-letter change
 * (a length change, or two letters at once) — the sheet only ever highlights
 * an honest one-letter swap.
 */
export function changedLetterIndexes(lines: string[]): number[] {
  return lines.map((line, i) => {
    if (i === 0) return -1;
    const prev = lines[i - 1];
    if (prev.length !== line.length) return -1;
    let at = -1;
    for (let k = 0; k < line.length; k++) {
      if (prev[k] !== line[k]) {
        if (at !== -1) return -1; // more than one letter moved
        at = k;
      }
    }
    return at;
  });
}

export interface FlipCardsGeometry {
  pageWidth: number;
  pageHeight: number;
  blockLeft: number;
  blockTop: number;
  cardWidth: number;
  cardHeight: number;
  cols: number;
  rows: number;
  cardsPerPage: number;
  pages: number;
  photo: number;
}

export function flipCardsGeometry(config: FlipCardsConfig): FlipCardsGeometry {
  const { width, height } = pageSize(config.paper ?? 'A4', 'portrait');
  const blockW = COLS * CARD_W_MM;
  const blockH = ROWS * CARD_H_MM;
  const cardsPerPage = COLS * ROWS;
  return {
    pageWidth: width,
    pageHeight: height,
    blockLeft: (width - blockW) / 2,
    blockTop: (height - blockH) / 2,
    cardWidth: CARD_W_MM,
    cardHeight: CARD_H_MM,
    cols: COLS,
    rows: ROWS,
    cardsPerPage,
    pages: Math.max(1, Math.ceil(config.cards.length / cardsPerPage)),
    photo: PHOTO_MM,
  };
}

function cellStyle(geo: FlipCardsGeometry, slot: GridPos): string {
  const left = geo.blockLeft + slot.col * geo.cardWidth;
  const top = geo.blockTop + slot.row * geo.cardHeight;
  return `left:${left}mm;top:${top}mm;width:${geo.cardWidth}mm;height:${geo.cardHeight}mm;`;
}

function renderFront(card: FlipCard, geo: FlipCardsGeometry, slot: GridPos): string {
  const inner = card.photoUrl
    ? `<img class="fc-photo" src="${escapeHtml(card.photoUrl)}" alt="${escapeHtml(card.word)}">`
    : `<div class="fc-nophoto"><div class="fc-nophoto-mark">no photo</div>` +
      `<div class="fc-nophoto-word">${escapeHtml(card.word)}</div></div>`;
  return `<div class="fc-card" style="${cellStyle(geo, slot)}"><div class="fc-inner">${inner}</div></div>`;
}

/** Type size for the back of a card: the biggest that fits the clearance box. */
export function backTypeSizeMm(lines: string[]): number {
  const fitW = CARD_W_MM - 2 * CONTENT_CLEAR_MM;
  const fitH = CARD_H_MM - 2 * CONTENT_CLEAR_MM;
  const widest = lines.reduce((m, l) => Math.max(m, l.length), 1);
  return Math.min(
    TARGET_CAP_MM / CAP_RATIO,
    fitH / (lines.length * LINE_H),
    fitW / (widest * CHAR_W_RATIO)
  );
}

function renderBack(
  card: FlipCard,
  geo: FlipCardsGeometry,
  slot: GridPos,
  highlight: boolean
): string {
  const lines = card.backLines.length ? card.backLines : [card.word];
  const changed = highlight ? changedLetterIndexes(lines) : lines.map(() => -1);
  const fs = backTypeSizeMm(lines);
  const body = lines
    .map((line, i) => {
      const at = changed[i];
      const html =
        at >= 0
          ? escapeHtml(line.slice(0, at)) +
            `<span class="fc-changed">${escapeHtml(line[at])}</span>` +
            escapeHtml(line.slice(at + 1))
          : escapeHtml(line);
      return `<div class="fc-line">${html}</div>`;
    })
    .join('');
  // The 180° rotation is what makes the back read upright once the sheet is
  // flipped on its SHORT edge. Do not remove it without re-reading the duplex
  // note at the top of this file.
  return (
    `<div class="fc-card" style="${cellStyle(geo, slot)}">` +
    `<div class="fc-inner fc-rot" style="font-size:${fs.toFixed(2)}mm;">${body}</div>` +
    `</div>`
  );
}

const FLIP_CSS = `
  .fc-card { position:absolute; }
  .fc-inner { position:absolute; inset:${CONTENT_CLEAR_MM}mm; display:flex; flex-direction:column;
              align-items:center; justify-content:center; overflow:hidden; }
  .fc-rot { transform:rotate(180deg); }
  .fc-photo { width:${PHOTO_MM}mm; height:${PHOTO_MM}mm; object-fit:contain; }
  .fc-nophoto { width:${PHOTO_MM}mm; height:${PHOTO_MM}mm; border:0.6mm dashed ${AMBER};
                border-radius:2mm; display:flex; flex-direction:column; align-items:center;
                justify-content:center; gap:3mm; }
  .fc-nophoto-mark { font-size:4mm; color:${AMBER}; letter-spacing:0.4mm; text-transform:uppercase; }
  .fc-nophoto-word { font-size:12mm; color:${INK}; }
  .fc-line { line-height:${LINE_H}; color:${INK}; white-space:nowrap; }
  .fc-changed { color:${AMBER}; }
  /* Adult text: 30 mm in from the side (clear of the outer vertical cut
     line at 25 mm) and 16 mm down, so no line of type begins on a cut line,
     on a triangle, or within 14 mm of a paper edge. */
  .fc-head { position:absolute; left:${FOOT_X_MM}mm; top:16mm; font-size:7pt; color:#5F594F; }
`;

export interface FlipCardsHtmlOptions {
  sides?: 'both' | 'front' | 'back';
}

export function buildFlipCardsHtml(
  config: FlipCardsConfig,
  options: FlipCardsHtmlOptions = {}
): string {
  const geo = flipCardsGeometry(config);
  const sides = options.sides ?? 'both';
  const highlight = config.highlightChanges ?? true;
  const lines = gridLines(
    geo.blockLeft,
    (geo.pageHeight - geo.rows * geo.cardHeight) / 2,
    geo.cols,
    geo.rows,
    geo.cardWidth,
    geo.cardHeight,
    geo.pageWidth,
    geo.pageHeight
  );
  const guides = renderCutGuides(lines, geo.pageWidth, geo.pageHeight);
  const title = config.title ?? 'Writing Shelf cards';

  const pages: Array<{ html: string; style?: string }> = [];
  for (let p = 0; p < geo.pages; p++) {
    const slice = config.cards.slice(p * geo.cardsPerPage, (p + 1) * geo.cardsPerPage);
    const foot = renderFooter(FOOT_X_MM, FOOT_Y_MM, cardsLine(slice.length));
    const head = (face: string) =>
      `<div class="fc-head">${escapeHtml(title)} · ${face} · sheet ${p + 1} of ${geo.pages} · print duplex, flip on SHORT edge</div>`;

    if (sides === 'both' || sides === 'front') {
      const cards = slice
        .map((card, i) => renderFront(card, geo, frontSlot(i, geo.cols)))
        .join('');
      pages.push({ html: guides + cards + head('picture side') + foot });
    }
    if (sides === 'both' || sides === 'back') {
      const cards = slice
        .map((card, i) => renderBack(card, geo, backSlot(frontSlot(i, geo.cols), geo.rows), highlight))
        .join('');
      pages.push({
        html: guides + cards + head('word side') + foot,
        style: config.backPageStyle,
      });
    }
  }

  return printDocument({
    title,
    paper: config.paper ?? 'A4',
    orientation: 'portrait',
    pages,
    css: FLIP_CSS,
    fontFaceCss: config.fontFaceCss,
  });
}

/** Cut lines on one page — 3 verticals + 3 horizontals for a 2 x 2 block. */
export function flipCardsCutLineCount(config: FlipCardsConfig): number {
  const geo = flipCardsGeometry(config);
  return countCutLines(
    gridLines(
      geo.blockLeft,
      (geo.pageHeight - geo.rows * geo.cardHeight) / 2,
      geo.cols,
      geo.rows,
      geo.cardWidth,
      geo.cardHeight,
      geo.pageWidth,
      geo.pageHeight
    )
  );
}
