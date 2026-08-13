// Tracing Work — PDF builders (jsPDF port of the three approved mockup
// templates in ./docxTemplates.ts).
//
// Why PDF: teachers print these straight from a phone/Chromebook, and Word's
// flow layout let a long name push a worksheet onto a second page. This module
// keeps the exact same visual design (brand colours, header/footer copy,
// watermark placement, per-template image sizing) but lays it out with an
// absolute top-to-bottom cursor and a **single-page-fit guarantee**:
// `computeTracingLayout()` derives every trace-image box from the real image
// dimensions returned by renderTraceStrip/renderBlankGuide, sums the whole
// page top-to-bottom, and defensively scales the trace art down if the
// projected total would ever exceed the printable height. One child is always
// exactly one page — `drawTracingPage()` never calls `doc.addPage()`.
//
// Two public builders sit on top of that single-page routine:
//   • `buildTracingPdf(opts)`        — one child, a one-page PDF.
//   • `buildTracingPdfBatch(items)`  — a whole class as ONE multi-page PDF
//     (one page per child, `addPage()` between them) so a teacher sends a
//     single print job instead of unzipping 18 files.
//
// Orientation is per template, not per document: Templates A and B are
// landscape US Letter (792×612); C is portrait (612×792). A mixed batch
// interleaves orientations in one file — see `orientationFor()` and
// `buildTracingPdfBatch()`.
//
// Design reference: ./docxTemplates.ts (do not edit that file; it is the
// source of truth for colours/copy and is kept for the .docx export path).
'use client';

import { jsPDF } from 'jspdf';
import { renderTraceStrip, renderBlankGuide, type StripResult } from './traceRender';

// ---------------------------------------------------------------- brand ---
// (identical values to docxTemplates.ts, expressed as CSS hex for jsPDF)
export const INK = '#0D3330';
export const EMERALD = '#0E9F6E';
export const GOLD = '#C98A2C';
const PANEL_TEAL = '#EAF4F1';
const PANEL_GOLD = '#FBF1E1';
const RULE_GRAY = '#D8DEDC';
const FOOTER_GRAY = '#7C8A87';
const QUIET_GRAY = '#9AA6A3';
const FAINT_GRAY = '#AEB8B5';

// jsPDF only ships the 14 base PDF fonts; Century Gothic / Calibri are not
// embeddable without shipping ~300 KB of font binary to every teacher, so the
// closest base-font stand-ins are used (same weights, same sizes).
const FONT_LABEL = 'helvetica';
const FONT_BODY = 'helvetica';

// -------------------------------------------------------------- metrics ---
/** docx `transformation.width` is CSS px @96dpi; PDF user space here is pt. */
export const PX_TO_PT = 72 / 96;

export const PAGE_W = 612;   // US Letter portrait, matching the docx default section
export const PAGE_H = 792;
export const MARGIN_X = 0.65 * 72;   // 46.8pt — docx PAGE_MARGIN left/right
export const MARGIN_Y = 0.55 * 72;   // 39.6pt — docx PAGE_MARGIN top/bottom
export const CONTENT_W = PAGE_W - 2 * MARGIN_X;   // 518.4
export const AVAIL_H = PAGE_H - 2 * MARGIN_Y;     // 712.8

/**
 * Landscape Template B does NOT reuse the portrait margins.
 *
 * The portrait 0.65in/0.55in frame is a *typographic* margin: it is what makes
 * a mostly-text A4-ish sheet look like a document. Landscape B is not a
 * document — it is four full-bleed panels of trace art, and on a 612pt-tall
 * page the portrait margin was spending 79.2pt (13% of the sheet) on white
 * space that the teacher correctly read as wasted, while the glyphs her class
 * traces stayed small.
 *
 * 0.30in = 21.6pt on all four edges is the tightest value that is still safe
 * on every printer this actually goes to. Consumer inkjets and laser printers
 * have a *hardware* unprintable margin of roughly 0.16–0.25in (worst case is
 * the bottom edge on sheet-fed inkjets, ~0.25in); 0.30in clears the worst of
 * those by 0.05in / 3.6pt, so nothing on the sheet is ever clipped or pushed
 * into a "content outside printable area" scale-to-fit prompt. Do not lower
 * this below 0.25in — at that point the footer starts landing in some
 * printers' dead zone.
 *
 * Reclaimed versus the portrait margins:
 *   width   792 − 2×21.6 = 748.8   (was 698.4, +50.4pt)
 *   height  612 − 21.6 − 14.4 = 576.0   (was 532.8, +43.2pt)
 * That reclaimed height is real, spendable budget — see GEOMETRY.B.
 */
export const LANDSCAPE_MARGIN_X = 0.30 * 72;   // 21.6pt
/** Top edge only — see LANDSCAPE_MARGIN_BOTTOM for why the frame is uneven. */
export const LANDSCAPE_MARGIN_Y = 0.30 * 72;   // 21.6pt

/**
 * The landscape frame is deliberately NOT symmetric top-to-bottom.
 *
 * Everything on a B sheet is drawn top-anchored (`let y = marginY` in
 * drawTemplateB, growing downwards) and the layout solver guarantees at least
 * MIN_SLACK of *unused page* under the last element. So the bottom edge is
 * protected twice over: the physical clearance from the paper edge to the
 * lowest ink is `marginBottom + slack − footerOverhang`, never just
 * `marginBottom`. The top and side edges get no such second helping — there,
 * the margin is the entire clearance.
 *
 * `footerOverhang` is 2.6pt and is a real term, not a fudge: the footer is
 * budgeted 11pt in CHROME.B but drawn with its cap-line 6pt down, so its
 * baseline lands at 6 + 7.5 × 0.8 = 12.0pt and a descender in the class name
 * (Helvetica ≈ 0.212 em ⇒ 1.59pt at 7.5pt) reaches 13.59pt — 2.59pt past the
 * budget and into the slack.
 *
 * At a symmetric 0.30in that made the bottom the single most over-protected
 * edge on the sheet: 21.6 + 18 − 2.6 = 37.0pt (0.514in) guaranteed, against a
 * top/side clearance of 21.6pt (0.30in) — and the bottom was the edge the
 * 0.30in figure was chosen for in the first place. Half an inch of page was
 * being spent twice on the same worry while the glyphs stayed small.
 *
 * 0.20in = 14.4pt on the bottom keeps the guaranteed ink clearance at
 * 14.4 + 18 − 2.6 = 29.8pt = 0.414in, still 0.164in clear of the ~0.25in
 * worst-case sheet-fed-inkjet bottom dead zone — more than 3× the 0.05in
 * buffer the top and side edges run at, and those edges are untouched. (On the
 * Joey sample, where slack is 19.61 and 'Whale Class' has no descender, the
 * measured clearance is 32.7pt = 0.455in.)
 *
 * Do not push this below ~9.8pt: that is where the guaranteed clearance hits
 * 0.35in and the remaining buffer stops being worth the ink. Optically the
 * sheet still reads bottom-heavy, which is correct — the *drawn* white band
 * under the footer is marginBottom + slack ≈ 34pt against 21.6pt at the top.
 */
export const LANDSCAPE_MARGIN_BOTTOM = 0.20 * 72;   // 14.4pt

/**
 * Never let a sheet come closer than this to the bottom margin.
 *
 * This is a floor on leftover page, not a knob: shrinking it to manufacture
 * room for bigger art would defeat the thing it exists to do, and the
 * LANDSCAPE_MARGIN_BOTTOM reasoning above now leans on it being 18.
 */
export const MIN_SLACK = 18;
/** Hard floor on the defensive down-scale (below this the art is unusable). */
const MIN_TRACE_SCALE = 0.35;

export type TracingTemplate = 'A' | 'B' | 'C';

// ---------------------------------------------------------- orientation ---
/**
 * Templates A and B are LANDSCAPE worksheets; C stays portrait.
 *
 * The whole point of going landscape is the size of the glyphs a five-year-
 * old traces with a fat marker, and the two things that limit those glyphs
 * pull in opposite directions: the name strip is only ~1.8:1 (it wants
 * height) while the 0–9 numbers strip is ~6.5:1 (it wants width). Landscape
 * US Letter gives the numbers row 698.4pt of usable width instead of 518.4
 * (+35%), and the lost vertical comes back by setting the name's model strip
 * and its blank practice guide *side by side* on one line — the classic
 * "trace it, then write it" row — so the name costs one band height instead
 * of two. See GEOMETRY.B (and GEOMETRY.A, which now shares those numbers).
 *
 * A moved from portrait to landscape after B's four rounds of live tuning had
 * already answered "what size should this text be" — rather than re-deriving
 * a second, slightly different answer for A, its CHROME and GEOMETRY entries
 * reuse B's exactly. See the drawTemplateA docstring for the layout that made
 * that possible.
 *
 * Orientation is a property of the template, never of the caller, so a mixed
 * batch just interleaves page orientations (see `buildTracingPdfBatch`).
 */
export type PageOrientation = 'portrait' | 'landscape';

export function orientationFor(template: TracingTemplate): PageOrientation {
  return template === 'C' ? 'portrait' : 'landscape';
}

export interface PageMetrics {
  orientation: PageOrientation;
  /** page width in pt */
  w: number;
  /** page height in pt */
  h: number;
  /** left/right margin in pt — portrait and landscape do not share one. */
  marginX: number;
  /** top margin in pt — every template draws top-anchored from here. */
  marginY: number;
  /**
   * bottom margin in pt. Equal to `marginY` on the portrait templates; smaller
   * on landscape B, where MIN_SLACK already guarantees a second helping of
   * bottom clearance — see LANDSCAPE_MARGIN_BOTTOM.
   */
  marginBottom: number;
  /** printable width between the left/right margins */
  contentW: number;
  /** printable height between the top and bottom margins */
  availH: number;
}

const PORTRAIT_METRICS: PageMetrics = {
  orientation: 'portrait', w: PAGE_W, h: PAGE_H,
  marginX: MARGIN_X, marginY: MARGIN_Y, marginBottom: MARGIN_Y,
  contentW: CONTENT_W, availH: AVAIL_H,
};
const LANDSCAPE_METRICS: PageMetrics = {
  orientation: 'landscape',
  w: PAGE_H,                                    // 792
  h: PAGE_W,                                    // 612
  marginX: LANDSCAPE_MARGIN_X,                  // 21.6
  marginY: LANDSCAPE_MARGIN_Y,                  // 21.6
  marginBottom: LANDSCAPE_MARGIN_BOTTOM,        // 14.4
  contentW: PAGE_H - 2 * LANDSCAPE_MARGIN_X,    // 748.8
  availH: PAGE_W - LANDSCAPE_MARGIN_Y - LANDSCAPE_MARGIN_BOTTOM,   // 576.0
};

export function pageMetrics(template: TracingTemplate): PageMetrics {
  return orientationFor(template) === 'landscape' ? LANDSCAPE_METRICS : PORTRAIT_METRICS;
}

// ------------------------------------------------------- template specs ---
/**
 * Fixed (non-image) vertical space each template consumes, in pt, itemised so
 * the numbers stay auditable against docxTemplates.ts. docx twips /20 = pt;
 * docx half-points /2 = pt; docx border sizes are eighths of a pt.
 */
const CHROME = {
  // Template A moved from portrait to landscape (see orientationFor) so its
  // trace glyphs could grow to match B's rather than stay capped by a
  // portrait page that had no more chrome left to cut (the old A audit —
  // 212 → 181pt — already took everything adjacent to a trace strip; the
  // header/title/picture frame were the "Classic Montree" design itself and
  // deliberately left alone). Landscape doesn't just add width, it removes
  // the reason A's chrome was ever a separate budget: A's structure now
  // borrows B's directly — picture/logo beside a kicker+title lockup instead
  // of three stacked header pieces, the name row side by side instead of two
  // stacked bands, "now you try" beside its rule instead of above it — the
  // same three compressions that paid for B's growth. The result is CHROME.A
  // below being field-for-field identical in value to CHROME.B: same chrome
  // (180), same flexible budget, same defensive-scale target, same drawn
  // band sizes. That's intentional, not a coincidence to prune away — it's
  // what makes A's trace strips exactly as large as the ones B's four rounds
  // of live tuning already settled on, rather than a second, independently-
  // rounded answer. See the drawTemplateA docstring for the full layout and
  // GEOMETRY.A for where the shared numbers come from.
  A: {
    picture: 96,          // photo/logo header slot — same size as B's badge
    headerAfter: 6,       // 120 twips under the header band
    namePanelFrame: 9,    // 4 pad-top + 4 pad-bottom + 1 border
    numbersLabel: 16,     // 4 before + 11 line (9pt caps) + 1 after
    numbersPanelFrame: 9,
    gapNumbersPanel: 2,   // 40 twips between numbers trace + guide
    spacerBeforeTry: 4,   // 80 twips
    tryPanelFrame: 9,
    tryRow: 18,           // 11pt heading line, ruled line on the same row
    footer: 11,           // 3 before (60 twips) + 8pt line
  },
  // Template B is landscape (792×612) on a 0.30in frame: 568.8pt of printable
  // height instead of portrait's 712.8, so every chrome item is re-costed for
  // the wider, shorter page. The first round of savings came from laying things
  // out *across* rather than down:
  //   • header    badge beside the kicker/title instead of stacked above them
  //               (was 114.5+11+30 = 155.5 stacked)
  //   • try panel heading beside its ruled line instead of above it
  //               (was 15+17+17 = 49 stacked)
  //   • the name panel holds ONE band (trace | blank guide side by side), so
  //     its frame is charged once and the band itself once — see GEOMETRY.B.
  //
  // Round 2 squeezed the chrome from 190 → 143 (−47pt) to fund a numbers row a
  // third bigger. Round 3 (the teacher asked for name AND numbers to grow by
  // one more equal step) re-audited what was left and took 143 → 124 (−19pt).
  // The cuts are smaller than last round's because the obvious fat is gone;
  // each one below is at, or one step above, the point where it would start
  // costing legibility. Every round-3 cut and its justification:
  //   badge            48 → 40  (−8)   the header row costs the taller of the
  //                                    emblem and the two-line text lockup
  //                                    (kicker 11pt line + 1 + title 22pt line
  //                                    = 34pt), so 34 is the hard floor and
  //                                    only 14pt was ever available here. At 40
  //                                    the emblem is still 17.6% taller than
  //                                    the lockup and 40pt ≈ 53px @96dpi, which
  //                                    still reads as the badge this template
  //                                    is named for. Going to the 34pt floor
  //                                    would make emblem and text the same
  //                                    height and kill that read, so 6 of the
  //                                    14 are deliberately left on the table.
  //   headerAfter       8 →  6  (−2)   120 twips; the name panel below it has
  //                                    its own 0.5pt emerald border, which does
  //                                    the separating a wider gap was doing.
  //   namePanelFrame   11 →  9  (−2)   4 pad-top + 4 pad-bottom + 1 border.
  //                                    Panel pad is a pure border gutter: the
  //                                    strips carry their own internal air
  //                                    (0.85 em above the headline, 1.15 em of
  //                                    descender room below — traceRender.ts),
  //                                    which at the round-3 name band is
  //                                    0.85/4.30 × 172.5 = 34.1pt of blank
  //                                    inside the image before any ink. 4pt of
  //                                    gutter is a visual inset, not clearance.
  //   numbersLabel     18 → 16  (−2)   4 before + 11 line (9pt caps) + 1 after.
  //   numbersPanelFrame 11 → 9  (−2)   as namePanelFrame.
  //   spacerBeforeTry   5 →  4  (−1)   80 twips. Both neighbours are bordered
  //                                    panels, so 4pt of white still reads as a
  //                                    gutter between two rules; this is the
  //                                    last point available here.
  //   tryPanelFrame    11 →  9  (−2)   as namePanelFrame.
  // Sum: 40+6+9+16+9+2+4+9+18+11 = 124.
  //
  // Audited and deliberately NOT cut in round 3:
  //   tryRow    18 — the rule sits at PANEL_PAD_Y + tryRow − 5, so the child
  //                  has tryRow − 5 = 13pt of gold above the line to put a
  //                  marker stroke in. That is already the floor; trimming it
  //                  is what would make "now you try" stop being usable.
  //   footer    11 — cutting the budget here frees nothing real. The footer is
  //                  *drawn* at cap-line y+6, so its 7.5pt italic baseline sits
  //                  at y+12 and already overhangs its 11pt budget by up to
  //                  2.6pt into the slack; a smaller budget just moves ink
  //                  further down the page rather than making page. (That
  //                  2.6pt is subtracted in the LANDSCAPE_MARGIN_BOTTOM sum.)
  //   gapNumbersPanel 2 — one 40-twip hairline between the model row and the
  //                  practice row inside the numbers panel; there is no point
  //                  in it to take.
  //
  // PANEL_PAD_Y in drawTemplateB is 4 and MUST stay equal to the pad half of
  // the three *PanelFrame numbers above, and the `before` argument passed to
  // sectionLabel() must equal numbersLabel's lead (4), or the drawn panels and
  // the audited arithmetic drift apart.
  //
  // Round 4 spends chrome instead of saving it: the teacher's ask was that the
  // badge is the one thing on this sheet that is too small to read (the
  // MONTREE seal is fine engraved linework and a ring of 6pt-equivalent type —
  // at the round-3 40pt it does not resolve on a classroom printer). First cut
  // went 40 → 64 with a solid-colour backdrop plate for contrast; live
  // testing with a school's own uploaded (full-colour, non-square) logo
  // showed the plate read as an unwanted green background rather than a
  // feature — a custom logo already carries its own colour and identity, it
  // doesn't need one behind it — and the badge itself still wanted to be
  // bigger. Final: 40 → 96 (+56, ×2.4), no backdrop, badgeArt placed with its
  // own aspect ratio preserved (see drawTemplateB) so a non-square upload
  // doesn't get stretched the way a flat `badge×badge` box would force.
  //
  // The layout's own single-page-fit guarantee absorbs the extra chrome
  // automatically (computeTracingLayout) rather than by hand-trimming another
  // chrome line: chrome rises 124 → 180, so the flexible budget the trace
  // bands draw from shrinks from 434.0 to 378.0pt and the defensive down-scale
  // (previously idle — round 3 landed at 556.39 of a 558.0 ceiling, 1.61pt of
  // headroom) now engages at 0.8742×. Unlike the first (64pt) cut, this one
  // does dip both bands BELOW the round-2 baseline (name 150.83pt vs 162,
  // numbers 113.59pt vs 122 — about −6.9% each): a real cost, accepted
  // because it's what was explicitly asked for, badge size over glyph size.
  // Total height lands exactly on the MIN_SLACK=18 floor (558.0 of 576.0) —
  // by construction, since the down-scale solves for exactly that budget, not
  // a sign of anything cutting it close.
  B: {
    badge: 96,            // 128px emblem @96dpi — round 4, see above
    headerAfter: 6,       // 120 twips under the header band
    namePanelFrame: 9,    // 4 pad-top + 4 pad-bottom + 1 border
    numbersLabel: 16,     // 4 before + 11 line (9pt caps) + 1 after
    numbersPanelFrame: 9,
    gapNumbersPanel: 2,   // 40 twips between numbers trace + guide
    spacerBeforeTry: 4,   // 80 twips
    tryPanelFrame: 9,
    tryRow: 18,           // 11pt heading line, ruled line on the same row
    footer: 11,           // 3 before (60 twips) + 8pt line
  },
  C: {
    kicker: 12,           // 8pt tracked line + 2pt after (40 twips)
    title: 30,            // 22pt line (28) + rule + 1pt after (20 twips)
    classLine: 14,        // 3 before (60 twips) + 11pt line
    label: 27,            // 13 before (260 twips) + 10 line + 4 after (80)
    labels: 3,
    gapNameTrace: 1.5,    // 30 twips
    gapNameGuide: 2,      // 40 twips
    gapNumbersTrace: 1,   // 20 twips
    gapNumbersGuide: 2,   // 40 twips
    ruledLine: 21,        // 420 twips
    footer: 22,           // 15 before (300 twips) + 7pt line
  },
} as const;

export function chromeHeight(template: TracingTemplate): number {
  if (template === 'A') {
    // 96 + 6 + 9 + 16 + 9 + 2 + 4 + 9 + 18 + 11 = 180 — same formula as B,
    // field for field (see the CHROME.A comment above).
    const c = CHROME.A;
    return c.picture + c.headerAfter + c.namePanelFrame + c.numbersLabel
      + c.numbersPanelFrame + c.gapNumbersPanel
      + c.spacerBeforeTry + c.tryPanelFrame + c.tryRow + c.footer;
  }
  if (template === 'B') {
    // 96 + 6 + 9 + 16 + 9 + 2 + 4 + 9 + 18 + 11 = 180 (round 4 — see CHROME.B)
    const c = CHROME.B;
    return c.badge + c.headerAfter + c.namePanelFrame + c.numbersLabel
      + c.numbersPanelFrame + c.gapNumbersPanel
      + c.spacerBeforeTry + c.tryPanelFrame + c.tryRow + c.footer;
  }
  const c = CHROME.C;
  return c.kicker + c.title + c.classLine + c.label * c.labels
    + c.gapNameTrace + c.gapNameGuide + c.gapNumbersTrace + c.gapNumbersGuide
    + c.ruledLine + c.footer;
}

/**
 * How the name's model strip and its blank practice guide are arranged.
 *  • 'stacked'     — guide directly under the strip (portrait A and C). Costs
 *                    two band heights of page.
 *  • 'sideBySide'  — strip on the left, guide filling the rest of the row to
 *                    its right, both at the same height so their three ruled
 *                    lines run on unbroken (landscape B). Costs ONE band
 *                    height, which is what pays for B's bigger glyphs.
 */
type NameRowMode = 'stacked' | 'sideBySide';

/** Landscape B panel padding, shared by the layout maths and the drawing code. */
const B_PANEL_PAD_X = 13;
/** Gap between the name model strip and the blank guide beside it. */
const B_NAME_ROW_GAP = 16;
/** Usable width inside a landscape-B panel: 748.8 − 2×13 = 722.8. */
const B_PANEL_INNER_W = LANDSCAPE_METRICS.contentW - 2 * B_PANEL_PAD_X;

/**
 * Round-3 growth step for BOTH of landscape B's trace bands.
 *
 * The teacher's round-2 feedback was that the name and the numbers had grown by
 * different amounts (numbers +34.1%, name +15.7%) and that this round they
 * should "kick up ... by the same ratio". Expressing the two band heights as
 * one shared multiplier over the round-2 baselines is what makes that exact
 * rather than approximate: any pair of hand-rounded integers (173/130, say)
 * would differ in the third digit. Both x-heights therefore grow by exactly
 * B_BAND_GROWTH, and will keep doing so if it is ever changed again.
 *
 * 1.065 is the largest step the page can pay for — see GEOMETRY.B for where
 * the budget came from and why the ceiling is 1.0665.
 */
const B_ROUND2_NAME_BAND = 162;
const B_ROUND2_NUMBERS_BAND = 122;
const B_BAND_GROWTH = 1.065;

/**
 * Round-4 growth step for portrait Template C, the one template still sized
 * on its own terms.
 *
 * Same rule as B_BAND_GROWTH and for the same reason: the teacher asked for the
 * name and the numbers to grow "by the same ratio", so C's two band heights
 * are one shared multiplier over the values it shipped with, rather than two
 * hand-rounded integers that would differ in the third digit. C gets its own
 * multiplier because it is limited by something neither A nor B is — the
 * width of the page its 0–9 row is drawn across. See GEOMETRY.C for the audit.
 * (A used to have its own multiplier here too; now that it's landscape it
 * reuses B_ROUND2_NAME_BAND / B_ROUND2_NUMBERS_BAND / B_BAND_GROWTH directly
 * — see GEOMETRY.A.)
 *
 * C also silently *lost* ~7% when traceRender.ts widened its descender
 * budget (strip height 4.00 → 4.30 × size, so a fixed band height draws a
 * proportionally smaller glyph). The first 4.30/4.00 = 1.075 of the multiplier
 * below therefore only puts the glyphs back where they were before that fix;
 * everything above it is the real growth the teacher asked for.
 */
const C_BASE_NAME_BAND = 145;
const C_BASE_NUMBERS_BAND = 70;
const C_BAND_GROWTH = 1.135;

interface TemplateGeometry {
  /** x-height passed to renderTraceStrip for the child's name. */
  nameSize: number;
  /**
   * x-height passed to renderTraceStrip/renderBlankGuide for the 0–9 numbers
   * row. Optional — templates that omit it use the shared `NUMBERS_SIZE`.
   * Template B renders the row larger (see GEOMETRY.B): rendering the strip at
   * a size close to the one it is drawn at keeps the dotted stroke art crisp
   * and shrinks the strip's fixed pixel padding as a share of its width, so the
   * band height (not the width cap) is what limits the glyphs.
   */
  numbersSize?: number;
  /** display width cap for the name strip (and, when stacked, its guide). */
  nameMaxW: number;
  /** display width cap for the numbers strip/guide. */
  numbersMaxW: number;
  /** preferred displayed height of the name band. */
  nameBandH: number;
  /** preferred displayed height of the numbers band. */
  numbersBandH: number;
  /** images are centred (A, B) or flush-left (C), as in the mockups. */
  align: 'center' | 'left';
  /** name strip vs. blank guide arrangement; defaults to 'stacked'. */
  nameRow?: NameRowMode;
  /** `widthEm` for the name blank guide; defaults to `NAME_GUIDE_EM`. */
  nameGuideEm?: number;
  /** `widthEm` for the numbers blank guide; defaults to `NUMBERS_GUIDE_EM`. */
  numbersGuideEm?: number;
  /**
   * Letter-spacing for the 0–9 row; defaults to the shared `NUMBERS_TRACKING`.
   * This is a *width* knob, and on landscape B width is what caps how tall the
   * numbers band may grow — see GEOMETRY.B.
   */
  numbersTracking?: number;
}

export const GEOMETRY: Record<TracingTemplate, TemplateGeometry> = {
  // ---- Template A, landscape 792×612, 0.30in frame / 0.20in bottom -------
  // Same page, same CHROME budget (180), same GEOMETRY targets as B — see the
  // CHROME.A comment for why. A reuses B's constants directly (rather than a
  // copy that could quietly drift) so name/numbersBandH, the width caps, the
  // side-by-side name row and the tightened numbers tracking are byte-for-
  // byte what B's four rounds of live tuning arrived at: drawn name x-height
  // 35.08pt, numbers x-height 26.42pt, at the same 0.8742× defensive scale.
  // See the GEOMETRY.B comment immediately below for the full derivation.
  //
  // What's genuinely A-specific is the picture/logo slot, and it is sized as
  // a fixed CHROME.A.picture (96, same as B's badge) rather than as a
  // flexible budget item the way portrait A's picture box used to be: the
  // photo or fallback logo is placed with its own aspect ratio preserved
  // inside that fixed square, exactly like B's badge, so its size no longer
  // depends on — or competes with — the trace band budget above. See the
  // drawTemplateA docstring.
  A: {
    nameSize: 100, numbersSize: 100,
    nameMaxW: 470, numbersMaxW: B_PANEL_INNER_W,
    nameBandH: B_ROUND2_NAME_BAND * B_BAND_GROWTH,          // 172.53
    numbersBandH: B_ROUND2_NUMBERS_BAND * B_BAND_GROWTH,    // 129.93
    align: 'center', nameRow: 'sideBySide',
    nameGuideEm: 12, numbersGuideEm: 23, numbersTracking: 0.32,
  },
  // ---- Template B, landscape 792×612, 0.30in frame / 0.20in bottom -------
  // Printable box 748.8 × 576.0; chrome 124 (see CHROME.B); MIN_SLACK 18.
  // Flexible budget = 576.0 − 124 − 18 = 434.0pt, spent as
  //     1 × nameBandH  (strip and guide sit side by side)
  //   + 2 × numbersBandH
  //   = 172.53 + 2 × 129.93 = 432.39   ⇒ total 556.39, slack 19.61 ≥ 18  ✔
  //
  // Round 4 (see CHROME.B) spent that 19.61pt of headroom, and a lot more, on
  // a bigger badge: chrome is now 180, not 124, so computeTracingLayout's own
  // down-scale engages at 0.8742× and the two band heights below are TARGETS
  // fed into that scale, not what prints. Drawn: name 172.53 × 0.8742 =
  // 150.83pt (x-height 35.08pt), numbers 129.93 × 0.8742 = 113.59pt (x-height
  // 26.42pt) — both now BELOW the round-2 baseline (162 / 122, about −6.9%
  // each) this section derives GEOMETRY.B from. That's an explicit, accepted
  // trade-off (badge size over glyph size, on direct request), not an
  // oversight; the constants below are left exactly as round 3 set them —
  // only CHROME.B and the resulting scale changed.
  //
  // Every strip is 4.30 × its render `size` tall (traceRender.ts: 0.85 + 2 +
  // 0.3 + DESCENDER_EM 1.15), so displayed x-height = bandH / 4.30:
  //     name     172.53 / 4.30 = 40.123pt   was 162 / 4.30 = 37.674pt
  //     numbers  129.93 / 4.30 = 30.216pt   was 122 / 4.30 = 28.372pt
  // Both are exactly ×B_BAND_GROWTH = 1.065, i.e. +6.5% each, which is the
  // "same ratio for both" the teacher asked for after round 2 grew them by
  // different amounts. Digits span 2 em, so a traced digit is now 60.43pt ≈
  // 0.84in tall (was 56.74pt / 0.79in).
  //
  // Why only +6.5% when round 2 managed +34%/+16%: the flexible spend is 406pt
  // of a 568.8pt page, so growing it needs ~4.06pt of new budget per 1% and
  // there was 1.8pt spare. Round 3 found 26.2pt, all of it audited:
  //     +19.0  chrome 143 → 124  (see CHROME.B — every remaining item was
  //            re-costed; three of them had nothing left to give and were
  //            left alone, which is why this is 19pt and not another 47pt)
  //     + 7.2  bottom margin 0.30in → 0.20in (see LANDSCAPE_MARGIN_BOTTOM —
  //            the bottom edge was the one place still paying twice for the
  //            same clearance, because MIN_SLACK sits under the content)
  //   ⇒ budget 407.8 → 434.0, so the growth ceiling is 434.0 / 406 = 1.0665.
  // 1.065 is taken and the remaining 0.15% (1.61pt) is left as headroom above
  // MIN_SLACK, matching the 1.8pt round 2 left. The honest summary is that the
  // structure is now close to tapped out: a further +10% would need another
  // 42pt, and nothing of that size is left that does not cost legibility.
  //
  // Width checks against the 722.8pt panel interior (748.8 − 2 × 13):
  //   • The numbers row is the one place where width, not height, bites. The
  //     '0 1 … 9' strip is (1696 + 1900 t + 36) / 430 wide-to-tall at tracking
  //     t (16.96 em of glyph+space advance, 19 gaps, 36px of fixed pad). At
  //     round 2's t = 0.38 that is 5.707 : 1, capping the band at 722.8 / 5.707
  //     = 126.65pt — BELOW the 129.93 this round wants, so `bandHeight()` would
  //     have silently width-capped the numbers to x-height 29.45 and broken the
  //     equal-ratio ask (name +6.5%, numbers +3.8%). `numbersTracking` 0.32
  //     fixes it at the source: (1696 + 608 + 36) / 430 = 5.4419 : 1, so the
  //     129.93pt band draws 707.05pt and the cap moves out to 722.8 / 5.4419 =
  //     132.82pt. The row stays height-limited (129.93 < 132.82) with 15.75pt
  //     of width to spare, and the gap between two digits is 0.62 (space glyph)
  //     + 2 × 0.32 = 1.26 em, still wider than a digit's own 1.16 em.
  //   • `numbersGuideEm` 24 → 23. At 24 the guide's natural width at a 129.93pt
  //     band would be 24 / 4.30 × 129.93 = 725.2pt, past `numbersMaxW` 722.8 —
  //     so it would be capped at 722.8 and drawn 15.75pt wider than the model
  //     row above it, overhanging it at both ends. At 23 the natural width is
  //     694.95pt and `guideBox()` stretches it to exactly the model's 707.05pt
  //     (×1.017), so the practice line ends flush with the digits it copies.
  //   • The name strip is ~1.82 : 1 for a 6-letter name, 314.6pt at 172.53pt
  //     tall, leaving 722.8 − 314.6 − 16 = 392.2pt of blank practice line
  //     beside it. `nameMaxW` 470 caps how much of the row a very long name may
  //     eat, guaranteeing the guide never drops below 722.8 − 470 − 16 = 236.8.
  //   • `nameGuideEm` stays 12: natural width at a 172.53pt band is
  //     12 / 4.30 × 172.53 = 481.5pt, and the guide is actually drawn at
  //     367–555pt across the roster's 3–6 letter names (Hayden 367.4, Segina
  //     392.2, Joey 485.3, Kai 555.1), so 481.5 still sits inside that bracket
  //     and the dash density stays within ±25% of natural either way.
  B: {
    nameSize: 100, numbersSize: 100,
    nameMaxW: 470, numbersMaxW: B_PANEL_INNER_W,
    nameBandH: B_ROUND2_NAME_BAND * B_BAND_GROWTH,          // 172.53
    numbersBandH: B_ROUND2_NUMBERS_BAND * B_BAND_GROWTH,    // 129.93
    align: 'center', nameRow: 'sideBySide',
    nameGuideEm: 12, numbersGuideEm: 23, numbersTracking: 0.32,
  },
  // ---- Template C, portrait 612×792, 0.65in/0.55in frame -----------------
  // Printable box 518.4 × 712.8; chrome 186.5 (unchanged); MIN_SLACK 18.
  //     2 × nameBandH + 2 × numbersBandH = 2 × 164.575 + 2 × 79.45 = 488.05
  //   ⇒ total 674.55, slack 38.25.
  // Displayed x-height = bandH / 4.30 (traceRender.ts):
  //     name     164.575 / 4.30 = 38.273pt   was 145 / 4.30 = 33.721pt
  //     numbers   79.450 / 4.30 = 18.477pt   was  70 / 4.30 = 16.279pt
  // Both are exactly ×C_BAND_GROWTH = 1.135 (1.075 of it the descender-fix
  // refund, 1.056 new growth).
  //
  // C is the one template where WIDTH, not vertical budget, sets the ceiling —
  // the opposite of Template A, and the reason its chrome is untouched:
  //   • The 0–9 strip is 6.494 : 1 at the shared NUMBERS_TRACKING 0.55, so a
  //     79.45pt band draws 515.95pt. The page's whole content width is 518.4,
  //     so the hard ceiling on the numbers band is 518.4 / 6.494 = 79.83pt =
  //     ×1.1403 — and this round takes ×1.135, 99.5% of it, leaving 2.45pt of
  //     width in hand. `numbersMaxW` is therefore raised from 680px (510pt) to
  //     CONTENT_W: at 510 the row would have width-capped at 78.5pt and grown
  //     only ×1.121 while the name grew ×1.135, breaking the equal-ratio ask.
  //     Full-width is also the right *look* here — C's "now you try" rule and
  //     its title rule already run the full content width, so the digits now
  //     line up with them instead of stopping 64pt short.
  //   • That ceiling is why 38.25pt of slack (20.25 above MIN_SLACK) is left on
  //     the sheet and why trimming C's chrome would buy nothing: there is
  //     vertical budget for ×1.182, but no page left to draw it across. The only
  //     way past it is to tighten NUMBERS_TRACKING the way landscape B had to
  //     (0.55 → 0.32). B needed that to hit its target at all; C would gain
  //     1.8% of glyph for a permanently tighter 0–9 row, so the shared 0.55 is
  //     kept and the 1.8% is left on the table. Revisit only if the teacher
  //     asks for C's digits specifically.
  //   • name row — unaffected: the blank guide (8.5 em, 1.9767 : 1) caps the
  //     band at 420 / 1.9767 = 212.5pt, 29% above the 164.575 taken, and the
  //     model strip only reaches `nameMaxW` above an aspect of 2.55 (~8+
  //     letters), which width-caps by design and leaves more slack, not less.
  C: {
    nameSize: 110, nameMaxW: 560 * PX_TO_PT, numbersMaxW: CONTENT_W,
    nameBandH: C_BASE_NAME_BAND * C_BAND_GROWTH,          // 164.575
    numbersBandH: C_BASE_NUMBERS_BAND * C_BAND_GROWTH,    // 79.45
    align: 'left',
  },
};

/** The blank-guide `widthEm` the name guide is rendered at for `template`. */
export function nameGuideEmFor(template: TracingTemplate): number {
  return GEOMETRY[template].nameGuideEm ?? NAME_GUIDE_EM;
}

/**
 * Numbers row copy/tracking is identical on every template (see
 * docxTemplates.ts). '0' leads the row because kindergarten number formation
 * is taught 0–9, and the row is the child's first exposure to writing zero.
 */
export const NUMBERS_TEXT = '0 1 2 3 4 5 6 7 8 9';
/** Default numbers x-height; `GEOMETRY.<t>.numbersSize` overrides it per template. */
export const NUMBERS_SIZE = 70;
export const NUMBERS_TRACKING = 0.55;
export const NAME_GUIDE_EM = 8.5;
export const NUMBERS_GUIDE_EM = 15;

/** The x-height the numbers row is rendered at for `template`. */
export function numbersSizeFor(template: TracingTemplate): number {
  return GEOMETRY[template].numbersSize ?? NUMBERS_SIZE;
}

/** The blank-guide `widthEm` the numbers guide is rendered at for `template`. */
export function numbersGuideEmFor(template: TracingTemplate): number {
  return GEOMETRY[template].numbersGuideEm ?? NUMBERS_GUIDE_EM;
}

/** The letter-spacing the numbers row is rendered at for `template`. */
export function numbersTrackingFor(template: TracingTemplate): number {
  return GEOMETRY[template].numbersTracking ?? NUMBERS_TRACKING;
}

// --------------------------------------------------------------- layout ---
export interface ImageDims { width: number; height: number }
export interface Box { w: number; h: number }

export interface TracingLayoutInput {
  template: TracingTemplate;
  /** natural dims from renderTraceStrip(childName, { size: nameSize }) */
  nameTrace: ImageDims;
  /** natural dims from renderBlankGuide({ size: nameSize, widthEm: nameGuideEmFor(t) }) */
  nameGuide: ImageDims;
  /** natural dims from renderTraceStrip('0 1 …9', { size: numbersSizeFor(t), tracking: numbersTrackingFor(t) }) */
  numbersTrace: ImageDims;
  /** natural dims from renderBlankGuide({ size: numbersSizeFor(t), widthEm: numbersGuideEmFor(t) }) */
  numbersGuide: ImageDims;
}

export interface TracingLayout {
  template: TracingTemplate;
  chrome: number;
  nameTraceBox: Box;
  nameGuideBox: Box;
  numbersTraceBox: Box;
  numbersGuideBox: Box;
  /** defensive down-scale that had to be applied (1 = none needed). */
  scale: number;
  /** projected top-to-bottom height of everything on the page. */
  totalHeight: number;
  /** the page box this layout was solved against (portrait A/C, landscape B). */
  page: PageMetrics;
  /** page.availH - totalHeight; the guarantee is that this stays >= MIN_SLACK. */
  slack: number;
  fits: boolean;
}

/**
 * Pure layout maths — no DOM, no jsPDF. Given the *natural* pixel dimensions
 * of the four rendered trace images, work out the exact drawn box for each so
 * the whole worksheet fits on one page with at least MIN_SLACK to spare.
 *
 * Two rules make this correct rather than merely small:
 *  1. A trace strip and its blank practice guide are scaled to the *same*
 *     displayed height. Both are rendered at the same `size`, and both are
 *     exactly `4.30 × size` tall (traceRender.ts: base = 0.85+2+0.3 em, height
 *     = base + DESCENDER_EM = base + 1.15 em), so equal displayed height ⇒
 *     identical rule spacing. Nothing here hardcodes that ratio — every box is
 *     derived from the real rendered dims — so it is safe for traceRender.ts to
 *     change it, as it did when the 'g' descender turned out to need 1.15 em
 *     rather than 0.85 em of room below the baseline.
 *  2. The guide is a strip of purely horizontal rules, so widening it does not
 *     disturb that spacing. It is therefore stretched (never squeezed) out to
 *     at least the width of the strip it partners, capped at the template's
 *     max width — the practice line is never narrower than the model.
 *
 * Orientation is folded into the same machinery rather than bolted beside it:
 * the page box comes from `pageMetrics(template)` (landscape for B), and a
 * `nameRow: 'sideBySide'` template charges the name band to the page once
 * instead of twice because its guide sits next to the strip, not under it. The
 * defensive down-scale and the MIN_SLACK guarantee are unchanged and still the
 * only thing standing between a very long name and a second page.
 */
export function computeTracingLayout(input: TracingLayoutInput): TracingLayout {
  const { template } = input;
  const geo = GEOMETRY[template];
  const chrome = chromeHeight(template);
  const page = pageMetrics(template);
  const sideBySide = geo.nameRow === 'sideBySide';

  const bandHeight = (targetH: number, maxW: number, trace: ImageDims, guide: ImageDims | null) =>
    Math.min(
      targetH,
      (maxW * trace.height) / trace.width,   // strip must fit the width cap
      // guide never has to be squeezed — except in a side-by-side name row,
      // where the guide is a filler sized to whatever the strip leaves and so
      // must not be allowed to hold the band's height down.
      guide ? (maxW * guide.height) / guide.width : Infinity,
    );

  let nameH = bandHeight(geo.nameBandH, geo.nameMaxW, input.nameTrace, sideBySide ? null : input.nameGuide);
  let numbersH = bandHeight(geo.numbersBandH, geo.numbersMaxW, input.numbersTrace, input.numbersGuide);

  // ---- single-page-fit guarantee -----------------------------------------
  // Everything flexible scales together so the art stays visually coherent.
  // A side-by-side name row occupies one band height on the page, not two.
  // Template A's picture/logo slot is NOT part of this — like B's badge, it's
  // a fixed CHROME.A.picture square (see the CHROME.A comment), so it never
  // competes with the trace bands for budget.
  const nameRows = sideBySide ? 1 : 2;
  let scale = 1;
  const flexible = () => nameRows * nameH + 2 * numbersH;
  const projected = chrome + flexible();
  if (projected > page.availH - MIN_SLACK) {
    const budget = page.availH - MIN_SLACK - chrome;
    scale = Math.max(MIN_TRACE_SCALE, Math.min(1, budget / flexible()));
    nameH *= scale;
    numbersH *= scale;
  }

  const strip = (h: number, img: ImageDims): Box => ({ w: (img.width * h) / img.height, h });
  const guideBox = (h: number, img: ImageDims, partnerW: number, maxW: number): Box => ({
    w: Math.min(maxW, Math.max((img.width * h) / img.height, partnerW)),
    h,
  });

  const nameTraceBox = strip(nameH, input.nameTrace);
  // Side by side, the guide is not scaled to its own aspect at all: it takes
  // every point the model strip leaves in the panel row, so the child's blank
  // practice line always runs out to the right edge of the panel.
  const nameGuideBox: Box = sideBySide
    ? { w: B_PANEL_INNER_W - nameTraceBox.w - B_NAME_ROW_GAP, h: nameH }
    : guideBox(nameH, input.nameGuide, nameTraceBox.w, geo.nameMaxW);
  const numbersTraceBox = strip(numbersH, input.numbersTrace);
  const numbersGuideBox = guideBox(numbersH, input.numbersGuide, numbersTraceBox.w, geo.numbersMaxW);

  const totalHeight = chrome + nameRows * nameH + 2 * numbersH;
  const slack = page.availH - totalHeight;

  return {
    template,
    chrome,
    nameTraceBox,
    nameGuideBox,
    numbersTraceBox,
    numbersGuideBox,
    scale,
    totalHeight,
    page,
    slack,
    fits: slack >= MIN_SLACK - 1e-6,
  };
}

// ----------------------------------------------------------- draw utils ---
type Align = 'left' | 'center' | 'right';

interface TextOpts {
  size: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  charSpace?: number;
  align?: Align;
  font?: string;
}

/** Measured width including jsPDF's per-character tracking. */
function measure(doc: jsPDF, text: string, o: TextOpts): number {
  doc.setFont(o.font ?? FONT_BODY, o.bold ? (o.italic ? 'bolditalic' : 'bold') : (o.italic ? 'italic' : 'normal'));
  doc.setFontSize(o.size);
  const cs = o.charSpace ?? 0;
  return doc.getTextWidth(text) + cs * Math.max(0, text.length - 1);
}

/** Draw `text` with its cap-line at `yTop` (cursor semantics, not baselines). */
function drawText(doc: jsPDF, text: string, x: number, yTop: number, o: TextOpts) {
  const w = measure(doc, text, o);
  doc.setTextColor(o.color ?? INK);
  let dx = x;
  if (o.align === 'center') dx = x - w / 2;
  else if (o.align === 'right') dx = x - w;
  doc.text(text, dx, yTop + o.size * 0.8, { charSpace: o.charSpace ?? 0, baseline: 'alphabetic' });
}

function hline(doc: jsPDF, x0: number, x1: number, y: number, color: string, width: number) {
  doc.setDrawColor(color);
  doc.setLineWidth(width);
  doc.line(x0, y, x1, y);
}

/**
 * docx `sectionLabel()` — tracked 9pt caps.
 *
 * `before` is a parameter because the lead has to match whatever CHROME.<t>
 * budgeted or the label drifts off its own row. Both landscape A and B now
 * charge this block 16pt (4 + 11 + 1); the 9pt default is what the original
 * docx port used and is kept only so a caller that has no opinion still gets
 * the docx spacing.
 */
function sectionLabel(doc: jsPDF, text: string, x: number, y: number, color = INK, before = 9): number {
  drawText(doc, text.toUpperCase(), x, y + before, { size: 9, bold: true, color, charSpace: 0.8, font: FONT_LABEL });
  return 16; // landscape A/B's shared label block height (callers ignore it)
}

function alignedX(align: 'center' | 'left', boxW: number, contentW: number, marginX: number): number {
  return align === 'center' ? marginX + (contentW - boxW) / 2 : marginX;
}

// ------------------------------------------------------------- images -----
function sniffFormat(bytes: ArrayBuffer): 'JPEG' | 'PNG' {
  const b = new Uint8Array(bytes);
  return b[0] === 0xff && b[1] === 0xd8 ? 'JPEG' : 'PNG';
}

function bytesToDataUrl(bytes: ArrayBuffer): Promise<string> {
  const mime = sniffFormat(bytes) === 'JPEG' ? 'image/jpeg' : 'image/png';
  return blobToDataUrl(new Blob([bytes], { type: mime }));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error ?? new Error('FileReader failed'));
    fr.readAsDataURL(blob);
  });
}

async function imgDims(bytes: ArrayBuffer): Promise<ImageDims> {
  const bmp = await createImageBitmap(new Blob([bytes]));
  const dims = { width: bmp.width, height: bmp.height };
  bmp.close();
  return dims;
}

interface Art { dataUrl: string; format: 'PNG' | 'JPEG'; dims: ImageDims }

async function artFromBytes(bytes: ArrayBuffer): Promise<Art> {
  const [dataUrl, dims] = await Promise.all([bytesToDataUrl(bytes), imgDims(bytes)]);
  return { dataUrl, format: sniffFormat(bytes), dims };
}

function place(doc: jsPDF, art: Art, x: number, y: number, w: number, h: number) {
  doc.addImage(art.dataUrl, art.format, x, y, w, h, undefined, 'FAST');
}

/**
 * Watermark, drawn before anything else so the sheet prints over it — the PDF
 * equivalent of docx's `behindDocument: true` floating image.
 *
 * `rotationDeg` is counter-clockwise (docx's 325° clockwise == 35° CCW) and
 * the image is positioned so its *centre* lands on (cx, cy) after rotating,
 * because jsPDF rotates an image about its bottom-left corner.
 *
 * Templates A and C only. Template B deliberately has no watermark: the faded
 * grey emblem prints badly on the classroom printer and the bottom-right one
 * read as a cut-off image on a printed sheet.
 */
function watermark(doc: jsPDF, art: Art, opts: {
  w: number; h: number; cx: number; cy: number; pageH: number; rotationDeg?: number; opacity?: number;
}) {
  const { w, h, cx, cy, pageH, rotationDeg = 0, opacity = 1 } = opts;
  doc.saveGraphicsState();
  if (opacity < 1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.setGState(new (doc as any).GState({ opacity }));
  }
  if (!rotationDeg) {
    place(doc, art, cx - w / 2, cy - h / 2, w, h);
  } else {
    const t = (rotationDeg * Math.PI) / 180;
    const c = Math.cos(t), s = Math.sin(t);
    // pivot (bottom-left corner) in PDF y-up space
    const px = cx - (c * (w / 2) - s * (h / 2));
    const pyUp = (pageH - cy) - (s * (w / 2) + c * (h / 2));
    doc.addImage(art.dataUrl, art.format, px, pageH - pyUp - h, w, h, undefined, 'FAST', rotationDeg);
  }
  doc.restoreGraphicsState();
}

// ------------------------------------------------------------- builder ---
export interface TracingPdfOptions {
  template: TracingTemplate;
  childName: string;
  className?: string;                 // e.g. "Whale Class" — header/subtitle
  // A school's own name, shown wherever "Montree Phonics" branding used to be
  // hardcoded (header kicker on A/B, the quiet kicker on C, all three
  // footers). Optional and blank by default: an empty schoolName removes that
  // text entirely rather than falling back to "Montree Phonics" — the sheet
  // is meant to carry the school's own identity, not ours, once they've told
  // us what it is.
  schoolName?: string;
  logoBytes?: ArrayBuffer | null;     // replaces the default whale emblem everywhere
  pictureBytes?: ArrayBuffer | null;  // Template A's picture-box photo (optional)
  defaultLogoBytes: ArrayBuffer;      // fallback whale emblem (badge, opaque)
  defaultWatermarkBytes: ArrayBuffer; // fallback whale emblem (faded, for watermark use)
}

/**
 * Per-run memo so a whole-class batch decodes each shared asset once instead of
 * once per child. The numbers strip, both blank guides, the badge and the
 * watermark are byte-identical on every page of a batch; only the name strip
 * actually differs. Optional — a single-child build passes no cache.
 */
export interface TracingRenderCache {
  /** keyed by the ArrayBuffer identity of the source bytes */
  bytes: Map<ArrayBuffer, Promise<Art>>;
  /** keyed by the render parameters of the strip */
  strips: Map<string, Promise<Art>>;
}

export function createTracingRenderCache(): TracingRenderCache {
  return { bytes: new Map(), strips: new Map() };
}

function memoArt<K>(map: Map<K, Promise<Art>> | undefined, key: K, make: () => Promise<Art>): Promise<Art> {
  if (!map) return make();
  const hit = map.get(key);
  if (hit) return hit;
  const made = make();
  map.set(key, made);
  return made;
}

async function stripArt(result: StripResult): Promise<Art> {
  return {
    dataUrl: await blobToDataUrl(result.blob),
    format: 'PNG',
    dims: { width: result.width, height: result.height },
  };
}

/**
 * jsPDF fixes page 1's orientation at construction time, so a document always
 * has to be *born* in the orientation its first page needs; every later page
 * picks its own via `addPage('letter', orientation)`.
 */
function newTracingDoc(orientation: PageOrientation): jsPDF {
  return new jsPDF({ orientation, unit: 'pt', format: 'letter' });
}

/**
 * Draw one child's worksheet onto the *current* page of `doc`.
 *
 * This is the whole per-child routine, deliberately split out of
 * `buildTracingPdf` so the batch builder can run it against successive pages of
 * a single document. It never calls `addPage()` itself — one call, one page.
 */
export async function drawTracingPage(
  doc: jsPDF,
  opts: TracingPdfOptions,
  cache?: TracingRenderCache,
): Promise<void> {
  const {
    template, childName, className = 'Whale Class', schoolName = '',
    logoBytes, pictureBytes, defaultLogoBytes, defaultWatermarkBytes,
  } = opts;

  const geo = GEOMETRY[template];
  const name = childName.trim() || 'Name';
  // All four are per-template (landscape B renders the numbers row larger and
  // more tightly tracked, and both of its blank guides wider), so all four have
  // to be part of the cache keys — a mixed-template batch shares one cache and
  // must never hand a page the other template's differently-proportioned strip.
  const numbersSize = numbersSizeFor(template);
  const nameGuideEm = nameGuideEmFor(template);
  const numbersGuideEm = numbersGuideEmFor(template);
  const numbersTracking = numbersTrackingFor(template);

  // A page drawn at the wrong orientation would silently produce a worksheet
  // that runs off the sheet, so fail loudly instead. Both public builders set
  // this correctly; only a direct `drawTracingPage()` caller can get it wrong.
  const expected = pageMetrics(template);
  const actualW = doc.internal.pageSize.getWidth();
  if (Math.abs(actualW - expected.w) > 1) {
    throw new Error(
      `drawTracingPage: template ${template} needs a ${expected.orientation} page `
      + `(${expected.w}×${expected.h}pt) but the current page is ${Math.round(actualW)}pt wide`,
    );
  }

  const [nameTraceArt, nameGuideArt, numbersTraceArt, numbersGuideArt] = await Promise.all([
    memoArt(cache?.strips, `trace|${geo.nameSize}|${name}`,
      async () => stripArt(await renderTraceStrip(name, { size: geo.nameSize }))),
    memoArt(cache?.strips, `guide|${geo.nameSize}|${nameGuideEm}`,
      async () => stripArt(await renderBlankGuide({ size: geo.nameSize, widthEm: nameGuideEm }))),
    memoArt(cache?.strips, `trace|${numbersSize}|${numbersTracking}|${NUMBERS_TEXT}`,
      async () => stripArt(await renderTraceStrip(NUMBERS_TEXT, { size: numbersSize, tracking: numbersTracking }))),
    memoArt(cache?.strips, `guide|${numbersSize}|${numbersGuideEm}`,
      async () => stripArt(await renderBlankGuide({ size: numbersSize, widthEm: numbersGuideEm }))),
  ]);

  const badgeBytes = logoBytes ?? defaultLogoBytes;
  const watermarkBytes = logoBytes ?? defaultWatermarkBytes;
  const badgeArt = await memoArt(cache?.bytes, badgeBytes, () => artFromBytes(badgeBytes));
  const watermarkArt = await memoArt(cache?.bytes, watermarkBytes, () => artFromBytes(watermarkBytes));
  // The shipped watermark asset is already faded; a teacher's own logo is not,
  // so it gets knocked back here instead of swamping the worksheet.
  const watermarkOpacity = logoBytes ? 0.1 : 1;
  const pictureArt = template === 'A' && pictureBytes
    ? await memoArt(cache?.bytes, pictureBytes, () => artFromBytes(pictureBytes))
    : null;

  const layout = computeTracingLayout({
    template,
    nameTrace: nameTraceArt.dims,
    nameGuide: nameGuideArt.dims,
    numbersTrace: numbersTraceArt.dims,
    numbersGuide: numbersGuideArt.dims,
  });

  const ctx = {
    doc, layout, className, schoolName: schoolName.trim(), name, badgeArt, watermarkArt, watermarkOpacity, pictureArt,
    nameTraceArt, nameGuideArt, numbersTraceArt, numbersGuideArt,
  };
  if (template === 'A') drawTemplateA(ctx);
  else if (template === 'B') drawTemplateB(ctx);
  else drawTemplateC(ctx);
}

/** One child, one page — portrait for A and C, landscape for B. */
export async function buildTracingPdf(opts: TracingPdfOptions): Promise<Blob> {
  const doc = newTracingDoc(orientationFor(opts.template));
  await drawTracingPage(doc, opts);
  return doc.output('blob');
}

/**
 * A whole class as ONE merged PDF — page 1 is the first child, page 2 the
 * second, and so on, in the order given. Teachers print this as a single job.
 *
 * Orientation is per page, not per document: the doc is constructed in the
 * orientation the *first* item needs (jsPDF has no way to re-orient page 1
 * afterwards) and every subsequent page states its own. A batch that mixes
 * landscape B sheets with portrait A/C sheets therefore comes out as one file
 * with interleaved page orientations, which is what every PDF viewer and
 * printer expects — the "one merged print job, never a zip" constraint holds.
 */
export async function buildTracingPdfBatch(items: TracingPdfOptions[]): Promise<Blob> {
  if (items.length === 0) throw new Error('buildTracingPdfBatch: at least one child is required');
  const doc = newTracingDoc(orientationFor(items[0].template));
  const cache = createTracingRenderCache();
  for (let i = 0; i < items.length; i++) {
    if (i > 0) doc.addPage('letter', orientationFor(items[i].template));
    await drawTracingPage(doc, items[i], cache);
  }
  return doc.output('blob');
}

interface DrawCtx {
  doc: jsPDF;
  layout: TracingLayout;
  className: string;
  schoolName: string;
  name: string;
  badgeArt: Art;
  watermarkArt: Art;
  watermarkOpacity: number;
  pictureArt: Art | null;
  nameTraceArt: Art;
  nameGuideArt: Art;
  numbersTraceArt: Art;
  numbersGuideArt: Art;
}

/** Shared: the four trace images + their labels, drawn from `y` downwards. */
function drawTraceBlocks(ctx: DrawCtx, y: number, opts: {
  align: 'center' | 'left';
  labels: [string, string];
  labelColors?: [string, string];
  gaps: [number, number, number, number];
  labelHeight: number;
  /** lead above the label's cap-line; MUST equal the `before` half of `labelHeight`. */
  labelBefore?: number;
  drawLabel?: (text: string, y: number, color: string) => void;
}): number {
  const { doc, layout } = ctx;
  const { align, labels, gaps, labelHeight, labelBefore } = opts;
  const [c1, c2] = opts.labelColors ?? [INK, INK];
  // C is the only remaining caller, portrait.
  const { contentW, marginX } = layout.page;
  const label = opts.drawLabel ?? ((text: string, ly: number, color: string) => { sectionLabel(doc, text, marginX, ly, color, labelBefore); });

  label(labels[0], y, c1);
  y += labelHeight;
  place(doc, ctx.nameTraceArt, alignedX(align, layout.nameTraceBox.w, contentW, marginX), y, layout.nameTraceBox.w, layout.nameTraceBox.h);
  y += layout.nameTraceBox.h + gaps[0];
  place(doc, ctx.nameGuideArt, alignedX(align, layout.nameGuideBox.w, contentW, marginX), y, layout.nameGuideBox.w, layout.nameGuideBox.h);
  y += layout.nameGuideBox.h + gaps[1];

  label(labels[1], y, c2);
  y += labelHeight;
  place(doc, ctx.numbersTraceArt, alignedX(align, layout.numbersTraceBox.w, contentW, marginX), y, layout.numbersTraceBox.w, layout.numbersTraceBox.h);
  y += layout.numbersTraceBox.h + gaps[2];
  place(doc, ctx.numbersGuideArt, alignedX(align, layout.numbersGuideBox.w, contentW, marginX), y, layout.numbersGuideBox.w, layout.numbersGuideBox.h);
  y += layout.numbersGuideBox.h + gaps[3];

  return y;
}

// ---- Template A — Classic Montree (LANDSCAPE) ----
/**
 * 792 × 612, same 0.30in/0.30in/0.20in frame as B (LANDSCAPE_METRICS). A
 * moved here from portrait so its trace glyphs could grow to match B's:
 * portrait A's picture band, header row and title were three separately
 * stacked pieces on a 712.8pt page, and that page had no chrome left to cut
 * (the old CHROME.A audit already took every point adjacent to a trace
 * strip). Landscape doesn't just add width — it removes the reason A needed
 * its own budget at all, by borrowing B's structure directly:
 *
 *  L_MARGIN_Y 21.6 ┌───────────────────────────────────────────────────────┐
 *    picture   96  │ [ photo/logo ]  [SCHOOL NAME ·] NAME TRACING · CLASS  │
 *                  │                 My Name Is…                          │
 *   +after      6  │                                                       │
 *  name frame 159.8│ ┌ ink hairline ──────────────────────────────────────┐│
 *   (9+150.8)      │ │  [ name model ]  [ blank practice line ]           ││
 *                  │ └──────────────────────────────────────────────────┘  │
 *     label     16 │ NUMBERS 0–9                                           │
 *  num frame  238.2│ ┌ ink hairline ──────────────────────────────────────┐│
 *  (9+2·113.6+2)   │ │            0 1 2 3 4 5 6 7 8 9  (model)            ││
 *                  │ │            ─────────────────── (practice)          ││
 *                  │ └──────────────────────────────────────────────────┘  │
 *    spacer      4 │                                                       │
 *  now-you-try  27 │ NOW YOU TRY!  ─────────────────────────────────────    │
 *    footer     11 │       Whale Class [· School Name]                     │
 *  slack 18 (MIN)  └───────────────────────────────────────────────────────┘
 *  L_MARGIN_BOT 14.4
 *
 * 96 + 6 + 159.83 + 16 + 238.17 + 4 + 27 + 11 = 558.0 of 576.0 printable —
 * identical to B's total, because CHROME.A and GEOMETRY.A are now field-for-
 * field the same as B's (see those comments). "The text the right size" is
 * B's four rounds of live tuning; A reuses that answer exactly rather than
 * re-deriving a second, slightly different one.
 *
 * Three compressions make the landscape page fit, borrowed straight from B:
 * the picture/logo sits beside the kicker+title lockup instead of above it
 * (was header row + rule + title, three stacked pieces); the name row is the
 * model strip and its blank practice line side by side on one row instead of
 * stacked on two; and "now you try" runs its heading beside the rule instead
 * of above it.
 *
 * Where A deliberately does NOT copy B, on purpose: style, not size. A stays
 * the plain, uncoloured "Classic Montree" sheet — thin ink hairline frames,
 * no teal/gold fills, a generic "My Name Is…" instead of a personalised
 * title — so the two templates still read as different products, not just
 * different orientations of the same one.
 *
 * The picture slot shows the teacher's uploaded batch photo if one is set,
 * else the school's logo (the same badgeArt B's header uses) — the same
 * fallback rule Template A always had, just moved into the header row. It is
 * placed with its own aspect ratio preserved and centred in the
 * picture×picture box (see `picFit` below), never stretched: the same fix
 * applied to B's badge, and for the same reason — a class photo or a
 * non-square logo upload would otherwise be forced into a square and
 * visibly distorted. There is no colour backdrop behind it either, for the
 * same round-4 reason B's badge lost its plate: against real artwork (not
 * just a flat seal) a solid-colour backing reads as an unwanted background,
 * not a feature.
 */
function drawTemplateA(ctx: DrawCtx) {
  const { doc, layout, className, schoolName } = ctx;
  const c = CHROME.A;
  const { contentW, marginX, marginY } = layout.page;
  const centre = marginX + contentW / 2;
  // Must equal the pad half of CHROME.A's *PanelFrame entries (4 + 4 + 1 = 9).
  const PANEL_PAD_Y = 4;

  let y = marginY;

  // The faded emblem is still the "Classic Montree" look; only B (a full-
  // bleed colour sheet) dropped its watermark.
  watermark(doc, ctx.watermarkArt, {
    w: 700 * PX_TO_PT, h: 490 * PX_TO_PT, cx: layout.page.w / 2, cy: layout.page.h / 2, pageH: layout.page.h,
    rotationDeg: 35, opacity: ctx.watermarkOpacity,
  });

  // ---- header row: picture/logo beside the kicker/title, group centred ---
  const picture = c.picture;
  // No hardcoded "MONTREE PHONICS" — the school's own name if they've given
  // us one, otherwise just "NAME TRACING · {CLASS}"; a long combination
  // simply widens the centred header group symmetrically, never clips (see
  // the equivalent note in drawTemplateB).
  const kicker = schoolName
    ? `${schoolName.toUpperCase()} · NAME TRACING · ${className.toUpperCase()}`
    : `NAME TRACING · ${className.toUpperCase()}`;
  const title = 'My Name Is…';
  const kickerOpts = { size: 8, bold: true, color: INK, charSpace: 1, font: FONT_LABEL } as const;
  const titleOpts = { size: 17, bold: true, color: INK, font: FONT_LABEL } as const;
  const textW = Math.max(measure(doc, kicker, kickerOpts), measure(doc, title, titleOpts));
  const headGap = 16;
  const headX = centre - (picture + headGap + textW) / 2;

  // Aspect-safe contain placement, no backdrop — see the docstring above.
  const picArt = ctx.pictureArt ?? ctx.badgeArt;
  const pd = picArt.dims;
  const picFit = Math.min(picture / pd.width, picture / pd.height);
  const picW = pd.width * picFit;
  const picH = pd.height * picFit;
  const picX = headX + (picture - picW) / 2;
  const picY = y + (picture - picH) / 2;
  place(doc, picArt, picX, picY, picW, picH);

  // kicker (11pt line) + 1pt + title (22pt line) = 34pt, optically centred on
  // the picture — same lockup maths as drawTemplateB.
  const textTop = y + (picture - 34) / 2;
  drawText(doc, kicker, headX + picture + headGap, textTop, kickerOpts);
  drawText(doc, title, headX + picture + headGap, textTop + 12, titleOpts);
  y += picture + c.headerAfter;

  const frame = (top: number, h: number) => {
    doc.setDrawColor(INK);
    doc.setLineWidth(0.75);
    doc.rect(marginX, top, contentW, h, 'S');
  };

  // ---- name frame: model strip | blank practice line, side by side -------
  const namePanelH = c.namePanelFrame + layout.nameTraceBox.h;
  frame(y, namePanelH);
  const nameY = y + PANEL_PAD_Y;
  const nameX = marginX + B_PANEL_PAD_X;
  place(doc, ctx.nameTraceArt, nameX, nameY, layout.nameTraceBox.w, layout.nameTraceBox.h);
  place(doc, ctx.nameGuideArt, nameX + layout.nameTraceBox.w + B_NAME_ROW_GAP, nameY,
    layout.nameGuideBox.w, layout.nameGuideBox.h);
  y += namePanelH;

  // The `4` is CHROME.A.numbersLabel's lead (4 + 11 line + 1 after = 16).
  sectionLabel(doc, 'Numbers 0–9', marginX, y, INK, 4);
  y += c.numbersLabel;

  // ---- numbers frame: model over practice, full width --------------------
  const numPanelH = c.numbersPanelFrame + 2 * layout.numbersTraceBox.h + c.gapNumbersPanel;
  frame(y, numPanelH);
  let inner = y + PANEL_PAD_Y;
  place(doc, ctx.numbersTraceArt, alignedX('center', layout.numbersTraceBox.w, contentW, marginX), inner,
    layout.numbersTraceBox.w, layout.numbersTraceBox.h);
  inner += layout.numbersTraceBox.h + c.gapNumbersPanel;
  place(doc, ctx.numbersGuideArt, alignedX('center', layout.numbersGuideBox.w, contentW, marginX), inner,
    layout.numbersGuideBox.w, layout.numbersGuideBox.h);
  y += numPanelH + c.spacerBeforeTry;

  // ---- "now you try" row: heading left, rule running right ---------------
  const tryOpts = { size: 9, bold: true, color: EMERALD, charSpace: 0.8, font: FONT_LABEL } as const;
  drawText(doc, 'NOW YOU TRY!', marginX, y + PANEL_PAD_Y, tryOpts);
  hline(doc, marginX + measure(doc, 'NOW YOU TRY!', tryOpts) + 14, marginX + contentW,
    y + PANEL_PAD_Y + c.tryRow - 5, RULE_GRAY, 0.75);
  y += c.tryPanelFrame + c.tryRow;

  // "Montree Phonics" attribution replaced by the school's own name — same
  // rule, same fallback as the header, when no school name is set.
  drawText(doc, schoolName ? `${className} · ${schoolName}` : className, centre, y + 6,
    { size: 7.5, italic: true, color: FOOTER_GRAY, align: 'center' });
}

// ---- Template B — Whale Badge (LANDSCAPE) ----
/**
 * 792 × 612, 0.30in on three edges and 0.20in at the bottom (see
 * LANDSCAPE_MARGIN_BOTTOM). Same design language as the portrait version it
 * replaces — whale emblem, a kicker over an emerald title, teal name panel,
 * gold numbers panel, gold "now you try" panel, italic footer — reflowed and
 * then tightened over three rounds so the glyphs a five-year-old actually
 * traces get bigger, then widened once more (round 4) for the badge itself:
 *
 *  L_MARGIN_Y 21.6 ┌───────────────────────────────────────────────────────┐
 *      badge   96  │ ((( emblem )))  [SCHOOL NAME ·] WHALE CLASS           │
 *                  │                 My Name Is Joey                      │
 *     +after    6  │                                                       │
 * name panel 159.8 │ ┌ teal ────────────────────────────────────────────┐  │
 *   (9 + 150.8)    │ │  [ J o e y  model ]  [ blank practice line ]     │  │
 *                  │ └──────────────────────────────────────────────────┘  │
 *      label   16  │ NUMBERS 0–9                                           │
 *  num panel 238.2 │ ┌ white/gold ──────────────────────────────────────┐  │
 *  (9+2·113.6+2)   │ │            0 1 2 3 4 5 6 7 8 9  (model)          │  │
 *                  │ │            ─────────────────── (practice)        │  │
 *                  │ └──────────────────────────────────────────────────┘  │
 *     spacer    4  │                                                       │
 *   try panel   27 │ ┌ gold ── NOW YOU TRY! ────────────────────────────┐  │
 *     footer   11  │       Whale Class [· School Name]                     │
 *   slack 18 (MIN) └───────────────────────────────────────────────────────┘
 *  L_MARGIN_BOT 14.4
 *
 * 96 + 6 + 159.83 + 16 + 238.17 + 4 + 27 + 11 = 558.0 of 576.0 printable
 * (round 4 — see the round-4 note on CHROME.B; the badge went 40 → 64 → 96
 * across live iteration, and the two panel heights above are the auto-scaled
 * *drawn* sizes, 0.8742× of their GEOMETRY.B targets — now below the round-2
 * baseline, an accepted trade for badge size — not the targets themselves).
 *
 * The badge has no colour backdrop plate: an early cut added a solid emerald
 * circle behind it for contrast against the MONTREE seal's fine engraved
 * linework, but a school's own uploaded logo already carries its own colour
 * and identity, and the plate read as an unwanted green background rather
 * than a feature. It's placed instead with its own aspect ratio preserved,
 * fit to and centred in the badge×badge box (see the `badgeFit` maths right
 * before `place(doc, ctx.badgeArt, ...)` below) rather than stretched to fill
 * it — `place()` otherwise forces its target box exactly, which would distort
 * any badgeArt that isn't a perfect square (the default seal is; a school's
 * own upload usually isn't).
 *
 * The kicker no longer hardcodes "MONTREE PHONICS" — that was our branding on
 * a sheet the school prints under their own name. It now reads
 * "{SCHOOL NAME} · {CLASS}" if the school has told us their name, or just
 * "{CLASS}" alone if not (schoolName is opt-in, see TracingPdfOptions); the
 * footer drops the same way. Both are built with plain string concatenation
 * against `ctx.schoolName`, not baked into CHROME/GEOMETRY, so an empty
 * schoolName costs nothing in the vertical budget above — only the *width*
 * of the kicker line changes, and that is measured live (see `textW` below),
 * never assumed.
 *
 * The title is the child's own name — "My Name Is Joey" — not a static label.
 * Template A says a nameless "My Name Is…" above a photo box; B has no photo,
 * so its header is where the sheet gets personalised, and a five-year-old who
 * cannot yet read the trace strip can still recognise their name in the title.
 * Overflow is not a practical concern: at 17pt bold Helvetica "My Name Is " is
 * 97.9pt and the header group has 748.8 − 96 (badge) − 16 (gap) = 636.8pt, so
 * the name itself gets 538.9pt — 38 characters even if every one of them were
 * a capital M (14.17pt, the widest glyph in the face), and ~59 for a normal
 * mixed-case name. The whole roster is 3–6 letters. If a name ever did exceed
 * that, the lockup is centred, so it would spill evenly both ways rather than
 * run off one edge; the kicker line is measured (`textW`), not assumed, and a
 * school name long enough to out-run the title would simply widen the header
 * group symmetrically around centre rather than clip.
 *
 * There is no watermark on this template: the faded grey emblem does not print
 * on the classroom printer this is used with, and the bottom-right one read as
 * a cut-off image on paper. A and C keep theirs. That also means B never calls
 * saveGraphicsState/setGState/restoreGraphicsState, so nothing here can leave
 * the PDF graphics state unbalanced — the emerald and gold are plain,
 * fully-opaque device RGB in the content stream.
 */
function drawTemplateB(ctx: DrawCtx) {
  const { doc, layout, className, schoolName, name } = ctx;
  const c = CHROME.B;
  const { contentW, marginX, marginY } = layout.page;
  const centre = marginX + contentW / 2;
  const right = marginX + contentW;
  // Must equal the pad half of CHROME.B's *PanelFrame entries (4 + 4 + 1 = 9).
  const PANEL_PAD_Y = 4;

  let y = marginY;

  // ---- header band: emblem beside the kicker/title, group centred ---------
  // Portrait stacked these (155.5pt); side by side they cost the badge's own
  // 96pt (round 4 — was 40pt, then briefly 64pt before the teacher asked for
  // 50% more), which is the single biggest chunk of vertical the landscape
  // reflow buys back.
  const badge = c.badge;
  // No hardcoded "MONTREE PHONICS" — see the docstring's round-4 note. Blank
  // schoolName just drops that segment, no dangling separator.
  const kicker = schoolName
    ? `${schoolName.toUpperCase()} · ${className.toUpperCase()}`
    : className.toUpperCase();
  const title = `My Name Is ${name}`;
  const kickerOpts = { size: 8, bold: true, color: INK, charSpace: 1, font: FONT_LABEL } as const;
  const titleOpts = { size: 17, bold: true, color: EMERALD, font: FONT_LABEL } as const;
  const textW = Math.max(measure(doc, kicker, kickerOpts), measure(doc, title, titleOpts));
  const headGap = 16;
  const headX = centre - (badge + headGap + textW) / 2;
  // No colour backdrop plate — a school's own uploaded logo already carries
  // its own colour and identity, and a plate behind it read as an unwanted
  // green background rather than a feature (see the round-4 note). The badge
  // is instead placed with its own aspect ratio preserved and centred in the
  // badge×badge box, not stretched to fill it: `place()` forces its target
  // box exactly, so a non-square badgeArt (any custom upload that isn't a
  // perfect square, unlike the default seal) would otherwise distort.
  const bd = ctx.badgeArt.dims;
  const badgeFit = Math.min(badge / bd.width, badge / bd.height);
  const badgeW = bd.width * badgeFit;
  const badgeH = bd.height * badgeFit;
  const badgeX = headX + (badge - badgeW) / 2;
  const badgeY = y + (badge - badgeH) / 2;
  place(doc, ctx.badgeArt, badgeX, badgeY, badgeW, badgeH);
  // kicker (11pt line) + 1pt + title (22pt line) = 34pt, optically centred on
  // the badge.
  const textTop = y + (badge - 34) / 2;
  drawText(doc, kicker, headX + badge + headGap, textTop, kickerOpts);
  drawText(doc, title, headX + badge + headGap, textTop + 12, titleOpts);
  y += badge + c.headerAfter;

  const panel = (top: number, h: number, fill: string, border: string) => {
    doc.setFillColor(fill);
    doc.setDrawColor(border);
    doc.setLineWidth(0.5);
    doc.rect(marginX, top, contentW, h, 'FD');
  };

  // ---- name panel (teal / emerald): model strip | blank practice line -----
  // One row, not two: both images are the same height so their three ruled
  // lines run straight through, and the child traces the name then keeps
  // writing on the blank half of the same line.
  const namePanelH = c.namePanelFrame + layout.nameTraceBox.h;
  panel(y, namePanelH, PANEL_TEAL, EMERALD);
  const nameY = y + PANEL_PAD_Y;
  const nameX = marginX + B_PANEL_PAD_X;
  place(doc, ctx.nameTraceArt, nameX, nameY, layout.nameTraceBox.w, layout.nameTraceBox.h);
  place(doc, ctx.nameGuideArt, nameX + layout.nameTraceBox.w + B_NAME_ROW_GAP, nameY,
    layout.nameGuideBox.w, layout.nameGuideBox.h);
  y += namePanelH;

  // The `4` is CHROME.B.numbersLabel's lead (4 + 11 line + 1 after = 16).
  sectionLabel(doc, 'Numbers 0–9', marginX, y, GOLD, 4);
  y += c.numbersLabel;

  // ---- numbers panel (white / gold): model over practice, full width ------
  const numPanelH = c.numbersPanelFrame + 2 * layout.numbersTraceBox.h + c.gapNumbersPanel;
  panel(y, numPanelH, '#FFFFFF', GOLD);
  let inner = y + PANEL_PAD_Y;
  place(doc, ctx.numbersTraceArt, alignedX('center', layout.numbersTraceBox.w, contentW, marginX), inner,
    layout.numbersTraceBox.w, layout.numbersTraceBox.h);
  inner += layout.numbersTraceBox.h + c.gapNumbersPanel;
  place(doc, ctx.numbersGuideArt, alignedX('center', layout.numbersGuideBox.w, contentW, marginX), inner,
    layout.numbersGuideBox.w, layout.numbersGuideBox.h);
  y += numPanelH + c.spacerBeforeTry;

  // ---- "now you try" panel (gold): heading left, rule running right -------
  const tryPanelH = c.tryPanelFrame + c.tryRow;
  panel(y, tryPanelH, PANEL_GOLD, GOLD);
  const tryOpts = { size: 9, bold: true, color: INK, charSpace: 0.8, font: FONT_LABEL } as const;
  const tryX = marginX + B_PANEL_PAD_X;
  drawText(doc, 'NOW YOU TRY!', tryX, y + PANEL_PAD_Y, tryOpts);
  hline(doc, tryX + measure(doc, 'NOW YOU TRY!', tryOpts) + 14, right - B_PANEL_PAD_X,
    y + PANEL_PAD_Y + c.tryRow - 5, GOLD, 0.75);
  y += tryPanelH;

  drawText(doc, schoolName ? `${className} · ${schoolName}` : className, centre, y + 6, { size: 7.5, italic: true, color: FOOTER_GRAY, align: 'center' });
}

// ---- Template C — Minimalist Line ----
function drawTemplateC(ctx: DrawCtx) {
  const { doc, className, schoolName } = ctx;
  const c = CHROME.C;

  // docx: 210×147px emblem, flush bottom-right.
  const wm = { w: 210 * PX_TO_PT, h: 147 * PX_TO_PT };
  watermark(ctx.doc, ctx.watermarkArt, {
    ...wm, cx: PAGE_W - wm.w / 2, cy: PAGE_H - wm.h / 2, pageH: PAGE_H, opacity: ctx.watermarkOpacity,
  });

  let y = MARGIN_Y;

  // Was a hardcoded 'montree phonics' kicker — now the school's own name in
  // the same quiet lowercase treatment, or nothing at all (the line stays,
  // just blank) if they haven't told us one. See TracingPdfOptions.schoolName.
  if (schoolName) {
    drawText(doc, schoolName.toLowerCase(), MARGIN_X, y, { size: 8, color: QUIET_GRAY, charSpace: 1.5, font: FONT_LABEL });
  }
  y += c.kicker;

  drawText(doc, 'Name practice', MARGIN_X, y, { size: 22, color: INK, font: FONT_LABEL });
  hline(doc, MARGIN_X, MARGIN_X + CONTENT_W, y + 28, RULE_GRAY, 0.375);
  y += c.title;

  drawText(doc, className, MARGIN_X, y + 3, { size: 9, italic: true, color: QUIET_GRAY });
  y += c.classLine;

  // Template C's labels are quiet lowercase, not the tracked caps of A/B.
  const quietLabel = (text: string, ly: number) => {
    drawText(doc, text, MARGIN_X, ly + 13, { size: 8, color: FOOTER_GRAY, charSpace: 1.5, font: FONT_LABEL });
  };

  y = drawTraceBlocks(ctx, y, {
    align: 'left',
    labels: ['trace it', 'numbers 0–9'],
    gaps: [c.gapNameTrace, c.gapNameGuide, c.gapNumbersTrace, c.gapNumbersGuide],
    labelHeight: c.label,
    drawLabel: (text, ly) => quietLabel(text, ly),
  });

  quietLabel('now you try', y);
  y += c.label;

  hline(doc, MARGIN_X, MARGIN_X + CONTENT_W, y + c.ruledLine, RULE_GRAY, 0.375);
  y += c.ruledLine;

  drawText(doc, schoolName ? `${schoolName} — Name Practice` : 'Name Practice', MARGIN_X, y + 15, { size: 7, italic: true, color: FAINT_GRAY });
}
