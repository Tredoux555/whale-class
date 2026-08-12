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
const SUBTITLE_GRAY = '#4B5A57';
const CAPTION_GRAY = '#6B7A77';
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

export const PAGE_W = 612;   // US Letter, matching the docx default section
export const PAGE_H = 792;
export const MARGIN_X = 0.65 * 72;   // 46.8pt — docx PAGE_MARGIN left/right
export const MARGIN_Y = 0.55 * 72;   // 39.6pt — docx PAGE_MARGIN top/bottom
export const CONTENT_W = PAGE_W - 2 * MARGIN_X;   // 518.4
export const AVAIL_H = PAGE_H - 2 * MARGIN_Y;     // 712.8

/** Never let a sheet come closer than this to the bottom margin. */
export const MIN_SLACK = 18;
/** Hard floor on the defensive down-scale (below this the art is unusable). */
const MIN_TRACE_SCALE = 0.35;

export type TracingTemplate = 'A' | 'B' | 'C';

// ------------------------------------------------------- template specs ---
/**
 * Fixed (non-image) vertical space each template consumes, in pt, itemised so
 * the numbers stay auditable against docxTemplates.ts. docx twips /20 = pt;
 * docx half-points /2 = pt; docx border sizes are eighths of a pt.
 */
const CHROME = {
  A: {
    headerRow: 11,        // 9pt caps line
    headerRule: 12,       // 1pt rule box + 10pt spacing-after (200 twips)
    title: 28,            // 15pt bold line (20) + 8pt after (160 twips)
    pictureFrame: 39,     // 13 pad-top + 4 gap + 9 caption + 13 pad-bottom
    label: 25,            // 9 before + 11 line + 5 after  (×3 labels)
    labels: 3,
    gapNameTrace: 1,      // 20 twips
    gapNameGuide: 4,      // 80 twips
    gapNumbersTrace: 1,   // 10 twips (rounded up)
    gapNumbersGuide: 4,   // 80 twips
    ruledLine: 19,        // 380 twips
    footer: 18,           // 10 before (200 twips) + 8pt line
  },
  B: {
    badge: 114.5,         // 150px emblem (112.5pt) + 2pt after (40 twips)
    kicker: 11,           // 8pt caps line + 1pt after (20 twips)
    title: 30,            // 17pt bold line (22) + 8pt after (160 twips)
    panelFrame: 15,       // 7 pad-top + 7 pad-bottom + 1 border (×3 panels)
    panels: 3,
    gapNamePanel: 1,      // 20 twips between trace + guide
    gapNumbersPanel: 1,   // 10 twips (rounded up)
    label: 25,
    labels: 1,
    spacerBeforeTry: 8,   // 140 twips + 1pt empty run
    tryHeading: 17,       // 11pt line + 6pt after (120 twips)
    tryRuledLine: 17,     // 340 twips
    footer: 15,           // 7 before (140 twips) + 8pt line
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
    const c = CHROME.A;
    return c.headerRow + c.headerRule + c.title + c.pictureFrame + c.label * c.labels
      + c.gapNameTrace + c.gapNameGuide + c.gapNumbersTrace + c.gapNumbersGuide
      + c.ruledLine + c.footer;
  }
  if (template === 'B') {
    const c = CHROME.B;
    return c.badge + c.kicker + c.title + c.panelFrame * c.panels
      + c.gapNamePanel + c.gapNumbersPanel + c.label * c.labels
      + c.spacerBeforeTry + c.tryHeading + c.tryRuledLine + c.footer;
  }
  const c = CHROME.C;
  return c.kicker + c.title + c.classLine + c.label * c.labels
    + c.gapNameTrace + c.gapNameGuide + c.gapNumbersTrace + c.gapNumbersGuide
    + c.ruledLine + c.footer;
}

interface TemplateGeometry {
  /** x-height passed to renderTraceStrip for the child's name. */
  nameSize: number;
  /**
   * x-height passed to renderTraceStrip/renderBlankGuide for the 1–9 numbers
   * row. Optional — templates that omit it use the shared `NUMBERS_SIZE`.
   * Template B renders the row larger (see GEOMETRY.B): its badge layout leaves
   * enough vertical slack for a taller numbers band, and rendering the strip at
   * a matching natural size keeps the dotted stroke art crisp at that size and
   * shrinks the strip's fixed padding as a share of its width, so the band
   * height (not the width cap) is what limits the glyphs.
   */
  numbersSize?: number;
  /** display width cap for the name strip/guide (docx px → pt). */
  nameMaxW: number;
  /** display width cap for the numbers strip/guide (docx px → pt). */
  numbersMaxW: number;
  /** preferred displayed height of the name band. */
  nameBandH: number;
  /** preferred displayed height of the numbers band. */
  numbersBandH: number;
  /** images are centred (A, B) or flush-left (C), as in the mockups. */
  align: 'center' | 'left';
}

export const GEOMETRY: Record<TracingTemplate, TemplateGeometry> = {
  A: { nameSize: 100, nameMaxW: 480 * PX_TO_PT, numbersMaxW: 620 * PX_TO_PT, nameBandH: 120, numbersBandH: 60, align: 'center' },
  // Template B's chrome (284.5) + a full-height name band (2 × 122) leaves
  // 712.8 − 18 − 284.5 − 244 = 166.3pt for the two numbers rows, i.e. up to
  // 83.15pt each. 80 spends most of that and still lands the page 24.3pt clear
  // of the bottom margin (MIN_SLACK is 18), and a longer name only ever makes
  // the name band *shorter*, so 24.3 is the worst case, not the best one.
  // The numbers strip is ~6.22× as wide as it is tall, so an 80pt band draws
  // 497.8pt wide — hence the wider 680px cap (520px would have clipped it back
  // to 61.5pt, barely above the old 60).
  B: { nameSize: 100, numbersSize: 100, nameMaxW: 420 * PX_TO_PT, numbersMaxW: 680 * PX_TO_PT, nameBandH: 122, numbersBandH: 80, align: 'center' },
  C: { nameSize: 110, nameMaxW: 560 * PX_TO_PT, numbersMaxW: 680 * PX_TO_PT, nameBandH: 145, numbersBandH: 70, align: 'left' },
};

/** Numbers row copy/tracking is identical on every template (see docxTemplates.ts). */
export const NUMBERS_TEXT = '1 2 3 4 5 6 7 8 9';
/** Default numbers x-height; `GEOMETRY.<t>.numbersSize` overrides it per template. */
export const NUMBERS_SIZE = 70;
export const NUMBERS_TRACKING = 0.55;
export const NAME_GUIDE_EM = 8.5;
export const NUMBERS_GUIDE_EM = 15;

/** The x-height the numbers row is rendered at for `template`. */
export function numbersSizeFor(template: TracingTemplate): number {
  return GEOMETRY[template].numbersSize ?? NUMBERS_SIZE;
}

/** Template A photo box: docx draws the photo 300px wide. */
const PICTURE_MAX_W = 300 * PX_TO_PT;   // 225
const PICTURE_MAX_H = 110;
/** Template A fallback emblem: docx draws it 118×118px. */
const BADGE_IN_BOX = 118 * PX_TO_PT;    // 88.5

// --------------------------------------------------------------- layout ---
export interface ImageDims { width: number; height: number }
export interface Box { w: number; h: number }

export interface TracingLayoutInput {
  template: TracingTemplate;
  /** natural dims from renderTraceStrip(childName, { size: nameSize }) */
  nameTrace: ImageDims;
  /** natural dims from renderBlankGuide({ size: nameSize, widthEm: 8.5 }) */
  nameGuide: ImageDims;
  /** natural dims from renderTraceStrip('1 2 …9', { size: numbersSizeFor(t), tracking: 0.55 }) */
  numbersTrace: ImageDims;
  /** natural dims from renderBlankGuide({ size: numbersSizeFor(t), widthEm: 15 }) */
  numbersGuide: ImageDims;
  /** Template A only — natural pixel dims of the teacher's photo, if any. */
  picture?: ImageDims | null;
}

export interface TracingLayout {
  template: TracingTemplate;
  chrome: number;
  nameTraceBox: Box;
  nameGuideBox: Box;
  numbersTraceBox: Box;
  numbersGuideBox: Box;
  /** Template A only: the drawn size of the photo / fallback emblem. */
  pictureBox: Box | null;
  /** defensive down-scale that had to be applied (1 = none needed). */
  scale: number;
  /** projected top-to-bottom height of everything on the page. */
  totalHeight: number;
  /** AVAIL_H - totalHeight; the guarantee is that this stays >= MIN_SLACK. */
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
 *     exactly `4 × size` tall (traceRender.ts: base = 0.85+2+0.3 em, height =
 *     base + 0.85 em), so equal displayed height ⇒ identical rule spacing.
 *  2. The guide is a strip of purely horizontal rules, so widening it does not
 *     disturb that spacing. It is therefore stretched (never squeezed) out to
 *     at least the width of the strip it partners, capped at the template's
 *     max width — the practice line is never narrower than the model.
 */
export function computeTracingLayout(input: TracingLayoutInput): TracingLayout {
  const { template } = input;
  const geo = GEOMETRY[template];
  const chrome = chromeHeight(template);

  const bandHeight = (targetH: number, maxW: number, trace: ImageDims, guide: ImageDims) =>
    Math.min(
      targetH,
      (maxW * trace.height) / trace.width,   // strip must fit the width cap
      (maxW * guide.height) / guide.width,   // guide never has to be squeezed
    );

  let nameH = bandHeight(geo.nameBandH, geo.nameMaxW, input.nameTrace, input.nameGuide);
  let numbersH = bandHeight(geo.numbersBandH, geo.numbersMaxW, input.numbersTrace, input.numbersGuide);

  // Template A's picture box is the other flexible block.
  let pictureH = 0;
  let pictureW = 0;
  if (template === 'A') {
    if (input.picture) {
      const s = Math.min(PICTURE_MAX_W / input.picture.width, PICTURE_MAX_H / input.picture.height);
      pictureW = input.picture.width * s;
      pictureH = input.picture.height * s;
    } else {
      pictureW = BADGE_IN_BOX;
      pictureH = BADGE_IN_BOX;
    }
  }

  // ---- single-page-fit guarantee -----------------------------------------
  // Everything flexible scales together so the art stays visually coherent.
  let scale = 1;
  const flexible = () => 2 * nameH + 2 * numbersH + pictureH;
  const projected = chrome + flexible();
  if (projected > AVAIL_H - MIN_SLACK) {
    const budget = AVAIL_H - MIN_SLACK - chrome;
    scale = Math.max(MIN_TRACE_SCALE, Math.min(1, budget / flexible()));
    nameH *= scale;
    numbersH *= scale;
    pictureH *= scale;
    pictureW *= scale;
  }

  const strip = (h: number, img: ImageDims): Box => ({ w: (img.width * h) / img.height, h });
  const guideBox = (h: number, img: ImageDims, partnerW: number, maxW: number): Box => ({
    w: Math.min(maxW, Math.max((img.width * h) / img.height, partnerW)),
    h,
  });

  const nameTraceBox = strip(nameH, input.nameTrace);
  const nameGuideBox = guideBox(nameH, input.nameGuide, nameTraceBox.w, geo.nameMaxW);
  const numbersTraceBox = strip(numbersH, input.numbersTrace);
  const numbersGuideBox = guideBox(numbersH, input.numbersGuide, numbersTraceBox.w, geo.numbersMaxW);

  const totalHeight = chrome + 2 * nameH + 2 * numbersH + pictureH;
  const slack = AVAIL_H - totalHeight;

  return {
    template,
    chrome,
    nameTraceBox,
    nameGuideBox,
    numbersTraceBox,
    numbersGuideBox,
    pictureBox: template === 'A' ? { w: pictureW, h: pictureH } : null,
    scale,
    totalHeight,
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

/** docx `sectionLabel()` — tracked 9pt caps with 9pt before / 5pt after. */
function sectionLabel(doc: jsPDF, text: string, x: number, y: number, color = INK): number {
  drawText(doc, text.toUpperCase(), x, y + 9, { size: 9, bold: true, color, charSpace: 0.8, font: FONT_LABEL });
  return CHROME.A.label; // 25 — same block on templates A and B
}

function alignedX(align: 'center' | 'left', boxW: number): number {
  return align === 'center' ? MARGIN_X + (CONTENT_W - boxW) / 2 : MARGIN_X;
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
 */
function watermark(doc: jsPDF, art: Art, opts: {
  w: number; h: number; cx: number; cy: number; rotationDeg?: number; opacity?: number;
}) {
  const { w, h, cx, cy, rotationDeg = 0, opacity = 1 } = opts;
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
    const pyUp = (PAGE_H - cy) - (s * (w / 2) + c * (h / 2));
    doc.addImage(art.dataUrl, art.format, px, PAGE_H - pyUp - h, w, h, undefined, 'FAST', rotationDeg);
  }
  doc.restoreGraphicsState();
}

// ------------------------------------------------------------- builder ---
export interface TracingPdfOptions {
  template: TracingTemplate;
  childName: string;
  className?: string;                 // e.g. "Whale Class" — header/subtitle
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

function newTracingDoc(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
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
    template, childName, className = 'Whale Class',
    logoBytes, pictureBytes, defaultLogoBytes, defaultWatermarkBytes,
  } = opts;

  const geo = GEOMETRY[template];
  const name = childName.trim() || 'Name';
  // Per-template (Template B renders the numbers row larger), so it has to be
  // part of every numbers cache key — a mixed-template batch shares one cache
  // and must never hand a page the other template's differently-sized strip.
  const numbersSize = numbersSizeFor(template);

  const [nameTraceArt, nameGuideArt, numbersTraceArt, numbersGuideArt] = await Promise.all([
    memoArt(cache?.strips, `trace|${geo.nameSize}|${name}`,
      async () => stripArt(await renderTraceStrip(name, { size: geo.nameSize }))),
    memoArt(cache?.strips, `guide|${geo.nameSize}|${NAME_GUIDE_EM}`,
      async () => stripArt(await renderBlankGuide({ size: geo.nameSize, widthEm: NAME_GUIDE_EM }))),
    memoArt(cache?.strips, `trace|${numbersSize}|${NUMBERS_TRACKING}|${NUMBERS_TEXT}`,
      async () => stripArt(await renderTraceStrip(NUMBERS_TEXT, { size: numbersSize, tracking: NUMBERS_TRACKING }))),
    memoArt(cache?.strips, `guide|${numbersSize}|${NUMBERS_GUIDE_EM}`,
      async () => stripArt(await renderBlankGuide({ size: numbersSize, widthEm: NUMBERS_GUIDE_EM }))),
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
    picture: pictureArt?.dims ?? null,
  });

  const ctx = {
    doc, layout, className, name, badgeArt, watermarkArt, watermarkOpacity, pictureArt,
    nameTraceArt, nameGuideArt, numbersTraceArt, numbersGuideArt,
  };
  if (template === 'A') drawTemplateA(ctx);
  else if (template === 'B') drawTemplateB(ctx);
  else drawTemplateC(ctx);
}

/** One child, one page. */
export async function buildTracingPdf(opts: TracingPdfOptions): Promise<Blob> {
  const doc = newTracingDoc();
  await drawTracingPage(doc, opts);
  return doc.output('blob');
}

/**
 * A whole class as ONE merged PDF — page 1 is the first child, page 2 the
 * second, and so on, in the order given. Teachers print this as a single job.
 */
export async function buildTracingPdfBatch(items: TracingPdfOptions[]): Promise<Blob> {
  if (items.length === 0) throw new Error('buildTracingPdfBatch: at least one child is required');
  const doc = newTracingDoc();
  const cache = createTracingRenderCache();
  for (let i = 0; i < items.length; i++) {
    if (i > 0) doc.addPage('letter', 'portrait');
    await drawTracingPage(doc, items[i], cache);
  }
  return doc.output('blob');
}

interface DrawCtx {
  doc: jsPDF;
  layout: TracingLayout;
  className: string;
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
  drawLabel?: (text: string, y: number, color: string) => void;
}): number {
  const { doc, layout } = ctx;
  const { align, labels, gaps, labelHeight } = opts;
  const [c1, c2] = opts.labelColors ?? [INK, INK];
  const label = opts.drawLabel ?? ((text: string, ly: number, color: string) => { sectionLabel(doc, text, MARGIN_X, ly, color); });

  label(labels[0], y, c1);
  y += labelHeight;
  place(doc, ctx.nameTraceArt, alignedX(align, layout.nameTraceBox.w), y, layout.nameTraceBox.w, layout.nameTraceBox.h);
  y += layout.nameTraceBox.h + gaps[0];
  place(doc, ctx.nameGuideArt, alignedX(align, layout.nameGuideBox.w), y, layout.nameGuideBox.w, layout.nameGuideBox.h);
  y += layout.nameGuideBox.h + gaps[1];

  label(labels[1], y, c2);
  y += labelHeight;
  place(doc, ctx.numbersTraceArt, alignedX(align, layout.numbersTraceBox.w), y, layout.numbersTraceBox.w, layout.numbersTraceBox.h);
  y += layout.numbersTraceBox.h + gaps[2];
  place(doc, ctx.numbersGuideArt, alignedX(align, layout.numbersGuideBox.w), y, layout.numbersGuideBox.w, layout.numbersGuideBox.h);
  y += layout.numbersGuideBox.h + gaps[3];

  return y;
}

// ---- Template A — Classic Montree ----
function drawTemplateA(ctx: DrawCtx) {
  const { doc, layout, className } = ctx;
  const c = CHROME.A;
  const centre = MARGIN_X + CONTENT_W / 2;

  // docx: 700×490px emblem rotated 325°, centred on the page, behind the text.
  watermark(ctx.doc, ctx.watermarkArt, {
    w: 700 * PX_TO_PT, h: 490 * PX_TO_PT, cx: PAGE_W / 2, cy: PAGE_H / 2,
    rotationDeg: 35, opacity: ctx.watermarkOpacity,
  });

  let y = MARGIN_Y;

  drawText(doc, 'MONTREE PHONICS', MARGIN_X, y, { size: 9, bold: true, color: INK, charSpace: 1.2, font: FONT_LABEL });
  drawText(doc, `Name Tracing · ${className}`, MARGIN_X + CONTENT_W, y, { size: 9, italic: true, color: SUBTITLE_GRAY, align: 'right' });
  y += c.headerRow;

  hline(doc, MARGIN_X, MARGIN_X + CONTENT_W, y + 1, INK, 1);
  y += c.headerRule;

  drawText(doc, 'My Name Is…', centre, y, { size: 15, bold: true, color: INK, align: 'center', font: FONT_LABEL });
  y += c.title;

  // Picture box
  const pic = layout.pictureBox!;
  const boxH = c.pictureFrame + pic.h;
  doc.setDrawColor(INK);
  doc.setLineWidth(0.75);
  doc.rect(MARGIN_X, y, CONTENT_W, boxH, 'S');
  const picArt = ctx.pictureArt ?? ctx.badgeArt;
  place(doc, picArt, centre - pic.w / 2, y + 13, pic.w, pic.h);
  drawText(
    doc,
    ctx.pictureArt ? ' ' : '[ drop in a class photo or sticker here ]',
    centre, y + 13 + pic.h + 4,
    { size: 8, italic: true, color: CAPTION_GRAY, align: 'center' },
  );
  y += boxH;

  y = drawTraceBlocks(ctx, y, {
    align: 'center',
    labels: ['Trace it', 'Numbers 1–9'],
    gaps: [c.gapNameTrace, c.gapNameGuide, c.gapNumbersTrace, c.gapNumbersGuide],
    labelHeight: c.label,
  });

  sectionLabel(doc, 'Now you try!', MARGIN_X, y, EMERALD);
  y += c.label;

  hline(doc, MARGIN_X, MARGIN_X + CONTENT_W, y + c.ruledLine, RULE_GRAY, 0.75);
  y += c.ruledLine;

  drawText(doc, `${className} · Montree Phonics`, centre, y + 10, { size: 7.5, italic: true, color: FOOTER_GRAY, align: 'center' });
}

// ---- Template B — Whale Badge ----
function drawTemplateB(ctx: DrawCtx) {
  const { doc, layout, className } = ctx;
  const c = CHROME.B;
  const centre = MARGIN_X + CONTENT_W / 2;
  const PANEL_PAD_Y = 7;

  // docx: 300×210px bottom-right + 220×154px top-left, flush to the page edge.
  const wBig = { w: 300 * PX_TO_PT, h: 210 * PX_TO_PT };
  watermark(ctx.doc, ctx.watermarkArt, {
    ...wBig, cx: PAGE_W - wBig.w / 2, cy: PAGE_H - wBig.h / 2, opacity: ctx.watermarkOpacity,
  });
  const wSmall = { w: 220 * PX_TO_PT, h: 154 * PX_TO_PT };
  watermark(ctx.doc, ctx.watermarkArt, {
    ...wSmall, cx: wSmall.w / 2, cy: wSmall.h / 2, opacity: ctx.watermarkOpacity,
  });

  let y = MARGIN_Y;

  const badge = 150 * PX_TO_PT;
  place(doc, ctx.badgeArt, centre - badge / 2, y, badge, badge);
  y += c.badge;

  drawText(doc, `MONTREE PHONICS · ${className.toUpperCase()}`, centre, y, { size: 8, bold: true, color: INK, charSpace: 1, align: 'center', font: FONT_LABEL });
  y += c.kicker;
  drawText(doc, 'My Name Badge', centre, y, { size: 17, bold: true, color: EMERALD, align: 'center', font: FONT_LABEL });
  y += c.title;

  const panel = (h: number, fill: string, border: string) => {
    doc.setFillColor(fill);
    doc.setDrawColor(border);
    doc.setLineWidth(0.5);
    doc.rect(MARGIN_X, y, CONTENT_W, h, 'FD');
  };

  // Name panel (teal / emerald)
  const namePanelH = c.panelFrame + 2 * layout.nameTraceBox.h + c.gapNamePanel;
  panel(namePanelH, PANEL_TEAL, EMERALD);
  let inner = y + PANEL_PAD_Y;
  place(doc, ctx.nameTraceArt, alignedX('center', layout.nameTraceBox.w), inner, layout.nameTraceBox.w, layout.nameTraceBox.h);
  inner += layout.nameTraceBox.h + c.gapNamePanel;
  place(doc, ctx.nameGuideArt, alignedX('center', layout.nameGuideBox.w), inner, layout.nameGuideBox.w, layout.nameGuideBox.h);
  y += namePanelH;

  sectionLabel(doc, 'Numbers 1–9', MARGIN_X, y, GOLD);
  y += c.label;

  // Numbers panel (white / gold)
  const numPanelH = c.panelFrame + 2 * layout.numbersTraceBox.h + c.gapNumbersPanel;
  panel(numPanelH, '#FFFFFF', GOLD);
  inner = y + PANEL_PAD_Y;
  place(doc, ctx.numbersTraceArt, alignedX('center', layout.numbersTraceBox.w), inner, layout.numbersTraceBox.w, layout.numbersTraceBox.h);
  inner += layout.numbersTraceBox.h + c.gapNumbersPanel;
  place(doc, ctx.numbersGuideArt, alignedX('center', layout.numbersGuideBox.w), inner, layout.numbersGuideBox.w, layout.numbersGuideBox.h);
  y += numPanelH + c.spacerBeforeTry;

  // "Now you try" panel (gold)
  const tryPanelH = c.panelFrame + c.tryHeading + c.tryRuledLine;
  panel(tryPanelH, PANEL_GOLD, GOLD);
  drawText(doc, 'NOW YOU TRY!', centre, y + PANEL_PAD_Y, { size: 9, bold: true, color: INK, charSpace: 0.8, align: 'center', font: FONT_LABEL });
  hline(doc, MARGIN_X + 13, MARGIN_X + CONTENT_W - 13, y + PANEL_PAD_Y + c.tryHeading + c.tryRuledLine - 4, GOLD, 0.75);
  y += tryPanelH;

  drawText(doc, `${className} · Montree Phonics`, centre, y + 7, { size: 7.5, italic: true, color: FOOTER_GRAY, align: 'center' });
}

// ---- Template C — Minimalist Line ----
function drawTemplateC(ctx: DrawCtx) {
  const { doc, className } = ctx;
  const c = CHROME.C;

  // docx: 210×147px emblem, flush bottom-right.
  const wm = { w: 210 * PX_TO_PT, h: 147 * PX_TO_PT };
  watermark(ctx.doc, ctx.watermarkArt, {
    ...wm, cx: PAGE_W - wm.w / 2, cy: PAGE_H - wm.h / 2, opacity: ctx.watermarkOpacity,
  });

  let y = MARGIN_Y;

  drawText(doc, 'montree phonics', MARGIN_X, y, { size: 8, color: QUIET_GRAY, charSpace: 1.5, font: FONT_LABEL });
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
    labels: ['trace it', 'numbers 1–9'],
    gaps: [c.gapNameTrace, c.gapNameGuide, c.gapNumbersTrace, c.gapNumbersGuide],
    labelHeight: c.label,
    drawLabel: (text, ly) => quietLabel(text, ly),
  });

  quietLabel('now you try', y);
  y += c.label;

  hline(doc, MARGIN_X, MARGIN_X + CONTENT_W, y + c.ruledLine, RULE_GRAY, 0.375);
  y += c.ruledLine;

  drawText(doc, 'Montree Phonics — Name Practice', MARGIN_X, y + 15, { size: 7, italic: true, color: FAINT_GRAY });
}
