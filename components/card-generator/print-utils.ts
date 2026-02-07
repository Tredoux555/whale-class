import { Card } from './types';

// Constants for card dimensions (in cm)
const A4_WIDTH_CM = 21;
const A4_HEIGHT_CM = 29.7;
const PICTURE_CARD_SIZE_CM = 7.5;
const LABEL_INTERNAL_CM = 1.8;
const LABEL_CARD_HEIGHT_CM = 2.4;
const MARGIN_CM = 0;
const CUTTING_LINE_WIDTH = 0.02;
const WHITE_BORDER_CM = 0.5;
const CARD_BORDER_RADIUS = 0.4;

interface CreateCardHTMLParams {
  card: Card;
  type: 'control' | 'picture' | 'label';
}

/**
 * Helper function to create HTML for a single card
 */
const createCardHTML = ({ card, type }: CreateCardHTMLParams): string => {
  if (type === 'control') {
    return `
      <div class="card card-control">
        <div class="image-area">
          <img src="${card.croppedImage}" alt="${card.label}">
        </div>
        <div class="label-area">${card.label}</div>
      </div>
    `;
  } else if (type === 'picture') {
    return `
      <div class="card card-picture">
        <div class="image-area">
          <img src="${card.croppedImage}" alt="${card.label}">
        </div>
      </div>
    `;
  } else {
    return `
      <div class="card card-label-only">
        <div class="label-area" style="flex: 1;">${card.label}</div>
      </div>
    `;
  }
};

interface GenerateCardsParams {
  cards: Card[];
  borderColor: string;
  fontFamily: string;
}

/**
 * Generate standard size print layout (control, picture, and label cards)
 * Returns HTML document string ready for printing
 */
export const generateCards = ({
  cards,
  borderColor,
  fontFamily
}: GenerateCardsParams): string => {
  const CONTROL_CARD_HEIGHT_CM = PICTURE_CARD_SIZE_CM + LABEL_CARD_HEIGHT_CM;
  const gridMarginLeft = (A4_WIDTH_CM - (PICTURE_CARD_SIZE_CM * 2)) / 2;
  const pictureGridMarginTop = (A4_HEIGHT_CM - (PICTURE_CARD_SIZE_CM * 3)) / 2;
  const controlGridMarginTop = (A4_HEIGHT_CM - (CONTROL_CARD_HEIGHT_CM * 3)) / 2;
  const labelGridMarginTop = (A4_HEIGHT_CM - (LABEL_CARD_HEIGHT_CM * 8)) / 2;

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
      grid-template-columns: ${PICTURE_CARD_SIZE_CM}cm ${PICTURE_CARD_SIZE_CM}cm;
      gap: 0;
      position: relative;
      margin: 0;
      padding: 0;
    }
    
    .grid-picture {
      grid-template-rows: repeat(3, ${PICTURE_CARD_SIZE_CM}cm);
      margin-left: ${gridMarginLeft}cm;
      margin-top: ${pictureGridMarginTop}cm;
    }
    
    .grid-control {
      grid-template-rows: repeat(3, ${CONTROL_CARD_HEIGHT_CM}cm);
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
      height: ${CONTROL_CARD_HEIGHT_CM}cm;
      width: ${PICTURE_CARD_SIZE_CM}cm;
    }
    
    .card-picture {
      height: ${PICTURE_CARD_SIZE_CM}cm;
      width: ${PICTURE_CARD_SIZE_CM}cm;
    }
    
    .card-label-only {
      height: ${LABEL_CARD_HEIGHT_CM}cm;
      width: ${PICTURE_CARD_SIZE_CM}cm;
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
      height: ${LABEL_INTERNAL_CM}cm;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "${fontFamily}", cursive;
      font-size: 24pt;
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

  // Generate Control Cards pages (6 per page in 2x3 grid)
  const controlCards = cards.map(card => createCardHTML({ card, type: 'control' }));
  for (let i = 0; i < controlCards.length; i += 6) {
    const pageCards = controlCards.slice(i, i + 6);
    const pageNum = Math.floor(i / 6) + 1;
    html += `
      <div class="page page-has-3rows-control">
        <div class="page-title">Control Cards - Page ${pageNum}</div>
        <div class="grid grid-control">
          ${pageCards.join('')}
          ${pageCards.length < 6 ? '<div></div>'.repeat(6 - pageCards.length) : ''}
        </div>
      </div>
    `;
  }

  // Generate Picture Cards pages (6 per page in 2x3 grid)
  const pictureCards = cards.map(card => createCardHTML({ card, type: 'picture' }));
  for (let i = 0; i < pictureCards.length; i += 6) {
    const pageCards = pictureCards.slice(i, i + 6);
    const pageNum = Math.floor(i / 6) + 1;
    html += `
      <div class="page page-has-3rows-picture">
        <div class="page-title">Picture Cards - Page ${pageNum}</div>
        <div class="grid grid-picture">
          ${pageCards.join('')}
          ${pageCards.length < 6 ? '<div></div>'.repeat(6 - pageCards.length) : ''}
        </div>
      </div>
    `;
  }

  // Generate Label Cards pages (16 per page in 2x8 grid)
  const labelCards = cards.map(card => createCardHTML({ card, type: 'label' }));
  const labelGridMarginLeft = (A4_WIDTH_CM - (PICTURE_CARD_SIZE_CM * 2)) / 2;
  for (let i = 0; i < labelCards.length; i += 16) {
    const pageCards = labelCards.slice(i, i + 16);
    const pageNum = Math.floor(i / 16) + 1;
    html += `
      <div class="page">
        <div class="page-title">Label Cards - Page ${pageNum}</div>
        <div class="grid" style="grid-template-rows: repeat(8, ${LABEL_CARD_HEIGHT_CM}cm); grid-auto-rows: ${LABEL_CARD_HEIGHT_CM}cm; margin-left: ${labelGridMarginLeft}cm; margin-top: ${labelGridMarginTop}cm;">
          ${pageCards.join('')}
          ${pageCards.length < 16 ? '<div></div>'.repeat(16 - pageCards.length) : ''}
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
 * Generate large cards print layout (4 images per A4 page in 2x2 grid)
 * Returns HTML document string ready for printing
 */
export const generateLargeCards = ({
  cards,
  borderColor,
  fontFamily: _fontFamily
}: GenerateCardsParams): string => {
  const MARGIN_CM = 0;
  const WHITE_BORDER_CM = 0.5;
  const CARD_BORDER_RADIUS = 0.4;
  
  const usableWidth = A4_WIDTH_CM - (2 * MARGIN_CM);
  const usableHeight = A4_HEIGHT_CM - (2 * MARGIN_CM);
  
  const imageSize = Math.min(
    usableWidth / 2,
    usableHeight / 2
  );

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
      grid-template-columns: ${imageSize}cm ${imageSize}cm;
      grid-template-rows: ${imageSize}cm ${imageSize}cm;
      gap: 0;
      position: relative;
      margin: 0 auto;
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

  // Generate pages with 4 images each
  for (let i = 0; i < cards.length; i += 4) {
    const pageCards = cards.slice(i, i + 4);
    const pageNum = Math.floor(i / 4) + 1;
    html += `
      <div class="page">
        <div class="page-title">Images - Page ${pageNum}</div>
        <div class="grid">
          ${pageCards.map(card => `
            <div class="image-box">
              <div class="image-inner">
                <img src="${card.croppedImage}" alt="${card.label}">
              </div>
            </div>
          `).join('')}
          ${pageCards.length < 4 ? '<div></div>'.repeat(4 - pageCards.length) : ''}
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
