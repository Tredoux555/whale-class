/**
 * builders/sentence-strips.ts — control strips (sentence + picture) + standalone
 * picture cards + sentence-only strips. Ports print-utils.ts generateStripCards
 * (21×6.5 control · 6.5×6.5 picture · 14.5×6.5 sentence, identical-overlay
 * invariant, uniform batch font).
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import { computeUniformStripFontSize } from '../adaptive-font';
import {
  A4_WIDTH_CM, A4_HEIGHT_CM, WHITE_BORDER_CM, CARD_BORDER_RADIUS_CM,
  FRAME_COLOR, INK, KIDS_FONT, computeStripLayout, DEFAULT_STRIP_SIZE_CM,
} from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl, placeholderTile } from '../html-shell';

/** Pick the picture word for a sentence: the last token that has an image asset. */
function pickSentenceWord(sentence: string, spec: WeekSpec, assets: AssetMap): string | null {
  const tokens = sentence.toLowerCase().match(/[a-z']+/g) ?? [];
  let hit: string | null = null;
  for (const t of tokens) {
    const w = t.replace(/'/g, '');
    if (assets.images[w]) hit = w;
  }
  if (hit) return hit;
  const anchor = spec.anchorWord?.toLowerCase();
  if (anchor && assets.images[anchor]) return anchor;
  // still return anchor (placeholder will show its name) if present, else null.
  return anchor ?? (tokens.length ? tokens[tokens.length - 1] : null);
}

function pic(word: string | null, assets: AssetMap, warnings: string[]): string {
  if (!word) return placeholderTile('?');
  const safe = sanitizeImageUrl(resolveImage(assets, word) ?? '');
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`sentence_strips: missing image for "${word}"`);
  return placeholderTile(word);
}

export function buildSentenceStrips(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const sentences = spec.materials?.sentences ?? [];
  const L = computeStripLayout(opts.cardSizeCm ?? DEFAULT_STRIP_SIZE_CM);

  const textWidthCm = L.stripWidth - WHITE_BORDER_CM * 2 - L.internalGap - L.pictureSize;
  const textHeightCm = L.stripHeight - WHITE_BORDER_CM * 2;
  const fpt = computeUniformStripFontSize(sentences, L.fontSize, textWidthCm, textHeightCm);

  const marginCtrlTop = (A4_HEIGHT_CM - L.stripHeight * L.stripsPerPage) / 2;
  const marginSentLeft = (A4_WIDTH_CM - L.sentenceWidth) / 2;
  const marginPicLeft = (A4_WIDTH_CM - L.pictureSize * L.picCols) / 2;
  const marginPicTop = (A4_HEIGHT_CM - L.pictureSize * L.picRows) / 2;

  const css = `
.gridc{display:grid;grid-template-columns:${L.stripWidth}cm;grid-auto-rows:${L.stripHeight}cm;gap:0;margin-top:${marginCtrlTop}cm;}
.grids{display:grid;grid-template-columns:${L.sentenceWidth}cm;grid-auto-rows:${L.stripHeight}cm;gap:0;margin-left:${marginSentLeft}cm;margin-top:${marginCtrlTop}cm;}
.gridp{display:grid;grid-template-columns:repeat(${L.picCols},${L.pictureSize}cm);grid-auto-rows:${L.pictureSize}cm;gap:0;margin-left:${marginPicLeft}cm;margin-top:${marginPicTop}cm;}
.sc{background:${FRAME_COLOR};width:${L.stripWidth}cm;height:${L.stripHeight}cm;padding:${WHITE_BORDER_CM}cm;display:flex;gap:${L.internalGap}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;}
.ss{background:${FRAME_COLOR};width:${L.sentenceWidth}cm;height:${L.stripHeight}cm;padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;}
.txt{flex:1;width:100%;height:100%;background:white;display:flex;align-items:center;justify-content:center;padding:0.2cm 0.5cm;font-family:${KIDS_FONT};font-weight:bold;font-size:${fpt}pt;text-align:center;line-height:1.25;color:${INK};border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;word-break:break-word;}
.pimg{width:${L.pictureSize - WHITE_BORDER_CM * 2}cm;height:${L.pictureSize - WHITE_BORDER_CM * 2}cm;background:white;overflow:hidden;flex-shrink:0;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;}
.pimg img{width:100%;height:100%;object-fit:cover;display:block;}
.pc{background:${FRAME_COLOR};width:${L.pictureSize}cm;height:${L.pictureSize}cm;padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;}
.pci{width:100%;height:100%;background:white;overflow:hidden;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;}
.pci img{width:100%;height:100%;object-fit:cover;display:block;}
`;

  const wordFor = sentences.map((s) => pickSentenceWord(s, spec, assets));

  const controls = sentences.map((s, i) =>
    `<div class="sc"><div class="txt">${escapeHtml(s)}</div>` +
    `<div class="pimg">${pic(wordFor[i], assets, warnings)}</div></div>`);
  const pics = wordFor.map((w) => `<div class="pc"><div class="pci">${pic(w, assets, warnings)}</div></div>`);
  const sents = sentences.map((s) => `<div class="ss"><div class="txt">${escapeHtml(s)}</div></div>`);

  const pages: string[] = [];
  if (sentences.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No sentences for this week.</div></div>`);
  } else {
    for (let i = 0; i < controls.length; i += L.stripsPerPage) {
      pages.push(`<div class="page"><div class="gridc">${controls.slice(i, i + L.stripsPerPage).join('')}</div></div>`);
    }
    for (let i = 0; i < pics.length; i += L.picPerPage) {
      pages.push(`<div class="page"><div class="gridp">${pics.slice(i, i + L.picPerPage).join('')}</div></div>`);
    }
    for (let i = 0; i < sents.length; i += L.stripsPerPage) {
      pages.push(`<div class="page"><div class="grids">${sents.slice(i, i + L.stripsPerPage).join('')}</div></div>`);
    }
  }

  return {
    html: docShell({ title: `Week ${spec.week} — Sentence Strips`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
