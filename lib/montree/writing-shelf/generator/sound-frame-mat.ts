// lib/montree/writing-shelf/generator/sound-frame-mat.ts
//
// Sheet 01 — the SOUND-FRAME MAT, a.k.a. the letter sorting mat, "the first
// work". An add-on generator: the shipped static PDF at
// public/dark-phonics-shelf/v2/01-sound-frame-mat.pdf and its Python builder
// are UNTOUCHED. This is for when the owner wants a different mat — more
// frames, letters printed in them, or the whole thing on A3.
//
// Geometry is ported from scripts/curriculum/writing-shelf/build_sound_frame_mat.py:
//
//   A4 landscape, 297 x 210. Trim rectangle 282 x 100, CENTRED and identical
//   on both sides. Front (Tray 1): 3 frames of 70 mm with 6 mm gutters. Back
//   (Tray 3): 4 frames of 66 mm with 4 mm gutters — the largest four-up that
//   keeps the frames inside the 5.5 mm printer-safe margin.
//
// DUPLEX. Short-edge flip of a LANDSCAPE sheet is a rotation about the short
// (vertical) edge: a left<->right mirror, (x, y) -> (W - x, y). A rectangle
// centred on the sheet maps onto itself under that map, so the front cut line
// and the back cut line coincide and ONE cut serves both faces. The generator
// refuses (warns) if the trim is ever moved off centre.
//
// A3 — "every border neat and uniform". A3 landscape is 420 x 297. Instead of
// the A4 sheet's three different margins (30 mm front mat margin, 3 mm back,
// 15/17 mm top and bottom) the A3 mat uses ONE border value, default 15 mm,
// for the mat's outer margin AND for the gaps between frames. The frames are
// then sized to fill the trim exactly:
//
//     frameW = (trimW - (n + 1) * border) / n
//     frameH = trimH - 2 * border
//
// so at the defaults (trim 400 x 111, border 15) the front is 3 frames of
// 113.33 x 81.00 mm and the back 4 frames of 81.25 x 81.00 mm — every gap on
// either face is exactly 15 mm, and the back frames come out square to a
// quarter of a millimetre. The trim is identical on both sides, as it must be.

import {
  CONTENT_CLEAR_MM,
  SAFE_MM,
  AMBER,
  INK,
  cardsLine,
  countCutLines,
  escapeHtml,
  renderCutGuides,
  renderFooter,
  trimLines,
} from './cut-guides';
import { pageSize, printDocument, type Paper } from './page-shell';

/** Frame stroke and corner, matched to the shipped sheet. */
export const FRAME_STROKE_MM = 0.265;
export const FRAME_CORNER_MM = 1.84;
/** Frame edge -> cut line, both sides. */
export const MAT_MARGIN_MIN_MM = 3.0;

export type MatSideName = 'front' | 'back';

export interface MatSideConfig {
  /** How many frames on this side. */
  count: number;
  /** Frame size, mm — SHELF mode only. Ignored when `uniformBorder` is set. */
  frame?: number;
  /** Gap between frames, mm — SHELF mode only. */
  gutter?: number;
  /**
   * Optional letter or word printed inside each frame, index by index.
   * Default: none at all — the mat is BARE, which is what the work wants
   * (the child puts counters and then letter tiles into empty frames).
   */
  labels?: string[];
  /** Index of the "spare" frame, drawn in amber dashes. -1 or undefined = none. */
  spareIndex?: number;
  /** The line of adult prose printed OUTSIDE the trim, on the part you throw away. */
  note?: string;
}

export interface MatConfig {
  paper: Paper;
  /** Trim rectangle, mm. Centred on the sheet — both sides share it. */
  trimWidth: number;
  trimHeight: number;
  /**
   * When set, the mat is drawn in UNIFORM-BORDER mode: this one value is the
   * mat's outer margin AND every gap between frames, and the frame size is
   * computed to fill the trim. This is the A3 default.
   */
  uniformBorder?: number;
  front: MatSideConfig;
  back: MatSideConfig;
  /** Duplex calibration CSS for the BACK page (mirror: 'horizontal'). */
  backPageStyle?: string;
  title?: string;
  /** Override the @font-face rules (used to inline the face in the samples). */
  fontFaceCss?: string;
}

export interface MatSideGeometry {
  count: number;
  frameWidth: number;
  frameHeight: number;
  gutter: number;
  /** Left edge of each frame, mm from the page's left edge. */
  xs: number[];
  /** Bottom edge of the frame row, mm from the page's bottom edge. */
  y: number;
  /** Frame edge -> trim line, horizontally. */
  matMarginX: number;
  /** Frame edge -> trim line, vertically. */
  matMarginY: number;
}

export interface MatGeometry {
  pageWidth: number;
  pageHeight: number;
  trimX0: number;
  trimY0: number;
  trimWidth: number;
  trimHeight: number;
  uniform: boolean;
  border: number;
  front: MatSideGeometry;
  back: MatSideGeometry;
  /** Empty when the mat is in spec. Shown to the owner rather than thrown. */
  warnings: string[];
}

/** The largest frame an n-up row can hold — port of build_sound_frame_mat.max_frame(). */
export function maxFrame(trimLen: number, n: number, gutter: number, margin: number): number {
  return (trimLen - 2 * margin - (n - 1) * gutter) / n;
}

/** Uniform-border frame width: n frames and n+1 identical borders fill the trim. */
export function uniformFrameWidth(trimLen: number, n: number, border: number): number {
  return (trimLen - (n + 1) * border) / n;
}

function sideGeometry(
  side: MatSideConfig,
  geo: { pageW: number; trimX0: number; trimY0: number; trimW: number; trimH: number },
  uniformBorder: number | undefined
): MatSideGeometry {
  const n = Math.max(1, Math.round(side.count));
  if (uniformBorder !== undefined) {
    const frameWidth = uniformFrameWidth(geo.trimW, n, uniformBorder);
    const frameHeight = geo.trimH - 2 * uniformBorder;
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      xs.push(geo.trimX0 + uniformBorder + i * (frameWidth + uniformBorder));
    }
    return {
      count: n,
      frameWidth,
      frameHeight,
      gutter: uniformBorder,
      xs,
      y: geo.trimY0 + uniformBorder,
      matMarginX: uniformBorder,
      matMarginY: uniformBorder,
    };
  }

  // SHELF mode: an explicit square frame and gutter, the row centred on the sheet.
  const frame = side.frame ?? 70;
  const gutter = side.gutter ?? 6;
  const span = n * frame + (n - 1) * gutter;
  const x0 = geo.pageW / 2 - span / 2;
  const xs: number[] = [];
  for (let i = 0; i < n; i++) xs.push(x0 + i * (frame + gutter));
  return {
    count: n,
    frameWidth: frame,
    frameHeight: frame,
    gutter,
    xs,
    y: geo.trimY0 + (geo.trimH - frame) / 2,
    matMarginX: x0 - geo.trimX0,
    matMarginY: (geo.trimH - frame) / 2,
  };
}

export function matGeometry(config: MatConfig): MatGeometry {
  const { width: pageW, height: pageH } = pageSize(config.paper, 'landscape');
  const trimW = config.trimWidth;
  const trimH = config.trimHeight;
  const trimX0 = pageW / 2 - trimW / 2;
  const trimY0 = pageH / 2 - trimH / 2;
  const base = { pageW, trimX0, trimY0, trimW, trimH };

  const front = sideGeometry(config.front, base, config.uniformBorder);
  const back = sideGeometry(config.back, base, config.uniformBorder);

  const warnings: string[] = [];
  for (const [name, side] of [['Front', front], ['Back', back]] as const) {
    if (side.frameWidth <= 0 || side.frameHeight <= 0) {
      warnings.push(`${name}: there is no room left for a frame — fewer frames, or a smaller border.`);
      continue;
    }
    if (side.matMarginX < MAT_MARGIN_MIN_MM - 1e-9) {
      warnings.push(
        `${name}: the frames come within ${side.matMarginX.toFixed(1)} mm of the cut line ` +
          `(${MAT_MARGIN_MIN_MM} mm is the minimum).`
      );
    }
    if (side.matMarginY < MAT_MARGIN_MIN_MM - 1e-9) {
      warnings.push(`${name}: the frames are taller than the mat allows.`);
    }
    if (trimX0 + side.matMarginX < SAFE_MM) {
      warnings.push(`${name}: the frames reach inside the printer's ${SAFE_MM} mm margin.`);
    }
  }
  if (trimY0 < 0 || trimY0 + trimH > pageH) {
    warnings.push('The mat is taller than the paper.');
  }
  if (Math.abs(pageW - (trimX0 + trimW) - trimX0) > 1e-9) {
    warnings.push('The trim rectangle is not centred: one cut will not serve both sides.');
  }

  return {
    pageWidth: pageW,
    pageHeight: pageH,
    trimX0,
    trimY0,
    trimWidth: trimW,
    trimHeight: trimH,
    uniform: config.uniformBorder !== undefined,
    border: config.uniformBorder ?? 0,
    front,
    back,
    warnings,
  };
}

function renderFrames(side: MatSideGeometry, cfg: MatSideConfig, pageH: number): string {
  const out: string[] = [];
  const top = pageH - side.y - side.frameHeight;
  for (let i = 0; i < side.count; i++) {
    const spare = cfg.spareIndex !== undefined && cfg.spareIndex === i;
    const colour = spare ? AMBER : INK;
    const dash = spare ? 'border-style:dashed;' : '';
    const label = (cfg.labels ?? [])[i] ?? '';
    // Label type is sized off the frame so it stays inside the 4 mm content
    // clearance whatever size the frame ends up.
    const fs = Math.max(8, (side.frameHeight - 2 * CONTENT_CLEAR_MM) * 0.55);
    out.push(
      `<div class="frame" style="left:${side.xs[i]}mm;top:${top}mm;` +
        `width:${side.frameWidth}mm;height:${side.frameHeight}mm;border-color:${colour};${dash}">` +
        (label
          ? `<span class="frame-label" style="font-size:${fs.toFixed(1)}mm;color:${colour};">${escapeHtml(label)}</span>`
          : '') +
        `</div>`
    );
  }
  return out.join('');
}

function renderSide(
  config: MatConfig,
  geo: MatGeometry,
  which: MatSideName
): string {
  const side = which === 'front' ? geo.front : geo.back;
  const cfg = which === 'front' ? config.front : config.back;
  const lines = trimLines(geo.trimX0, geo.trimY0, geo.trimWidth, geo.trimHeight, geo.pageWidth, geo.pageHeight);

  // Adult text: at least 14 mm from a page edge and clear of the vertical cut
  // line, so no line of type ever begins on a cut line or on a triangle.
  const textX = Math.max(14, geo.trimX0 + 4);
  const noteY = geo.trimY0 - 10;
  const note = cfg.note ?? '';

  return (
    renderCutGuides(lines, geo.pageWidth, geo.pageHeight) +
    renderFrames(side, cfg, geo.pageHeight) +
    `<div class="mat-head" style="left:${textX}mm;top:${geo.pageHeight - geo.trimY0 - geo.trimHeight - 12}mm;">` +
      `Dark Phonics · Writing Shelf · sound-frame mat · ` +
      `${which === 'front' ? 'Front' : 'Back'} · ${side.count} frames of ` +
      `${side.frameWidth.toFixed(side.frameWidth % 1 ? 2 : 0)} × ${side.frameHeight.toFixed(side.frameHeight % 1 ? 2 : 0)} mm` +
    `</div>` +
    (note ? `<div class="mat-note" style="left:${textX}mm;bottom:${noteY}mm;">${escapeHtml(note)}</div>` : '') +
    renderFooter(textX, 9.6, cardsLine(1, 'mat'))
  );
}

const MAT_CSS = `
  .frame { position:absolute; border-width:${FRAME_STROKE_MM}mm; border-style:solid;
           border-radius:${FRAME_CORNER_MM}mm; display:flex; align-items:center; justify-content:center; }
  .frame-label { line-height:1; }
  .mat-head { position:absolute; font-size:7pt; color:#5F594F; }
  .mat-note { position:absolute; right:14mm; font-size:7pt; line-height:1.4; color:#8C857B; }
`;

export interface MatHtmlOptions {
  /** 'both' = one duplex job; 'front'/'back' print a single side. */
  sides?: 'both' | 'front' | 'back';
}

export function buildSoundFrameMatHtml(config: MatConfig, options: MatHtmlOptions = {}): string {
  const geo = matGeometry(config);
  const sides = options.sides ?? 'both';
  const pages: Array<{ html: string; style?: string }> = [];
  if (sides === 'both' || sides === 'front') pages.push({ html: renderSide(config, geo, 'front') });
  if (sides === 'both' || sides === 'back') {
    pages.push({ html: renderSide(config, geo, 'back'), style: config.backPageStyle });
  }
  return printDocument({
    title: config.title ?? 'Sound-frame mat',
    paper: config.paper,
    orientation: 'landscape',
    pages,
    css: MAT_CSS,
    fontFaceCss: config.fontFaceCss,
  });
}

/** For the tests and the on-screen readout. */
export function matCutLineCount(config: MatConfig): number {
  const geo = matGeometry(config);
  return countCutLines(
    trimLines(geo.trimX0, geo.trimY0, geo.trimWidth, geo.trimHeight, geo.pageWidth, geo.pageHeight)
  );
}
