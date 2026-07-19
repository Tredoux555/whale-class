/**
 * builders/flashcards.ts — big picture-word flashcards (the #1 teacher ask).
 *
 * 🚨🚨 THE FLASHCARD HARD RULE (Tredoux, Jul 19 2026 — supersedes everything):
 * ONE CARD = ONE FULL A4 PAGE. Anything that belongs on the card's back gets its
 * OWN page immediately after, sized to fit comfortably, aligned for LONG-EDGE
 * duplex (every printer's default flip). No two cards ever share a sheet; no
 * cutting; a teacher hits "print on both sides" with default settings and gets
 * a stack of ready flashcards. Do NOT reintroduce multi-card sheets and do NOT
 * author for short-edge flip (short-edge prints every back upside-down).
 *
 * Page stream: [card1 FRONT][card1 BACK][card2 FRONT][card2 BACK]… — odd pages
 * (1-indexed) are always fronts, even pages always backs, so duplex pairing can
 * never drift. Long-edge flip on portrait mirrors left↔right but the card fills
 * the page and its content is centred, so backs land on fronts automatically.
 *
 * Phonics deck: card 1 = the letter/pattern (front "Aa" / back "/a/"), then one
 * card per vocabulary word (front = picture, back = the word BIG) — the SAME
 * word list the three-part cards use (spec.materials.threePartCards).
 * Grace & Courtesy Intro Weeks: rule cards — front = the iconic photo, back =
 * the rule PHRASE verbatim (not lowercased).
 *
 * 🚨 Card heights are FIXED (not flex), exactly as three-part-cards does: an
 * `<img height:100%>` only resolves to a real height inside a fixed-height flex
 * parent — inside an auto-height flex chain Chrome's print engine collapses it
 * to 0 and the picture silently vanishes from the PDF. One 279mm card + 9mm
 * page padding fills the 297mm sheet exactly.
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

/** One card fills the page: 297mm sheet − 2×9mm page padding. */
const CARD_H_MM = 279;

function picture(word: string, assets: AssetMap, warnings: string[]): string {
  const url = resolveImage(assets, word);
  const safe = url ? sanitizeImageUrl(url) : '';
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`flashcards: missing image for "${word}"`);
  return placeholderTile(word);
}

/** Shared one-card-per-page CSS (front picture face + back text face). */
function cardCss(): string {
  return `
.fsheet{height:100%;box-sizing:border-box;padding:9mm;display:flex;flex-direction:column;}
.fcard{height:${CARD_H_MM}mm;background:${FRAME_COLOR};padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;gap:${WHITE_BORDER_CM}cm;overflow:hidden;}
.fc-img{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.fc-img img{width:100%;height:100%;object-fit:cover;display:block;}
/* Text face (the card BACK) — one white panel filling the card. */
.fc-back{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${INK};text-align:center;padding:0.4cm 1cm;line-height:1.1;word-break:break-word;overflow-wrap:anywhere;}
/* Letter / pattern card front — the glyph fills the white panel. */
.fc-glyph{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${FRAME_COLOR};line-height:1;}
`;
}

/** front/back page pair for one card. */
const page = (inner: string) => `<div class="page fsheet"><div class="fcard">${inner}</div></div>`;

export function buildFlashcards(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  // Grace & Courtesy Intro Weeks: rule cards (iconic image front / rule PHRASE
  // back, verbatim — not lowercased). Every phonics week has no ruleCards →
  // falls straight through to the phonics deck.
  const ruleCards = spec.materials?.ruleCards;
  if (ruleCards && ruleCards.length) return buildRuleFlashcards(spec, assets, ruleCards, opts);

  const warnings: string[] = [];
  const words = (spec.materials?.threePartCards ?? []).map((w) => w.toLowerCase());

  // Back-of-card word: the full-page white panel — let the word go BIG but keep
  // comfortable side margins (the "fits comfortably on duplex" clause).
  const wordWidthCm = A4_WIDTH_CM - 1.8 /* page padding */ - WHITE_BORDER_CM * 2 - 2 /* panel padding */;
  const labelPt = (w: string) => adaptiveLabelFontSize(w, 130, wordWidthCm, 10);

  // The opening letter/pattern card. Level 1 → the letter both cases ("Aa");
  // Level 2/3 → the pattern (patternDisplay ?? sound). Back = the sound kicker.
  const glyph = escapeHtml(spec.letterDisplay || spec.patternDisplay || spec.sound);
  const glyphPt = glyph.replace(/&[a-z]+;/g, 'x').length <= 3 ? 260 : 150;
  const kicker = escapeHtml(spec.patternDisplay || `/${spec.sound}/`);

  const pages: string[] = [];
  // Card 1: letter front / sound back.
  pages.push(page(`<div class="fc-glyph" style="font-size:${glyphPt}pt;">${glyph}</div>`));
  pages.push(page(`<div class="fc-back" style="font-size:120pt;color:${FRAME_COLOR};">${kicker}</div>`));
  // One card per word: picture front / word back.
  for (const w of words) {
    pages.push(page(`<div class="fc-img">${picture(w, assets, warnings)}</div>`));
    pages.push(page(`<div class="fc-back" style="font-size:${labelPt(w)}pt;">${escapeHtml(w)}</div>`));
  }
  if (pages.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No flashcard words for this week.</div></div>`);
  }

  return {
    html: docShell({ title: `Week ${spec.week} — Flashcards`, css: cardCss(), body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}

/**
 * Grace & Courtesy rule flashcards — SAME hard rule: one card per A4 page,
 * photo front / rule phrase back (verbatim), long-edge duplex pairing.
 */
function buildRuleFlashcards(
  spec: WeekSpec,
  assets: AssetMap,
  ruleCards: NonNullable<WeekSpec['materials']['ruleCards']>,
  opts: BuildOpts = {},
): BuildResult {
  const warnings: string[] = [];
  const wordWidthCm = A4_WIDTH_CM - 1.8 - WHITE_BORDER_CM * 2 - 2;
  // Phrases are longer than single words → start smaller + allow a few lines.
  const labelPt = (phrase: string) => adaptiveLabelFontSize(phrase, 90, wordWidthCm, 14);

  const pages: string[] = [];
  for (const rc of ruleCards) {
    pages.push(page(`<div class="fc-img">${picture(rc.image.toLowerCase(), assets, warnings)}</div>`));
    pages.push(page(`<div class="fc-back" style="font-size:${labelPt(rc.phrase)}pt;line-height:1.2;">${escapeHtml(rc.phrase)}</div>`));
  }
  if (pages.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No rule cards for this week.</div></div>`);
  }

  return {
    html: docShell({ title: `${spec.displayName || `Week ${spec.week}`} — Rule Flashcards`, css: cardCss(), body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings,
  };
}
