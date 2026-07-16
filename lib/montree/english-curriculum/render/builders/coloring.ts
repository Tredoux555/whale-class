/**
 * builders/coloring.ts — 2×2 colouring grid + a hero page, composed from the
 * MJ-generated `<word>-coloring.png` line-art assets (NOT hand-drawn SVG).
 *
 * Layout (fixed Jul 15 2026 — the cards overflowed / the 2nd column clipped):
 * FIXED card heights (not `height:100%` flex) so nothing depends on the exact
 * sheet height — an earlier flex version summed to precisely 297mm and Chrome
 * spilled each grid page onto a second physical sheet. Two 122mm rows + gap +
 * header + padding stay well under A4, and each picture FILLS its cell
 * (contain, so the line-art never distorts). The hero word is picked from the
 * colouring list (so it actually has a `-coloring` asset), not the anchor word
 * (which — e.g. W1 "a" — often has none, leaving a blank hero page).
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import { FRAME_COLOR, INK, KIDS_FONT } from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl, placeholderTile } from '../html-shell';

const CELL_H_MM = 122;  // 2 rows (244) + 7 gap + ~16 header + 20 padding ≈ 287 < 297

function art(word: string, assets: AssetMap, warnings: string[], hero: boolean): string {
  const safe = sanitizeImageUrl(resolveImage(assets, word, { coloring: true }) ?? '');
  if (safe) return `<img class="ci-img" src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`coloring: missing ${word}-coloring.png`);
  const box = hero ? 150 : 80;
  return `<div class="ci-ph" style="width:${box}mm;height:${box}mm;">${placeholderTile(word)}</div>`;
}

export function buildColoring(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const words = (spec.materials?.coloring ?? []).map((w) => w.toLowerCase());
  // Hero = a word that ACTUALLY has a colouring asset: prefer the anchor word
  // when it's in the list, else the last colouring word (the fun one — potato).
  const anchor = (spec.anchorWord || '').toLowerCase();
  const hero = (words.includes(anchor) ? anchor : words[words.length - 1] || spec.sound).toLowerCase();

  const css = `
.sheet{box-sizing:border-box;padding:10mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5mm;}
.top .aa{font-size:24pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .nm{font-size:12pt;color:#555;font-family:${KIDS_FONT};}
.cgrid{display:grid;grid-template-columns:1fr 1fr;gap:7mm;}
.citem{height:${CELL_H_MM}mm;border:0.4mm dashed #d1d5db;border-radius:3mm;padding:4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}
.ci-imgwrap{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.ci-img{max-width:100%;max-height:100%;object-fit:contain;}
.ci-ph{flex:0 1 auto;}
.cap{flex:0 0 auto;font-size:16pt;font-weight:700;font-family:${KIDS_FONT};color:${INK};margin-top:3mm;}
.hero-sheet{box-sizing:border-box;padding:10mm;}
.hero{height:255mm;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.hero .ci-imgwrap{flex:1;min-height:0;width:100%;}
.hero .cap{font-size:26pt;margin-top:5mm;}
`;

  const cell = (w: string, hero: boolean) =>
    `<div class="ci-imgwrap">${art(w, assets, warnings, hero)}</div><div class="cap">${escapeHtml(w)}</div>`;

  const pages: string[] = [];
  const gridWords = words.filter((w) => w !== hero);
  for (let i = 0; i < gridWords.length; i += 4) {
    const cells = gridWords.slice(i, i + 4).map((w) => `<div class="citem">${cell(w, false)}</div>`).join('');
    pages.push(
      `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(spec.letterDisplay || spec.sound)} &middot; Color</div>` +
      `<div class="nm">name ______________________</div></div><div class="cgrid">${cells}</div></div>`);
  }
  // Hero page — the anchor/last word big.
  pages.push(`<div class="page hero-sheet"><div class="hero">${cell(hero, true)}</div></div>`);

  if (pages.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No colouring words for this week.</div></div>`);
  }

  return {
    html: docShell({ title: `${spec.displayName || `Week ${spec.week}`} — Colouring`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
