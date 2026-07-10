/**
 * builders/matching.ts — word ↔ picture "draw a line" sheet.
 * Ports the house build_matching layout (two columns, dots, fixed shuffle).
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import { FRAME_COLOR, INK, KIDS_FONT } from '../geometry';
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

function pic(word: string, assets: AssetMap, warnings: string[]): string {
  const safe = sanitizeImageUrl(resolveImage(assets, word) ?? '');
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}" style="width:30mm;height:30mm;object-fit:contain;">`;
  warnings.push(`matching: missing image for "${word}"`);
  return `<div style="width:30mm;height:30mm;">${placeholderTile(word)}</div>`;
}

export function buildMatching(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  // Cap at 6 rows per sheet so the columns breathe; paginate the rest.
  const all = (spec.materials?.matching ?? []).map((w) => w.toLowerCase());
  const seed = opts.seed ?? spec.week * 101 + 7;

  const css = `
.sheet{padding:14mm 18mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2mm;}
.top .aa{font-size:24pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .nm{font-size:12pt;color:#555;font-family:${KIDS_FONT};}
.instr{font-size:12pt;color:#666;font-family:${KIDS_FONT};margin-bottom:6mm;}
.match{display:flex;justify-content:space-between;}
.wcol,.pcol{display:flex;flex-direction:column;justify-content:space-around;flex:1;}
.wrow{display:flex;align-items:center;gap:6mm;font-family:${KIDS_FONT};font-weight:700;font-size:26pt;color:${INK};min-height:36mm;justify-content:flex-end;}
.prow{display:flex;align-items:center;gap:6mm;min-height:36mm;}
.dot{width:4.5mm;height:4.5mm;border-radius:50%;background:${FRAME_COLOR};flex-shrink:0;}
`;

  const pages: string[] = [];
  const perPage = 6;
  const chunks: string[][] = [];
  for (let i = 0; i < all.length; i += perPage) chunks.push(all.slice(i, i + perPage));
  if (chunks.length === 0) chunks.push([]);

  chunks.forEach((words, pi) => {
    const pics = seededShuffle(words, seed + pi * 17);
    const wcol = words.map((w) => `<div class="wrow">${escapeHtml(w)}<div class="dot"></div></div>`).join('');
    const pcol = pics.map((p) => `<div class="prow"><div class="dot"></div>${pic(p, assets, warnings)}</div>`).join('');
    pages.push(
      `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(spec.letterDisplay || spec.sound)} · Match</div>` +
      `<div class="nm">name ______________________</div></div>` +
      `<div class="instr">Draw a line from the word to the picture.</div>` +
      `<div class="match"><div class="wcol">${wcol || '<div class="instr">No words this week.</div>'}</div>` +
      `<div class="pcol">${pcol}</div></div></div>`);
  });

  return {
    html: docShell({ title: `Week ${spec.week} — Matching`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
