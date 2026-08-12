// Canvas rendering for the Tracing Work tool — draws the strokeFont engine's
// dot/arrow instructions (and the classic three-line school-paper guide,
// ported from build_tracing.py's guidelines()) onto an HTMLCanvasElement,
// then exports a PNG Blob sized for embedding in the generated .docx.
'use client';

import { tracedInstructions, textWidth, type TraceInstructions } from './strokeFont';

export interface StripResult {
  blob: Blob;
  width: number;   // CSS-space (unscaled) size, for aspect-ratio math when embedding
  height: number;
}

const PIXEL_RATIO = 4; // render at 4x for crisp print quality when embedded in a docx

/**
 * Canvas budget *below* the baseline, in em (`size`) units.
 *
 * This is the whole allowance for descenders, so it has to clear the deepest
 * point any glyph's polyline actually reaches — not just its end point. Every
 * glyph in strokeFont.ts was measured via `glyphPolylines(ch, 0, 0, 1)`:
 *
 *   g  -1.0497   ← deepest; the low point of its descender loop, mid-stroke
 *   q  -1.0022
 *   p  -1.0000
 *   y  -1.0000
 *   j  -0.8500   ← exactly the old 0.85 budget, i.e. flush with the edge
 *
 * Trace dots are drawn with radius 0.045·size (strokeFont `dotRadius`), so the
 * true ink extent is 1.0497 + 0.045 = 1.0947 em. 1.15 clears that by 0.055 em
 * (5.5pt at size 100) — visible white margin under the 'g' loop, no clipping.
 *
 * `renderTraceStrip` and `renderBlankGuide` MUST keep using the same value:
 * `computeTracingLayout()` in pdfTemplates.ts scales a strip and its partner
 * blank guide to an identical displayed height and relies on both having the
 * same natural height-per-`size`, or the three ruled lines would stop lining up.
 * Total strip height is therefore (0.85 + 2 + 0.3 + 1.15) = 4.30 × size.
 */
const DESCENDER_EM = 1.15;

function drawGuidelines(ctx: CanvasRenderingContext2D, x0: number, x1: number, base: number, u: number) {
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'butt';

  ctx.lineWidth = 0.6;
  ctx.setLineDash([0.9, 2.6]);
  ctx.beginPath();
  ctx.moveTo(x0, base - 2 * u);
  ctx.lineTo(x1, base - 2 * u);
  ctx.stroke();

  ctx.setLineDash([3.2, 3.2]);
  ctx.beginPath();
  ctx.moveTo(x0, base - u);
  ctx.lineTo(x1, base - u);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x0, base);
  ctx.lineTo(x1, base);
  ctx.stroke();
}

function drawInstructions(ctx: CanvasRenderingContext2D, instr: TraceInstructions) {
  ctx.fillStyle = '#000';
  for (const d of instr.dots) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const a of instr.arrows) {
    ctx.strokeStyle = a.color;
    ctx.fillStyle = a.color;
    ctx.lineWidth = a.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.tail[0], a.tail[1]);
    ctx.lineTo(a.tip[0], a.tip[1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a.head[0][0], a.head[0][1]);
    ctx.lineTo(a.head[1][0], a.head[1][1]);
    ctx.lineTo(a.head[2][0], a.head[2][1]);
    ctx.closePath();
    ctx.fill();
  }
}

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * PIXEL_RATIO);
  canvas.height = Math.ceil(h * PIXEL_RATIO);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
  return { canvas, ctx };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))), 'image/png');
  });
}

/** Render `text` as the dotted/arrowed TRACE IT strip on its three-line guide. */
export async function renderTraceStrip(text: string, opts: {
  size?: number; tracking?: number; padL?: number; padR?: number;
} = {}): Promise<StripResult> {
  const { size = 120, tracking = 0.12, padL = 14, padR = 22 } = opts;
  const w = textWidth(text, size, tracking) + padL + padR;
  const base = size * 0.85 + size * 2 + size * 0.3; // headline + arrow-overshoot + descender room
  const height = base + size * DESCENDER_EM;
  const { canvas, ctx } = makeCanvas(w, height);
  ctx.clearRect(0, 0, w, height);
  drawGuidelines(ctx, 0, w, base, size);
  drawInstructions(ctx, tracedInstructions(text, padL, base, size, { tracking }));
  return { blob: await toBlob(canvas), width: w, height };
}

/** A blank three-line guide strip (no letters) — the "now you try" retry line. */
export async function renderBlankGuide(opts: {
  size?: number; widthEm?: number;
} = {}): Promise<StripResult> {
  const { size = 120, widthEm = 8.5 } = opts;
  const w = widthEm * size;
  const base = size * 0.85 + size * 2 + size * 0.3;
  const height = base + size * DESCENDER_EM;
  const { canvas, ctx } = makeCanvas(w, height);
  ctx.clearRect(0, 0, w, height);
  drawGuidelines(ctx, 0, w, base, size);
  return { blob: await toBlob(canvas), width: w, height };
}

export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}
