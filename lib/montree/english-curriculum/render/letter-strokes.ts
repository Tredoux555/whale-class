/**
 * render/letter-strokes.ts — Montessori stroke-order glyphs for a–z (lower-case
 * single-storey print), generalised from build_week01_pack.py's svg_letter_a().
 *
 * Each letter is a list of pen CENTRELINES in draw order. From that ONE source
 * we render both:
 *   - the grey model glyph (each centreline stroked thick), and
 *   - the guide overlay (each centreline stroked thin + arrow-head, numbered,
 *     with a green "start here" dot at the first stroke's origin).
 * So the trace shape is guaranteed identical to the model the child copies.
 *
 * Coordinate frame: viewBox "0 0 100 120".
 *   baseline y=88 · x-height top y=40 · ascender top y=15 · descender bottom y=110.
 *
 * ⚠️ These are single-weight approximations of print letterforms — recognisable,
 * but a designer pass should refine the trickier bowls (a e g s) and the
 * arrowed stroke DIRECTIONS. Flagged in the build report.
 */

import {
  FRAME_COLOR,
  LETTER_BAND_WIDTH,
  LETTER_GUIDE_WIDTH,
  LETTER_START_DOT_R,
  LETTER_BAND_TINT,
} from './geometry';

interface Stroke {
  /** SVG path data — pen centreline, in draw direction (arrow points to the end). */
  d: string;
  /** Position for the stroke-order number. */
  num: [number, number];
}

interface LetterDef {
  strokes: Stroke[];
  /** i / j tittles: [cx, cy, r]. */
  dots?: [number, number, number][];
}

// Bowls / arcs used repeatedly.
const oFull = 'M50 43 A21 21 0 1 0 50 85 A21 21 0 1 0 50 43';

const LETTERS: Record<string, LetterDef> = {
  a: {
    strokes: [
      { d: 'M44 47 A19 19 0 1 0 44 85 A19 19 0 1 0 44 47', num: [30, 40] },
      { d: 'M64 44 L64 88', num: [70, 40] },
    ],
  },
  b: {
    strokes: [
      { d: 'M32 15 L32 88', num: [22, 20] },
      { d: 'M52 50 A18 18 0 1 1 52 86 A18 18 0 1 1 52 50', num: [72, 50] },
    ],
  },
  c: { strokes: [{ d: 'M66 50 A21 21 0 1 0 66 78', num: [70, 42] }] },
  d: {
    strokes: [
      { d: 'M48 50 A18 18 0 1 0 48 86 A18 18 0 1 0 48 50', num: [30, 44] },
      { d: 'M66 15 L66 88', num: [72, 20] },
    ],
  },
  e: {
    strokes: [
      { d: 'M31 64 L69 64', num: [24, 60] },
      { d: 'M69 64 A21 21 0 1 1 60 83', num: [74, 48] },
    ],
  },
  f: {
    strokes: [
      { d: 'M62 26 C58 18 46 18 46 30 L46 88', num: [66, 20] },
      { d: 'M34 44 L60 44', num: [28, 40] },
    ],
  },
  g: {
    strokes: [
      { d: 'M46 41 A17 17 0 1 0 46 75 A17 17 0 1 0 46 41', num: [30, 38] },
      { d: 'M63 42 L63 104 Q63 112 52 110', num: [70, 40] },
    ],
  },
  h: {
    strokes: [
      { d: 'M34 15 L34 88', num: [24, 20] },
      { d: 'M34 55 C34 44 66 44 66 58 L66 88', num: [70, 46] },
    ],
  },
  i: { strokes: [{ d: 'M50 40 L50 88', num: [40, 44] }], dots: [[50, 27, 3.4]] },
  j: {
    strokes: [{ d: 'M56 40 L56 104 Q56 112 44 108', num: [64, 44] }],
    dots: [[56, 27, 3.4]],
  },
  k: {
    strokes: [
      { d: 'M34 15 L34 88', num: [24, 20] },
      { d: 'M64 44 L38 66', num: [70, 42] },
      { d: 'M46 60 L66 88', num: [70, 84] },
    ],
  },
  l: { strokes: [{ d: 'M50 15 L50 88', num: [40, 20] }] },
  m: {
    strokes: [
      { d: 'M28 40 L28 88', num: [20, 44] },
      { d: 'M28 52 C28 42 50 42 50 56 L50 88', num: [42, 46] },
      { d: 'M50 52 C50 42 72 42 72 56 L72 88', num: [66, 46] },
    ],
  },
  n: {
    strokes: [
      { d: 'M32 40 L32 88', num: [22, 44] },
      { d: 'M32 52 C32 42 68 42 68 56 L68 88', num: [70, 46] },
    ],
  },
  o: { strokes: [{ d: oFull, num: [36, 40] }] },
  p: {
    strokes: [
      { d: 'M32 40 L32 110', num: [22, 44] },
      { d: 'M52 41 A17 17 0 1 1 52 75 A17 17 0 1 1 52 41', num: [70, 42] },
    ],
  },
  q: {
    strokes: [
      { d: 'M48 41 A17 17 0 1 0 48 75 A17 17 0 1 0 48 41', num: [30, 38] },
      { d: 'M66 40 L66 106 Q66 112 74 108', num: [72, 44] },
    ],
  },
  r: {
    strokes: [
      { d: 'M36 40 L36 88', num: [26, 44] },
      { d: 'M36 52 C36 44 52 42 64 48', num: [64, 42] },
    ],
  },
  s: { strokes: [{ d: 'M64 48 C64 40 40 40 40 52 C40 62 64 66 64 78 C64 90 40 90 38 80', num: [68, 44] }] },
  t: {
    strokes: [
      { d: 'M50 24 L50 82 Q50 88 58 86', num: [40, 28] },
      { d: 'M36 42 L64 42', num: [30, 38] },
    ],
  },
  u: {
    strokes: [
      { d: 'M32 40 L32 78 C32 86 42 88 50 88 C58 88 68 86 68 78 L68 40', num: [22, 44] },
      { d: 'M68 78 L68 88', num: [74, 84] },
    ],
  },
  v: { strokes: [{ d: 'M32 40 L50 88 L68 40', num: [26, 44] }] },
  w: { strokes: [{ d: 'M26 40 L38 88 L50 54 L62 88 L74 40', num: [20, 44] }] },
  x: {
    strokes: [
      { d: 'M32 40 L68 88', num: [26, 44] },
      { d: 'M68 40 L32 88', num: [72, 44] },
    ],
  },
  y: {
    strokes: [
      { d: 'M32 40 L50 78', num: [24, 44] },
      { d: 'M68 40 L50 78 L40 110', num: [74, 44] },
    ],
  },
  z: { strokes: [{ d: 'M32 42 L68 42 L32 86 L68 86', num: [26, 38] }] },
};

/** Parse the first "M x y" of a path to place the green start dot. */
function firstPoint(d: string): [number, number] {
  const m = d.match(/M\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)/i);
  if (!m) return [50, 40];
  return [parseFloat(m[1]), parseFloat(m[2])];
}

export interface LetterStrokeOpts {
  /** Render width. Provide EITHER widthMm (print) OR widthPx (screen). */
  widthMm?: number;
  widthPx?: number;
  /** Draw the numbered arrows + green start dot. */
  guides?: boolean;
  /** Grey model tint. */
  bandColor?: string;
  /** Guide arrow + number + dot colour. */
  guideColor?: string;
}

function renderGlyph(letter: string, opts: LetterStrokeOpts): { inner: string } {
  const def = LETTERS[letter];
  const band = opts.bandColor ?? LETTER_BAND_TINT;
  const guide = opts.guideColor ?? FRAME_COLOR;
  if (!def) {
    // Unknown letter — fall back to a plain glyph so nothing throws.
    return {
      inner:
        `<text x="50" y="82" font-size="70" font-family="'Andika','Comic Sans MS',cursive" ` +
        `font-weight="700" fill="${band}" text-anchor="middle">${letter}</text>`,
    };
  }

  // grey model band — each centreline stroked thick.
  let inner = def.strokes
    .map(
      (s) =>
        `<path d="${s.d}" fill="none" stroke="${band}" stroke-width="${LETTER_BAND_WIDTH}" ` +
        `stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');
  for (const [cx, cy, r] of def.dots ?? []) {
    inner += `<circle cx="${cx}" cy="${cy}" r="${r + 2.5}" fill="${band}"/>`;
  }

  if (opts.guides) {
    inner +=
      `<defs><marker id="lsah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.6" markerHeight="4.6" ` +
      `orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${guide}"/></marker></defs>`;
    def.strokes.forEach((s, i) => {
      inner +=
        `<path d="${s.d}" fill="none" stroke="${guide}" stroke-width="${LETTER_GUIDE_WIDTH}" ` +
        `stroke-linecap="round" marker-end="url(#lsah)"/>`;
      inner +=
        `<text x="${s.num[0]}" y="${s.num[1]}" font-size="11" font-weight="bold" fill="${guide}" ` +
        `font-family="system-ui">${i + 1}</text>`;
    });
    const [sx, sy] = firstPoint(def.strokes[0].d);
    inner += `<circle cx="${sx}" cy="${sy}" r="${LETTER_START_DOT_R}" fill="${guide}"/>`;
    for (const [cx, cy] of def.dots ?? []) {
      inner += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${guide}"/>`;
    }
  }
  return { inner };
}

/**
 * letterStrokeSVG — a complete <svg> for one letter (or a short cluster like
 * "qu"). Multi-char clusters lay their glyphs left-to-right.
 */
export function letterStrokeSVG(letterRaw: string, opts: LetterStrokeOpts = {}): string {
  const letter = (letterRaw || '').toLowerCase();
  const chars = letter.split('').filter((c) => /[a-z]/.test(c));
  const n = Math.max(1, chars.length);
  const vbW = 100 * n;
  const sizeAttr = opts.widthMm != null
    ? `width="${opts.widthMm * n}mm"`
    : opts.widthPx != null
      ? `width="${opts.widthPx * n}"`
      : `width="100%"`;

  const glyphs = (chars.length ? chars : [letter]).map((c, i) => {
    const { inner } = renderGlyph(c, opts);
    return `<g transform="translate(${i * 100},0)">${inner}</g>`;
  });

  return (
    `<svg ${sizeAttr} viewBox="0 0 ${vbW} 120" xmlns="http://www.w3.org/2000/svg">` +
    glyphs.join('') +
    `</svg>`
  );
}

/** Which lower-case letters have real stroke data (for validation/UI). */
export const KNOWN_STROKE_LETTERS = Object.keys(LETTERS);
