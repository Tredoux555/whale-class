import { Card } from './types';
import { escapeHtml, sanitizeImageUrl } from '@/lib/sanitize';

/**
 * Get validated object-position CSS for a card's image offset.
 * Defaults to 50% 50% (centered) if no offset is set.
 * Clamps values to 0-100 range to prevent CSS injection.
 */
const getObjectPosition = (card: Card): string => {
  const x = Math.max(0, Math.min(100, card.imageOffset?.x ?? 50));
  const y = Math.max(0, Math.min(100, card.imageOffset?.y ?? 50));
  return `object-position: ${x}% ${y}%`;
};

// Constants for page dimensions (in cm)
const A4_WIDTH_CM = 21;
const A4_HEIGHT_CM = 29.7;
const DEFAULT_CARD_SIZE_CM = 7.5;
const MARGIN_CM = 0;
const WHITE_BORDER_CM = 0.5;
const CARD_BORDER_RADIUS = 0.4;

/**
 * Compute grid layout that fits cards onto A4.
 * Returns { cols, rows, labelHeight, labelInternal, cardSize, fontSize }
 */
function computeLayout(cardSizeCm: number) {
  const s = cardSizeCm;
  // How many columns/rows of picture cards fit on A4
  const cols = Math.max(1, Math.floor(A4_WIDTH_CM / s));
  const pictureRows = Math.max(1, Math.floor(A4_HEIGHT_CM / s));

  // Label height scales with card size, minimum 2cm
  const labelHeight = Math.max(2, Math.round(s * 0.32 * 10) / 10);
  const labelInternal = Math.max(1.4, labelHeight - 0.6);

  // Control card = picture + label
  const controlHeight = s + labelHeight;
  const controlRows = Math.max(1, Math.floor(A4_HEIGHT_CM / controlHeight));

  // Cards per page
  const picturePerPage = cols * pictureRows;
  const controlPerPage = cols * controlRows;

  // Label-only: same width as picture card, compact rows
  const labelRows = Math.max(1, Math.floor(A4_HEIGHT_CM / labelHeight));
  const labelPerPage = cols * labelRows;

  // Font size scales with card size
  const fontSize = Math.max(12, Math.min(36, Math.round(s * 3.2)));

  return {
    cols, pictureRows, controlRows, labelRows,
    picturePerPage, controlPerPage, labelPerPage,
    labelHeight, labelInternal, controlHeight,
    cardSize: s, fontSize
  };
}

/**
 * Compute a per-label font size that fits the text within the available
 * label area without overflow. Shrinks from the base font when the text
 * is too long for a single line, down to a minimum of 12pt.
 */
function adaptiveLabelFontSize(
  label: string,
  basePt: number,
  cardWidthCm: number,
  labelHeightCm: number
): number {
  // Internal dimensions after subtracting border + padding
  const internalWidthPt = (cardWidthCm - WHITE_BORDER_CM * 2 - 0.6) * 28.35;
  const internalHeightPt = (labelHeightCm - WHITE_BORDER_CM * 2 - 0.4) * 28.35;
  const lineHeight = 1.2;
  // Conservative char-width coefficient for bold Comic Sans / Nunito
  const CHAR_W = 0.62;
  const MIN_PT = 8;

  // Find longest single (unbreakable) word — this sets the hard width floor
  const words = label.split(/\s+/).filter(Boolean);
  const longestWordLen = words.reduce((m, w) => Math.max(m, w.length), 1);

  let fontSize = basePt;
  while (fontSize > MIN_PT) {
    const charWidth = fontSize * CHAR_W;
    const charsPerLine = Math.max(1, Math.floor(internalWidthPt / charWidth));

    // Hard constraint: longest single word must fit in one line
    // (CSS break-word is a safety net, but we still try to shrink so it fits)
    const longestWordFits = longestWordLen <= charsPerLine;

    // Count wrapped lines (space-split; long words count as their own line)
    let lines = 1;
    let currentLineLen = 0;
    for (const w of words) {
      if (currentLineLen > 0 && currentLineLen + 1 + w.length > charsPerLine) {
        lines++;
        currentLineLen = w.length;
      } else {
        currentLineLen += (currentLineLen > 0 ? 1 : 0) + w.length;
      }
      // If a single word is longer than a line, it will wrap mid-word
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

interface CreateCardHTMLParams {
  card: Card;
  type: 'control' | 'picture' | 'label';
  layout?: { cardSize: number; labelHeight: number; fontSize: number };
}

/**
 * Helper function to create HTML for a single card
 */
const createCardHTML = ({ card, type, layout }: CreateCardHTMLParams): string => {
  // Compute per-card font size when layout info is available
  const fontPt = layout
    ? adaptiveLabelFontSize(card.label, layout.fontSize, layout.cardSize, layout.labelHeight)
    : undefined;
  const fontStyle = fontPt ? `font-size: ${fontPt}pt;` : '';

  if (type === 'control') {
    return `
      <div class="card card-control">
        <div class="image-area">
          <img src="${sanitizeImageUrl(card.croppedImage)}" alt="${escapeHtml(card.label)}" style="${getObjectPosition(card)}">
        </div>
        <div class="label-area" style="${fontStyle}">${escapeHtml(card.label)}</div>
      </div>
    `;
  } else if (type === 'picture') {
    return `
      <div class="card card-picture">
        <div class="image-area">
          <img src="${sanitizeImageUrl(card.croppedImage)}" alt="${escapeHtml(card.label)}" style="${getObjectPosition(card)}">
        </div>
      </div>
    `;
  } else {
    return `
      <div class="card card-label-only">
        <div class="label-area" style="flex: 1; ${fontStyle}">${escapeHtml(card.label)}</div>
      </div>
    `;
  }
};

interface GenerateCardsParams {
  cards: Card[];
  borderColor: string;
  fontFamily: string;
  cardSizeCm?: number;
}

/**
 * Generate standard size print layout (control, picture, and label cards)
 * Returns HTML document string ready for printing
 */
export const generateCards = ({
  cards,
  borderColor,
  fontFamily,
  cardSizeCm = DEFAULT_CARD_SIZE_CM
}: GenerateCardsParams): string => {
  const L = computeLayout(cardSizeCm);

  const gridMarginLeft = (A4_WIDTH_CM - (L.cardSize * L.cols)) / 2;
  const pictureGridMarginTop = (A4_HEIGHT_CM - (L.cardSize * L.pictureRows)) / 2;
  const controlGridMarginTop = (A4_HEIGHT_CM - (L.controlHeight * L.controlRows)) / 2;
  const labelGridMarginTop = (A4_HEIGHT_CM - (L.labelHeight * L.labelRows)) / 2;

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Montessori Cards - Print</title>
  <style>
    @page {
      size: A4;
      margin: ${MARGIN_CM}cm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, sans-serif;
      background: white;
      position: relative;
    }

    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      position: relative;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .page-title {
      font-size: 10pt;
      color: #999;
      margin-bottom: 0.5cm;
      text-align: center;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(${L.cols}, ${L.cardSize}cm);
      gap: 0;
      position: relative;
      margin: 0;
      padding: 0;
    }

    .grid-picture {
      grid-template-rows: repeat(${L.pictureRows}, ${L.cardSize}cm);
      margin-left: ${gridMarginLeft}cm;
      margin-top: ${pictureGridMarginTop}cm;
    }

    .grid-control {
      grid-template-rows: repeat(${L.controlRows}, ${L.controlHeight}cm);
      margin-left: ${gridMarginLeft}cm;
      margin-top: ${controlGridMarginTop}cm;
    }

    .card {
      background: ${borderColor};
      padding: ${WHITE_BORDER_CM}cm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      gap: 0.5cm;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      margin: 0;
      border: none;
    }

    .card-control {
      height: ${L.controlHeight}cm;
      width: ${L.cardSize}cm;
    }

    .card-picture {
      height: ${L.cardSize}cm;
      width: ${L.cardSize}cm;
    }

    .card-label-only {
      height: ${L.labelHeight}cm;
      width: ${L.cardSize}cm;
    }

    .card-label-only .label-area {
      height: auto;
      flex: 1;
    }

    .image-area {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: ${CARD_BORDER_RADIUS}cm;
    }

    .image-area img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .label-area {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      height: ${L.labelInternal}cm;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "${fontFamily}", cursive;
      font-size: ${L.fontSize}pt;
      font-weight: bold;
      text-align: center;
      padding: 0.2cm 0.3cm;
      line-height: 1.2;
      overflow: hidden;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: anywhere;
      hyphens: auto;
      max-width: 100%;
      border-radius: ${CARD_BORDER_RADIUS}cm;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .page-title {
        display: none;
      }

      .card {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: ${borderColor} !important;
      }
    }

    @media screen {
      body {
        padding: 20px;
        background: #f0f0f0;
      }

      .page {
        background: white;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    }
  </style>
</head>
<body>
`;

  // Generate Control Cards pages
  const layoutInfo = { cardSize: L.cardSize, labelHeight: L.labelHeight, fontSize: L.fontSize };
  const controlCards = cards.map(card => createCardHTML({ card, type: 'control', layout: layoutInfo }));
  for (let i = 0; i < controlCards.length; i += L.controlPerPage) {
    const pageCards = controlCards.slice(i, i + L.controlPerPage);
    const pageNum = Math.floor(i / L.controlPerPage) + 1;
    html += `
      <div class="page">
        <div class="page-title">Control Cards - Page ${pageNum}</div>
        <div class="grid grid-control">
          ${pageCards.join('')}
          ${pageCards.length < L.controlPerPage ? '<div></div>'.repeat(L.controlPerPage - pageCards.length) : ''}
        </div>
      </div>
    `;
  }

  // Generate Picture Cards pages
  const pictureCards = cards.map(card => createCardHTML({ card, type: 'picture' }));
  for (let i = 0; i < pictureCards.length; i += L.picturePerPage) {
    const pageCards = pictureCards.slice(i, i + L.picturePerPage);
    const pageNum = Math.floor(i / L.picturePerPage) + 1;
    html += `
      <div class="page">
        <div class="page-title">Picture Cards - Page ${pageNum}</div>
        <div class="grid grid-picture">
          ${pageCards.join('')}
          ${pageCards.length < L.picturePerPage ? '<div></div>'.repeat(L.picturePerPage - pageCards.length) : ''}
        </div>
      </div>
    `;
  }

  // Generate Label Cards pages
  const labelCards = cards.map(card => createCardHTML({ card, type: 'label', layout: layoutInfo }));
  const labelGridMarginLeft = (A4_WIDTH_CM - (L.cardSize * L.cols)) / 2;
  for (let i = 0; i < labelCards.length; i += L.labelPerPage) {
    const pageCards = labelCards.slice(i, i + L.labelPerPage);
    const pageNum = Math.floor(i / L.labelPerPage) + 1;
    html += `
      <div class="page">
        <div class="page-title">Label Cards - Page ${pageNum}</div>
        <div class="grid" style="grid-template-rows: repeat(${L.labelRows}, ${L.labelHeight}cm); grid-auto-rows: ${L.labelHeight}cm; margin-left: ${labelGridMarginLeft}cm; margin-top: ${labelGridMarginTop}cm;">
          ${pageCards.join('')}
          ${pageCards.length < L.labelPerPage ? '<div></div>'.repeat(L.labelPerPage - pageCards.length) : ''}
        </div>
      </div>
    `;
  }

  html += `
  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
`;

  return html;
};

/**
 * Generate large cards print layout (images only, fills A4 as much as possible)
 * Returns HTML document string ready for printing
 */
export const generateLargeCards = ({
  cards,
  borderColor,
  fontFamily: _fontFamily,
  cardSizeCm = DEFAULT_CARD_SIZE_CM
}: GenerateCardsParams): string => {
  // For "Print Images Only", use the selected card size to determine grid
  const cols = Math.max(1, Math.floor(A4_WIDTH_CM / cardSizeCm));
  const rows = Math.max(1, Math.floor(A4_HEIGHT_CM / cardSizeCm));
  const perPage = cols * rows;
  const marginLeft = (A4_WIDTH_CM - (cardSizeCm * cols)) / 2;
  const marginTop = (A4_HEIGHT_CM - (cardSizeCm * rows)) / 2;

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Montessori Images - Print</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, sans-serif;
      background: white;
      position: relative;
    }

    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      padding: 0;
      margin: 0;
      position: relative;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .page-title {
      font-size: 10pt;
      color: #999;
      margin-bottom: 0.5cm;
      text-align: center;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(${cols}, ${cardSizeCm}cm);
      grid-template-rows: repeat(${rows}, ${cardSizeCm}cm);
      gap: 0;
      position: relative;
      margin-left: ${marginLeft}cm;
      margin-top: ${marginTop}cm;
      padding: 0;
    }

    .image-box {
      background: ${borderColor};
      padding: ${WHITE_BORDER_CM}cm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      margin: 0;
      border: none;
    }

    .image-inner {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: ${CARD_BORDER_RADIUS}cm;
    }

    .image-inner img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .page-title {
        display: none;
      }
    }

    @media screen {
      body {
        padding: 20px;
        background: #f0f0f0;
      }

      .page {
        background: white;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    }
  </style>
</head>
<body>
`;

  // Generate pages
  for (let i = 0; i < cards.length; i += perPage) {
    const pageCards = cards.slice(i, i + perPage);
    const pageNum = Math.floor(i / perPage) + 1;
    html += `
      <div class="page">
        <div class="page-title">Images - Page ${pageNum}</div>
        <div class="grid">
          ${pageCards.map(card => `
            <div class="image-box">
              <div class="image-inner">
                <img src="${sanitizeImageUrl(card.croppedImage)}" alt="${escapeHtml(card.label)}" style="${getObjectPosition(card)}">
              </div>
            </div>
          `).join('')}
          ${pageCards.length < perPage ? '<div></div>'.repeat(perPage - pageCards.length) : ''}
        </div>
      </div>
    `;
  }

  html += `
  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
`;

  return html;
};

/**
 * Generate labels-only print layout
 * Returns HTML document string ready for printing
 */
export const generateLabelsOnly = ({
  cards,
  borderColor,
  fontFamily,
  cardSizeCm = DEFAULT_CARD_SIZE_CM
}: GenerateCardsParams): string => {
  const L = computeLayout(cardSizeCm);
  const labelGridMarginLeft = (A4_WIDTH_CM - (L.cardSize * L.cols)) / 2;
  const labelGridMarginTop = (A4_HEIGHT_CM - (L.labelHeight * L.labelRows)) / 2;

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Label Cards - Print</title>
  <style>
    @page {
      size: A4;
      margin: ${MARGIN_CM}cm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, sans-serif;
      background: white;
      position: relative;
    }

    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      position: relative;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .page-title {
      font-size: 10pt;
      color: #999;
      margin-bottom: 0.5cm;
      text-align: center;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(${L.cols}, ${L.cardSize}cm);
      gap: 0;
      position: relative;
      margin: 0;
      padding: 0;
    }

    .card {
      background: ${borderColor};
      padding: ${WHITE_BORDER_CM}cm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      margin: 0;
      border: none;
      height: ${L.labelHeight}cm;
      width: ${L.cardSize}cm;
    }

    .label-area {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "${fontFamily}", cursive;
      font-size: ${L.fontSize}pt;
      font-weight: bold;
      text-align: center;
      padding: 0.2cm 0.3cm;
      line-height: 1.2;
      overflow: hidden;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: anywhere;
      hyphens: auto;
      max-width: 100%;
      border-radius: ${CARD_BORDER_RADIUS}cm;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      body { margin: 0; padding: 0; }
      .page-title { display: none; }
      .card { background: ${borderColor} !important; }
    }

    @media screen {
      body { padding: 20px; background: #f0f0f0; }
      .page { background: white; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
`;

  const labelCards = cards.map(card => {
    const fontPt = adaptiveLabelFontSize(card.label, L.fontSize, L.cardSize, L.labelHeight);
    return `
    <div class="card">
      <div class="label-area" style="font-size: ${fontPt}pt;">${escapeHtml(card.label)}</div>
    </div>
  `;
  });

  for (let i = 0; i < labelCards.length; i += L.labelPerPage) {
    const pageCards = labelCards.slice(i, i + L.labelPerPage);
    const pageNum = Math.floor(i / L.labelPerPage) + 1;
    html += `
      <div class="page">
        <div class="page-title">Label Cards - Page ${pageNum}</div>
        <div class="grid" style="grid-template-rows: repeat(${L.labelRows}, ${L.labelHeight}cm); margin-left: ${labelGridMarginLeft}cm; margin-top: ${labelGridMarginTop}cm;">
          ${pageCards.join('')}
          ${pageCards.length < L.labelPerPage ? '<div></div>'.repeat(L.labelPerPage - pageCards.length) : ''}
        </div>
      </div>
    `;
  }

  html += `
  <script>
    window.onload = function() { setTimeout(() => { window.print(); }, 500); };
  </script>
</body>
</html>
`;

  return html;
};

// ============================================================================
// STRIP LAYOUT — Sentence Match Cards
// ----------------------------------------------------------------------------
// Long horizontal sentence strips paired with square picture cards. Standard
// Montessori sentence-strip format: 21cm × ~7cm strips, full A4 page width.
// Used by the Sentence Match Picture Generator. The square Three-Part Card
// Generator continues to use the layout above unchanged.
// ============================================================================

/**
 * Compute strip-layout dimensions for sentence-match cards.
 *
 * `cardSizeCm` controls the strip height AND the picture-square edge length.
 * Standard Montessori sentence-strip sizing (after Nienhuis / AMI / AMS):
 * 6.5cm strip height with a 6.5cm square picture — fits 4 strips per A4 page.
 *
 * The standalone sentence card has dimensions IDENTICAL to the sentence
 * portion of the control card (14.5 × 6.5cm at default size). When you lay a
 * sentence card next to a picture card you reconstruct the control card's
 * full footprint exactly (21cm = full A4 width).
 *
 * Internal gap inside the control card = 1cm (= 0.5cm right-padding the
 * sentence card would have + 0.5cm left-padding the picture card would have).
 */
function computeStripLayout(cardSizeCm: number) {
  const stripHeight = cardSizeCm;          // e.g. 6.5cm
  const stripWidth = A4_WIDTH_CM;          // 21cm — full A4 width (control card width)
  const pictureSize = stripHeight;         // square picture at strip height: 6.5×6.5cm
  const sentenceWidth = stripWidth - pictureSize; // 14.5cm — matches sentence portion of control
  const internalGap = WHITE_BORDER_CM * 2; // 1cm gap inside control = right-pad + left-pad

  // Per-page counts
  const stripsPerPage = Math.max(1, Math.floor(A4_HEIGHT_CM / stripHeight));
  const picCols = Math.max(1, Math.floor(A4_WIDTH_CM / pictureSize));
  const picRows = Math.max(1, Math.floor(A4_HEIGHT_CM / pictureSize));
  const picPerPage = picCols * picRows;

  // Base font size for adaptive sizing. The adaptive algorithm SHRINKS from
  // this base — never grows above it — so the base must be high enough to
  // fill the available text area for short sentences. Calibrated so a typical
  // 4–6 word sentence renders on 2 lines at ~55pt in a 6.5cm strip.
  const fontSize = Math.max(28, Math.min(72, Math.round(stripHeight * 12)));

  return {
    stripHeight,
    stripWidth,
    sentenceWidth,
    pictureSize,
    internalGap,
    stripsPerPage,
    picCols,
    picRows,
    picPerPage,
    fontSize,
  };
}

/**
 * Adaptive font sizer for sentence strips. Same algorithm as the square version
 * but tuned for the longer text rectangle (full strip width minus the picture
 * square minus borders).
 */
/**
 * Compute a UNIFORM font size for an entire batch of sentences. Picks the
 * largest font where EVERY sentence in the batch fits on one line within the
 * given text area. Used so a teacher's printout has consistent letter sizing
 * across all cards instead of each card individually scaled.
 *
 * Returns MIN_PT if at least one sentence is too long to fit on one line at
 * MIN_PT — the per-card adaptive sizer in adaptiveStripFontSize() will then
 * fall back to wrapping for that specific card.
 */
function computeUniformStripFontSize(
  sentences: string[],
  basePt: number,
  textWidthCm: number,
  textHeightCm: number
): number {
  if (sentences.length === 0) return basePt;
  // Find the longest sentence (by char count) — that's the constraint
  let uniform = basePt;
  for (const s of sentences) {
    const fit = adaptiveStripFontSize(s, basePt, textWidthCm, textHeightCm);
    if (fit < uniform) uniform = fit;
  }
  return uniform;
}

function adaptiveStripFontSize(
  sentence: string,
  basePt: number,
  textWidthCm: number,
  textHeightCm: number
): number {
  // Padding allowance inside the white area (the .strip-text-area has
  // padding: 0.2cm 0.5cm) — leave a small margin for safety.
  const internalWidthPt = (textWidthCm - 0.4) * 28.35;
  const internalHeightPt = (textHeightCm - 0.3) * 28.35;
  const lineHeight = 1.2;
  // Comic Sans MS bold has a real average char width of ~0.52 of the font
  // size (proportional font; punctuation and "i" are narrow, "M"/"W" are
  // wide).
  const CHAR_W = 0.52;
  const MIN_PT = 14;

  // Pass 1 — SINGLE LINE PREFERENCE: find the largest font size where the
  // entire sentence fits on one line within the strip's text area. This is
  // the canonical Montessori sentence-strip presentation: one strip = one
  // sentence = one line.
  const totalChars = sentence.length;
  for (let fontSize = basePt; fontSize >= MIN_PT; fontSize--) {
    const lineWidth = totalChars * fontSize * CHAR_W;
    const lineHeightPt = fontSize * lineHeight;
    if (lineWidth <= internalWidthPt && lineHeightPt <= internalHeightPt) {
      return fontSize;
    }
  }

  // Pass 2 — fallback for sentences too long to fit on one line even at
  // MIN_PT. Wrap to as few lines as possible at MIN_PT.
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

/**
 * Generate strip-layout print: control strips (sentence-left + picture-right)
 * + square picture cards + sentence-only strips. Returns one HTML doc with
 * all three sets paginated for A4 printing.
 */
export const generateStripCards = ({
  cards,
  borderColor,
  fontFamily,
  cardSizeCm = 6.5,
}: GenerateCardsParams): string => {
  const L = computeStripLayout(cardSizeCm);

  // Sentence-text white area dimensions inside the control strip:
  //   total strip width
  //     − 2× outer border (left + right padding of the strip)
  //     − internal gap (1cm = where the two cards would meet if separated)
  //     − picture square width
  // = strip - 2×0.5 - 1 - 6.5 = stripWidth - 8.5  (= 12.5cm at default 6.5)
  const textWidthCm = L.stripWidth - WHITE_BORDER_CM * 2 - L.internalGap - L.pictureSize;
  const textHeightCm = L.stripHeight - WHITE_BORDER_CM * 2;

  // UNIFORM batch font size — calibrated to the NARROWER text area (control
  // sentence portion, 12.5cm at default). Applied to both control sentences
  // AND standalone sentence cards so they visually match — when a kid lays
  // the standalone sentence card on top of the control's sentence portion,
  // the text is the same size.
  const sentences = cards.map(c => c.label);
  const uniformFontPt = computeUniformStripFontSize(sentences, L.fontSize, textWidthCm, textHeightCm);

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sentence Match Cards - Print</title>
  <style>
    @page {
      size: A4;
      margin: ${MARGIN_CM}cm;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: system-ui, sans-serif;
      background: white;
      position: relative;
    }

    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      position: relative;
      overflow: hidden;
    }
    .page:last-child { page-break-after: auto; }

    .page-title {
      font-size: 10pt;
      color: #999;
      margin-bottom: 0.3cm;
      text-align: center;
    }

    /* === CONTROL STRIP — full A4 width (21cm), sentence + picture in one bordered piece === */
    .strip-control {
      background: ${borderColor};
      width: ${L.stripWidth}cm;
      height: ${L.stripHeight}cm;
      padding: ${WHITE_BORDER_CM}cm;
      display: flex;
      flex-direction: row;
      gap: ${L.internalGap}cm;
      box-sizing: border-box;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* === SENTENCE-ONLY STRIP — sentence-portion size (14.5cm at default), borders on all 4 sides === */
    .strip-sentence {
      background: ${borderColor};
      width: ${L.sentenceWidth}cm;
      height: ${L.stripHeight}cm;
      padding: ${WHITE_BORDER_CM}cm;
      box-sizing: border-box;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .strip-text-area {
      flex: 1;
      width: 100%;
      height: 100%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.2cm 0.5cm;
      font-family: "${fontFamily}", cursive;
      font-weight: bold;
      text-align: center;
      line-height: 1.25;
      color: #1f2937;
      overflow: hidden;
      word-wrap: break-word;
      word-break: break-word;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .strip-image-area {
      width: ${L.pictureSize - WHITE_BORDER_CM * 2}cm;
      height: ${L.pictureSize - WHITE_BORDER_CM * 2}cm;
      background: white;
      overflow: hidden;
      flex-shrink: 0;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .strip-image-area img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .strips-grid-control {
      display: grid;
      grid-template-columns: ${L.stripWidth}cm;
      grid-auto-rows: ${L.stripHeight}cm;
      gap: 0;
    }

    .strips-grid-sentence {
      display: grid;
      grid-template-columns: ${L.sentenceWidth}cm;
      grid-auto-rows: ${L.stripHeight}cm;
      gap: 0;
    }

    /* === PICTURE CARDS (square) === */
    .pic-grid {
      display: grid;
      grid-template-columns: repeat(${L.picCols}, ${L.pictureSize}cm);
      grid-auto-rows: ${L.pictureSize}cm;
      gap: 0;
    }

    .pic-card {
      background: ${borderColor};
      width: ${L.pictureSize}cm;
      height: ${L.pictureSize}cm;
      padding: ${WHITE_BORDER_CM}cm;
      box-sizing: border-box;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pic-card-inner {
      width: 100%;
      height: 100%;
      background: white;
      overflow: hidden;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pic-card-inner img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { margin: 0; padding: 0; }
      .page-title { display: none; }
      .strip, .pic-card { background: ${borderColor} !important; }
    }

    @media screen {
      body { padding: 20px; background: #f0f0f0; }
      .page { background: white; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
`;

  // Control strips: sentence-left + picture-right, full A4 width (21cm)
  for (let i = 0; i < cards.length; i += L.stripsPerPage) {
    const pageCards = cards.slice(i, i + L.stripsPerPage);
    const pageNum = Math.floor(i / L.stripsPerPage) + 1;
    html += `<div class="page">
      <div class="page-title">Control Strips - Page ${pageNum}</div>
      <div class="strips-grid-control">`;
    for (const card of pageCards) {
      html += `<div class="strip-control">
        <div class="strip-text-area" style="font-size: ${uniformFontPt}pt;">${escapeHtml(card.label)}</div>
        <div class="strip-image-area"><img src="${sanitizeImageUrl(card.croppedImage)}" alt="${escapeHtml(card.label)}" style="${getObjectPosition(card)}"></div>
      </div>`;
    }
    html += '</div></div>';
  }

  // Picture cards: square grid (each card identical in size to the picture portion of control)
  for (let i = 0; i < cards.length; i += L.picPerPage) {
    const pageCards = cards.slice(i, i + L.picPerPage);
    const pageNum = Math.floor(i / L.picPerPage) + 1;
    html += `<div class="page">
      <div class="page-title">Picture Cards - Page ${pageNum}</div>
      <div class="pic-grid">`;
    for (const card of pageCards) {
      html += `<div class="pic-card">
        <div class="pic-card-inner"><img src="${sanitizeImageUrl(card.croppedImage)}" alt="${escapeHtml(card.label)}" style="${getObjectPosition(card)}"></div>
      </div>`;
    }
    html += '</div></div>';
  }

  // Sentence strips: text-only, sentence-portion size (14.5cm wide × 6.5cm tall at default)
  // Each card identical in size to the sentence portion of the control card.
  for (let i = 0; i < cards.length; i += L.stripsPerPage) {
    const pageCards = cards.slice(i, i + L.stripsPerPage);
    const pageNum = Math.floor(i / L.stripsPerPage) + 1;
    html += `<div class="page">
      <div class="page-title">Sentence Strips - Page ${pageNum}</div>
      <div class="strips-grid-sentence">`;
    for (const card of pageCards) {
      // Same uniform font as the control sentence portion — when the
      // standalone sentence card is laid over the control's sentence half,
      // the text matches in size.
      html += `<div class="strip-sentence">
        <div class="strip-text-area" style="font-size: ${uniformFontPt}pt;">${escapeHtml(card.label)}</div>
      </div>`;
    }
    html += '</div></div>';
  }

  html += `
  <script>
    window.onload = function() { setTimeout(() => { window.print(); }, 500); };
  </script>
</body>
</html>`;

  return html;
};

/**
 * Strip-layout images-only print: just the square picture cards.
 */
export const generateStripImagesOnly = ({
  cards,
  borderColor,
  fontFamily: _fontFamily,
  cardSizeCm = 6.5,
}: GenerateCardsParams): string => {
  const L = computeStripLayout(cardSizeCm);

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sentence Match Pictures - Print</title>
  <style>
    @page { size: A4; margin: ${MARGIN_CM}cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: white; }
    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      position: relative;
      overflow: hidden;
    }
    .page:last-child { page-break-after: auto; }
    .page-title { font-size: 10pt; color: #999; margin-bottom: 0.3cm; text-align: center; }
    .pic-grid {
      display: grid;
      grid-template-columns: repeat(${L.picCols}, ${L.pictureSize}cm);
      grid-auto-rows: ${L.pictureSize}cm;
      gap: 0;
    }
    .pic-card {
      background: ${borderColor};
      width: ${L.pictureSize}cm;
      height: ${L.pictureSize}cm;
      padding: ${WHITE_BORDER_CM}cm;
      box-sizing: border-box;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pic-card-inner {
      width: 100%; height: 100%;
      background: white; overflow: hidden;
      border-radius: ${CARD_BORDER_RADIUS}cm;
    }
    .pic-card-inner img { width: 100%; height: 100%; object-fit: cover; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; padding: 0; }
      .page-title { display: none; }
      .pic-card { background: ${borderColor} !important; }
    }
    @media screen { body { padding: 20px; background: #f0f0f0; } .page { background: white; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); } }
  </style>
</head>
<body>`;

  for (let i = 0; i < cards.length; i += L.picPerPage) {
    const pageCards = cards.slice(i, i + L.picPerPage);
    const pageNum = Math.floor(i / L.picPerPage) + 1;
    html += `<div class="page">
      <div class="page-title">Pictures - Page ${pageNum}</div>
      <div class="pic-grid">`;
    for (const card of pageCards) {
      html += `<div class="pic-card">
        <div class="pic-card-inner"><img src="${sanitizeImageUrl(card.croppedImage)}" alt="${escapeHtml(card.label)}" style="${getObjectPosition(card)}"></div>
      </div>`;
    }
    html += '</div></div>';
  }

  html += `<script>window.onload = function(){setTimeout(()=>window.print(),500);};</script></body></html>`;
  return html;
};

/**
 * Strip-layout sentences-only print: full A4-width text strips, no images.
 */
export const generateStripSentencesOnly = ({
  cards,
  borderColor,
  fontFamily,
  cardSizeCm = 6.5,
}: GenerateCardsParams): string => {
  const L = computeStripLayout(cardSizeCm);
  // Use the NARROWER text area (control sentence portion) as the sizing
  // constraint so the standalone sentence cards' text matches the control
  // sentence portion when the user prints both sets and lays them on top.
  const controlTextWidthCm = L.stripWidth - WHITE_BORDER_CM * 2 - L.internalGap - L.pictureSize;
  const textHeightCm = L.stripHeight - WHITE_BORDER_CM * 2;
  // UNIFORM batch font size across all sentence strips
  const sentences = cards.map(c => c.label);
  const uniformFontPt = computeUniformStripFontSize(sentences, L.fontSize, controlTextWidthCm, textHeightCm);

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sentence Strips - Print</title>
  <style>
    @page { size: A4; margin: ${MARGIN_CM}cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: white; }
    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      position: relative;
      overflow: hidden;
    }
    .page:last-child { page-break-after: auto; }
    .page-title { font-size: 10pt; color: #999; margin-bottom: 0.3cm; text-align: center; }
    .strips-grid {
      display: grid;
      grid-template-columns: ${L.sentenceWidth}cm;
      grid-auto-rows: ${L.stripHeight}cm;
      gap: 0;
    }
    .strip {
      background: ${borderColor};
      width: ${L.sentenceWidth}cm;
      height: ${L.stripHeight}cm;
      padding: ${WHITE_BORDER_CM}cm;
      box-sizing: border-box;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .strip-text-area {
      width: 100%; height: 100%;
      background: white;
      display: flex; align-items: center; justify-content: center;
      padding: 0.2cm 0.5cm;
      font-family: "${fontFamily}", cursive;
      font-weight: bold;
      text-align: center;
      line-height: 1.25;
      color: #1f2937;
      overflow: hidden;
      word-wrap: break-word;
      word-break: break-word;
      border-radius: ${CARD_BORDER_RADIUS}cm;
    }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; padding: 0; }
      .page-title { display: none; }
      .strip { background: ${borderColor} !important; }
    }
    @media screen { body { padding: 20px; background: #f0f0f0; } .page { background: white; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); } }
  </style>
</head>
<body>`;

  for (let i = 0; i < cards.length; i += L.stripsPerPage) {
    const pageCards = cards.slice(i, i + L.stripsPerPage);
    const pageNum = Math.floor(i / L.stripsPerPage) + 1;
    html += `<div class="page">
      <div class="page-title">Sentence Strips - Page ${pageNum}</div>
      <div class="strips-grid">`;
    for (const card of pageCards) {
      html += `<div class="strip">
        <div class="strip-text-area" style="font-size: ${uniformFontPt}pt;">${escapeHtml(card.label)}</div>
      </div>`;
    }
    html += '</div></div>';
  }

  html += `<script>window.onload = function(){setTimeout(()=>window.print(),500);};</script></body></html>`;
  return html;
};
