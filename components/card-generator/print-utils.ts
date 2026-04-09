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

  let fontSize = basePt;
  while (fontSize > 12) {
    // Approximate character width for bold Comic Sans / Nunito
    const charWidth = fontSize * 0.58;
    const charsPerLine = Math.max(1, Math.floor(internalWidthPt / charWidth));
    // Count wrapped lines (split on spaces to avoid mid-word breaks)
    const words = label.split(/\s+/);
    let lines = 1;
    let currentLineLen = 0;
    for (const w of words) {
      if (currentLineLen > 0 && currentLineLen + 1 + w.length > charsPerLine) {
        lines++;
        currentLineLen = w.length;
      } else {
        currentLineLen += (currentLineLen > 0 ? 1 : 0) + w.length;
      }
    }
    const totalHeightPt = lines * fontSize * lineHeight;
    if (totalHeightPt <= internalHeightPt) break;
    fontSize -= 1;
  }
  return Math.max(12, fontSize);
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
