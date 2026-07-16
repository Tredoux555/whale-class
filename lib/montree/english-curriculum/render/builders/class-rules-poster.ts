/**
 * builders/class-rules-poster.ts — the Grace & Courtesy "Class Rules" poster.
 *
 * ONE A4 portrait page per Intro Week: a title band + the week's five rules, each
 * a house-green framed row (iconic image on the left, the rule phrase on the
 * right). It is the wall companion to the rule flashcards — same #2D5A27 frame +
 * Andika ink, so the poster and the cards read as one set.
 *
 * Intro-Weeks only (driven entirely by `spec.materials.ruleCards`); it is never
 * offered on a phonics week (see render/index.ts materialTypesForSpec). Missing
 * images degrade to placeholder tiles + a warning — never a thrown render.
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import { adaptiveLabelFontSize } from '../adaptive-font';
import {
  A4_WIDTH_CM, WHITE_BORDER_CM, CARD_BORDER_RADIUS_CM, FRAME_COLOR, INK, KIDS_FONT,
} from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl, placeholderTile } from '../html-shell';

const ROW_H_MM = 44;   // 5 rows (220) + gaps (20) + header (~34) + padding (28) < 297
const IMG_MM = 40;

function picture(word: string, assets: AssetMap, warnings: string[]): string {
  const safe = sanitizeImageUrl(resolveImage(assets, word) ?? '');
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`class_rules_poster: missing image for "${word}"`);
  return placeholderTile(word);
}

export function buildClassRulesPoster(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const rules = spec.materials?.ruleCards ?? [];
  const title = spec.displayName || 'Our Classroom Rules';

  // The phrase column is roughly full-width minus the image + frame paddings.
  const phraseWidthCm = A4_WIDTH_CM - 2.8 /* page padding */ - IMG_MM / 10 - 1.5;
  const phrasePt = (phrase: string) => adaptiveLabelFontSize(phrase, 34, phraseWidthCm, ROW_H_MM / 10);

  const css = `
.poster{box-sizing:border-box;padding:14mm;display:flex;flex-direction:column;height:100%;}
.p-head{text-align:center;margin-bottom:8mm;}
.p-title{font-family:${KIDS_FONT};font-weight:700;color:${FRAME_COLOR};font-size:21pt;line-height:1.15;}
.p-sub{font-family:system-ui;letter-spacing:5px;text-transform:uppercase;color:#8a9a8f;font-size:10pt;margin-top:3mm;}
.p-rows{display:flex;flex-direction:column;gap:5mm;flex:1;}
.p-row{display:flex;align-items:stretch;gap:5mm;background:${FRAME_COLOR};border-radius:${CARD_BORDER_RADIUS_CM}cm;padding:${WHITE_BORDER_CM}cm;height:${ROW_H_MM}mm;overflow:hidden;}
.p-img{width:${IMG_MM}mm;flex:0 0 auto;background:#fff;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.p-img img{width:100%;height:100%;object-fit:cover;display:block;}
.p-phrase{flex:1;background:#fff;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 6mm;font-family:${KIDS_FONT};font-weight:700;color:${INK};line-height:1.1;word-break:break-word;overflow-wrap:anywhere;}
`;

  const row = (rc: { image: string; phrase: string }) =>
    `<div class="p-row"><div class="p-img">${picture(rc.image.toLowerCase(), assets, warnings)}</div>` +
    `<div class="p-phrase" style="font-size:${phrasePt(rc.phrase)}pt;">${escapeHtml(rc.phrase)}</div></div>`;

  const body = rules.length
    ? `<div class="page poster"><div class="p-head"><div class="p-title">${escapeHtml(title)}</div>` +
      `<div class="p-sub">Grace &amp; Courtesy</div></div>` +
      `<div class="p-rows">${rules.map(row).join('')}</div></div>`
    : `<div class="page"><div class="page-title">No rules for this week.</div></div>`;

  return {
    html: docShell({ title: `${title} — Class Rules Poster`, css, body, fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
