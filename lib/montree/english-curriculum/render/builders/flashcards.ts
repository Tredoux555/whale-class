/**
 * builders/flashcards.ts — big picture-word flashcards (the #1 teacher ask).
 *
 * Two cards per A4 portrait page: a LARGE picture on top (~68% of the card) and
 * the word big beneath, in the house green frame (#2D5A27) with white inner
 * panels + rounded corners — the same frame technique as the three-part cards.
 *
 * The deck opens with a letter/sound card: the week's letter (Level 1, both
 * cases — "Aa") or the pattern (Level 2/3 — patternDisplay ?? sound, e.g.
 * "a_e", "-tion"), printed big and trace-clean. Then one card per vocabulary
 * word — the SAME list the three-part cards use (spec.materials.threePartCards),
 * so the flashcards and the 3-part cards always drill the identical words.
 *
 * 🚨 Card heights are FIXED (not flex), exactly as three-part-cards does: an
 * `<img height:100%>` only resolves to a real height inside a fixed-height flex
 * parent — inside an auto-height flex chain Chrome's print engine collapses it
 * to 0 and the picture silently vanishes from the PDF. Two 135mm cards + gap +
 * page padding stay comfortably under the 297mm sheet, so nothing spills.
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

const CARD_H_MM = 135; // (297 − 18 page padding − 9 gap) / 2

function picture(word: string, assets: AssetMap, warnings: string[]): string {
  const url = resolveImage(assets, word);
  const safe = url ? sanitizeImageUrl(url) : '';
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`flashcards: missing image for "${word}"`);
  return placeholderTile(word);
}

export function buildFlashcards(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  // Grace & Courtesy Intro Weeks: rule cards (iconic image + rule PHRASE) — no
  // opening letter card, caption kept verbatim (not lowercased). Every phonics
  // week has no ruleCards → falls straight through to the byte-identical deck.
  const ruleCards = spec.materials?.ruleCards;
  if (ruleCards && ruleCards.length) return buildRuleFlashcards(spec, assets, ruleCards, opts);

  const warnings: string[] = [];
  const words = (spec.materials?.threePartCards ?? []).map((w) => w.toLowerCase());

  // The word panel is ~full-card-width by ~4cm tall — size the label to fit it.
  const wordWidthCm = A4_WIDTH_CM - 1.8 /* page padding */ - WHITE_BORDER_CM * 2;
  const labelPt = (w: string) => adaptiveLabelFontSize(w, 54, wordWidthCm, 4);

  const css = `
.fsheet{height:100%;box-sizing:border-box;padding:9mm;display:flex;flex-direction:column;gap:9mm;}
.fcard{height:${CARD_H_MM}mm;background:${FRAME_COLOR};padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;gap:${WHITE_BORDER_CM}cm;overflow:hidden;}
.fc-img{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.fc-img img{width:100%;height:100%;object-fit:cover;display:block;}
.fc-word{flex:0 0 34mm;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${INK};text-align:center;padding:0.2cm 0.4cm;line-height:1.1;word-break:break-word;overflow-wrap:anywhere;}
/* Letter / pattern card — no picture; the glyph fills the white panel. */
.fc-glyph{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${FRAME_COLOR};line-height:1;}
.fc-kicker{flex:0 0 26mm;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${INK};font-size:20pt;}
`;

  // The opening letter/pattern card. Level 1 → the letter both cases ("Aa");
  // Level 2/3 → the pattern (patternDisplay ?? sound). Kicker names the sound.
  const glyph = escapeHtml(spec.letterDisplay || spec.patternDisplay || spec.sound);
  const glyphPt = glyph.replace(/&[a-z]+;/g, 'x').length <= 3 ? 200 : 120;
  const kicker = escapeHtml(spec.patternDisplay || `/${spec.sound}/`);
  const letterCard =
    `<div class="fcard"><div class="fc-glyph" style="font-size:${glyphPt}pt;">${glyph}</div>` +
    `<div class="fc-kicker">${kicker}</div></div>`;

  const wordCard = (w: string) =>
    `<div class="fcard"><div class="fc-img">${picture(w, assets, warnings)}</div>` +
    `<div class="fc-word" style="font-size:${labelPt(w)}pt;">${escapeHtml(w)}</div></div>`;

  const cards = [letterCard, ...words.map(wordCard)];

  const pages: string[] = [];
  for (let i = 0; i < cards.length; i += 2) {
    pages.push(`<div class="page fsheet">${cards.slice(i, i + 2).join('')}</div>`);
  }
  if (cards.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No flashcard words for this week.</div></div>`);
  }

  return {
    html: docShell({ title: `Week ${spec.week} — Flashcards`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}

/**
 * Grace & Courtesy rule flashcards — two per A4 page, LARGE picture on top + the
 * rule PHRASE beneath (verbatim, not lowercased), same house-green frame as the
 * phonics deck. One card per school day. Reuses the phonics card geometry so the
 * two decks look identical on the wall; the only differences are: no opening
 * letter/glyph card, and a taller word panel (rule phrases run to two lines).
 */
function buildRuleFlashcards(
  spec: WeekSpec,
  assets: AssetMap,
  ruleCards: NonNullable<WeekSpec['materials']['ruleCards']>,
  opts: BuildOpts = {},
): BuildResult {
  const warnings: string[] = [];
  const wordWidthCm = A4_WIDTH_CM - 1.8 /* page padding */ - WHITE_BORDER_CM * 2;
  // Phrases are longer than single words → start smaller + allow up to two lines.
  const labelPt = (phrase: string) => adaptiveLabelFontSize(phrase, 40, wordWidthCm, 8);

  const css = `
.fsheet{height:100%;box-sizing:border-box;padding:9mm;display:flex;flex-direction:column;gap:9mm;}
.fcard{height:${CARD_H_MM}mm;background:${FRAME_COLOR};padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;gap:${WHITE_BORDER_CM}cm;overflow:hidden;}
.fc-img{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.fc-img img{width:100%;height:100%;object-fit:cover;display:block;}
.fc-word{flex:0 0 42mm;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${INK};text-align:center;padding:0.2cm 0.6cm;line-height:1.15;word-break:break-word;overflow-wrap:anywhere;}
`;

  const card = (rc: { image: string; phrase: string }) =>
    `<div class="fcard"><div class="fc-img">${picture(rc.image.toLowerCase(), assets, warnings)}</div>` +
    `<div class="fc-word" style="font-size:${labelPt(rc.phrase)}pt;">${escapeHtml(rc.phrase)}</div></div>`;

  const cards = ruleCards.map(card);
  const pages: string[] = [];
  for (let i = 0; i < cards.length; i += 2) {
    pages.push(`<div class="page fsheet">${cards.slice(i, i + 2).join('')}</div>`);
  }
  if (cards.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No rule cards for this week.</div></div>`);
  }

  return {
    html: docShell({ title: `${spec.displayName || `Week ${spec.week}`} — Rule Flashcards`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
