/**
 * builders/dark-phonics-card.ts — ONE double-sided Dark Phonics flashcard.
 *
 * A single hero card added to a week's printable pack when the week maps to a
 * Dark Phonics lesson (see spec/index.ts getDarkPhonicsForWeek + build-week.mjs).
 * Two A4 pages, ONE centred card each — print DUPLEX, flip on the SHORT edge:
 *   • Page 1 (front): the film's picture, large on white inside the house frame.
 *   • Page 2 (back):  the BIG lower-case grapheme ("s" / "ck" / "qu") + the film
 *                     catchphrase + a small montree.xyz footer.
 *
 * The card box is centred both axes on identical geometry front/back, so a
 * short-edge duplex flip lands the back squarely behind the front (a single
 * centred card is symmetric — no per-cell column mirror like the bingo grid).
 *
 * The picture + grapheme + catchphrase come in via opts.darkPhonics (the CLI
 * resolves the image to a file:// URL from --dark-phonics-dir; the Studio never
 * builds this material — it plays the video in the songs area instead). Without
 * opts.darkPhonics the builder degrades to a single note page (never throws).
 *
 * 🚨 White paper only (print rule — no dark theme on printables) and the card
 * height is FIXED, not flex: an `<img height:100%>` only resolves inside a
 * fixed-height flex parent (see flashcards.ts), else Chrome's print engine
 * collapses it to 0 and the picture vanishes from the PDF.
 */

import type { WeekSpec } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { adaptiveLabelFontSize } from '../adaptive-font';
import {
  A4_WIDTH_CM, A4_HEIGHT_CM, WHITE_BORDER_CM, CARD_BORDER_RADIUS_CM, FRAME_COLOR, INK, KIDS_FONT,
} from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl } from '../html-shell';

const CARD_W_MM = 180; // (210 − 2×15 side margin)
const CARD_H_MM = 250; // (297 − 2×23.5 top/bottom margin) — centred on A4

export function buildDarkPhonicsCard(spec: WeekSpec, _assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const dp = opts.darkPhonics;
  const title = `${spec.displayName || `Week ${spec.week}`} — Dark Phonics`;

  if (!dp) {
    return {
      html: docShell({
        title,
        css: '',
        body: `<div class="page"><div class="page-title">No Dark Phonics card for this week.</div></div>`,
        fontBaseUrl: opts.fontBaseUrl,
        autoPrint: opts.autoPrint,
      }),
      warnings: ['dark-phonics-card: no Dark Phonics lesson mapped to this week'],
    };
  }

  const grapheme = String(dp.sound || '').toLowerCase();
  const phrase = String(dp.title || '');
  const safeImg = sanitizeImageUrl(dp.imageUrl);
  if (!safeImg) warnings.push(`dark-phonics-card: missing/invalid image for lesson ${dp.lesson}`);

  // Grapheme sizing: a single letter fills the panel; digraphs ("ck", "qu")
  // and any longer grapheme step down so both letters sit on one line.
  const letterPt = grapheme.length <= 1 ? 340 : grapheme.length === 2 ? 240 : 170;
  // Descender clearance: with line-height:1 the tail of g/j/p/q/y overflows the
  // letter's line box (~0.1em) and eats into the phrase's 0.8cm margin-top,
  // colliding with the catchphrase. Reserve bottom padding proportional to the
  // font size (em) ONLY when the grapheme has a descender — non-descender cards
  // get no padding and render byte-identically to before.
  const hasDescender = /[gjpqy]/.test(grapheme);
  const letterPadBottom = hasDescender ? 'padding-bottom:0.26em;' : '';
  // Catchphrase: shrink-to-fit the card width, up to three lines.
  const phrasePt = adaptiveLabelFontSize(phrase, 48, CARD_W_MM / 10, 7);

  const css = `
.dp-page{width:${A4_WIDTH_CM}cm;height:${A4_HEIGHT_CM}cm;display:flex;align-items:center;justify-content:center;box-sizing:border-box;}
.dp-card{width:${CARD_W_MM}mm;height:${CARD_H_MM}mm;background:${FRAME_COLOR};padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;}
.dp-inner{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.dp-inner img{width:100%;height:100%;object-fit:contain;display:block;}
.dp-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:#9ca3af;font-size:22pt;}
.dp-back-in{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.2cm 1.4cm;box-sizing:border-box;}
.dp-letter{font-family:${KIDS_FONT};font-weight:bold;color:${FRAME_COLOR};line-height:1;}
.dp-phrase{font-family:${KIDS_FONT};font-weight:bold;color:${INK};line-height:1.15;margin-top:0.8cm;word-break:break-word;overflow-wrap:anywhere;}
.dp-foot{font-family:${KIDS_FONT};color:#9ca3af;font-size:13pt;margin-top:1.0cm;letter-spacing:0.06em;}
`;

  const frontInner = safeImg
    ? `<img src="${safeImg}" alt="${escapeHtml(phrase)}">`
    : `<div class="dp-ph">${escapeHtml(phrase)}</div>`;

  const front =
    `<div class="page dp-page"><div class="dp-card"><div class="dp-inner">${frontInner}</div></div></div>`;

  const back =
    `<div class="page dp-page"><div class="dp-card"><div class="dp-back-in">` +
    `<div class="dp-letter" style="font-size:${letterPt}pt;${letterPadBottom}">${escapeHtml(grapheme)}</div>` +
    `<div class="dp-phrase" style="font-size:${phrasePt}pt;">${escapeHtml(phrase)}</div>` +
    `<div class="dp-foot">montree.xyz</div>` +
    `</div></div></div>`;

  return {
    html: docShell({
      title,
      css,
      body: front + back,
      fontBaseUrl: opts.fontBaseUrl,
      autoPrint: opts.autoPrint,
    }),
    warnings,
  };
}
