/**
 * render/adaptive-font.ts — the ONE shrink-to-fit implementation.
 *
 * Direct ports of print-utils.ts:
 *   - adaptiveLabelFontSize()      (square 3-part labels)
 *   - adaptiveStripFontSize()      (sentence strips, single-line preference)
 *   - computeUniformStripFontSize() (largest size where EVERY sentence fits)
 *
 * Pure functions — no DOM measurement, calibrated to Comic-Sans / Andika bold.
 */

import { WHITE_BORDER_CM } from './geometry';

/** Port of print-utils.ts adaptiveLabelFontSize(). */
export function adaptiveLabelFontSize(
  label: string,
  basePt: number,
  cardWidthCm: number,
  labelHeightCm: number,
): number {
  const internalWidthPt = (cardWidthCm - WHITE_BORDER_CM * 2 - 0.6) * 28.35;
  const internalHeightPt = (labelHeightCm - WHITE_BORDER_CM * 2 - 0.4) * 28.35;
  const lineHeight = 1.2;
  const CHAR_W = 0.62;
  const MIN_PT = 8;

  const words = label.split(/\s+/).filter(Boolean);
  const longestWordLen = words.reduce((m, w) => Math.max(m, w.length), 1);

  let fontSize = basePt;
  while (fontSize > MIN_PT) {
    const charWidth = fontSize * CHAR_W;
    const charsPerLine = Math.max(1, Math.floor(internalWidthPt / charWidth));
    const longestWordFits = longestWordLen <= charsPerLine;

    let lines = 1;
    let currentLineLen = 0;
    for (const w of words) {
      if (currentLineLen > 0 && currentLineLen + 1 + w.length > charsPerLine) {
        lines++;
        currentLineLen = w.length;
      } else {
        currentLineLen += (currentLineLen > 0 ? 1 : 0) + w.length;
      }
      if (w.length > charsPerLine) {
        lines += Math.ceil(w.length / charsPerLine) - 1;
      }
    }
    const totalHeightPt = lines * fontSize * lineHeight;
    if (longestWordFits && totalHeightPt <= internalHeightPt) break;
    fontSize -= 1;
  }
  return Math.max(MIN_PT, fontSize);
}

/** Port of print-utils.ts adaptiveStripFontSize() (single-line preference). */
export function adaptiveStripFontSize(
  sentence: string,
  basePt: number,
  textWidthCm: number,
  textHeightCm: number,
): number {
  const internalWidthPt = (textWidthCm - 0.4) * 28.35;
  const internalHeightPt = (textHeightCm - 0.3) * 28.35;
  const lineHeight = 1.2;
  const CHAR_W = 0.52;
  const MIN_PT = 14;

  const totalChars = sentence.length;
  for (let fontSize = basePt; fontSize >= MIN_PT; fontSize--) {
    const lineWidth = totalChars * fontSize * CHAR_W;
    const lineHeightPt = fontSize * lineHeight;
    if (lineWidth <= internalWidthPt && lineHeightPt <= internalHeightPt) {
      return fontSize;
    }
  }

  const words = sentence.split(/\s+/).filter(Boolean);
  const longestWordLen = words.reduce((m, w) => Math.max(m, w.length), 1);

  let fontSize = basePt;
  while (fontSize > MIN_PT) {
    const charWidth = fontSize * CHAR_W;
    const charsPerLine = Math.max(1, Math.floor(internalWidthPt / charWidth));
    const longestWordFits = longestWordLen <= charsPerLine;

    let lines = 1;
    let cur = 0;
    for (const w of words) {
      if (cur > 0 && cur + 1 + w.length > charsPerLine) {
        lines++;
        cur = w.length;
      } else {
        cur += (cur > 0 ? 1 : 0) + w.length;
      }
      if (w.length > charsPerLine) {
        lines += Math.ceil(w.length / charsPerLine) - 1;
      }
    }
    const totalHeightPt = lines * fontSize * lineHeight;
    if (longestWordFits && totalHeightPt <= internalHeightPt) break;
    fontSize -= 1;
  }
  return Math.max(MIN_PT, fontSize);
}

/** Port of print-utils.ts computeUniformStripFontSize(). */
export function computeUniformStripFontSize(
  sentences: string[],
  basePt: number,
  textWidthCm: number,
  textHeightCm: number,
): number {
  if (sentences.length === 0) return basePt;
  let uniform = basePt;
  for (const s of sentences) {
    const fit = adaptiveStripFontSize(s, basePt, textWidthCm, textHeightCm);
    if (fit < uniform) uniform = fit;
  }
  return uniform;
}
