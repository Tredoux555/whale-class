/**
 * builders/flashcards.ts — big picture-word flashcards (the #1 teacher ask).
 *
 * 🔄 DUPLEX DESIGN (Tredoux, Jul 18 2026 — supersedes the single-face card):
 * TRUE two-sided flashcards for LONG-EDGE duplex (every printer's default flip).
 * Pages come in FRONT/BACK pairs: front page = two picture-only cards stacked;
 * the very next page = the SAME two cards' text sides (big word / letter) in the
 * SAME top/bottom order. Long-edge flip on portrait mirrors left↔right but keeps
 * top card on top — and card content is centred/full-width — so the backs land
 * on their fronts automatically with zero printer settings. Do NOT reorder pages
 * or switch to short-edge: short-edge flip would print every back upside-down.
 *
 * The deck opens with a letter/sound card: front = the week's letter (Level 1,
 * both cases — "Aa") or pattern (Level 2/3 — patternDisplay ?? sound), back =
 * the sound kicker ("/a/"). Then one card per vocabulary word — the SAME list
 * the three-part cards use (spec.materials.threePartCards): picture front, the
 * word big on the back. An odd final card shares its sheet with a blank slot so
 * front/back positions always line up.
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

  // Back-of-card word: near-full-card white panel — let the word go BIG.
  const wordWidthCm = A4_WIDTH_CM - 1.8 /* page padding */ - WHITE_BORDER_CM * 2;
  const labelPt = (w: string) => adaptiveLabelFontSize(w, 110, wordWidthCm - 1, 9);

  const css = `
.fsheet{height:100%;box-sizing:border-box;padding:9mm;display:flex;flex-direction:column;gap:9mm;}
.fcard{height:${CARD_H_MM}mm;background:${FRAME_COLOR};padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;gap:${WHITE_BORDER_CM}cm;overflow:hidden;}
.fblank{height:${CARD_H_MM}mm;}
.fc-img{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.fc-img img{width:100%;height:100%;object-fit:cover;display:block;}
/* Text face (the card BACK) — one white panel filling the card. */
.fc-back{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${INK};text-align:center;padding:0.2cm 0.5cm;line-height:1.05;word-break:break-word;overflow-wrap:anywhere;}
/* Letter / pattern card front — the glyph fills the white panel. */
.fc-glyph{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${FRAME_COLOR};line-height:1;}
`;

  // The opening letter/pattern card. Level 1 → the letter both cases ("Aa");
  // Level 2/3 → the pattern (patternDisplay ?? sound). Back = the sound kicker.
  const glyph = escapeHtml(spec.letterDisplay || spec.patternDisplay || spec.sound);
  const glyphPt = glyph.replace(/&[a-z]+;/g, 'x').length <= 3 ? 200 : 120;
  const kicker = escapeHtml(spec.patternDisplay || `/${spec.sound}/`);

  // front/back HTML per card, same index = same physical card.
  const fronts: string[] = [
    `<div class="fcard"><div class="fc-glyph" style="font-size:${glyphPt}pt;">${glyph}</div></div>`,
    ...words.map((w) => `<div class="fcard"><div class="fc-img">${picture(w, assets, warnings)}</div></div>`),
  ];
  const backs: string[] = [
    `<div class="fcard"><div class="fc-back" style="font-size:90pt;color:${FRAME_COLOR};">${kicker}</div></div>`,
    ...words.map((w) => `<div class="fcard"><div class="fc-back" style="font-size:${labelPt(w)}pt;">${escapeHtml(w)}</div></div>`),
  ];

  // Sheet pairs: FRONT page (2 picture cards) immediately followed by its BACK
  // page (same 2 cards' text sides, same top/bottom order). Long-edge duplex
  // lines them up automatically. Odd remainder keeps its slot via a blank spacer.
  const pages: string[] = [];
  for (let i = 0; i < fronts.length; i += 2) {
    const f = [fronts[i], fronts[i + 1] ?? '<div class="fblank"></div>'];
    const b = [backs[i], backs[i + 1] ?? '<div class="fblank"></div>'];
    pages.push(`<div class="page fsheet">${f.join('')}</div>`);
    pages.push(`<div class="page fsheet">${b.join('')}</div>`);
  }
  if (fronts.length === 0) {
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
