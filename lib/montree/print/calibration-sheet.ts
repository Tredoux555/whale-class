// lib/montree/print/calibration-sheet.ts
//
// The duplex CALIBRATION TEST SHEET: one duplex page (front + back) carrying
// the same crosshair and the same 1 mm ruler at the same spot on both faces.
//
// How the owner uses it: print it duplex, hold the sheet up to a window or a
// lamp, and read off — on the ruler — how far the back crosshair sits from the
// front one. Those two numbers, in millimetres, are exactly what the X and Y
// sliders of the Duplex Calibration card take.
//
// Pure string builder: no React, no DOM. Everything is in millimetres.

import { PRINT_FONT_STACK, andikaFontFaceCss } from './fonts';

/** Ink, matched to the Writing Shelf house palette. */
const FRONT_INK = '#141110';
const BACK_INK = '#E5A11B'; // amber, so the two crosshairs are told apart on the light
const GREY = '#8C857B';

const PAGE_W = 210;
const PAGE_H = 297;
const CX = PAGE_W / 2;
const CY = PAGE_H / 2;

/** Half-length of the crosshair arms, and the span of the ruler either side. */
const ARM_MM = 20;
const RULER_MM = 15;
/** Which ticks get a printed number. */
const LABEL_AT = [10, 15];

export interface CalibrationSheetOptions {
  /** Teacher-frame X nudge currently set, in mm (+ = back content moves right). */
  offsetX?: number;
  /** Teacher-frame Y nudge currently set, in mm (+ = back content moves down). */
  offsetY?: number;
  /**
   * CSS to apply to the back page — pass backPageTransform(x, y, 'vertical')
   * from duplex-calibration.ts. Empty string means "no nudge", which is what
   * you want for the FIRST print.
   */
  backPageStyle?: string;
  /** Override the @font-face rules (used to inline the face in the samples). */
  fontFaceCss?: string;
}

function ruler(colour: string): string {
  const out: string[] = [];
  for (let i = -RULER_MM; i <= RULER_MM; i++) {
    if (i === 0) continue;
    const major = i % 5 === 0;
    const len = major ? 4 : 2;
    // horizontal ruler: ticks hang below the horizontal arm
    out.push(
      `<div class="tick" style="left:${CX + i}mm;top:${CY}mm;height:${len}mm;background:${colour};"></div>`
    );
    // vertical ruler: ticks stick out right of the vertical arm
    out.push(
      `<div class="tickh" style="top:${CY + i}mm;left:${CX}mm;width:${len}mm;background:${colour};"></div>`
    );
    // Only the outer majors carry a number. The +/-5 labels sat on the axis
    // and on each other near the centre, which is exactly where the reading is
    // taken — the 1 mm ticks are what you count, the numbers are only there to
    // tell you which way you are counting.
    //
    // The two label runs live in DIFFERENT QUADRANTS so they cannot collide at
    // all: the horizontal axis's numbers sit 3 mm BELOW their own ticks, and
    // the vertical axis's numbers sit 4 mm to the LEFT of the axis (right-
    // aligned against it, see .numv). Their y-ranges are disjoint by
    // construction — the horizontal run occupies y = CY+3..CY+5, the nearest
    // vertical label starts at CY+9.
    if (LABEL_AT.includes(Math.abs(i))) {
      out.push(
        `<div class="num" style="left:${CX + i}mm;top:${CY + 3}mm;color:${colour};">${i > 0 ? '+' : ''}${i}</div>`
      );
      out.push(
        `<div class="numv" style="top:${CY + i}mm;left:${CX - 4}mm;color:${colour};">${i > 0 ? '+' : ''}${i}</div>`
      );
    }
  }
  return out.join('');
}

function crosshair(colour: string): string {
  return (
    `<div class="arm-h" style="left:${CX - ARM_MM}mm;top:${CY}mm;width:${2 * ARM_MM}mm;background:${colour};"></div>` +
    `<div class="arm-v" style="top:${CY - ARM_MM}mm;left:${CX}mm;height:${2 * ARM_MM}mm;background:${colour};"></div>` +
    `<div class="ring" style="left:${CX}mm;top:${CY}mm;border-color:${colour};"></div>` +
    ruler(colour)
  );
}

const FRONT_WORDS = [
  '<b>Duplex calibration test sheet</b>',
  '1. Print this sheet <b>double-sided, flipping on the SHORT edge</b>, at 100% — never “fit to page”.',
  '2. Hold the printed sheet up to a window or a lamp so you can see both sides at once.',
  '3. The black crosshair is the FRONT. The amber crosshair is the BACK.',
  '4. Read off the ruler how far the amber crosshair sits from the black one: sideways first, then up and down. <b>1 small tick = 1 mm, the longer ticks are every 5 mm.</b>',
  '5. Type those two numbers into the Duplex Calibration sliders — <b>X</b> is sideways (+ means the back needs to move right), <b>Y</b> is up and down (+ means the back needs to move down).',
  '6. Print this sheet again to check. When the two crosshairs sit on top of each other, the printer is calibrated, and every duplex work in Montree will use it.',
];

export function buildCalibrationSheetHtml(options: CalibrationSheetOptions = {}): string {
  const { offsetX = 0, offsetY = 0, backPageStyle = '', fontFaceCss = andikaFontFaceCss() } = options;
  const now = `X ${offsetX.toFixed(1)} mm · Y ${offsetY.toFixed(1)} mm`;

  const instructions = FRONT_WORDS.map((line, i) =>
    i === 0 ? `<p class="h">${line}</p>` : `<p>${line}</p>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Duplex calibration test sheet</title>
<style>
${fontFaceCss}
  /* @page margin MUST be 0: it is the structural half of the duplex fix.
     A non-zero @page margin is resolved against the printable area, which is
     not the same box on the front and the back of a sheet on most printers —
     that alone throws front and back out by several millimetres. */
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: ${PRINT_FONT_STACK}; color: ${FRONT_INK}; }
  .page { position: relative; width: ${PAGE_W}mm; height: ${PAGE_H}mm; overflow: hidden; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .arm-h { position: absolute; height: 0.25mm; transform: translateY(-50%); }
  .arm-v { position: absolute; width: 0.25mm; transform: translateX(-50%); }
  .ring { position: absolute; width: 6mm; height: 6mm; border: 0.25mm solid; border-radius: 50%; transform: translate(-50%, -50%); }
  .tick { position: absolute; width: 0.25mm; transform: translateX(-50%); }
  .tickh { position: absolute; height: 0.25mm; transform: translateY(-50%); }
  .num { position: absolute; font-size: 6pt; transform: translateX(-50%); }
  .numv { position: absolute; font-size: 6pt; transform: translate(-100%, -50%); }
  .words { position: absolute; left: 20mm; right: 20mm; top: 22mm; font-size: 9pt; line-height: 1.45; }
  .words p { margin: 0 0 2.6mm 0; }
  .words p.h { font-size: 13pt; margin-bottom: 4mm; }
  .foot { position: absolute; left: 20mm; right: 20mm; bottom: 18mm; font-size: 8pt; color: ${GREY}; }
  .rot { position: absolute; inset: 0; transform: rotate(180deg); }
</style></head><body>
<div class="page">
  <div class="words">${instructions}</div>
  ${crosshair(FRONT_INK)}
  <div class="foot">FRONT · black · calibration currently set to ${now}</div>
</div>
<div class="page"${backPageStyle ? ` style="${backPageStyle}"` : ''}>
  <div class="rot">
    ${crosshair(BACK_INK)}
    <div class="foot">BACK · amber · this side carries the nudge (${now}). Short-edge flip.</div>
  </div>
</div>
</body></html>`;
}
