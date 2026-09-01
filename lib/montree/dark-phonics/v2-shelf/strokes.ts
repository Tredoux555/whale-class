/**
 * V2 Shelf — laying a whole WORD out in traceable strokes.
 *
 * 🚨 THE GLYPH GEOMETRY IS NOT RE-PORTED HERE, ON PURPOSE.
 *
 * The plan called for emitting scripts/curriculum/satpin-paperwork/stroke_font.py
 * into TypeScript. That port already exists, and is already the one the Dark
 * Phonics tracing step uses: lib/montree/english-curriculum/render/letter-strokes.ts
 * holds a–z as ordered pen CENTRELINES in draw order, in a 100×120 frame
 * (baseline y=88, x-height top y=40, ascender y=15, descender y=110), and the
 * printed model glyph on the paper worksheets is rendered from the same
 * definitions. Emitting a second copy would mean two alphabets drifting apart —
 * and the shape a child traces on glass would stop matching the shape they
 * copy on paper, which is the whole reason that module exists.
 *
 * So this module adds only what a WORD needs on top of one letter: horizontal
 * placement, a shared viewBox, and one continuous stroke order across the word
 * so a finger walks left to right, letter by letter, in writing order.
 *
 * PURE: no React, no DOM. The caller measures the rendered paths.
 */

import {
  letterStrokes,
  type LetterDef,
} from '@/lib/montree/english-curriculum/render/letter-strokes';

/** One glyph cell is the letter-strokes frame: 100 wide, 120 tall. */
export const GLYPH_W = 100;
export const GLYPH_H = 120;

/**
 * Letters are set tighter than their 100-unit cell so a word reads as a word.
 * The cell keeps its full height; only the advance narrows.
 */
export const GLYPH_ADVANCE = 74;

/** One stroke of the laid-out word, already translated into word space. */
export interface WordStroke {
  /** SVG path data, in the glyph's own coordinates. */
  d: string;
  /** The transform that puts it in its place in the word. */
  transform: string;
  /**
   * The same translation as a number. `getPointAtLength()` reports a path's own
   * user space, BEFORE the element's transform — so hit-testing must add this
   * back by hand. Holding it here keeps that correction next to the transform
   * it undoes.
   */
  dx: number;
  /** Which letter of the word this stroke belongs to (0-based). */
  letterIndex: number;
  /** The letter itself — used for the phoneme clip when the letter completes. */
  letter: string;
}

/** An i/j tittle. Drawn, never traced: a dot is not a stroke. */
export interface WordDot {
  cx: number;
  cy: number;
  r: number;
  letterIndex: number;
}

export interface WordTraceModel {
  /** The letters that actually have a stroke model, in order. */
  letters: string[];
  strokes: WordStroke[];
  dots: WordDot[];
  /** viewBox for the whole word. */
  viewBox: string;
  width: number;
  height: number;
}

/**
 * Lay a word out as one continuous run of strokes.
 *
 * Characters with no stroke model (punctuation, an ellipsis) are dropped
 * silently — a child traces letters, not full stops. A word that yields nothing
 * returns an empty model, and the caller shows nothing rather than an empty box.
 */
export function buildWordTrace(wordRaw: string): WordTraceModel {
  const chars = Array.from(wordRaw.toLowerCase());
  const kept: Array<{ ch: string; def: LetterDef }> = [];
  for (const ch of chars) {
    const def = letterStrokes(ch);
    if (def) kept.push({ ch, def });
  }

  const strokes: WordStroke[] = [];
  const dots: WordDot[] = [];

  kept.forEach(({ ch, def }, i) => {
    // Centre each glyph's 100-wide frame on its narrower advance slot.
    const x = i * GLYPH_ADVANCE - (GLYPH_W - GLYPH_ADVANCE) / 2;
    const transform = `translate(${round(x)} 0)`;
    for (const stroke of def.strokes) {
      strokes.push({ d: stroke.d, transform, dx: round(x), letterIndex: i, letter: ch });
    }
    for (const [cx, cy, r] of def.dots ?? []) {
      dots.push({ cx: round(cx + x), cy, r, letterIndex: i });
    }
  });

  const width = kept.length
    ? (kept.length - 1) * GLYPH_ADVANCE + GLYPH_W
    : GLYPH_W;
  // The glyph frame starts half an overhang to the left of the first advance.
  const x0 = -(GLYPH_W - GLYPH_ADVANCE) / 2;

  return {
    letters: kept.map((k) => k.ch),
    strokes,
    dots,
    viewBox: `${round(x0)} 0 ${round(width)} ${GLYPH_H}`,
    width,
    height: GLYPH_H,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The word this lesson's tracing work should teach.
 *
 * The first decodable word the lesson introduces, when it has one — that is the
 * word the book has just taught a child to read, so tracing it is the natural
 * close. Lessons with an empty ledger (the earliest letters, which teach a
 * sound before anything is decodable) fall back to the letter itself.
 */
export function traceWordFor(letter: string, decodable?: readonly string[]): string {
  const first = decodable?.find((w) => buildWordTrace(w).letters.length > 0);
  return first ?? letter;
}
