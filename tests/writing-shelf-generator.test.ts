/**
 * Writing Shelf ADD-ON generator — the pure layer.
 *
 * Four things here can silently ruin a print run and cannot be seen by looking
 * at a preview, so they are asserted rather than eyeballed:
 *
 *   1. the SHORT-EDGE duplex pairing map (a wrong row mirror puts every word
 *      behind the wrong picture, and you only find out after cutting);
 *   2. the duplex calibration clamp and the sign of the back-page transform;
 *   3. the mat's frame arithmetic on A4 (the shipped 3 x 70 / 4 x 66) and on
 *      A3 (the uniform-border fill);
 *   4. that Rule A's cut lines actually reach the paper — the right NUMBER of
 *      full-page hairlines with a triangle at each page edge.
 */

import { describe, expect, it } from 'vitest';

import {
  backPageTransform,
  clampDuplexOffset,
  DEFAULT_DUPLEX_CALIBRATION_STORAGE_KEY,
} from '@/lib/montree/print/duplex-calibration';
import { buildCalibrationSheetHtml } from '@/lib/montree/print/calibration-sheet';
import { andikaFontFaceCss, PRINT_FONT_STACK } from '@/lib/montree/print/fonts';
import { countMarks, gridLines, cardsLine } from '@/lib/montree/writing-shelf/generator/cut-guides';
import {
  backSlot,
  backTypeSizeMm,
  buildFlipCardsHtml,
  cardIndexForBackSlot,
  changedLetterIndexes,
  flipCardsCutLineCount,
  frontSlot,
} from '@/lib/montree/writing-shelf/generator/flip-cards';
import {
  buildSoundFrameMatHtml,
  matGeometry,
  uniformFrameWidth,
} from '@/lib/montree/writing-shelf/generator/sound-frame-mat';
import {
  defaultChainCardsConfig,
  defaultDictationCardsConfig,
  defaultMatConfigA3,
  defaultMatConfigA4,
} from '@/lib/montree/writing-shelf/generator/defaults';

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe('duplex pairing — short-edge flip of a portrait sheet', () => {
  it('backs front top-left with back bottom-left, same column', () => {
    expect(backSlot({ col: 0, row: 0 })).toEqual({ col: 0, row: 1 });
    expect(backSlot({ col: 1, row: 0 })).toEqual({ col: 1, row: 1 });
    expect(backSlot({ col: 0, row: 1 })).toEqual({ col: 0, row: 0 });
    expect(backSlot({ col: 1, row: 1 })).toEqual({ col: 1, row: 0 });
  });

  it('never changes the column — that would be the LONG-edge geometry', () => {
    for (let i = 0; i < 4; i++) {
      const front = frontSlot(i);
      expect(backSlot(front).col).toBe(front.col);
    }
  });

  it('is an involution, and cardIndexForBackSlot is its exact inverse', () => {
    for (let i = 0; i < 4; i++) {
      const front = frontSlot(i);
      expect(backSlot(backSlot(front))).toEqual(front);
      expect(cardIndexForBackSlot(backSlot(front))).toBe(i);
    }
  });

  it('holds for a taller grid too', () => {
    expect(backSlot({ col: 2, row: 0 }, 4)).toEqual({ col: 2, row: 3 });
    expect(backSlot({ col: 2, row: 3 }, 4)).toEqual({ col: 2, row: 0 });
  });
});

describe('duplex calibration', () => {
  it('clamps to +/- 3 mm and snaps to the 0.5 mm step', () => {
    expect(clampDuplexOffset(0)).toBe(0);
    expect(clampDuplexOffset(1.2)).toBe(1);
    expect(clampDuplexOffset(1.3)).toBe(1.5);
    expect(clampDuplexOffset(-1.3)).toBe(-1.5);
    expect(clampDuplexOffset(9)).toBe(3);
    expect(clampDuplexOffset(-9)).toBe(-3);
    expect(clampDuplexOffset(Number.NaN)).toBe(0);
  });

  it('emits nothing at the 0/0 default, so the back keeps the front box tree', () => {
    expect(backPageTransform(0, 0)).toBe('');
    expect(backPageTransform(0, 0, 'horizontal')).toBe('');
  });

  it('negates the axis the physical flip mirrors, and only that one', () => {
    // portrait short edge: top/bottom swap -> Y is negated, X carries through
    expect(backPageTransform(1, 2, 'vertical')).toBe('transform:translate(1mm, -2mm);');
    // landscape short edge (the mat), and bingo's portrait long edge:
    // left/right swap -> X is negated, Y carries through
    expect(backPageTransform(1, 2, 'horizontal')).toBe('transform:translate(-1mm, 2mm);');
  });

  it('keeps one global key so a printer is calibrated once', () => {
    expect(DEFAULT_DUPLEX_CALIBRATION_STORAGE_KEY).toBe('montree.print.duplexCalibration.v1');
  });
});

describe('sound-frame mat arithmetic', () => {
  it('reproduces the shipped A4 mat exactly', () => {
    const geo = matGeometry(defaultMatConfigA4());
    expect(geo.pageWidth).toBe(297);
    expect(geo.pageHeight).toBe(210);
    expect(geo.trimWidth).toBe(282);
    expect(geo.trimHeight).toBe(100);
    expect(geo.trimX0).toBeCloseTo(7.5, 6);
    expect(geo.trimY0).toBeCloseTo(55, 6);
    expect(geo.front.frameWidth).toBe(70);
    expect(geo.front.frameHeight).toBe(70);
    expect(geo.front.matMarginX).toBeCloseTo(30, 6); // handoff §1
    expect(geo.back.frameWidth).toBe(66);
    expect(geo.back.matMarginX).toBeCloseTo(3, 6); // the 3 mm floor, exactly
    expect(geo.warnings).toEqual([]);
  });

  it('fills an A3 trim with one uniform border', () => {
    const geo = matGeometry(defaultMatConfigA3());
    expect(geo.pageWidth).toBe(420);
    expect(geo.pageHeight).toBe(297);
    expect(geo.uniform).toBe(true);
    expect(geo.border).toBe(15);
    // front: 3 frames + 4 borders of 15 fill 400 mm
    expect(geo.front.frameWidth).toBeCloseTo(113.3333333, 5);
    expect(geo.front.frameHeight).toBeCloseTo(81, 6);
    // back: 4 frames + 5 borders of 15 fill 400 mm
    expect(geo.back.frameWidth).toBeCloseTo(81.25, 6);
    expect(geo.back.frameHeight).toBeCloseTo(81, 6);
    // the border really is uniform: frames span the trim exactly
    for (const side of [geo.front, geo.back]) {
      const span = side.count * side.frameWidth + (side.count - 1) * side.gutter;
      expect(span + 2 * geo.border).toBeCloseTo(geo.trimWidth, 6);
      expect(side.frameHeight + 2 * geo.border).toBeCloseTo(geo.trimHeight, 6);
    }
    expect(geo.warnings).toEqual([]);
  });

  it('uniformFrameWidth is the arithmetic the UI shows', () => {
    expect(uniformFrameWidth(400, 4, 15)).toBeCloseTo(81.25, 6);
    expect(uniformFrameWidth(400, 3, 15)).toBeCloseTo(113.333333, 5);
  });

  it('warns rather than silently printing a mat that breaks the safe margin', () => {
    const geo = matGeometry({ ...defaultMatConfigA4(), front: { count: 4, frame: 70, gutter: 6 } });
    expect(geo.warnings.length).toBeGreaterThan(0);
  });
});

describe('Rule A cut guides', () => {
  it('a 2 x 2 butted block takes 3 verticals and 3 horizontals', () => {
    expect(flipCardsCutLineCount(defaultChainCardsConfig())).toBe(6);
  });

  it('every line reaches both page edges and carries a triangle there', () => {
    const lines = gridLines(25, 28.5, 2, 2, 80, 120, 210, 297);
    expect(lines.vlines).toHaveLength(3);
    expect(lines.hlines).toHaveLength(3);
    for (const v of lines.vlines) {
      expect(v.y0).toBe(0);
      expect(v.y1).toBe(297);
    }
    expect(countMarks(lines, 210, 297)).toBe(12); // 6 lines, 2 ends each
  });

  it('the generated flip-card HTML draws exactly those lines and marks per page', () => {
    const html = buildFlipCardsHtml(defaultChainCardsConfig());
    const pages = 2 /* sides */ * 2 /* sheets for 6 cards */;
    expect(count(html, 'class="page"')).toBe(pages);
    expect(count(html, 'class="cut-v"')).toBe(3 * pages);
    expect(count(html, 'class="cut-h"')).toBe(3 * pages);
    expect(count(html, 'class="cut-mark"')).toBe(12 * pages);
    expect(html).toContain('@page { size: A4 portrait; margin: 0; }');
    expect(html).toContain(cardsLine(4));
    expect(html).toContain(cardsLine(2)); // the second sheet holds the last two
  });

  it('the mat draws its single centred trim rectangle on both sides', () => {
    const html = buildSoundFrameMatHtml(defaultMatConfigA3());
    expect(count(html, 'class="page"')).toBe(2);
    expect(count(html, 'class="cut-v"')).toBe(2 * 2);
    expect(count(html, 'class="cut-h"')).toBe(2 * 2);
    expect(count(html, 'class="cut-mark"')).toBe(8 * 1 * 2);
    expect(html).toContain('@page { size: A3 landscape; margin: 0; }');
  });
});

describe('the printed face', () => {
  // The backs rendered in a serif once, because a print window opened by
  // window.open('') has no base URL for a relative font src and the old stack
  // ended in the generic `cursive`. Both halves are pinned here.
  it('declares the bundled Andika at ABSOLUTE urls, with an all-sans fallback', () => {
    for (const html of [
      buildFlipCardsHtml(defaultChainCardsConfig()),
      buildSoundFrameMatHtml(defaultMatConfigA3()),
      buildCalibrationSheetHtml({}),
    ]) {
      expect(html).toContain("src:url('/fonts/Andika-Regular.ttf') format('truetype')");
      expect(html).toContain("src:url('/fonts/Andika-Bold.ttf') format('truetype')");
      expect(html).toContain(PRINT_FONT_STACK);
      expect(html).not.toContain('cursive');
    }
    expect(PRINT_FONT_STACK).toBe("'Andika', 'Fredoka', 'Nunito', Arial, sans-serif");
    expect(andikaFontFaceCss('/fonts/')).toBe(andikaFontFaceCss('/fonts'));
  });

  it('lets a caller inline the face instead, for a self-contained file', () => {
    const html = buildFlipCardsHtml({
      ...defaultChainCardsConfig(),
      fontFaceCss: "@font-face{font-family:'Andika';src:url(data:font/ttf;base64,AAAA);}",
    });
    expect(html).toContain('data:font/ttf;base64,AAAA');
    expect(html).not.toContain('/fonts/Andika-Regular.ttf');
  });
});

describe('the calibration sheet ruler', () => {
  it('numbers only the outer majors, so nothing collides at the centre', () => {
    const html = buildCalibrationSheetHtml({});
    for (const n of ['+10', '-10', '+15', '-15']) expect(html).toContain(`>${n}<`);
    for (const n of ['+5', '-5']) expect(html).not.toContain(`>${n}<`);
  });

  it('still draws every 1 mm tick on both axes', () => {
    const html = buildCalibrationSheetHtml({});
    // 30 ticks per axis (-15..+15, no zero), on each of the two faces
    expect(count(html, 'class="tick"')).toBe(30 * 2);
    expect(count(html, 'class="tickh"')).toBe(30 * 2);
    expect(html).toContain('1 small tick = 1 mm, the longer ticks are every 5 mm');
  });
});

describe('card backs', () => {
  it('picks out exactly the letter that changed, and nothing on line one', () => {
    expect(changedLetterIndexes(['tap', 'cap', 'can', 'pan', 'pen'])).toEqual([-1, 0, 2, 0, 1]);
    expect(changedLetterIndexes(['bin', 'big', 'bug', 'dug', 'mug'])).toEqual([-1, 2, 1, 0, 0]);
  });

  it('refuses to highlight anything but an honest one-letter swap', () => {
    expect(changedLetterIndexes(['cat', 'cart'])).toEqual([-1, -1]);
    expect(changedLetterIndexes(['cat', 'dog'])).toEqual([-1, -1]);
  });

  it('sizes a single word to about a 20 mm cap height, and a five-line chain smaller', () => {
    const single = backTypeSizeMm(['cat']);
    const chain = backTypeSizeMm(['tap', 'cap', 'can', 'pan', 'pen']);
    expect(single * 0.7).toBeGreaterThan(19);
    expect(single * 0.7).toBeLessThan(23);
    expect(chain).toBeLessThan(single);
    expect(chain * 5 * 1.05).toBeLessThanOrEqual(120 - 2 * 4 + 1e-9);
  });

  it('prints the word only, with a placeholder, when there is no picture', () => {
    const html = buildFlipCardsHtml(defaultDictationCardsConfig(), { sides: 'front' });
    expect(count(html, 'fc-nophoto"')).toBe(12);
    expect(html).toContain('no photo');
  });

  it('carries the duplex nudge on the BACK page only', () => {
    const html = buildFlipCardsHtml(
      { ...defaultChainCardsConfig(), backPageStyle: backPageTransform(1, 2, 'vertical') },
    );
    expect(count(html, 'transform:translate(1mm, -2mm);')).toBe(2); // one per back sheet
  });
});
