// Tracing Work — docx builders (ported from the three approved mockup
// templates). Runs entirely client-side: renders the real stroke-font trace
// art via <canvas> (traceRender.ts) and assembles the .docx with the `docx`
// package already used elsewhere in this app.
'use client';

import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType, VerticalAlign,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom,
  TextWrappingType, TextWrappingSide, convertInchesToTwip, HeightRule,
} from 'docx';
import { renderTraceStrip, renderBlankGuide, blobToArrayBuffer } from './traceRender';

// ---------------------------------------------------------------- brand ---
export const INK = '0D3330';
export const EMERALD = '0E9F6E';
export const GOLD = 'C98A2C';
const PANEL_TEAL = 'EAF4F1';
const PANEL_GOLD = 'FBF1E1';
const RULE_GRAY = 'D8DEDC';

const FONT_LABEL = 'Century Gothic';
const FONT_BODY = 'Calibri';

const PAGE_MARGIN = {
  top: convertInchesToTwip(0.55), bottom: convertInchesToTwip(0.55),
  left: convertInchesToTwip(0.65), right: convertInchesToTwip(0.65),
};

export type TracingTemplate = 'A' | 'B' | 'C';

export interface TracingDocxOptions {
  template: TracingTemplate;
  childName: string;
  className?: string;      // e.g. "Whale Class" — shown in the header/subtitle
  logoBytes?: ArrayBuffer | null;    // replaces the default whale emblem everywhere
  pictureBytes?: ArrayBuffer | null; // Template A's picture-box photo (optional)
  defaultLogoBytes: ArrayBuffer;     // fallback whale emblem (badge, opaque)
  defaultWatermarkBytes: ArrayBuffer; // fallback whale emblem (faded, for watermark use)
}

function noBorder() { return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }; }

async function imgDims(bytes: ArrayBuffer): Promise<{ w: number; h: number }> {
  const bmp = await createImageBitmap(new Blob([bytes]));
  const w = bmp.width, h = bmp.height;
  bmp.close();
  return { w, h };
}

async function imageParagraph(bytes: ArrayBuffer, width: number, align = AlignmentType.CENTER, spacing?: { before?: number; after?: number }) {
  const { w, h } = await imgDims(bytes);
  const height = Math.round((width * h) / w);
  return new Paragraph({
    alignment: align,
    spacing: { before: spacing?.before ?? 0, after: spacing?.after ?? 0 },
    children: [new ImageRun({ type: 'png', data: bytes, transformation: { width, height } })],
  });
}

function ruledLines(count: number, opts: { color?: string; rowHeight?: number; size?: number } = {}) {
  const { color = RULE_GRAY, rowHeight = 380, size = 6 } = opts;
  const rows: TableRow[] = [];
  for (let i = 0; i < count; i++) {
    rows.push(new TableRow({
      height: { value: rowHeight, rule: HeightRule.ATLEAST },
      children: [new TableCell({
        width: { size: 100, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.BOTTOM,
        borders: { top: noBorder(), left: noBorder(), right: noBorder(), bottom: { style: BorderStyle.SINGLE, size, color } },
        children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })],
      })],
    }));
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder(), insideHorizontal: noBorder(), insideVertical: noBorder() },
    rows,
  });
}

function sectionLabel(text: string, color = INK) {
  return new Paragraph({
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, font: FONT_LABEL, size: 18, color, characterSpacing: 16 })],
  });
}

let _watermarkZIndex = 0;
async function floatingWatermark(bytes: ArrayBuffer, opts: {
  w: number; h: number; rotation?: number; alignH?: string; alignV?: string;
}) {
  const { w, h, rotation = 0, alignH = 'center', alignV = 'center' } = opts;
  _watermarkZIndex += 1;
  return new Paragraph({
    children: [new ImageRun({
      type: 'png',
      data: bytes,
      transformation: { width: w, height: h, rotation },
      floating: {
        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: alignH as never },
        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: alignV as never },
        wrap: { type: TextWrappingType.NONE, side: TextWrappingSide.BOTH_SIDES },
        behindDocument: true,
        allowOverlap: true,
        zIndex: _watermarkZIndex,
      },
    })],
  });
}

function headerBlock(subtitle: string) {
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder(), insideHorizontal: noBorder(), insideVertical: noBorder() },
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.BOTTOM,
            children: [new Paragraph({ children: [new TextRun({ text: 'MONTREE PHONICS', bold: true, font: FONT_LABEL, size: 18, color: INK, characterSpacing: 24 })] })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.BOTTOM,
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: subtitle, italics: true, font: FONT_BODY, size: 18, color: '4B5A57' })] })],
          }),
        ],
      })],
    }),
    new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: INK } }, children: [new TextRun({ text: '', size: 2 })] }),
  ];
}

// ------------------------------------------------------------- builder ---
export async function buildTracingDocx(opts: TracingDocxOptions): Promise<Blob> {
  _watermarkZIndex = 0; // reset per document so relativeHeight stays small and valid across repeated calls
  const { template, childName, className = 'Whale Class', logoBytes, pictureBytes, defaultLogoBytes, defaultWatermarkBytes } = opts;
  const badge = logoBytes ?? defaultLogoBytes;
  const watermark = logoBytes ?? defaultWatermarkBytes;

  const nameSize = template === 'C' ? 110 : template === 'B' ? 100 : 100;
  const [nameTrace, guideName, numbersTrace, guideNumbers] = await Promise.all([
    renderTraceStrip(childName || 'Name', { size: nameSize }),
    renderBlankGuide({ size: nameSize, widthEm: 8.5 }),
    renderTraceStrip('1 2 3 4 5 6 7 8 9', { size: 70, tracking: 0.55 }),
    renderBlankGuide({ size: 70, widthEm: 15 }),
  ]);
  const [nameTraceBuf, guideNameBuf, numbersTraceBuf, guideNumbersBuf] = await Promise.all(
    [nameTrace, guideName, numbersTrace, guideNumbers].map((r) => blobToArrayBuffer(r.blob))
  );

  let children: (Paragraph | Table)[];
  if (template === 'A') children = await buildTemplateA({ childName, className, badge, watermark, pictureBytes, nameTraceBuf, guideNameBuf, numbersTraceBuf, guideNumbersBuf });
  else if (template === 'B') children = await buildTemplateB({ childName, className, badge, watermark, nameTraceBuf, guideNameBuf, numbersTraceBuf, guideNumbersBuf });
  else children = await buildTemplateC({ childName, className, watermark, nameTraceBuf, guideNameBuf, numbersTraceBuf, guideNumbersBuf });

  const doc = new Document({ sections: [{ properties: { page: { margin: PAGE_MARGIN } }, children }] });
  return Packer.toBlob(doc);
}

// ---- Template A — Classic Montree ----
async function buildTemplateA(a: {
  childName: string; className: string; badge: ArrayBuffer; watermark: ArrayBuffer; pictureBytes?: ArrayBuffer | null;
  nameTraceBuf: ArrayBuffer; guideNameBuf: ArrayBuffer; numbersTraceBuf: ArrayBuffer; guideNumbersBuf: ArrayBuffer;
}) {
  const pictureCell = a.pictureBytes
    ? await imageParagraph(a.pictureBytes, 300, AlignmentType.CENTER)
    : new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type: 'png', data: a.badge, transformation: { width: 118, height: 118 } })],
      });
  const pictureBox = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: INK }, bottom: { style: BorderStyle.SINGLE, size: 6, color: INK },
      left: { style: BorderStyle.SINGLE, size: 6, color: INK }, right: { style: BorderStyle.SINGLE, size: 6, color: INK },
      insideHorizontal: noBorder(), insideVertical: noBorder(),
    },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 100, type: WidthType.PERCENTAGE }, margins: { top: 260, bottom: 260, left: 200, right: 200 },
      children: [
        pictureCell,
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: a.pictureBytes ? ' ' : '[ drop in a class photo or sticker here ]', italics: true, color: '6B7A77', font: FONT_BODY, size: 16 })] }),
      ],
    })] })],
  });

  return [
    await floatingWatermark(a.watermark, { w: 700, h: 490, rotation: 325 }),
    ...headerBlock(`Name Tracing · ${a.className}`),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: 'My Name Is…', bold: true, font: FONT_LABEL, size: 30, color: INK })] }),
    pictureBox,
    sectionLabel('Trace it'),
    await imageParagraph(a.nameTraceBuf, 480, AlignmentType.CENTER, { after: 20 }),
    await imageParagraph(a.guideNameBuf, 480, AlignmentType.CENTER, { after: 80 }),
    sectionLabel('Numbers 1–9'),
    await imageParagraph(a.numbersTraceBuf, 620, AlignmentType.CENTER, { after: 10 }),
    await imageParagraph(a.guideNumbersBuf, 620, AlignmentType.CENTER, { after: 80 }),
    sectionLabel('Now you try!', EMERALD),
    ruledLines(1),
    new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${a.className} · Montree Phonics`, italics: true, size: 15, color: '7C8A87', font: FONT_BODY })] }),
  ];
}

// ---- Template B — Whale Badge ----
async function buildTemplateB(b: {
  childName: string; className: string; badge: ArrayBuffer; watermark: ArrayBuffer;
  nameTraceBuf: ArrayBuffer; guideNameBuf: ArrayBuffer; numbersTraceBuf: ArrayBuffer; guideNumbersBuf: ArrayBuffer;
}) {
  function panel(children: (Paragraph | Table)[], fill: string, borderColor: string) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        left: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        insideHorizontal: noBorder(), insideVertical: noBorder(),
      },
      rows: [new TableRow({ children: [new TableCell({
        width: { size: 100, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill },
        margins: { top: 140, bottom: 140, left: 260, right: 260 }, children,
      })] })],
    });
  }

  return [
    await floatingWatermark(b.watermark, { w: 300, h: 210, alignH: 'right', alignV: 'bottom' }),
    await floatingWatermark(b.watermark, { w: 220, h: 154, alignH: 'left', alignV: 'top' }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new ImageRun({ type: 'png', data: b.badge, transformation: { width: 150, height: 150 } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: `MONTREE PHONICS · ${b.className.toUpperCase()}`, bold: true, font: FONT_LABEL, size: 16, color: INK, characterSpacing: 20 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: 'My Name Badge', bold: true, font: FONT_LABEL, size: 34, color: EMERALD })] }),
    panel([
      await imageParagraph(b.nameTraceBuf, 420, AlignmentType.CENTER, { after: 20 }),
      await imageParagraph(b.guideNameBuf, 420, AlignmentType.CENTER),
    ], PANEL_TEAL, EMERALD),
    sectionLabel('Numbers 1–9', GOLD),
    panel([
      await imageParagraph(b.numbersTraceBuf, 520, AlignmentType.CENTER, { after: 10 }),
      await imageParagraph(b.guideNumbersBuf, 520, AlignmentType.CENTER),
    ], 'FFFFFF', GOLD),
    new Paragraph({ spacing: { before: 140 }, children: [new TextRun({ text: '', size: 2 })] }),
    panel([
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'NOW YOU TRY!', bold: true, font: FONT_LABEL, size: 18, color: INK, characterSpacing: 16 })] }),
      ruledLines(1, { color: GOLD, rowHeight: 340 }),
    ], PANEL_GOLD, GOLD),
    new Paragraph({ spacing: { before: 140 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${b.className} · Montree Phonics`, italics: true, size: 15, color: '7C8A87', font: FONT_BODY })] }),
  ];
}

// ---- Template C — Minimalist Line ----
async function buildTemplateC(c: {
  childName: string; className: string; watermark: ArrayBuffer;
  nameTraceBuf: ArrayBuffer; guideNameBuf: ArrayBuffer; numbersTraceBuf: ArrayBuffer; guideNumbersBuf: ArrayBuffer;
}) {
  function label(text: string) {
    return new Paragraph({ spacing: { before: 260, after: 80 }, children: [new TextRun({ text, font: FONT_LABEL, size: 16, color: '7C8A87', characterSpacing: 30 })] });
  }
  return [
    await floatingWatermark(c.watermark, { w: 210, h: 147, alignH: 'right', alignV: 'bottom' }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'montree phonics', font: FONT_LABEL, size: 16, color: '9AA6A3', characterSpacing: 30 })] }),
    new Paragraph({ spacing: { after: 20 }, border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: RULE_GRAY } }, children: [new TextRun({ text: 'Name practice', font: FONT_LABEL, size: 44, color: INK })] }),
    new Paragraph({ spacing: { before: 60, after: 0 }, children: [new TextRun({ text: c.className, italics: true, font: FONT_BODY, size: 18, color: '9AA6A3' })] }),
    label('trace it'),
    await imageParagraph(c.nameTraceBuf, 560, AlignmentType.LEFT, { after: 30 }),
    await imageParagraph(c.guideNameBuf, 560, AlignmentType.LEFT, { after: 40 }),
    label('numbers 1–9'),
    await imageParagraph(c.numbersTraceBuf, 680, AlignmentType.LEFT, { after: 20 }),
    await imageParagraph(c.guideNumbersBuf, 680, AlignmentType.LEFT, { after: 40 }),
    label('now you try'),
    ruledLines(1, { color: RULE_GRAY, size: 3, rowHeight: 420 }),
    new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Montree Phonics — Name Practice', italics: true, size: 14, color: 'AEB8B5', font: FONT_BODY })] }),
  ];
}
