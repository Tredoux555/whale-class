/**
 * builders/three-part-cards.ts — control / picture / label cards, 7.5cm squares.
 * Ports the CardGenerator layout (print-utils.ts computeLayout + house pack).
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import { adaptiveLabelFontSize } from '../adaptive-font';
import {
  A4_WIDTH_CM, A4_HEIGHT_CM, WHITE_BORDER_CM, CARD_BORDER_RADIUS_CM,
  FRAME_COLOR, INK, KIDS_FONT, computeSquareLayout, DEFAULT_CARD_SIZE_CM,
} from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl, placeholderTile } from '../html-shell';

function imageArea(word: string, assets: AssetMap, warnings: string[]): string {
  const url = resolveImage(assets, word);
  const safe = url ? sanitizeImageUrl(url) : '';
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`three_part_cards: missing image for "${word}"`);
  return placeholderTile(word);
}

export function buildThreePartCards(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const words = (spec.materials?.threePartCards ?? []).map((w) => w.toLowerCase());
  const L = computeSquareLayout(opts.cardSizeCm ?? DEFAULT_CARD_SIZE_CM);

  const marginLeft = (A4_WIDTH_CM - L.cardSize * L.cols) / 2;
  const picTop = (A4_HEIGHT_CM - L.cardSize * L.pictureRows) / 2;
  const ctrlTop = (A4_HEIGHT_CM - L.controlHeight * L.controlRows) / 2;
  const labTop = (A4_HEIGHT_CM - L.labelHeight * L.labelRows) / 2;

  const css = `
.grid{display:grid;grid-template-columns:repeat(${L.cols},${L.cardSize}cm);gap:0;}
.grid-ctrl{grid-auto-rows:${L.controlHeight}cm;margin-left:${marginLeft}cm;margin-top:${ctrlTop}cm;}
.grid-pic{grid-auto-rows:${L.cardSize}cm;margin-left:${marginLeft}cm;margin-top:${picTop}cm;}
.grid-lab{grid-auto-rows:${L.labelHeight}cm;margin-left:${marginLeft}cm;margin-top:${labTop}cm;}
.card{background:${FRAME_COLOR};padding:${WHITE_BORDER_CM}cm;display:flex;flex-direction:column;gap:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;}
.card-ctrl{height:${L.controlHeight}cm;width:${L.cardSize}cm;}
.card-pic{height:${L.cardSize}cm;width:${L.cardSize}cm;}
.card-lab{height:${L.labelHeight}cm;width:${L.cardSize}cm;}
.img{background:white;flex:1;overflow:hidden;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;}
.img img{width:100%;height:100%;object-fit:cover;display:block;}
.lab{background:white;height:${L.labelInternal}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${INK};text-align:center;padding:0.2cm 0.3cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;line-height:1.2;overflow:hidden;word-break:break-word;overflow-wrap:anywhere;}
.card-lab .lab{flex:1;height:auto;}
`;

  const labelPt = (w: string) => adaptiveLabelFontSize(w, L.fontSize, L.cardSize, L.labelHeight);
  const ctrl = (w: string) =>
    `<div class="card card-ctrl"><div class="img">${imageArea(w, assets, warnings)}</div>` +
    `<div class="lab" style="font-size:${labelPt(w)}pt;">${escapeHtml(w)}</div></div>`;
  const pic = (w: string) =>
    `<div class="card card-pic"><div class="img">${imageArea(w, assets, warnings)}</div></div>`;
  const lab = (w: string) =>
    `<div class="card card-lab"><div class="lab" style="font-size:${labelPt(w)}pt;">${escapeHtml(w)}</div></div>`;

  const pages: string[] = [];
  const paginate = (cards: string[], per: number, gridClass: string) => {
    for (let i = 0; i < cards.length; i += per) {
      pages.push(`<div class="page"><div class="grid ${gridClass}">${cards.slice(i, i + per).join('')}</div></div>`);
    }
  };
  if (words.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No three-part-card words for this week.</div></div>`);
  } else {
    paginate(words.map(ctrl), L.controlPerPage, 'grid-ctrl');
    paginate(words.map(pic), L.picturePerPage, 'grid-pic');
    paginate(words.map(lab), L.labelPerPage, 'grid-lab');
  }

  return {
    html: docShell({ title: `Week ${spec.week} — Three-Part Cards`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
