// Montree Phonics — single-stroke manuscript letter engine (TypeScript port).
//
// Faithful, geometry-for-geometry port of
// scripts/curriculum/satpin-paperwork/stroke_font.py — the same hand-defined
// skeleton alphabet that renders the dotted, arrowed TRACE IT letterforms in
// every dark-phonics tracing-workbook.pdf. Ported so the Tracing Work tool
// can render any name/word live in the browser instead of only the words
// baked into the offline curriculum build.
//
// Coordinate system (em units, y UP, matches the Python source exactly):
//   2.0 headline/cap-height   1.0 midline (top of x-height)
//   0.0 baseline              -1.0 descender
// `size` in every public call is the x-height, in device pixels/points.
//
// Device-space output (glyphPolylines, tracedInstructions) is y-DOWN
// (SVG/canvas convention) — the only place the Python's y-up math is flipped.

export type Pt = [number, number];
type Segment =
  | { k: 'l'; pts: Pt[] }
  | { k: 'a'; cx: number; cy: number; rx: number; ry: number; a0: number; a1: number }
  | { k: 's'; pts: Pt[] }
  | { k: 'dot'; x: number; y: number };
type Stroke = Segment[];
type FlatStroke = Pt[] | { dot: true; x: number; y: number };

const ARC_STEP = 5.0;
const SPLINE_STEP = 14;

function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Pt[] {
  const n = Math.max(2, Math.floor(Math.abs(a1 - a0) / ARC_STEP) + 1);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const ang = ((a0 + (a1 - a0) * i / n) * Math.PI) / 180;
    pts.push([cx + rx * Math.cos(ang), cy + ry * Math.sin(ang)]);
  }
  return pts;
}

function spline(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts.slice();
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  const out: Pt[] = [];
  for (let i = 0; i < p.length - 3; i++) {
    const [p0, p1, p2, p3] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
    const steps = SPLINE_STEP + (i === p.length - 4 ? 1 : 0);
    for (let j = 0; j < steps; j++) {
      const t = j / SPLINE_STEP, t2 = t * t, t3 = t * t * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t
          + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
          + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t
          + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
          + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

function flatten(segments: Stroke): FlatStroke {
  const pts: Pt[] = [];
  for (const seg of segments) {
    if (seg.k === 'dot') return { dot: true, x: seg.x, y: seg.y };
    let nw: Pt[];
    if (seg.k === 'l') nw = seg.pts.slice();
    else if (seg.k === 'a') nw = arc(seg.cx, seg.cy, seg.rx, seg.ry, seg.a0, seg.a1);
    else nw = spline(seg.pts);
    if (pts.length && nw.length &&
        Math.abs(nw[0][0] - pts[pts.length - 1][0]) < 1e-9 &&
        Math.abs(nw[0][1] - pts[pts.length - 1][1]) < 1e-9) {
      nw = nw.slice(1);
    }
    pts.push(...nw);
  }
  return pts;
}

const L = (...pts: Pt[]): Segment => ({ k: 'l', pts });
const A = (cx: number, cy: number, r: number, a0: number, a1: number, ry?: number): Segment =>
  ({ k: 'a', cx, cy, rx: r, ry: ry == null ? r : ry, a0, a1 });
const S = (...pts: Pt[]): Segment => ({ k: 's', pts });
const DOT = (x: number, y: number): Segment => ({ k: 'dot', x, y });
const bowl = (cx: number, cy: number, r: number, start = 60.0, sweep = 360.0) => A(cx, cy, r, start, start + sweep);
const oStrokes = (cx = 0.5, cy = 0.5, r = 0.5): Stroke[] => [[bowl(cx, cy, r)]];

const SIDE = 0.10;
const GLYPH: Record<string, [number, Stroke[]]> = {};
const g = (ch: string, adv: number, strokes: Stroke[]) => { GLYPH[ch] = [adv, strokes]; };

// ---- lowercase ----
g('a', 1.22, [[bowl(0.5, 0.5, 0.5)], [L([1.0, 1.02], [1.0, 0.0])]]);
g('b', 1.22, [[L([0.0, 2.0], [0.0, 0.0])], [A(0.5, 0.5, 0.5, 180, -180)]]);
g('c', 1.18, [[A(0.5, 0.5, 0.5, 60, 300)]]);
g('d', 1.22, [[bowl(0.5, 0.5, 0.5)], [L([1.0, 2.0], [1.0, 0.0])]]);
g('e', 1.18, [[L([0.003, 0.55], [0.997, 0.55]), A(0.5, 0.5, 0.5, 5.7, 300)]]);
g('f', 1.02, [[A(0.62, 1.5, 0.32, 0, 180), L([0.30, 1.5], [0.30, 0.0])], [L([0.0, 1.02], [0.70, 1.02])]]);
g('g', 1.22, [[bowl(0.5, 0.5, 0.5)], [L([1.0, 1.02], [1.0, -0.55]), A(0.5, -0.55, 0.5, 0, -160)]]);
g('h', 1.22, [[L([0.0, 2.0], [0.0, 0.0])], [L([0.0, 0.18], [0.0, 0.5]), A(0.5, 0.5, 0.5, 180, 0), L([1.0, 0.5], [1.0, 0.0])]]);
g('i', 0.52, [[L([0.16, 1.0], [0.16, 0.0])], [DOT(0.16, 1.52)]]);
g('j', 0.72, [[L([0.36, 1.0], [0.36, -0.55]), A(0.06, -0.55, 0.30, 0, -115)], [DOT(0.36, 1.52)]]);
g('k', 1.14, [[L([0.0, 2.0], [0.0, 0.0])], [L([0.88, 1.0], [0.06, 0.42])], [L([0.33, 0.62], [0.92, 0.0])]]);
g('l', 0.52, [[L([0.16, 2.0], [0.16, 0.0])]]);
g('m', 1.72, [[L([0.0, 1.0], [0.0, 0.0])],
  [L([0.0, 0.18], [0.0, 0.55]), A(0.375, 0.55, 0.375, 180, 0), L([0.75, 0.55], [0.75, 0.0])],
  [L([0.75, 0.18], [0.75, 0.55]), A(1.125, 0.55, 0.375, 180, 0), L([1.5, 0.55], [1.5, 0.0])]]);
g('n', 1.22, [[L([0.0, 1.0], [0.0, 0.0])], [L([0.0, 0.18], [0.0, 0.5]), A(0.5, 0.5, 0.5, 180, 0), L([1.0, 0.5], [1.0, 0.0])]]);
g('o', 1.22, oStrokes());
g('p', 1.22, [[L([0.0, 1.0], [0.0, -1.0])], [A(0.5, 0.5, 0.5, 180, -180)]]);
g('q', 1.24, [[bowl(0.5, 0.5, 0.5)], [L([1.0, 1.02], [1.0, -0.88]), S([1.0, -0.88], [1.10, -1.00], [1.32, -0.76])]]);
g('r', 0.92, [[L([0.0, 1.0], [0.0, 0.0])], [L([0.0, 0.18], [0.0, 0.60]), A(0.42, 0.60, 0.42, 180, 42)]]);
g('s', 1.02, [[S([0.72, 0.84], [0.42, 1.02], [0.10, 0.80], [0.36, 0.58], [0.64, 0.44], [0.74, 0.20], [0.40, -0.02], [0.08, 0.18])]]);
g('t', 0.94, [[L([0.36, 1.78], [0.36, 0.0])], [L([0.0, 1.02], [0.72, 1.02])]]);
g('u', 1.22, [[L([0.0, 1.0], [0.0, 0.5]), A(0.5, 0.5, 0.5, 180, 360), L([1.0, 0.5], [1.0, 1.0])], [L([1.0, 1.0], [1.0, 0.0])]]);
g('v', 1.12, [[L([0.0, 1.0], [0.45, 0.0], [0.90, 1.0])]]);
g('w', 1.62, [[L([0.0, 1.0], [0.35, 0.0], [0.70, 1.0], [1.05, 0.0], [1.40, 1.0])]]);
g('x', 1.04, [[L([0.0, 1.0], [0.82, 0.0])], [L([0.82, 1.0], [0.0, 0.0])]]);
g('y', 1.12, [[L([0.0, 1.0], [0.46, 0.06])], [L([0.90, 1.0], [0.06, -1.0])]]);
g('z', 1.08, [[L([0.0, 1.0], [0.86, 1.0], [0.0, 0.0], [0.88, 0.0])]]);

// ---- capitals ----
g('A', 1.34, [[L([0.56, 2.0], [0.0, 0.0])], [L([0.56, 2.0], [1.12, 0.0])], [L([0.18, 0.66], [0.94, 0.66])]]);
g('B', 1.30, [[L([0.0, 2.0], [0.0, 0.0])],
  [S([0.0, 2.0], [0.52, 1.99], [0.80, 1.76], [0.80, 1.28], [0.52, 1.03], [0.0, 1.02])],
  [S([0.0, 1.02], [0.60, 1.01], [0.92, 0.74], [0.92, 0.28], [0.58, 0.01], [0.0, 0.0])]]);
g('C', 1.56, [[A(0.67, 1.0, 0.67, 48, 312, 1.0)]]);
g('D', 1.50, [[L([0.0, 2.0], [0.0, 0.0])], [S([0.0, 2.0], [0.60, 1.98], [1.06, 1.60], [1.06, 0.40], [0.60, 0.02], [0.0, 0.0])]]);
g('E', 1.20, [[L([0.0, 2.0], [0.0, 0.0])], [L([0.0, 2.0], [0.86, 2.0])], [L([0.0, 1.03], [0.72, 1.03])], [L([0.0, 0.0], [0.86, 0.0])]]);
g('F', 1.14, [[L([0.0, 2.0], [0.0, 0.0])], [L([0.0, 2.0], [0.86, 2.0])], [L([0.0, 1.03], [0.72, 1.03])]]);
g('G', 1.60, [[A(0.67, 1.0, 0.67, 48, 318, 1.0), L([1.115, 0.335], [1.16, 0.90])], [L([1.16, 0.90], [0.68, 0.90])]]);
g('H', 1.42, [[L([0.0, 2.0], [0.0, 0.0])], [L([1.10, 2.0], [1.10, 0.0])], [L([0.0, 1.03], [1.10, 1.03])]]);
g('I', 1.10, [[L([0.45, 2.0], [0.45, 0.0])], [L([0.08, 2.0], [0.82, 2.0])], [L([0.08, 0.0], [0.82, 0.0])]]);
g('J', 1.16, [[L([0.86, 2.0], [0.86, 0.50]), S([0.86, 0.50], [0.80, 0.10], [0.48, -0.02], [0.14, 0.26])]]);
g('K', 1.32, [[L([0.0, 2.0], [0.0, 0.0])], [L([1.00, 2.0], [0.05, 0.96])], [L([0.32, 1.22], [1.08, 0.0])]]);
g('L', 1.10, [[L([0.0, 2.0], [0.0, 0.0], [0.88, 0.0])]]);
g('M', 1.66, [[L([0.0, 2.0], [0.0, 0.0])], [L([0.0, 2.0], [0.71, 0.72], [1.42, 2.0])], [L([1.42, 2.0], [1.42, 0.0])]]);
g('N', 1.42, [[L([0.0, 2.0], [0.0, 0.0])], [L([0.0, 2.0], [1.10, 0.0])], [L([1.10, 0.0], [1.10, 2.0])]]);
g('O', 1.60, [[A(0.70, 1.0, 0.70, 60, 420, 1.0)]]);
g('P', 1.24, [[L([0.0, 2.0], [0.0, 0.0])], [S([0.0, 2.0], [0.56, 1.99], [0.88, 1.74], [0.88, 1.28], [0.56, 1.03], [0.0, 1.02])]]);
g('Q', 1.66, [[A(0.70, 1.0, 0.70, 60, 420, 1.0)], [L([0.96, 0.44], [1.48, -0.10])]]);
g('R', 1.32, [[L([0.0, 2.0], [0.0, 0.0])],
  [S([0.0, 2.0], [0.56, 1.99], [0.88, 1.74], [0.88, 1.28], [0.56, 1.03], [0.0, 1.02])],
  [L([0.44, 1.03], [1.06, 0.0])]]);
g('S', 1.40, [[S([1.02, 1.68], [0.58, 2.04], [0.12, 1.62], [0.48, 1.16], [0.88, 0.88], [1.02, 0.44], [0.56, -0.03], [0.10, 0.36])]]);
g('T', 1.30, [[L([0.56, 2.0], [0.56, 0.0])], [L([0.0, 2.0], [1.12, 2.0])]]);
g('U', 1.46, [[L([0.0, 2.0], [0.0, 0.56]), A(0.57, 0.56, 0.57, 180, 360), L([1.14, 0.56], [1.14, 2.0])]]);
g('V', 1.46, [[L([0.0, 2.0], [0.57, 0.0], [1.14, 2.0])]]);
g('W', 2.06, [[L([0.0, 2.0], [0.44, 0.0], [0.87, 2.0], [1.30, 0.0], [1.74, 2.0])]]);
g('X', 1.38, [[L([0.0, 2.0], [1.06, 0.0])], [L([1.06, 2.0], [0.0, 0.0])]]);
g('Y', 1.38, [[L([0.0, 2.0], [0.53, 1.02])], [L([1.06, 2.0], [0.53, 1.02])], [L([0.53, 1.02], [0.53, 0.0])]]);
g('Z', 1.34, [[L([0.0, 2.0], [1.04, 2.0], [0.0, 0.0], [1.06, 0.0])]]);

// ---- digits ----
g('0', 1.16, [[A(0.47, 1.0, 0.47, 60, 420, 1.0)]]);
g('1', 0.92, [[L([0.10, 1.58], [0.52, 2.0], [0.52, 0.0])]]);
g('2', 1.16, [[S([0.06, 1.58], [0.30, 2.03], [0.82, 1.94], [0.86, 1.46], [0.52, 0.96], [0.06, 0.02]), L([0.06, 0.02], [0.96, 0.02])]]);
g('3', 1.16, [[S([0.06, 1.62], [0.42, 2.04], [0.88, 1.72], [0.50, 1.06], [0.92, 0.74], [0.70, 0.02], [0.10, 0.28])]]);
g('4', 1.20, [[L([0.72, 2.0], [0.02, 0.62], [0.98, 0.62])], [L([0.72, 2.0], [0.72, 0.0])]]);
g('5', 1.16, [[L([0.18, 2.0], [0.14, 1.18]), S([0.14, 1.18], [0.56, 1.32], [0.92, 1.02], [0.86, 0.44], [0.46, 0.0], [0.06, 0.22])], [L([0.18, 2.0], [0.92, 2.0])]]);
g('6', 1.16, [[S([0.86, 1.86], [0.50, 2.03], [0.12, 1.42], [0.08, 0.62], [0.36, 0.0], [0.78, 0.16], [0.86, 0.60], [0.50, 0.96], [0.12, 0.76])]]);
g('7', 1.14, [[L([0.04, 2.0], [1.00, 2.0], [0.34, 0.0])]]);
g('8', 1.16, [[S([0.50, 1.02], [0.14, 1.36], [0.24, 1.86], [0.60, 2.02], [0.86, 1.70], [0.50, 1.02], [0.12, 0.56], [0.30, 0.04], [0.72, 0.10], [0.86, 0.56], [0.50, 1.02])]]);
g('9', 1.16, [[A(0.47, 1.42, 0.47, 60, 420, 0.58)], [L([0.94, 1.42], [0.94, 0.0])]]);

// ---- punctuation ----
g('.', 0.56, [[DOT(0.18, 0.07)]]);
g(',', 0.56, [[S([0.24, 0.20], [0.20, 0.0], [0.04, -0.26])]]);
g('!', 0.58, [[L([0.20, 2.0], [0.20, 0.44])], [DOT(0.20, 0.07)]]);
g('?', 1.06, [[S([0.06, 1.58], [0.22, 2.02], [0.68, 2.04], [0.82, 1.58], [0.46, 1.20], [0.44, 0.72])], [DOT(0.44, 0.07)]]);
g("'", 0.36, [[L([0.18, 2.0], [0.10, 1.50])]]);
g('-', 0.86, [[L([0.04, 0.86], [0.62, 0.86])]]);
g(' ', 0.62, []);

const ALIAS: Record<string, string> = { '’': "'", '‘': "'", '—': '-', '–': '-', '…': '.' };
export const MISSING = new Set<string>();

function resolve(ch: string): string | null {
  const c = ALIAS[ch] ?? ch;
  if (GLYPH[c]) return c;
  MISSING.add(ch);
  return null;
}

export function advance(ch: string, tracking = 0.0): number {
  const r = resolve(ch);
  return (r ? GLYPH[r][0] : 0.0) + (r ? tracking : 0.0);
}

export function textWidth(text: string, size: number, tracking = 0.0): number {
  let s = 0;
  for (const ch of text) s += advance(ch, tracking);
  return s * size;
}

export function layout(text: string, tracking = 0.0): [string, number][] {
  const out: [string, number][] = [];
  let x = 0.0;
  for (const ch of text) {
    const r = resolve(ch);
    if (r) { out.push([r, x]); x += GLYPH[r][0] + tracking; }
  }
  return out;
}

/** Device-space (y-DOWN — SVG/canvas convention) strokes for one glyph, baseline-left at (ox, oy). */
export function glyphPolylines(ch: string, ox: number, oy: number, size: number): FlatStroke[] {
  const r = resolve(ch);
  if (!r) return [];
  const out: FlatStroke[] = [];
  for (const stroke of GLYPH[r][1]) {
    const flat = flatten(stroke);
    if (!Array.isArray(flat)) {
      out.push({ dot: true, x: ox + (flat.x + SIDE) * size, y: oy - flat.y * size });
    } else {
      out.push(flat.map(([px, py]) => [ox + (px + SIDE) * size, oy - py * size] as Pt));
    }
  }
  return out;
}

export function textStrokes(text: string, x: number, y: number, size: number, tracking = 0.10): FlatStroke[] {
  const out: FlatStroke[] = [];
  for (const [ch, pen] of layout(text, tracking)) {
    out.push(...glyphPolylines(ch, x + pen * size, y, size));
  }
  return out;
}

function walk(poly: Pt[], spacing: number): Pt[] {
  const pts: Pt[] = [poly[0]];
  let acc = 0.0;
  for (let i = 0; i < poly.length - 1; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[i + 1];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg <= 1e-9) continue;
    let t = spacing - acc;
    while (t <= seg) {
      pts.push([x0 + (x1 - x0) * t / seg, y0 + (y1 - y0) * t / seg]);
      t += spacing;
    }
    acc = (acc + seg) % spacing;
  }
  return pts;
}

function startDir(poly: Pt[]): Pt {
  const [x0, y0] = poly[0];
  for (let i = 1; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (d > 1e-6) return [(x1 - x0) / d, (y1 - y0) / d];
  }
  return [0.0, -1.0];
}

/** stroke 1 (of each glyph) red, stroke 2 blue — matches the Montree letter-formation charts. */
export const ARROW_COLORS = ['#8C1C1C', '#0F3373'];
export const DOTTED = '#000000';

export interface TraceDot { x: number; y: number; r: number }
export interface TraceArrow { tail: Pt; tip: Pt; head: [Pt, Pt, Pt]; color: string; width: number }
export interface TraceInstructions { dots: TraceDot[]; arrows: TraceArrow[] }

function arrowSpec(x: number, y: number, dx: number, dy: number, size: number, color: string, gap = 0.15, length = 0.34): TraceArrow {
  const ln = length * size, gp = gap * size;
  const tipx = x - dx * gp, tipy = y - dy * gp;
  const tailx = tipx - dx * ln, taily = tipy - dy * ln;
  const hw = 0.098 * size, hl = 0.215 * size;
  const px = -dy, py = dx;
  return {
    tail: [tailx, taily],
    tip: [tipx, tipy],
    head: [[tipx, tipy], [tipx - dx * hl + px * hw, tipy - dy * hl + py * hw], [tipx - dx * hl - px * hw, tipy - dy * hl - py * hw]],
    color,
    width: Math.max(0.5, 0.048 * size),
  };
}

/**
 * Dotted skeleton `text` on baseline (x, y) with stroke-order arrows — the
 * exact TRACE IT look from the dark-phonics tracing workbooks, as a
 * render-agnostic instruction list (feed to <canvas> or SVG).
 */
export function tracedInstructions(text: string, x: number, y: number, size: number, opts: {
  tracking?: number; arrows?: boolean; dotSpacing?: number; dotRadius?: number;
} = {}): TraceInstructions {
  const { tracking = 0.10, arrows = true, dotSpacing = 0.155, dotRadius = 0.045 } = opts;
  const spacing = dotSpacing * size, radius = dotRadius * size;
  const dots: TraceDot[] = [];
  const arrowList: TraceArrow[] = [];
  for (const [ch, pen] of layout(text, tracking)) {
    const ox = x + pen * size;
    const strokes = glyphPolylines(ch, ox, y, size);
    strokes.forEach((stroke, i) => {
      const color = ARROW_COLORS[i % 2];
      if (!Array.isArray(stroke)) {
        dots.push({ x: stroke.x, y: stroke.y, r: radius * 1.9 });
        if (arrows) arrowList.push(arrowSpec(stroke.x, stroke.y - radius * 1.9, 0, 1, size, color, 0.09, 0.28));
        return;
      }
      for (const [px, py] of walk(stroke, spacing)) dots.push({ x: px, y: py, r: radius });
      if (arrows) {
        const [dx, dy] = startDir(stroke);
        arrowList.push(arrowSpec(stroke[0][0], stroke[0][1], dx, dy, size, color));
      }
    });
  }
  return { dots, arrows: arrowList };
}

/** The same letterforms as a solid monoline polyline list (device y-down). */
export function solidStrokes(text: string, x: number, y: number, size: number, tracking = 0.10): FlatStroke[] {
  return textStrokes(text, x, y, size, tracking);
}
