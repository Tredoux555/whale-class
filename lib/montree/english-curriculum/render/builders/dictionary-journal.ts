/**
 * builders/dictionary-journal.ts — "My Dictionary" journal: per row a line-art
 * picture (colour it) + 3-line writing guide with the word in traceable grey +
 * open space to write it. Colour + trace + write on one binder page per week.
 * Ports build_week01_pack.py build_dictionary.
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import { FRAME_COLOR, INK, KIDS_FONT } from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl, placeholderTile } from '../html-shell';

function art(word: string, assets: AssetMap, warnings: string[]): string {
  // Prefer coloring line-art; fall back to the photo; then placeholder.
  const safe = sanitizeImageUrl(
    resolveImage(assets, word, { coloring: true }) ?? resolveImage(assets, word) ?? '',
  );
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}" style="max-height:34mm;max-width:34mm;object-fit:contain;">`;
  warnings.push(`dictionary_journal: missing art for "${word}"`);
  return `<div style="width:34mm;height:34mm;">${placeholderTile(word)}</div>`;
}

export function buildDictionaryJournal(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const words = (spec.materials?.dictionary ?? []).map((w) => w.toLowerCase());

  const css = `
.sheet{padding:12mm 14mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3mm;}
.top .aa{font-size:24pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .t{font-size:11pt;color:#999;letter-spacing:3px;font-family:system-ui;}
.top .nm{font-size:11pt;color:#555;font-family:${KIDS_FONT};}
.drow{display:flex;align-items:center;gap:8mm;height:48mm;border-bottom:0.3mm dashed #e5e7eb;}
.dpic{width:38mm;flex-shrink:0;text-align:center;}
.dpic .cap{font-size:11pt;font-family:${KIDS_FONT};font-weight:700;color:${INK};margin-top:1mm;}
.lines{position:relative;flex:1;height:24mm;}
.l-top{position:absolute;left:0;right:0;top:0;border-top:0.35mm solid #d1d5db;}
.l-mid{position:absolute;left:0;right:0;top:8mm;border-top:0.35mm dashed #c9c9c9;}
.l-base{position:absolute;left:0;right:0;top:16mm;border-top:0.45mm solid #9ca3af;}
.trace{position:absolute;left:4mm;top:16mm;transform:translateY(-84%);font-family:${KIDS_FONT};font-weight:700;font-size:15mm;line-height:1;color:#d1d5db;letter-spacing:1mm;}
`;

  const header = () =>
    `<div class="top"><div class="aa">${escapeHtml(spec.letterDisplay || spec.sound)}</div>` +
    `<div class="t">MY DICTIONARY &middot; WEEK ${spec.week}</div>` +
    `<div class="nm">name ____________________</div></div>`;

  const row = (w: string) =>
    `<div class="drow"><div class="dpic">${art(w, assets, warnings)}<div class="cap">${escapeHtml(w)}</div></div>` +
    `<div class="lines"><div class="l-top"></div><div class="l-mid"></div><div class="l-base"></div>` +
    `<div class="trace">${escapeHtml(w)}</div></div></div>`;

  const pages: string[] = [];
  if (words.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No dictionary words for this week.</div></div>`);
  } else {
    for (let i = 0; i < words.length; i += 5) {
      pages.push(`<div class="page sheet">${header()}${words.slice(i, i + 5).map(row).join('')}</div>`);
    }
  }

  return {
    html: docShell({ title: `Week ${spec.week} — Dictionary Journal`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
