/**
 * builders/coloring.ts — 2×2 colouring grid + a hero page, composed from the
 * MJ-generated `<word>-coloring.png` line-art assets (NOT hand-drawn SVG).
 * Ports build_week01_pack.py build_coloring's page geometry.
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import { FRAME_COLOR, INK, KIDS_FONT } from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl, placeholderTile } from '../html-shell';

function art(word: string, assets: AssetMap, warnings: string[], heightMm: number): string {
  const safe = sanitizeImageUrl(resolveImage(assets, word, { coloring: true }) ?? '');
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}" style="max-height:${heightMm}mm;max-width:100%;object-fit:contain;">`;
  warnings.push(`coloring: missing ${word}-coloring.png`);
  return `<div style="width:${heightMm}mm;height:${heightMm}mm;">${placeholderTile(word)}</div>`;
}

export function buildColoring(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const words = (spec.materials?.coloring ?? []).map((w) => w.toLowerCase());
  const hero = (spec.anchorWord || words[words.length - 1] || spec.sound).toLowerCase();

  const css = `
.sheet{padding:12mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5mm;}
.top .aa{font-size:24pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .nm{font-size:12pt;color:#555;font-family:${KIDS_FONT};}
.cgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8mm;}
.citem{border:0.4mm dashed #d1d5db;border-radius:3mm;padding:5mm 3mm 3mm;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:116mm;}
.cap{font-size:16pt;font-weight:700;font-family:${KIDS_FONT};color:${INK};margin-top:2mm;}
.hero{display:flex;flex-direction:column;align-items:center;justify-content:center;height:252mm;}
.hero .cap{font-size:26pt;}
`;

  const pages: string[] = [];
  const gridWords = words.filter((w) => w !== hero);
  for (let i = 0; i < gridWords.length; i += 4) {
    const cells = gridWords.slice(i, i + 4).map((w) =>
      `<div class="citem">${art(w, assets, warnings, 92)}<div class="cap">${escapeHtml(w)}</div></div>`).join('');
    pages.push(
      `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(spec.letterDisplay || spec.sound)} &middot; Color</div>` +
      `<div class="nm">name ______________________</div></div><div class="cgrid">${cells}</div></div>`);
  }
  // Hero page — the anchor word big.
  pages.push(
    `<div class="page sheet"><div class="hero">${art(hero, assets, warnings, 190)}` +
    `<div class="cap">${escapeHtml(hero)}</div></div></div>`);

  if (pages.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No colouring words for this week.</div></div>`);
  }

  return {
    html: docShell({ title: `Week ${spec.week} — Colouring`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
