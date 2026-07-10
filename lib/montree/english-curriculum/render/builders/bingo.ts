/**
 * builders/bingo.ts — THE single duplex-bingo implementation going forward.
 * Boards 4×4 (2× border) + calling cards 3×3 duplex, SHORT-EDGE flip with the
 * per-row column mirror. Geometry from picture-bingo-generator.html + the house
 * pack (build_week01_pack.py build_bingo).
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import {
  FRAME_COLOR, INK, KIDS_FONT, HEADING_FONT,
  BINGO_GRID_SIZE, BINGO_BOARD_BORDER_MM, BINGO_CARD_BORDER_MM,
  BINGO_CALLING_COLS, BINGO_HEADER_MM, BINGO_GRID_WIDTH_MM, BINGO_RADIUS_PX,
  CARD_BORDER_RADIUS_CM,
} from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl } from '../html-shell';

function seededSample<T>(pool: T[], count: number, seed: number): T[] {
  const a = [...pool];
  let s = (seed || 1) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const out: T[] = [];
  let idx = 0;
  while (out.length < count) {
    out.push(a[idx % a.length]);
    idx++;
  }
  return out.slice(0, count);
}

const SPACER = '__spacer__';

export function buildBingo(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const pool = (spec.materials?.bingoPool ?? []).map((w) => w.toLowerCase());
  const size = BINGO_GRID_SIZE;
  const cells = size * size;
  const boardCount = 6;
  const seed = opts.seed ?? spec.week * 911 + 3;
  const title = `${spec.letterDisplay || spec.sound}`;

  if (pool.length < cells) {
    warnings.push(`bingo: pool has ${pool.length} words but a ${size}×${size} board needs ${cells}; cells were cycled to fill.`);
  }

  const cell = (word: string): string => {
    if (word === SPACER) return `<div class="bcell" style="visibility:hidden"></div>`;
    const safe = sanitizeImageUrl(resolveImage(assets, word) ?? '');
    if (safe) {
      return `<div class="bcell"><img src="${safe}" alt="${escapeHtml(word)}"><div class="w">${escapeHtml(word)}</div></div>`;
    }
    warnings.push(`bingo: missing image for "${word}"`);
    return `<div class="bcell"><div class="phw">${escapeHtml(word)}</div><div class="w">${escapeHtml(word)}</div></div>`;
  };

  const css = `
.hdr{text-align:center;height:${BINGO_HEADER_MM}mm;margin:8mm 0 4mm;overflow:hidden;box-sizing:border-box;}
.hdr h2{font-size:26px;color:${INK};font-family:${HEADING_FONT};font-weight:700;line-height:1.1;white-space:nowrap;}
.hdr p{font-size:12px;color:#999;margin-top:3px;line-height:1.2;white-space:nowrap;}
.bgrid{display:grid;grid-template-columns:repeat(${size},1fr);width:${BINGO_GRID_WIDTH_MM}mm;margin:0 auto;background:${FRAME_COLOR};padding:${BINGO_BOARD_BORDER_MM}mm;gap:${BINGO_BOARD_BORDER_MM}mm;border-radius:${BINGO_RADIUS_PX}px;}
.bcell{aspect-ratio:1;display:flex;flex-direction:column;overflow:hidden;background:white;border-radius:${Math.max(0, BINGO_RADIUS_PX - 2)}px;}
.bcell img{width:100%;flex:1;object-fit:cover;display:block;min-height:0;}
.bcell .w{font-size:14pt;font-weight:700;font-family:${KIDS_FONT};color:${INK};padding:2px 0;text-align:center;flex-shrink:0;line-height:1.2;}
.bcell .phw{flex:1;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:700;font-size:17pt;color:#9ca3af;}
.cgrid{display:grid;grid-template-columns:repeat(${BINGO_CALLING_COLS},1fr);width:${BINGO_GRID_WIDTH_MM}mm;margin:0 auto;gap:0;}
.ccard{aspect-ratio:1;background:${FRAME_COLOR};padding:${BINGO_CARD_BORDER_MM}mm;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;}
.cin{background:white;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:${CARD_BORDER_RADIUS_CM}cm;}
.cin img{width:100%;height:100%;object-fit:cover;display:block;}
.cw{font-size:30pt;font-weight:700;font-family:${KIDS_FONT};color:${INK};}
.cphw{font-size:19pt;font-weight:700;font-family:${KIDS_FONT};color:#9ca3af;}
`;

  const pages: string[] = [];

  if (pool.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No bingo pool for this week.</div></div>`);
    return { html: docShell({ title: `Week ${spec.week} — Bingo`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }), warnings };
  }

  // Player boards — single-sided, one page each.
  for (let b = 0; b < boardCount; b++) {
    const picks = seededSample(pool, cells, seed + b * 31);
    pages.push(
      `<div class="page"><div class="hdr"><h2>${escapeHtml(title)} &middot; BINGO</h2>` +
      `<p>Board #${b + 1} &middot; single-sided &middot; name ____________________</p></div>` +
      `<div class="bgrid">${picks.map(cell).join('')}</div></div>`);
  }

  // Calling cards — 3×3 duplex, picture front / word back, per-row column mirror.
  const cols = BINGO_CALLING_COLS;
  const perPage = cols * cols;
  const uniquePool = Array.from(new Set(pool));
  const front = (w: string): string => {
    if (w === SPACER) return `<div class="ccard" style="visibility:hidden"></div>`;
    const safe = sanitizeImageUrl(resolveImage(assets, w) ?? '');
    const inner = safe ? `<img src="${safe}" alt="${escapeHtml(w)}">` : `<span class="cphw">${escapeHtml(w)}</span>`;
    return `<div class="ccard"><div class="cin">${inner}</div></div>`;
  };
  const back = (w: string): string => {
    if (w === SPACER) return `<div class="ccard" style="visibility:hidden"></div>`;
    return `<div class="ccard"><div class="cin"><span class="cw">${escapeHtml(w)}</span></div></div>`;
  };

  const totalPages = Math.max(1, Math.ceil(uniquePool.length / perPage));
  for (let p = 0; p < totalPages; p++) {
    const slice = uniquePool.slice(p * perPage, (p + 1) * perPage);
    while (slice.length < perPage) slice.push(SPACER);
    const rows: string[][] = [];
    for (let r = 0; r < cols; r++) rows.push(slice.slice(r * cols, (r + 1) * cols));

    const fronts = rows.flat().map(front).join('');
    // SHORT-EDGE flip: mirror COLUMNS within each row.
    const backs = rows.map((r) => [...r].reverse().map(back).join('')).join('');

    pages.push(
      `<div class="page"><div class="hdr"><h2>${escapeHtml(title)} &middot; Calling Cards</h2>` +
      `<p>Picture Side &middot; Page ${p + 1} of ${totalPages} &middot; Print duplex, flip on SHORT edge</p></div>` +
      `<div class="cgrid">${fronts}</div></div>`);
    pages.push(
      `<div class="page"><div class="hdr"><h2>${escapeHtml(title)} &middot; Calling Cards</h2>` +
      `<p>Word Side (mirrored for duplex) &middot; Page ${p + 1} of ${totalPages}</p></div>` +
      `<div class="cgrid">${backs}</div></div>`);
  }

  return {
    html: docShell({ title: `Week ${spec.week} — Bingo`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
