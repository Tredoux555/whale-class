/**
 * builders/matching.ts — word ↔ picture "draw a line" sheet.
 *
 * Two EXPLICIT CSS-grid columns (word column | empty gutter | picture column) with a
 * real, guaranteed gap between them — a child needs actual room to draw a line. The
 * old flex:1 two-column layout collapsed both columns' content toward the shared
 * boundary (word right-aligned, picture left-aligned, both landing on the same
 * midline) so the two connector dots ended up touching with ~0mm to draw across.
 *
 * Rows are computed to EXACTLY fill the page's available height every time (per-page,
 * not per-material) via an explicit row-gap, so a full page and a partial last page
 * (fewer leftover words) both look evenly spread rather than bunched at the top with
 * dead space below — and pagination is capped so a page can never overflow.
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import { computeUniformStripFontSize } from '../adaptive-font';
import { FRAME_COLOR, INK, KIDS_FONT, computeMatchingLayout } from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl, placeholderTile } from '../html-shell';

/** Deterministic shuffle (seeded LCG) so preview + CLI agree. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = (seed || 1) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pic(word: string, assets: AssetMap, warnings: string[], sizeCm: number): string {
  const safe = sanitizeImageUrl(resolveImage(assets, word) ?? '');
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}" style="width:${sizeCm}cm;height:${sizeCm}cm;object-fit:contain;">`;
  warnings.push(`matching: missing image for "${word}"`);
  return `<div style="width:${sizeCm}cm;height:${sizeCm}cm;">${placeholderTile(word)}</div>`;
}

export function buildMatching(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const all = (spec.materials?.matching ?? []).map((w) => w.toLowerCase());
  const seed = opts.seed ?? spec.week * 101 + 7;
  const L = computeMatchingLayout();

  // Uniform font size across every word on every page — one shrink-to-fit pass
  // (the house adaptive-font utility), never a hardcoded size that could wrap a
  // long word and blow the fixed row height. The word text lives in its half
  // minus the dot + inner gap.
  const dotAndGapCm = 0.45 + 0.6;
  const fpt = all.length
    ? computeUniformStripFontSize(all, 26, L.halfColCm - dotAndGapCm, L.rowContentCm - 0.4)
    : 26;

  const css = `
.sheet{padding:14mm 18mm;}
.top{height:1.6cm;margin-bottom:0.4cm;display:flex;justify-content:space-between;align-items:center;}
.top .aa{font-size:24pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .nm{font-size:12pt;color:#555;font-family:${KIDS_FONT};}
.instr{height:0.8cm;margin-bottom:0.6cm;display:flex;align-items:center;font-size:12pt;color:#666;font-family:${KIDS_FONT};}
.match{display:grid;grid-template-columns:${L.halfColCm}cm ${L.colGapCm}cm ${L.halfColCm}cm;justify-content:center;height:${L.usableHeightCm}cm;}
.wcell{display:flex;align-items:center;justify-content:flex-end;gap:6mm;font-family:${KIDS_FONT};font-weight:700;font-size:${fpt}pt;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;height:100%;}
.pcell{display:flex;align-items:center;justify-content:flex-start;gap:6mm;height:100%;}
.dot{width:4.5mm;height:4.5mm;border-radius:50%;background:${FRAME_COLOR};flex-shrink:0;}
`;

  const pages: string[] = [];
  const perPage = L.rowsPerPage;
  const chunks: string[][] = [];
  for (let i = 0; i < all.length; i += perPage) chunks.push(all.slice(i, i + perPage));
  if (chunks.length === 0) chunks.push([]);

  chunks.forEach((words, pi) => {
    const pics = seededShuffle(words, seed + pi * 17);
    const n = words.length;
    // Distribute the page's full available height evenly across n rows — computed
    // PER PAGE (not per material) so a shorter last page fills the same page height
    // as a full one instead of bunching at the top with dead space below.
    const rowGapCm = n > 1 ? (L.usableHeightCm - n * L.rowContentCm) / (n - 1) : 0;

    const wcells = words
      .map((w, i) => `<div class="wcell" style="grid-column:1;grid-row:${i + 1};">${escapeHtml(w)}<div class="dot"></div></div>`)
      .join('');
    const pcells = pics
      .map((p, i) => `<div class="pcell" style="grid-column:3;grid-row:${i + 1};"><div class="dot"></div>${pic(p, assets, warnings, L.picSizeCm)}</div>`)
      .join('');

    const matchBlock = n > 0
      ? `<div class="match" style="grid-template-rows:repeat(${n},${L.rowContentCm}cm);row-gap:${rowGapCm}cm;align-content:center;">${wcells}${pcells}</div>`
      : `<div class="instr">No words this week.</div>`;

    pages.push(
      `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(spec.letterDisplay || spec.sound)} · Match</div>` +
      `<div class="nm">name ______________________</div></div>` +
      `<div class="instr">Draw a line from the word to the picture.</div>` +
      matchBlock +
      `</div>`);
  });

  return {
    html: docShell({ title: `Week ${spec.week} — Matching`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
