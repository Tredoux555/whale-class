/**
 * builders/book.ts — the A5-landscape, dark-forest, page-turn-reveal reader.
 * Ports build_week01_book.py. Page-turn IS the reveal: a READ page (the
 * spread text, dark + gold) then the full-bleed IMAGE page that answers it.
 *
 * Deviation from the W1 python (noted in the build report): the read page shows
 * the spread's own decodable sentence rather than a hard-coded "What is it?" —
 * the sentence is the thing the child reads, then turns to see the picture.
 */

import type { WeekSpec, BookSpread } from '../../spec/types';
import type { AssetMap } from '../assets';
import type { BuildOpts, BuildResult } from '../index';
import { resolveImage } from '../assets';
import {
  BOOK_WIDTH_MM, BOOK_HEIGHT_MM, BOOK_FOREST, BOOK_FOREST_DEEP,
  BOOK_GOLD, BOOK_FONT,
} from '../geometry';
import { docShell, escapeHtml, sanitizeImageUrl, placeholderTile } from '../html-shell';

export function buildBook(spec: WeekSpec, assets: AssetMap, opts: BuildOpts = {}): BuildResult {
  const warnings: string[] = [];
  const book = spec.book;
  const mark = escapeHtml(spec.sound || 'a');

  const css = `
@page{size:${BOOK_WIDTH_MM}mm ${BOOK_HEIGHT_MM}mm;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:${BOOK_FONT};}
.page{width:${BOOK_WIDTH_MM}mm;height:${BOOK_HEIGHT_MM}mm;page-break-after:always;position:relative;overflow:hidden;background:${BOOK_FOREST};}
.page:last-child{page-break-after:auto;}
.qpage{display:flex;align-items:center;justify-content:center;padding:10mm;background:radial-gradient(circle at 30% 20%,rgba(52,211,153,0.13),transparent 55%),${BOOK_FOREST};}
.q{color:#fff;font-size:44pt;font-weight:700;text-align:center;line-height:1.25;}
.suspense{background:radial-gradient(circle at 50% 60%,rgba(232,201,106,0.08),transparent 60%),${BOOK_FOREST_DEEP};}
.suspense .q{color:${BOOK_GOLD};letter-spacing:3px;}
.mark{position:absolute;bottom:7mm;right:11mm;color:rgba(232,201,106,0.45);font-size:24pt;font-weight:700;}
.apage img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;}
.aplace{position:absolute;inset:0;}
.bar{position:absolute;top:8mm;left:50%;transform:translateX(-50%);z-index:2;background:rgba(6,14,9,0.78);color:#fff;font-size:26pt;font-weight:700;padding:4mm 12mm;border-radius:6mm;white-space:nowrap;max-width:190mm;overflow:hidden;text-overflow:ellipsis;border:0.6mm solid rgba(52,211,153,0.35);}
.gold{color:${BOOK_GOLD};}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8mm;padding:10mm;text-align:center;background:radial-gradient(circle at 70% 25%,rgba(52,211,153,0.16),transparent 55%),${BOOK_FOREST};}
.kicker{color:${BOOK_GOLD};font-size:13pt;letter-spacing:5px;}
.title{color:#fff;font-size:58pt;font-weight:700;line-height:1.1;}
.foot{color:rgba(255,255,255,0.5);font-size:12pt;letter-spacing:1px;}
.back{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3.5mm;padding:10mm;text-align:center;background:radial-gradient(circle at 30% 80%,rgba(52,211,153,0.10),transparent 55%),${BOOK_FOREST};}
.back h2{color:${BOOK_GOLD};font-size:15pt;letter-spacing:3px;font-weight:700;margin-bottom:4mm;}
.back .w{color:#fff;font-size:16pt;}
.back .note{color:rgba(255,255,255,0.55);font-size:11pt;margin-top:7mm;max-width:150mm;line-height:1.5;}
.back .rule{width:34mm;height:0.4mm;background:rgba(232,201,106,0.5);margin-top:8mm;}
.back .author{color:#fff;font-size:14pt;font-weight:700;margin-top:3mm;}
.back .brand{color:${BOOK_GOLD};font-size:10pt;letter-spacing:5px;}
`;

  const qpage = (text: string) =>
    `<div class="page qpage"><div class="q">${escapeHtml(text)}</div><div class="mark">${mark}</div></div>`;

  // Wordless/suspense spread (image === "") → one full-dark page (deep forest,
  // gold text). No placeholder, no warning (§8b amendment #3).
  const suspensePage = (text: string) =>
    `<div class="page qpage suspense"><div class="q">${escapeHtml(text)}</div><div class="mark">${mark}</div></div>`;

  const apage = (sp: BookSpread) => {
    const safe = sanitizeImageUrl(resolveImage(assets, (sp.image || '').toLowerCase()) ?? '');
    const bar = sp.text ? `<div class="bar">${escapeHtml(sp.text)}</div>` : '';
    const media = safe
      ? `<img src="${safe}" alt="${escapeHtml(sp.image || '')}"/>`
      : (warnings.push(`book: missing image "${sp.image}" (spread ${sp.n})`),
         `<div class="aplace">${placeholderTile(sp.image || '?')}</div>`);
    return `<div class="page apage">${bar}${media}</div>`;
  };

  // Cover kicker — level-aware. Level 1 is byte-identical ("THE LETTER a").
  // Level 2/3 read "THE SOUND {patternDisplay ?? SOUND}"; morphology weeks
  // (W57–58) read "THE ENDING {patternDisplay}".
  const level = spec.level ?? 1;
  const kicker =
    level === 1
      ? `WEEK ${spec.week} &middot; THE LETTER ${escapeHtml(spec.sound)}`
      : spec.soundType === 'morphology'
        ? `WEEK ${spec.week} &middot; THE ENDING ${escapeHtml(spec.patternDisplay ?? spec.sound)}`
        : `WEEK ${spec.week} &middot; THE SOUND ${escapeHtml(spec.patternDisplay ?? (spec.sound || '').toUpperCase())}`;

  const pages: string[] = [];
  // Cover
  pages.push(
    `<div class="page cover"><div class="kicker">${kicker}</div>` +
    `<div class="title">${escapeHtml(book?.title ?? '')}</div><div class="foot">Book ${spec.week}</div></div>`);

  // Spreads: read page (text) → reveal page (image).
  // A spread with image === "" is a deliberate wordless/suspense beat: ONE
  // full-dark page carrying the text, no reveal image (no placeholder/warning).
  for (const sp of book?.spreads ?? []) {
    if ((sp.image || '').trim() === '') {
      pages.push(suspensePage(sp.text ?? ''));
      continue;
    }
    if (sp.text) pages.push(qpage(sp.text));
    pages.push(apage(sp));
  }

  // Back cover
  const backWords = (book?.backCoverWords ?? []).map((w) => escapeHtml(w)).join(' &middot; ');
  pages.push(
    `<div class="page back"><h2>READ TOGETHER</h2>` +
    (backWords ? `<div class="w">${backWords}</div>` : '') +
    `<div class="note">Read slowly. Let the child sound out each word before you turn the page.<br/>The pause is the lesson.</div>` +
    `<div class="rule"></div><div class="author">Tredoux Willemse</div><div class="brand">MONTREE</div></div>`);

  return {
    html: docShell({ title: `Week ${spec.week} — ${book?.title ?? 'Book'}`, css, body: pages.join(''), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint, ownReset: true }),
    warnings,
  };
}
