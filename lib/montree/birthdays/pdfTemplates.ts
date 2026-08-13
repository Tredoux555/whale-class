// Birthdays — PDF builders.
//
// Three printables, all built with jsPDF (vector primitives throughout; the
// only raster ink is the class emblem and, on the board, the children's own
// photos):
//
//   1. `buildBirthdayCardsPdf()` — a birthday card per child, merged into ONE
//      document (page 1 = first child, page 2 = second, …) so a teacher prints
//      the whole class in a single job. Each card carries the child's name, the
//      birth date, the age they are turning, a photo slot and light party
//      decoration. Every card is guaranteed to be exactly one page: the fixed
//      chrome is measured top-to-bottom and the flexible photo slot absorbs the
//      difference, with a defensive uniform down-scale as the last resort.
//
//   2. `buildBirthdayBoardPdf()` — the whole class on ONE festive page as a
//      photo grid running January → December, inside a decorated border.
//      Children with no birthday on file are kept and shown last, flagged,
//      never dropped. The column count is chosen to make the photos as big as
//      the page allows, so a class of 12 gets much larger tiles than a class
//      of 24 — and the page is a hard constraint, so it can never spill.
//
//   3. `buildBirthdayTrackerPdf()` — the whole class as a single-page wall
//      chart: twelve month boxes in a 3×4 grid, each child filed under their
//      birth month and day. A4 or A3, teacher's choice. The row height and
//      type size are derived from the busiest month so the grid always fits the
//      one page it is allowed.
//
// Palette and layout metrics deliberately match the Tracing Work worksheets
// (lib/montree/tracing/pdfTemplates.ts): same US Letter page, same margins,
// same ink/emerald/gold, so the two tools print as one family.
'use client';

import { GState, jsPDF } from 'jspdf';
import {
  balloonCluster, boardFrame, bunting, cake, confetti, scallops,
  seedFromString, sparkle, star4, whale,
  BIRTHDAY_PALETTE, INK, EMERALD, GOLD, PANEL_TEAL, PANEL_GOLD, RULE_GRAY,
  SUBTITLE_GRAY, CAPTION_GRAY, FOOTER_GRAY, QUIET_GRAY,
} from './decorations';
import {
  birthdayFacts, groupByMonth, sortByCalendar, MONTH_ABBR, MONTH_NAMES,
  type BirthdayEntry,
} from './parse';

// -------------------------------------------------------------- page metrics
/** US Letter, identical to the tracing worksheets. */
export const CARD_PAGE_W = 612;
export const CARD_PAGE_H = 792;
export const MARGIN_X = 0.65 * 72;   // 46.8
export const MARGIN_Y = 0.55 * 72;   // 39.6
export const CARD_CONTENT_W = CARD_PAGE_W - 2 * MARGIN_X;   // 518.4
export const CARD_AVAIL_H = CARD_PAGE_H - 2 * MARGIN_Y;     // 712.8
/** Never let a card come closer than this to the bottom margin. */
export const MIN_SLACK = 18;

export const TRACKER_SIZES = {
  A4: { w: 595.28, h: 841.89 },
  A3: { w: 841.89, h: 1190.55 },
} as const;
export type TrackerSize = keyof typeof TRACKER_SIZES;

const FONT = 'helvetica';

// ---------------------------------------------------------------- text utils
type Align = 'left' | 'center' | 'right';

interface TextOpts {
  size: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  charSpace?: number;
  align?: Align;
}

function applyFont(doc: jsPDF, o: TextOpts) {
  const style = o.bold
    ? (o.italic ? 'bolditalic' : 'bold')
    : (o.italic ? 'italic' : 'normal');
  doc.setFont(FONT, style);
  doc.setFontSize(o.size);
}

/** Measured width including jsPDF's per-character tracking. */
function measure(doc: jsPDF, text: string, o: TextOpts): number {
  applyFont(doc, o);
  const cs = o.charSpace ?? 0;
  return doc.getTextWidth(text) + cs * Math.max(0, text.length - 1);
}

/** Draw `text` with its cap-line at `yTop` (cursor semantics, not baselines). */
function drawText(doc: jsPDF, text: string, x: number, yTop: number, o: TextOpts) {
  const w = measure(doc, text, o);
  doc.setTextColor(o.color ?? INK);
  let dx = x;
  if (o.align === 'center') dx = x - w / 2;
  else if (o.align === 'right') dx = x - w;
  doc.text(text, dx, yTop + o.size * 0.8, { charSpace: o.charSpace ?? 0, baseline: 'alphabetic' });
}

function hline(doc: jsPDF, x0: number, x1: number, y: number, color: string, width: number) {
  doc.setDrawColor(color);
  doc.setLineWidth(width);
  doc.line(x0, y, x1, y);
}

/** Largest size in [min, max] at which `text` fits `maxW`. */
function fitSize(doc: jsPDF, text: string, maxW: number, max: number, min: number, o: Omit<TextOpts, 'size'>): number {
  let size = max;
  while (size > min && measure(doc, text, { ...o, size }) > maxW) size -= 0.5;
  return size;
}

/** Shorten with an ellipsis until it fits — used for long names in tight cells. */
function truncate(doc: jsPDF, text: string, maxW: number, o: TextOpts): string {
  if (measure(doc, text, o) <= maxW) return text;
  let out = text;
  while (out.length > 1 && measure(doc, `${out}…`, o) > maxW) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

/** Split a name across two lines at the space nearest the middle. */
function splitName(name: string): [string, string] {
  const spaces: number[] = [];
  for (let i = 0; i < name.length; i++) if (name[i] === ' ') spaces.push(i);
  if (spaces.length === 0) {
    const mid = Math.ceil(name.length / 2);
    return [name.slice(0, mid), name.slice(mid)];
  }
  const target = name.length / 2;
  const at = spaces.reduce((best, i) => (Math.abs(i - target) < Math.abs(best - target) ? i : best), spaces[0]);
  return [name.slice(0, at).trim(), name.slice(at + 1).trim()];
}

// -------------------------------------------------------------------- images
interface ImageDims { width: number; height: number }
interface Art { dataUrl: string; format: 'PNG' | 'JPEG'; dims: ImageDims }

function sniffFormat(bytes: ArrayBuffer): 'JPEG' | 'PNG' {
  const b = new Uint8Array(bytes);
  return b[0] === 0xff && b[1] === 0xd8 ? 'JPEG' : 'PNG';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error ?? new Error('FileReader failed'));
    fr.readAsDataURL(blob);
  });
}

async function artFromBytes(bytes: ArrayBuffer): Promise<Art> {
  const mime = sniffFormat(bytes) === 'JPEG' ? 'image/jpeg' : 'image/png';
  const blob = new Blob([bytes], { type: mime });
  const bmp = await createImageBitmap(blob);
  const dims = { width: bmp.width, height: bmp.height };
  bmp.close();
  return { dataUrl: await blobToDataUrl(blob), format: sniffFormat(bytes), dims };
}

/** Draw `art` contained inside a box, centred, preserving aspect ratio. */
function placeContained(doc: jsPDF, art: Art, x: number, y: number, boxW: number, boxH: number) {
  const s = Math.min(boxW / art.dims.width, boxH / art.dims.height);
  const w = art.dims.width * s;
  const h = art.dims.height * s;
  doc.addImage(art.dataUrl, art.format, x + (boxW - w) / 2, y + (boxH - h) / 2, w, h, undefined, 'FAST');
}

// ============================================================== BIRTHDAY CARD

/**
 * Fixed (non-photo) vertical space a card consumes, in pt, itemised so the
 * numbers stay auditable against `drawBirthdayCard`.
 */
const CARD_CHROME = {
  header: 28,          // logo / class name row
  headerRule: 14,      // rule + breathing room
  bunting: 34,         // swag droop + flag depth
  gapAfterBunting: 16,
  kicker: 22,          // "HAPPY BIRTHDAY" tracked caps + spacing
  gapAfterKicker: 6,
  nameLine: 1.16,      // multiplier on the name's font size, per line
  gapAfterName: 10,
  turning: 26,         // "turns 5 on March 3rd"
  born: 18,            // "born 3 March 2020"
  gapBeforePhoto: 18,
  gapAfterPhoto: 16,
  wish: 24,            // "with love from everyone in …"
  cake: 96,            // two tiers + candles + flames
  footer: 24,
} as const;

const NAME_SIZE_MAX = 44;
const NAME_SIZE_MIN = 24;
const NAME_SIZE_TWO_LINE = 30;
const PHOTO_W = 306;
const PHOTO_H_MAX = 290;
const PHOTO_H_MIN = 140;

export interface BirthdayCardLayout {
  nameSize: number;
  nameLines: string[];
  chrome: number;
  photo: { w: number; h: number };
  /** defensive uniform down-scale that had to be applied (1 = none needed). */
  scale: number;
  totalHeight: number;
  slack: number;
  fits: boolean;
}

/**
 * Work out the one card's geometry.
 *
 * The name is the only genuinely variable ingredient: it is shrunk to fit the
 * content width on one line, and only if it still will not fit at
 * NAME_SIZE_MIN does it wrap to two lines (which costs a line of height, taken
 * out of the photo slot). The photo slot then absorbs whatever vertical space
 * is left, clamped to a sane range; if even the minimum will not fit, every
 * block is scaled down uniformly so the card can never spill onto page two.
 */
export function computeBirthdayCardLayout(doc: jsPDF, name: string): BirthdayCardLayout {
  const c = CARD_CHROME;
  const maxNameW = CARD_CONTENT_W - 24;

  let nameLines = [name];
  let nameSize = fitSize(doc, name, maxNameW, NAME_SIZE_MAX, NAME_SIZE_MIN, { bold: true });
  if (measure(doc, name, { size: nameSize, bold: true }) > maxNameW) {
    nameLines = splitName(name);
    nameSize = Math.min(
      NAME_SIZE_TWO_LINE,
      ...nameLines.map((l) => fitSize(doc, l, maxNameW, NAME_SIZE_TWO_LINE, 14, { bold: true })),
    );
  }

  const fixed =
    c.header + c.headerRule + c.bunting + c.gapAfterBunting +
    c.kicker + c.gapAfterKicker +
    nameSize * c.nameLine * nameLines.length + c.gapAfterName +
    c.turning + c.born + c.gapBeforePhoto +
    c.gapAfterPhoto + c.wish + c.cake + c.footer;

  const room = CARD_AVAIL_H - MIN_SLACK - fixed;
  let photoH = Math.min(PHOTO_H_MAX, Math.max(PHOTO_H_MIN, room));
  let photoW = PHOTO_W;

  // Last-resort uniform shrink. Only reachable if the chrome constants are
  // later grown past the page — the guarantee must not depend on nobody ever
  // editing them.
  let scale = 1;
  const projected = fixed + photoH;
  if (projected > CARD_AVAIL_H - MIN_SLACK) {
    scale = Math.max(0.5, (CARD_AVAIL_H - MIN_SLACK) / projected);
    photoH *= scale;
    photoW *= scale;
  }

  const totalHeight = fixed * scale + photoH;
  return {
    nameSize: nameSize * scale,
    nameLines,
    chrome: fixed * scale,
    photo: { w: photoW, h: photoH },
    scale,
    totalHeight,
    slack: CARD_AVAIL_H - totalHeight,
    fits: CARD_AVAIL_H - totalHeight >= MIN_SLACK - 1e-6,
  };
}

interface CardCtx {
  className: string;
  logoArt: Art | null;
  today: Date;
}

/**
 * Draw one child's birthday card onto the *current* page of `doc`.
 * Never calls `addPage()` — one call, one page.
 */
export function drawBirthdayCard(doc: jsPDF, entry: BirthdayEntry, ctx: CardCtx) {
  const c = CARD_CHROME;
  const facts = birthdayFacts(entry, ctx.today);
  const layout = computeBirthdayCardLayout(doc, entry.name);
  const s = layout.scale;
  const centre = MARGIN_X + CARD_CONTENT_W / 2;
  const right = MARGIN_X + CARD_CONTENT_W;

  // Everything below is laid out with an absolute top-to-bottom cursor.
  let y = MARGIN_Y;

  // ---- header -------------------------------------------------------------
  const headerH = c.header * s;
  if (ctx.logoArt) {
    placeContained(doc, ctx.logoArt, MARGIN_X, y, headerH, headerH);
  }
  const classX = MARGIN_X + (ctx.logoArt ? headerH + 10 : 0);
  drawText(doc, ctx.className.toUpperCase(), classX, y + headerH * 0.28,
    { size: 9.5 * s, bold: true, color: INK, charSpace: 1.2 });
  drawText(doc, 'Birthdays · Montree', right, y + headerH * 0.28,
    { size: 9 * s, italic: true, color: SUBTITLE_GRAY, align: 'right' });
  y += headerH;

  hline(doc, MARGIN_X, right, y + 1, INK, 1);
  y += c.headerRule * s;

  // ---- bunting ------------------------------------------------------------
  bunting(doc, MARGIN_X, right, y + 2 * s, { flags: 11, droop: 9 * s, flagH: 12 * s });
  y += c.bunting * s + c.gapAfterBunting * s;

  // ---- kicker -------------------------------------------------------------
  drawText(doc, 'HAPPY BIRTHDAY', centre, y, {
    size: 12 * s, bold: true, color: GOLD, charSpace: 3.4 * s, align: 'center',
  });
  const kickW = measure(doc, 'HAPPY BIRTHDAY', { size: 12 * s, bold: true, charSpace: 3.4 * s });
  sparkle(doc, centre - kickW / 2 - 14 * s, y + 5 * s, 4.5 * s, EMERALD);
  sparkle(doc, centre + kickW / 2 + 14 * s, y + 5 * s, 4.5 * s, EMERALD);
  y += (c.kicker + c.gapAfterKicker) * s;

  // ---- name ---------------------------------------------------------------
  const nameTop = y;
  for (const line of layout.nameLines) {
    drawText(doc, line, centre, y, { size: layout.nameSize, bold: true, color: INK, align: 'center' });
    y += layout.nameSize * c.nameLine;
  }
  const nameBottom = y;
  y += c.gapAfterName * s;

  // ---- turning + born -----------------------------------------------------
  const turningText = facts.isToday
    ? `turns ${facts.turning} today!`
    : `turns ${facts.turning} on ${facts.monthDayOrdinal}`;
  drawText(doc, turningText, centre, y, { size: 17 * s, bold: true, color: EMERALD, align: 'center' });
  y += c.turning * s;
  drawText(doc, `born ${facts.bornOn}`, centre, y, { size: 10 * s, italic: true, color: CAPTION_GRAY, align: 'center' });
  y += (c.born + c.gapBeforePhoto) * s;

  // ---- photo slot ---------------------------------------------------------
  const photoX = centre - layout.photo.w / 2;
  const photoY = y;
  doc.setFillColor('#FFFFFF');
  doc.setDrawColor(RULE_GRAY);
  doc.setLineWidth(1);
  doc.setLineDashPattern([4, 3], 0);
  doc.roundedRect(photoX, photoY, layout.photo.w, layout.photo.h, 10, 10, 'FD');
  doc.setLineDashPattern([], 0);

  // corner ticks, so the empty box still reads as a deliberate frame
  doc.setDrawColor(EMERALD);
  doc.setLineWidth(1.4);
  const tick = 16 * s;
  const corners: [number, number, number, number][] = [
    [photoX + 8, photoY + 8, 1, 1],
    [photoX + layout.photo.w - 8, photoY + 8, -1, 1],
    [photoX + 8, photoY + layout.photo.h - 8, 1, -1],
    [photoX + layout.photo.w - 8, photoY + layout.photo.h - 8, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    doc.line(cx, cy, cx + tick * dx, cy);
    doc.line(cx, cy, cx, cy + tick * dy);
  }

  drawText(doc, 'add a photo here', centre, photoY + layout.photo.h / 2 - 12 * s,
    { size: 11 * s, italic: true, color: QUIET_GRAY, align: 'center' });
  drawText(doc, `a picture of ${entry.name.split(' ')[0]} on the big day`, centre, photoY + layout.photo.h / 2 + 4 * s,
    { size: 8 * s, italic: true, color: RULE_GRAY, align: 'center' });

  // balloons flanking the photo slot
  const clusterScale = Math.min(1, layout.photo.h / 300) * s;
  balloonCluster(doc, (MARGIN_X + photoX) / 2, photoY + 26 * s, clusterScale,
    [EMERALD, GOLD, BIRTHDAY_PALETTE[2]]);
  balloonCluster(doc, (right + photoX + layout.photo.w) / 2, photoY + 44 * s, clusterScale * 0.88,
    [BIRTHDAY_PALETTE[3], BIRTHDAY_PALETTE[2], GOLD]);

  y += layout.photo.h + c.gapAfterPhoto * s;

  // ---- wish ---------------------------------------------------------------
  const wish = `with love from everyone in ${ctx.className}`;
  const wishSize = fitSize(doc, wish, CARD_CONTENT_W - 40, 12 * s, 8, { italic: true });
  drawText(doc, wish, centre, y + 4 * s, { size: wishSize, italic: true, color: SUBTITLE_GRAY, align: 'center' });
  y += c.wish * s;

  // ---- cake ---------------------------------------------------------------
  const cakeH = c.cake * s;
  cake(doc, centre, y + cakeH - 6 * s, 112 * s, facts.turning);
  y += cakeH;

  // ---- footer -------------------------------------------------------------
  hline(doc, centre - 60 * s, centre + 60 * s, y + 4 * s, RULE_GRAY, 0.75);
  drawText(doc, `${ctx.className} · Montree`, centre, y + 9 * s,
    { size: 7.5 * s, italic: true, color: FOOTER_GRAY, align: 'center' });

  // ---- confetti (drawn last, but only where nothing is written) ------------
  confetti(doc, { x: 12, y: MARGIN_Y + 6, w: CARD_PAGE_W - 24, h: CARD_PAGE_H - MARGIN_Y - 40 }, {
    count: 46,
    seed: seedFromString(`${entry.name}|${entry.iso}`),
    scale: s,
    avoid: [
      { x: MARGIN_X - 6, y: MARGIN_Y - 6, w: CARD_CONTENT_W + 12, h: headerH + 12 },
      { x: MARGIN_X - 6, y: nameTop - 26 * s, w: CARD_CONTENT_W + 12, h: (nameBottom - nameTop) + 90 * s },
      { x: photoX - 4, y: photoY - 4, w: layout.photo.w + 8, h: layout.photo.h + 8 },
      { x: MARGIN_X - 40, y: photoY - 10, w: photoX - MARGIN_X + 44, h: 130 * s },
      { x: photoX + layout.photo.w - 4, y: photoY - 10, w: right - (photoX + layout.photo.w) + 44, h: 140 * s },
      { x: centre - 130 * s, y: y - cakeH - c.wish * s - 6, w: 260 * s, h: cakeH + c.wish * s + 44 * s },
    ],
  });
}

export interface BirthdayCardsOptions {
  entries: BirthdayEntry[];
  className?: string;
  logoBytes?: ArrayBuffer | null;
  /** injectable for tests; defaults to now */
  today?: Date;
}

/** Every child's card in ONE document — one page each, in calendar order. */
export async function buildBirthdayCardsPdf(opts: BirthdayCardsOptions): Promise<Blob> {
  const entries = sortByCalendar(opts.entries);
  if (entries.length === 0) throw new Error('buildBirthdayCardsPdf: at least one child is required');

  const className = (opts.className ?? '').trim() || 'Our Class';
  const today = opts.today ?? new Date();
  const logoArt = opts.logoBytes ? await artFromBytes(opts.logoBytes) : null;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  entries.forEach((entry, i) => {
    if (i > 0) doc.addPage('letter', 'portrait');
    drawBirthdayCard(doc, entry, { className, logoArt, today });
  });
  return doc.output('blob');
}

// ============================================================== BIRTHDAY BOARD

/**
 * The class photo board: every child on ONE decorated page, in calendar order.
 *
 * Geometry, all in pt on the same US Letter sheet as the cards:
 *   • a dressed frame 16pt in from the paper edge — mat band, gold rule,
 *     emerald hairline, pearl chain, a medallion pinning each corner,
 *   • bunting strung between the two top medallions,
 *   • the header lockup — emblem, class name, title, subtitle — ending at y=192,
 *   • the emblem again, half the page wide at 8% opacity, behind the grid,
 *   • the tile grid from y=200 to y=706,
 *   • a footer strip below it, with a balloon cluster in each bottom corner
 *     and a scallop run along the bottom of the frame.
 *
 * The single-page guarantee is structural rather than defensive: the grid's
 * box is a constant, and the number of ROWS is derived from the child count,
 * so the tiles shrink to fit rather than the page growing. Everything the
 * border and header draw sits OUTSIDE that box, so no amount of decoration can
 * push a tile off the sheet.
 */
export const BOARD_FRAME_INSET = 16;
export const BOARD_MARGIN_X = 54;
export const BOARD_GRID_TOP = 200;
export const BOARD_GRID_BOTTOM = 706;
const BOARD_GUTTER_X = 12;
const BOARD_GUTTER_Y = 8;
/** Photo diameter as a share of the tile width — leaves room for the ring. */
const BOARD_PHOTO_SHARE = 0.84;
const BOARD_MIN_PHOTO_D = 22;
/**
 * Past this many children a tile stops being a photo and starts being a dot.
 * Anyone beyond it is counted in the footer instead of printed illegibly —
 * the same "+N more" honesty the wall chart uses for a crowded month.
 */
export const BOARD_MAX_TILES = 40;

// ---- header lockup ---------------------------------------------------------
/**
 * The emblem is the second-largest thing on the sheet after a photograph, and
 * the title sits beside it rather than under it. Stacking them would have cost
 * another ~60pt of page and taken it straight out of the tiles; side by side,
 * the header is hero-scale and the grid keeps the photo size it had when the
 * header was a 34pt corner stamp.
 */
const BOARD_EMBLEM_D = 110;
const BOARD_LOCKUP_TOP = 70;
const BOARD_LOCKUP_GAP = 20;
/**
 * The watermark: the same emblem, 62% of the page wide, centred on the grid.
 *
 * The opacity was set by looking at renders, not by taste in the abstract.
 * Below ~6% the emblem vanishes into the gutters between tiles and reads as a
 * printing fault; above ~9% it starts to tint the pale photo discs and compete
 * with the month-coloured dates. 8% is the value at which the crest is plainly
 * there and every name, date and ring still reads at arm's length.
 */
const BOARD_WATERMARK_W = 0.62 * CARD_PAGE_W;
const BOARD_WATERMARK_OPACITY = 0.08;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export interface BirthdayBoardLayout {
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
  gutterX: number;
  gutterY: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  /** diameter of the circular photo */
  photoD: number;
  nameSize: number;
  dateSize: number;
  /** name + date + their gaps, measured below the photo */
  textBlockH: number;
  /** how many children actually get a tile */
  shown: number;
  /** how many did not fit and are reported in the footer instead */
  overflow: number;
  fits: boolean;
}

/**
 * Choose the grid.
 *
 * Column count is not a constant and not a guess: every candidate from 2 to 7
 * columns is costed and the one that yields the LARGEST photo wins, ties going
 * to the fewer columns. That is what makes a class of 12 print big portraits
 * and a class of 24 print smaller ones off the same code path — with 4 columns
 * hard-coded, 12 children would waste half the page and 22 would be squeezed
 * by the extra row rather than by the extra column.
 */
export function computeBirthdayBoardLayout(count: number): BirthdayBoardLayout {
  const shown = clamp(count, 1, BOARD_MAX_TILES);
  const overflow = Math.max(0, count - shown);

  const gridX = BOARD_MARGIN_X;
  const gridW = CARD_PAGE_W - 2 * BOARD_MARGIN_X;     // 504
  const gridY = BOARD_GRID_TOP;
  const gridH = BOARD_GRID_BOTTOM - BOARD_GRID_TOP;   // 568

  const cost = (cols: number) => {
    const rows = Math.ceil(shown / cols);
    const tileW = (gridW - (cols - 1) * BOARD_GUTTER_X) / cols;
    const tileH = (gridH - (rows - 1) * BOARD_GUTTER_Y) / rows;
    const nameSize = clamp(tileW * 0.11, 6.5, 11);
    const dateSize = nameSize * 0.82;
    const textBlockH = 6 + nameSize * 1.22 + dateSize * 1.2 + 2;
    const photoD = Math.min(tileW * BOARD_PHOTO_SHARE, tileH - textBlockH);
    return { cols, rows, tileW, tileH, nameSize, dateSize, textBlockH, photoD };
  };

  let best = cost(2);
  for (let cols = 3; cols <= 7; cols++) {
    const c = cost(cols);
    if (c.photoD > best.photoD + 0.01) best = c;
  }

  // Defensive floor. Unreachable at BOARD_MAX_TILES=40 (7 columns still leaves
  // a ~52pt photo), but the guarantee must not depend on that constant never
  // being raised: shrink the type until the minimum photo fits the tile.
  let { nameSize, dateSize, textBlockH, photoD } = best;
  let fits = true;
  if (photoD < BOARD_MIN_PHOTO_D) {
    photoD = Math.min(BOARD_MIN_PHOTO_D, best.tileH * 0.55);
    const room = Math.max(0, best.tileH - photoD);
    const shrink = textBlockH > 0 ? Math.min(1, room / textBlockH) : 0;
    nameSize = Math.max(4.5, nameSize * shrink);
    dateSize = Math.max(3.8, dateSize * shrink);
    textBlockH = room;
    fits = photoD >= BOARD_MIN_PHOTO_D * 0.75;
  }

  return {
    cols: best.cols,
    rows: best.rows,
    tileW: best.tileW,
    tileH: best.tileH,
    gutterX: BOARD_GUTTER_X,
    gutterY: BOARD_GUTTER_Y,
    gridX, gridY, gridW, gridH,
    photoD, nameSize, dateSize, textBlockH,
    shown, overflow, fits,
  };
}

/** One tile's worth of child: a name, a birthday (or none), and a photo. */
export interface BirthdayBoardChild {
  name: string;
  /**
   * The child's birthday, or null/undefined when none is on file. A null
   * entry is never a reason to leave the child off the board.
   */
  entry?: BirthdayEntry | null;
  /**
   * Square JPEG data URL, already fetched and cover-cropped by the caller
   * (see lib/montree/birthdays/roster.ts). Missing or failed photos fall back
   * to an initial-letter disc, so one broken image never fails the sheet.
   */
  photoDataUrl?: string | null;
}

/** January → December, then the children with no birthday on file. */
export function sortBoardChildren(children: BirthdayBoardChild[]): BirthdayBoardChild[] {
  const dated = children.filter((c) => c.entry);
  const undated = children.filter((c) => !c.entry);
  dated.sort((a, b) =>
    (a.entry!.month - b.entry!.month) ||
    (a.entry!.day - b.entry!.day) ||
    a.name.localeCompare(b.name));
  undated.sort((a, b) => a.name.localeCompare(b.name));
  return [...dated, ...undated];
}

/** The colour a tile's ring, initial and month accent take. */
function boardAccent(entry: BirthdayEntry | null | undefined): string {
  if (!entry) return QUIET_GRAY;
  return BIRTHDAY_PALETTE[(entry.month - 1) % BIRTHDAY_PALETTE.length];
}

/**
 * Tile captions: first names, except where the class has two of them.
 *
 * A first name is what a three-year-old recognises on a wall, so it is the
 * default — but a room with two Emmas would get two circles both labelled
 * "Emma", which is a wrong sheet rather than a plain one. Only the clashing
 * names gain a surname initial; everyone else stays first-name-only.
 */
export function boardLabels(children: BirthdayBoardChild[]): string[] {
  const parts = children.map((c) => c.name.trim().split(/\s+/));
  const counts = new Map<string, number>();
  for (const p of parts) {
    const key = (p[0] ?? '').toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return parts.map((p) => {
    const first = p[0] ?? '';
    if (!first) return '?';
    if ((counts.get(first.toLowerCase()) ?? 0) < 2 || p.length < 2) return first;
    return `${first} ${p[p.length - 1][0].toUpperCase()}.`;
  });
}

/**
 * Draw one child's tile: a circular photo with a month-coloured ring, the
 * first name under it and the birthday under that.
 *
 * The circle is a REAL crop, not a rounded frame over a square: the photo is
 * painted inside a jsPDF clipping path (`circle(..., null)` → `clip()` →
 * `discardPath()`), which is why the caller must hand over an already-square
 * image — a square drawn edge-to-edge in a circular clip is an exact cover
 * fill with no aspect-ratio maths left to get wrong.
 */
function drawBoardTile(
  doc: jsPDF,
  child: BirthdayBoardChild,
  label: string,
  x: number,
  y: number,
  layout: BirthdayBoardLayout,
) {
  const accent = boardAccent(child.entry);
  const cx = x + layout.tileW / 2;
  const blockH = layout.photoD + layout.textBlockH;
  const top = y + Math.max(0, (layout.tileH - blockH) / 2);
  const r = layout.photoD / 2;
  const cy = top + r;

  if (child.photoDataUrl) {
    doc.saveGraphicsState();
    doc.circle(cx, cy, r, null);      // path only — no painting operator
    doc.clip();
    doc.discardPath();
    doc.addImage(child.photoDataUrl, 'JPEG', cx - r, cy - r, r * 2, r * 2, undefined, 'FAST');
    doc.restoreGraphicsState();
  } else {
    // Initial-letter disc. A child with no photo still gets a real tile —
    // a hole in the grid would read as "this child was forgotten".
    doc.setFillColor(child.entry && child.entry.month % 2 === 0 ? PANEL_GOLD : PANEL_TEAL);
    doc.circle(cx, cy, r, 'F');
    const initial = (child.name.trim()[0] || '?').toUpperCase();
    drawText(doc, initial, cx, cy - layout.photoD * 0.21, {
      size: Math.max(6, layout.photoD * 0.42), bold: true, color: accent, align: 'center',
    });
  }

  doc.setDrawColor(accent);
  doc.setLineWidth(Math.max(1, layout.photoD * 0.028));
  doc.circle(cx, cy, r + 1.2, 'S');

  // ---- name + birthday ----------------------------------------------------
  const textW = layout.tileW - 4;
  let ty = top + layout.photoD + 6;

  // A name is the one thing on this sheet that must never be abbreviated: a
  // child reading "Maximilian-Alex…" under their own photograph is a worse
  // sheet than one tile of slightly smaller type. So the label shrinks to fit
  // its tile first, down to 72% of the grid's size, and only truncates if even
  // that will not do. The line ADVANCE stays on layout.nameSize, so every date
  // in the grid still sits on the same baseline.
  const nameSize = fitSize(doc, label, textW, layout.nameSize, layout.nameSize * 0.72, { bold: true });
  const nameOpts: TextOpts = { size: nameSize, bold: true, color: INK, align: 'center' };
  drawText(doc, truncate(doc, label, textW, nameOpts), cx, ty + (layout.nameSize - nameSize) * 0.5, nameOpts);
  ty += layout.nameSize * 1.22;

  if (child.entry) {
    drawText(doc, `${child.entry.day} ${MONTH_ABBR[child.entry.month - 1]}`, cx, ty, {
      size: layout.dateSize, bold: true, color: accent, align: 'center',
    });
  } else {
    const noteOpts: TextOpts = { size: layout.dateSize, italic: true, color: QUIET_GRAY, align: 'center' };
    drawText(doc, truncate(doc, 'not on file', textW, noteOpts), cx, ty, noteOpts);
  }
}

/**
 * The emblem at hero scale in the header.
 *
 * A teacher's own emblem is already a finished mark — the shipped Montree one
 * is a ruled roundel — so it is given the whole box and nothing else. Ringing a
 * crest that already has a ring is what makes a sheet look assembled rather
 * than designed. With no logo on file the house whale gets the medallion
 * treatment instead, so the header carries the same weight either way and the
 * lockup never collapses to a title floating on its own.
 */
function drawBoardEmblem(doc: jsPDF, art: Art | null, cx: number, cy: number, d: number) {
  if (art) {
    placeContained(doc, art, cx - d / 2, cy - d / 2, d, d);
    return;
  }
  const r = d / 2;
  doc.setFillColor(PANEL_TEAL);
  doc.circle(cx, cy, r, 'F');
  whale(doc, { cx, cy: cy + d * 0.03, w: d * 0.8, color: EMERALD, detail: true });
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.6);
  doc.circle(cx, cy, r, 'S');
  doc.setDrawColor(EMERALD);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, r + 3.4, 'S');
}

/**
 * The emblem again, huge and almost invisible, behind the photo grid.
 *
 * Drawn inside a saved graphics state with a low-alpha GState so the tiles,
 * names and dates that land on top of it are completely unaffected — the
 * watermark is the only thing in the document that is ever transparent, and it
 * is restored immediately so nothing downstream inherits the alpha.
 */
function drawBoardWatermark(doc: jsPDF, art: Art | null, cx: number, cy: number, w: number) {
  doc.saveGraphicsState();
  doc.setGState(new GState({ opacity: BOARD_WATERMARK_OPACITY }));
  if (art) {
    const h = w * (art.dims.height / art.dims.width);
    doc.addImage(art.dataUrl, art.format, cx - w / 2, cy - h / 2, w, h, undefined, 'FAST');
  } else {
    whale(doc, { cx, cy, w, color: EMERALD });
  }
  doc.restoreGraphicsState();
}

export interface BirthdayBoardOptions {
  children: BirthdayBoardChild[];
  className?: string;
  logoBytes?: ArrayBuffer | null;
  /** injectable for tests; defaults to now */
  today?: Date;
}

/** The whole class on ONE festive page — photos, calendar order, one sheet. */
export async function buildBirthdayBoardPdf(opts: BirthdayBoardOptions): Promise<Blob> {
  const all = sortBoardChildren(opts.children.filter((c) => c.name?.trim()));
  if (all.length === 0) throw new Error('buildBirthdayBoardPdf: at least one child is required');

  const className = (opts.className ?? '').trim() || 'Our Class';
  const logoArt = opts.logoBytes ? await artFromBytes(opts.logoBytes) : null;

  const layout = computeBirthdayBoardLayout(all.length);
  const children = all.slice(0, layout.shown);
  const undatedCount = all.filter((c) => !c.entry).length;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const centre = CARD_PAGE_W / 2;
  const fi = BOARD_FRAME_INSET;

  // ---- frame + bunting ----------------------------------------------------
  const frame = boardFrame(doc, {
    pageW: CARD_PAGE_W, pageH: CARD_PAGE_H, inset: fi, band: 11, radius: 20, pearlStep: 15,
  });
  const [topLeft, topRight] = frame.corners;
  bunting(doc, topLeft[0] + 2, topRight[0] - 2, topLeft[1] + 4, { flags: 13, droop: 10, flagH: 13 });

  // ---- header lockup ------------------------------------------------------
  // Emblem left, type right, the pair centred as one block. The block's width
  // is measured rather than assumed, so a long class name pushes the emblem
  // left instead of shoving the title off centre.
  const classOpts: TextOpts = { size: 10, bold: true, color: EMERALD, charSpace: 2.0 };
  const titleOpts: TextOpts = { size: 34, bold: true, color: INK };
  const subOpts: TextOpts = { size: 9, italic: true, color: SUBTITLE_GRAY };
  const classText = className.toUpperCase();
  const subText = 'every birthday in our class, January to December';
  const textW = Math.max(
    measure(doc, classText, classOpts),
    measure(doc, 'Birthdays', titleOpts),
    measure(doc, subText, subOpts),
  );
  const groupW = BOARD_EMBLEM_D + BOARD_LOCKUP_GAP + textW;
  const gx = (CARD_PAGE_W - groupW) / 2;
  const lt = BOARD_LOCKUP_TOP;

  drawBoardEmblem(doc, logoArt, gx + BOARD_EMBLEM_D / 2, lt + BOARD_EMBLEM_D / 2, BOARD_EMBLEM_D);

  const tx = gx + BOARD_EMBLEM_D + BOARD_LOCKUP_GAP;
  const ty = lt + 18;
  drawText(doc, classText, tx, ty, classOpts);
  drawText(doc, 'Birthdays', tx, ty + 16, titleOpts);
  hline(doc, tx, tx + 54, ty + 62, GOLD, 1.2);
  drawText(doc, subText, tx, ty + 70, subOpts);

  // A rule closing the header, broken by a single gold star on the page axis.
  const oy = lt + BOARD_EMBLEM_D + 12;
  hline(doc, centre - 150, centre - 14, oy, RULE_GRAY, 0.6);
  hline(doc, centre + 14, centre + 150, oy, RULE_GRAY, 0.6);
  star4(doc, centre, oy, 5, GOLD);

  // ---- watermark ----------------------------------------------------------
  drawBoardWatermark(doc, logoArt, centre, (BOARD_GRID_TOP + BOARD_GRID_BOTTOM) / 2, BOARD_WATERMARK_W);

  // ---- the grid -----------------------------------------------------------
  // The last row is usually short (22 children over 5 columns leaves two), and
  // a short row left-aligned reads as a mistake rather than a design — so every
  // row is centred on its own width. Full rows are unaffected (offset 0).
  const rowIndent = (row: number) => {
    const inRow = Math.min(layout.cols, children.length - row * layout.cols);
    const rowW = inRow * layout.tileW + (inRow - 1) * layout.gutterX;
    return (layout.gridW - rowW) / 2;
  };

  const labels = boardLabels(children);
  children.forEach((child, i) => {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = layout.gridX + rowIndent(row) + col * (layout.tileW + layout.gutterX);
    const y = layout.gridY + row * (layout.tileH + layout.gutterY);
    drawBoardTile(doc, child, labels[i], x, y, layout);
  });

  // ---- footer -------------------------------------------------------------
  balloonCluster(doc, fi + 46, BOARD_GRID_BOTTOM + 12, 0.62, [EMERALD, GOLD, BIRTHDAY_PALETTE[2]]);
  balloonCluster(doc, CARD_PAGE_W - fi - 46, BOARD_GRID_BOTTOM + 16, 0.56, [GOLD, BIRTHDAY_PALETTE[3], EMERALD]);
  // A scallop run answering the bunting, so the frame reads top and bottom.
  const [, , bottomRight, bottomLeft] = frame.corners;
  scallops(doc, bottomLeft[0] + 14, bottomRight[0] - 14, CARD_PAGE_H - frame.inner - 9, 4.5, GOLD, true);

  const dated = all.length - undatedCount;
  const footParts = [className, `${dated} ${dated === 1 ? 'birthday' : 'birthdays'}`];
  if (undatedCount > 0) {
    footParts.push(`${undatedCount} ${undatedCount === 1 ? 'birthday' : 'birthdays'} not on file yet`);
  }
  if (layout.overflow > 0) footParts.push(`+${layout.overflow} more not shown`);
  footParts.push('Montree');

  const footY = 736;
  hline(doc, centre - 150, centre + 150, footY - 8, RULE_GRAY, 0.6);
  const footText = footParts.join(' · ');
  const footSize = fitSize(doc, footText, CARD_PAGE_W - 2 * BOARD_MARGIN_X - 40, 8.5, 6, { italic: true });
  drawText(doc, footText, centre, footY, { size: footSize, italic: true, color: FOOTER_GRAY, align: 'center' });

  // ---- confetti, where confetti would actually be --------------------------
  // Two panels either side of the header lockup, under the bunting it fell
  // from. An even sprinkle over the whole border reads as noise; a scatter with
  // a source reads as a party. Both panels are bounded by the lockup's measured
  // width, so they can never encroach on the type.
  const seed = seedFromString(`${className}|board|${all.length}`);
  const fallY = 76;
  const fallH = 100;
  confetti(doc, { x: frame.inner + 10, y: fallY, w: gx - frame.inner - 30, h: fallH },
    { count: 9, seed, scale: 0.72 });
  confetti(doc, { x: gx + groupW + 20, y: fallY, w: CARD_PAGE_W - frame.inner - 10 - (gx + groupW + 20), h: fallH },
    { count: 9, seed: seed ^ 0x9e37, scale: 0.72 });

  // One sparkle per grid row in each side band, on the row's own centre line —
  // placed rather than scattered, so the margins read as composed.
  const bandL = (frame.inner + BOARD_MARGIN_X - 14) / 2;
  const bandR = CARD_PAGE_W - bandL;
  for (let row = 0; row < layout.rows; row++) {
    const sy = layout.gridY + (row + 0.5) * layout.tileH + row * layout.gutterY;
    star4(doc, row % 2 === 0 ? bandL : bandR, sy, 4.6, GOLD);
    star4(doc, row % 2 === 0 ? bandR : bandL, sy, 2.8, EMERALD);
  }

  return doc.output('blob');
}

// ============================================================ BIRTHDAY TRACKER

export interface TrackerLayout {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  gutter: number;
  gridX: number;
  gridY: number;
  /** vertical pitch of one child row inside a month box */
  lineH: number;
  fontSize: number;
  /** 1 or 2 columns of names inside each month box */
  innerCols: number;
  /** how many children a month box can show before "+N more" */
  capacity: number;
}

/**
 * Derive the wall chart's grid from the busiest month.
 *
 * The page is a hard constraint, so the maths runs the other way round from a
 * normal layout: available height per month box is known, the number of names
 * in the fullest month is known, and the row pitch falls out of the two. Only
 * if that pitch would drop below legibility does the box switch to two inner
 * columns, and only if *that* is still not enough does the overflow collapse
 * into a "+N more" line.
 */
export function computeTrackerLayout(size: TrackerSize, maxCount: number, headerH: number, footerH: number): TrackerLayout {
  const page = TRACKER_SIZES[size];
  const s = page.w / TRACKER_SIZES.A4.w;          // geometry scale
  const f = Math.sqrt(s);                          // type scale — sub-linear on
                                                   // purpose, so A3 buys real
                                                   // breathing room, not just a
                                                   // photocopy enlargement.
  const margin = 36 * s;
  const gutter = 14 * s;
  const cols = 3;
  const rows = 4;

  const gridX = margin;
  const gridY = margin + headerH;
  const contentW = page.w - 2 * margin;
  const gridH = page.h - margin - footerH - gridY;

  const cellW = (contentW - (cols - 1) * gutter) / cols;
  const cellH = (gridH - (rows - 1) * gutter) / rows;

  const barH = 17 * f;
  const listH = cellH - barH - 12 * s;

  const idealLineH = 13.5 * f;
  const minLineH = 8.4 * f;

  let innerCols = 1;
  let lineH = listH / Math.max(1, maxCount);
  if (lineH < minLineH) {
    innerCols = 2;
    lineH = listH / Math.max(1, Math.ceil(maxCount / 2));
  }
  lineH = Math.min(idealLineH, Math.max(minLineH, lineH));

  const rowsPerCol = Math.max(1, Math.floor(listH / lineH));
  const capacity = rowsPerCol * innerCols;
  const fontSize = Math.min(11 * f, Math.max(6, lineH * 0.66));

  return { cols, rows, cellW, cellH, gutter, gridX, gridY, lineH, fontSize, innerCols, capacity };
}

export interface BirthdayTrackerOptions {
  entries: BirthdayEntry[];
  className?: string;
  logoBytes?: ArrayBuffer | null;
  size: TrackerSize;
  today?: Date;
}

/** The whole class on one wall-chart page: 12 month boxes, 3 across, 4 down. */
export async function buildBirthdayTrackerPdf(opts: BirthdayTrackerOptions): Promise<Blob> {
  const page = TRACKER_SIZES[opts.size];
  const s = page.w / TRACKER_SIZES.A4.w;
  const f = Math.sqrt(s);
  const margin = 36 * s;
  const className = (opts.className ?? '').trim() || 'Our Class';
  const logoArt = opts.logoBytes ? await artFromBytes(opts.logoBytes) : null;

  const months = groupByMonth(opts.entries);
  const maxCount = months.reduce((m, b) => Math.max(m, b.length), 0);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [page.w, page.h] });

  const contentW = page.w - 2 * margin;
  const rightX = margin + contentW;

  // ---- header ---------------------------------------------------------
  const logoBox = 40 * f;
  let hy = margin;
  if (logoArt) placeContained(doc, logoArt, margin, hy, logoBox, logoBox);
  const textX = margin + (logoArt ? logoBox + 12 * f : 0);

  drawText(doc, className.toUpperCase(), textX, hy + 2 * f,
    { size: 10 * f, bold: true, color: EMERALD, charSpace: 1.6 });
  drawText(doc, 'Birthday Board', textX, hy + 15 * f, { size: 25 * f, bold: true, color: INK });
  // The balloons own the top-right corner, so the strapline stops clear of
  // them rather than running under the strings.
  const balloonZone = 56 * f;
  balloonCluster(doc, rightX - balloonZone / 2, hy + 4 * f, 0.62 * f, [GOLD, EMERALD, BIRTHDAY_PALETTE[2]]);
  drawText(doc, 'every birthday in our class, month by month', rightX - balloonZone, hy + 26 * f,
    { size: 9 * f, italic: true, color: SUBTITLE_GRAY, align: 'right' });

  hy += Math.max(logoBox, 44 * f);
  hline(doc, margin, rightX, hy, INK, 1);
  bunting(doc, margin, rightX, hy + 1, { flags: opts.size === 'A3' ? 18 : 14, droop: 7 * f, flagH: 9 * f });
  const headerH = (hy - margin) + 26 * f;

  const footerH = 24 * f;
  const layout = computeTrackerLayout(opts.size, maxCount, headerH, footerH);

  // ---- month boxes ------------------------------------------------------
  const padX = 9 * s;
  const barH = 17 * f;
  const dayGutter = 15 * f;

  for (let m = 0; m < 12; m++) {
    const col = m % layout.cols;
    const row = Math.floor(m / layout.cols);
    const x = layout.gridX + col * (layout.cellW + layout.gutter);
    const y = layout.gridY + row * (layout.cellH + layout.gutter);

    // box
    doc.setFillColor(m % 2 === 0 ? PANEL_TEAL : PANEL_GOLD);
    doc.setDrawColor(RULE_GRAY);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, y, layout.cellW, layout.cellH, 7 * s, 7 * s, 'FD');

    // month bar
    drawText(doc, MONTH_NAMES[m].toUpperCase(), x + padX, y + 4.5 * f,
      { size: 10 * f, bold: true, color: INK, charSpace: 1.3 });
    doc.setFillColor(BIRTHDAY_PALETTE[m % BIRTHDAY_PALETTE.length]);
    doc.circle(x + layout.cellW - padX - 3 * f, y + 8 * f, 3.2 * f, 'F');
    hline(doc, x + padX, x + layout.cellW - padX, y + barH - 3 * f, RULE_GRAY, 0.6);

    const bucket = months[m];
    const listTop = y + barH + 2 * s;
    const colW = (layout.cellW - 2 * padX - (layout.innerCols - 1) * 8 * s) / layout.innerCols;

    if (bucket.length === 0) {
      drawText(doc, 'no birthdays', x + padX, listTop + 2 * s,
        { size: Math.max(6, layout.fontSize * 0.92), italic: true, color: QUIET_GRAY });
      continue;
    }

    const overflow = bucket.length > layout.capacity;
    const shown = overflow ? bucket.slice(0, layout.capacity - 1) : bucket;
    const perCol = Math.ceil(layout.capacity / layout.innerCols);

    shown.forEach((entry, i) => {
      const ic = Math.floor(i / perCol);
      const ir = i % perCol;
      const ex = x + padX + ic * (colW + 8 * s);
      const ey = listTop + ir * layout.lineH;

      drawText(doc, String(entry.day), ex + dayGutter - 3 * f, ey,
        { size: layout.fontSize, bold: true, color: GOLD, align: 'right' });
      const nameOpts: TextOpts = { size: layout.fontSize, color: INK };
      drawText(doc, truncate(doc, entry.name, colW - dayGutter, nameOpts), ex + dayGutter, ey, nameOpts);
    });

    if (overflow) {
      const i = layout.capacity - 1;
      const ic = Math.floor(i / perCol);
      const ir = i % perCol;
      drawText(doc, `+${bucket.length - shown.length} more`,
        x + padX + ic * (colW + 8 * s) + dayGutter, listTop + ir * layout.lineH,
        { size: layout.fontSize * 0.92, italic: true, color: CAPTION_GRAY });
    }
  }

  // ---- footer -----------------------------------------------------------
  const total = opts.entries.length;
  const footY = page.h - margin - footerH + 6 * f;
  hline(doc, margin, rightX, footY - 4 * f, RULE_GRAY, 0.6);
  drawText(doc, `${className} · ${total} ${total === 1 ? 'birthday' : 'birthdays'} · Montree`,
    page.w / 2, footY, { size: 8 * f, italic: true, color: FOOTER_GRAY, align: 'center' });

  // ---- a whisper of confetti in the header band -------------------------
  confetti(doc, { x: margin, y: margin - 4 * f, w: contentW, h: headerH - 6 * f }, {
    count: opts.size === 'A3' ? 26 : 18,
    seed: seedFromString(`${className}|${opts.size}`),
    scale: f,
    avoid: [
      { x: margin - 4, y: margin - 4, w: contentW * 0.7, h: 50 * f },
      { x: margin + contentW * 0.5, y: margin + 14 * f, w: contentW * 0.5 + 4, h: 24 * f },
    ],
  });

  return doc.output('blob');
}
