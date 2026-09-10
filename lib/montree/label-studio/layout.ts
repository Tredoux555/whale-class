// lib/montree/label-studio/layout.ts
//
// Label Studio — the pure layout brain. No React, no DOM, no I/O.
//
// Every number here is a true MILLIMETRE. A4 is 210 x 297mm; the page margin
// is a constant, and the grid is whatever fits inside it with NO gap between
// labels (cut-once: one straight cut serves both neighbours). The three
// presets were chosen so the arithmetic lands exactly:
//     50 x 50  ->  4 cols x 5 rows = 20 / sheet
//    100 x 100 ->  2 x 2           =  4 / sheet
//     90 x 50  ->  2 x 5           = 10 / sheet
// which is only true at a 5mm margin (4 x 50 = 200 <= 210 - 2*5). Widen the
// margin and the small preset drops to 3 columns — so the margin is part of
// the contract, not a taste knob.

import { fontFor } from '@/lib/montree/classroom-jobs/poster-layout';

export const A4_W_MM = 210;
export const A4_H_MM = 297;
/** Page margin. See the note above — 5mm is load-bearing for the presets. */
export const SHEET_MARGIN_MM = 5;

export type SizeId = 'small' | 'large' | 'strip' | 'custom';

export type LabelSize = { w: number; h: number };

export const SIZE_PRESETS: Record<Exclude<SizeId, 'custom'>, LabelSize> = {
  small: { w: 50, h: 50 },
  large: { w: 100, h: 100 },
  strip: { w: 90, h: 50 },
};

export const CUSTOM_MIN_MM = 20;
export const CUSTOM_MAX_MM = 190;

export function clampCustom(v: number): number {
  if (!Number.isFinite(v)) return CUSTOM_MIN_MM;
  return Math.min(CUSTOM_MAX_MM, Math.max(CUSTOM_MIN_MM, Math.round(v)));
}

export type Grid = {
  cols: number;
  rows: number;
  perSheet: number;
  /** Left/top offset that centres the block of labels inside the page. */
  offsetX: number;
  offsetY: number;
};

/** How many labels of this size fit on one A4 portrait sheet, centred. */
export function gridFor(w: number, h: number, margin = SHEET_MARGIN_MM): Grid {
  const usableW = A4_W_MM - margin * 2;
  const usableH = A4_H_MM - margin * 2;
  const cols = Math.max(1, Math.floor(usableW / Math.max(1, w)));
  const rows = Math.max(1, Math.floor(usableH / Math.max(1, h)));
  const blockW = cols * w;
  const blockH = rows * h;
  return {
    cols,
    rows,
    perSheet: cols * rows,
    offsetX: (A4_W_MM - blockW) / 2,
    offsetY: (A4_H_MM - blockH) / 2,
  };
}

/** Split a flat label list into per-sheet pages. */
export function paginate<T>(items: T[], perSheet: number): T[][] {
  if (perSheet < 1) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += perSheet) out.push(items.slice(i, i + perSheet));
  return out.length ? out : [[]];
}

// -- type sizing ---------------------------------------------------------
// Type on a print card is sized from the STRING, not from the card (the
// Aug-2026 poster law). A single character is a different animal from a
// nine-letter name: it should own the label, so it gets ~60% of the height
// while a name is capped at 45% and shrunk to fit the width it actually has.

/** Rough width of one glyph as a fraction of the font size, bold sans. */
const CHAR_W = 0.6;

export function isStrip(w: number, h: number): boolean {
  return w > h * 1.25;
}

/** Diameter of the photo circle: 40% of the label's shorter side. */
export function photoSizeMm(w: number, h: number): number {
  return Math.min(w, h) * 0.4;
}

export function mainFontMm(
  text: string,
  w: number,
  h: number,
  opts: { photo?: boolean; sub?: boolean } = {}
): number {
  const clean = (text || '').trim();
  const len = Math.max(1, clean.length);
  const pad = Math.max(3, Math.min(w, h) * 0.08);
  const strip = isStrip(w, h);
  const photo = opts.photo ? photoSizeMm(w, h) + pad * 0.6 : 0;

  let availW = w - pad * 2 - (strip ? photo : 0);
  let availH = h - pad * 2 - (strip ? 0 : photo);
  if (opts.sub) availH -= h * 0.13;
  availW = Math.max(4, availW);
  availH = Math.max(4, availH);

  // Long strings are allowed to wrap once - never more.
  const lines = len > 12 ? 2 : 1;
  const perLine = Math.ceil(len / lines);

  const byHeight = len === 1 ? h * 0.6 : Math.min(h * 0.45, availH * 0.66);
  const byWidth = fontFor(perLine, availW / CHAR_W, 1, 1);

  return Math.max(3, Math.min(byHeight / lines, byWidth, availH / lines));
}

export function subFontMm(w: number, h: number): number {
  return Math.max(2.6, Math.min(w, h) * 0.09);
}

/** Emblem: ~18% of the shorter side, tucked in a corner, never behind text. */
export function emblemMm(w: number, h: number): number {
  return Math.min(w, h) * 0.18;
}

// -- content generation --------------------------------------------------

const IS_INT = /^-?\d+$/;
const IS_LETTER = /^[A-Za-z]$/;

export const SEQUENCE_MAX = 200;

/**
 * Enumerate a sequence from `start` to `end`.
 * Two single letters walk the alphabet (case taken from `start`); two
 * integers count. Anything else yields nothing - the caller shows a hint
 * rather than guessing at a half-typed field.
 */
export function expandSequence(start: string, end: string): string[] {
  const a = (start || '').trim();
  const b = (end || '').trim();
  if (!a || !b) return [];

  if (IS_LETTER.test(a) && IS_LETTER.test(b)) {
    const upper = a === a.toUpperCase();
    const from = a.toLowerCase().charCodeAt(0);
    const to = b.toLowerCase().charCodeAt(0);
    const step = to >= from ? 1 : -1;
    const out: string[] = [];
    for (let c = from; step > 0 ? c <= to : c >= to; c += step) {
      const ch = String.fromCharCode(c);
      out.push(upper ? ch.toUpperCase() : ch);
      if (out.length >= SEQUENCE_MAX) break;
    }
    return out;
  }

  if (IS_INT.test(a) && IS_INT.test(b)) {
    const from = parseInt(a, 10);
    const to = parseInt(b, 10);
    const step = to >= from ? 1 : -1;
    const out: string[] = [];
    for (let n = from; step > 0 ? n <= to : n >= to; n += step) {
      out.push(String(n));
      if (out.length >= SEQUENCE_MAX) break;
    }
    return out;
  }

  return [];
}

export type CaseMode = 'as-is' | 'upper' | 'lower' | 'both';

export function applyCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case 'upper': return text.toUpperCase();
    case 'lower': return text.toLowerCase();
    case 'both': return `${text.toUpperCase()} ${text.toLowerCase()}`;
    default: return text;
  }
}

/** One label per non-blank line, trimmed, capped. */
export function parseCustomList(raw: string, max = SEQUENCE_MAX): string[] {
  return (raw || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

// -- Montessori letter colouring -----------------------------------------
// The house convention a Montessori child meets on the moveable alphabet:
// vowels red, consonants blue. Digits and punctuation stay black - colouring
// them would teach a rule that does not exist.

export const VOWEL_RED = '#c62828';
export const CONSONANT_BLUE = '#1565c0';
export const PLAIN_INK = '#111827';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

export function charColor(ch: string, montessori: boolean): string {
  if (!montessori) return PLAIN_INK;
  const lower = ch.toLowerCase();
  if (VOWELS.has(lower)) return VOWEL_RED;
  if (lower >= 'a' && lower <= 'z') return CONSONANT_BLUE;
  return PLAIN_INK;
}

// -- print CSS -----------------------------------------------------------
// Injected as a <style dangerouslySetInnerHTML> string, NEVER <style jsx>:
// `@page` cannot be scoped to a selector, and Turbopack rejects a styled-jsx
// tag that is not the direct child of its component's outermost return.

export function printCss(): string {
  return `
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body {
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body * { visibility: hidden !important; }
  #label-sheets, #label-sheets * { visibility: visible !important; }
  #label-sheets {
    /* fixed, not absolute: #label-sheets sits inside .ls-preview, which is
       "relative" and is itself offset by the page's own padding/centring
       (px-4 py-4, max-w mx-auto). "absolute" would anchor to that padded
       box and print every sheet a few mm off the true page corner. "fixed"
       anchors to the page box itself, which is exactly what @page{margin:0}
       gives us, and nothing between here and the page has a transform. */
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    width: ${A4_W_MM}mm !important;
    background: #fff !important;
  }
  .ls-preview { height: auto !important; overflow: visible !important; }
  .ls-scaler { transform: none !important; height: auto !important; width: auto !important; }
  .ls-sheet {
    width: ${A4_W_MM}mm !important;
    height: ${A4_H_MM}mm !important;
    box-shadow: none !important;
    outline: none !important;
    margin: 0 !important;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }
  .ls-sheet:last-child { page-break-after: auto; break-after: auto; }
  .ls-noprint { display: none !important; }
  .ls-label { break-inside: avoid; page-break-inside: avoid; }
}
`.trim();
}
