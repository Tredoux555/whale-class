// Birthdays tool — vector party decoration primitives.
//
// Everything is drawn with jsPDF's own shape primitives (circles, ellipses,
// triangles, rounded rects, straight-line polylines). No external art, no
// raster assets, nothing to fetch — so a card renders identically offline and
// stays a few KB instead of a few MB.
//
// House rules for anything added here:
//   • Print palette only (see BIRTHDAY_PALETTE) — the Montree ink/emerald/gold
//     from the tracing worksheets plus a small set of festive accents.
//   • Decoration is *quiet*. It lives in the margins and behind nothing that
//     has to be read. If a shape would sit under body text, it doesn't belong.
//   • Deterministic: the confetti scatter uses a seeded PRNG so the same class
//     list always produces the same sheet.

import type { jsPDF } from 'jspdf';

export const INK = '#0D3330';
export const EMERALD = '#0E9F6E';
export const GOLD = '#C98A2C';
export const PANEL_TEAL = '#EAF4F1';
export const PANEL_GOLD = '#FBF1E1';
export const RULE_GRAY = '#D8DEDC';
export const SUBTITLE_GRAY = '#4B5A57';
export const CAPTION_GRAY = '#6B7A77';
export const FOOTER_GRAY = '#7C8A87';
export const QUIET_GRAY = '#9AA6A3';

/** Festive accents — deliberately desaturated so they print on any printer. */
export const CORAL = '#E4796B';
export const SKY = '#5FA8C9';
export const PLUM = '#9C7BB5';
export const LEAF = '#7FB98A';

/** The rotation of colours used for balloons, bunting and confetti. */
export const BIRTHDAY_PALETTE = [EMERALD, GOLD, CORAL, SKY, PLUM, LEAF] as const;

/** Deterministic 32-bit PRNG (mulberry32) — same list ⇒ same sheet. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable seed from a string, so a given class name always scatters the same. */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ------------------------------------------------------------------ balloons

export interface BalloonOpts {
  /** centre of the balloon body */
  x: number;
  y: number;
  /** body width; height is 1.22× this */
  w: number;
  color: string;
  /** length of the curly string below the knot (0 = no string) */
  stringLength?: number;
  /** sideways lean of the string, in pt (signed) */
  stringSway?: number;
}

/**
 * One balloon: an ellipse body, a small triangular knot, a highlight glint and
 * a hand-drawn-looking string built from short straight segments following a
 * damped sine (jsPDF's bezier helper is fiddlier than it is worth here, and
 * short segments print identically).
 */
export function balloon(doc: jsPDF, o: BalloonOpts) {
  const rx = o.w / 2;
  const ry = (o.w * 1.22) / 2;
  const knotY = o.y + ry;

  doc.setFillColor(o.color);
  doc.setDrawColor(o.color);
  doc.ellipse(o.x, o.y, rx, ry, 'F');

  // knot
  doc.triangle(o.x - rx * 0.16, knotY, o.x + rx * 0.16, knotY, o.x, knotY + rx * 0.3, 'F');

  // glint
  doc.setFillColor('#FFFFFF');
  doc.ellipse(o.x - rx * 0.34, o.y - ry * 0.34, rx * 0.16, ry * 0.13, 'F');

  const len = o.stringLength ?? 0;
  if (len > 0) {
    const sway = o.stringSway ?? rx * 0.55;
    doc.setDrawColor(QUIET_GRAY);
    doc.setLineWidth(0.5);
    const steps = 14;
    let px = o.x;
    let py = knotY + rx * 0.3;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const nx = o.x + Math.sin(t * Math.PI * 1.6) * sway * t;
      const ny = knotY + rx * 0.3 + len * t;
      doc.line(px, py, nx, ny);
      px = nx;
      py = ny;
    }
  }
}

/** A cluster of three balloons rising from a single point. */
export function balloonCluster(doc: jsPDF, x: number, y: number, scale: number, colors: readonly string[]) {
  const w = 22 * scale;
  balloon(doc, { x: x - w * 0.72, y: y + w * 0.30, w: w * 0.86, color: colors[1 % colors.length], stringLength: 30 * scale, stringSway: -4 * scale });
  balloon(doc, { x: x + w * 0.70, y: y + w * 0.42, w: w * 0.80, color: colors[2 % colors.length], stringLength: 26 * scale, stringSway: 4 * scale });
  balloon(doc, { x, y, w, color: colors[0], stringLength: 36 * scale, stringSway: 2 * scale });
}

// ------------------------------------------------------------------- bunting

/**
 * A string of triangular flags hanging in a shallow swag between two points.
 * Used as a header underline on both the cards and the wall chart.
 */
export function bunting(doc: jsPDF, x0: number, x1: number, y: number, opts: {
  flags?: number;
  droop?: number;
  flagH?: number;
  colors?: readonly string[];
} = {}) {
  const flags = opts.flags ?? 12;
  const droop = opts.droop ?? 10;
  const flagH = opts.flagH ?? 11;
  const colors = opts.colors ?? BIRTHDAY_PALETTE;

  const curve = (t: number) => y + Math.sin(t * Math.PI) * droop;

  // the cord
  doc.setDrawColor(INK);
  doc.setLineWidth(0.6);
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    doc.line(x0 + (x1 - x0) * t0, curve(t0), x0 + (x1 - x0) * t1, curve(t1));
  }

  // the flags
  const span = (x1 - x0) / flags;
  for (let i = 0; i < flags; i++) {
    const tL = (i + 0.08) / flags;
    const tR = (i + 0.92) / flags;
    const xL = x0 + (x1 - x0) * tL;
    const xR = x0 + (x1 - x0) * tR;
    const yL = curve(tL);
    const yR = curve(tR);
    const color = colors[i % colors.length];
    doc.setFillColor(color);
    doc.triangle(xL, yL, xR, yR, (xL + xR) / 2, Math.max(yL, yR) + flagH + span * 0.04, 'F');
  }
}

// ------------------------------------------------------------------ confetti

/**
 * A light scatter of dots, dashes and tiny triangles inside a rectangle,
 * optionally skipping a "keep clear" rect so nothing lands over the text.
 */
export function confetti(doc: jsPDF, area: { x: number; y: number; w: number; h: number }, opts: {
  count?: number;
  seed?: number;
  colors?: readonly string[];
  avoid?: { x: number; y: number; w: number; h: number }[];
  scale?: number;
} = {}) {
  const count = opts.count ?? 40;
  const colors = opts.colors ?? BIRTHDAY_PALETTE;
  const avoid = opts.avoid ?? [];
  const s = opts.scale ?? 1;
  const rnd = seededRandom(opts.seed ?? 1234);

  const blocked = (x: number, y: number) =>
    avoid.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

  for (let i = 0; i < count; i++) {
    const x = area.x + rnd() * area.w;
    const y = area.y + rnd() * area.h;
    if (blocked(x, y)) continue;
    const color = colors[Math.floor(rnd() * colors.length) % colors.length];
    const kind = Math.floor(rnd() * 3);
    doc.setFillColor(color);
    doc.setDrawColor(color);
    if (kind === 0) {
      doc.circle(x, y, (1.1 + rnd() * 0.9) * s, 'F');
    } else if (kind === 1) {
      const len = (3.5 + rnd() * 3) * s;
      const ang = rnd() * Math.PI;
      doc.setLineWidth(1.1 * s);
      doc.line(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2,
        x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2);
    } else {
      const r = (2 + rnd() * 1.6) * s;
      doc.triangle(x, y - r, x + r, y + r, x - r, y + r, 'F');
    }
  }
}

// ---------------------------------------------------------------------- cake

/**
 * A two-tier cake with `candles` lit candles. Drawn from its bottom-centre so
 * it can be parked on a baseline without extra maths at the call site.
 */
export function cake(doc: jsPDF, cx: number, baseY: number, w: number, candles: number) {
  const h = w * 0.52;
  const tierH = h * 0.58;
  const topH = h - tierH;
  const r = Math.min(3, w * 0.05);

  // bottom tier
  doc.setFillColor(PANEL_TEAL);
  doc.setDrawColor(EMERALD);
  doc.setLineWidth(0.8);
  doc.roundedRect(cx - w / 2, baseY - tierH, w, tierH, r, r, 'FD');

  // top tier
  const topW = w * 0.66;
  doc.setFillColor(PANEL_GOLD);
  doc.setDrawColor(GOLD);
  doc.roundedRect(cx - topW / 2, baseY - tierH - topH, topW, topH, r, r, 'FD');

  // icing drips along the top tier's rim
  doc.setFillColor(GOLD);
  const drips = 6;
  for (let i = 0; i < drips; i++) {
    const dx = cx - topW / 2 + (topW / drips) * (i + 0.5);
    doc.circle(dx, baseY - tierH - topH + 1.5, topW * 0.032, 'F');
  }

  // candles
  const n = Math.max(1, Math.min(candles, 9));
  const candleW = Math.max(1.6, topW * 0.045);
  const candleH = h * 0.42;
  const spread = topW * 0.74;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = cx - spread / 2 + spread * t;
    const top = baseY - tierH - topH - candleH;
    doc.setFillColor(BIRTHDAY_PALETTE[i % BIRTHDAY_PALETTE.length]);
    doc.rect(x - candleW / 2, top, candleW, candleH, 'F');
    // flame
    doc.setFillColor(GOLD);
    doc.ellipse(x, top - candleW * 0.9, candleW * 0.52, candleW * 1.05, 'F');
  }
}

// ------------------------------------------------------------------- starbur

/** A tiny six-point sparkle — used sparingly next to headings. */
export function sparkle(doc: jsPDF, x: number, y: number, r: number, color: string) {
  doc.setDrawColor(color);
  doc.setLineWidth(Math.max(0.5, r * 0.22));
  for (let i = 0; i < 3; i++) {
    const a = (Math.PI / 3) * i;
    doc.line(x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
}
