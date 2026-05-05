import { SortingMatConfig, SortingMatCount } from './types';
import { escapeHtml } from '@/lib/sanitize';

const A4_WIDTH_CM = 21;
const A4_HEIGHT_CM = 29.7;
const PAGE_MARGIN_CM = 1;
const CIRCLE_BORDER_CM = 0.3;

/**
 * Layout spec per circle count. Each entry returns the circle diameter (cm)
 * and a CSS grid-template that arranges them on the A4 page below the title.
 */
function getLayoutSpec(count: SortingMatCount): {
  diameter: number;
  gridTemplate: string;
  gap: number;
  /** When true, the third (last) circle spans both columns of a 2-col grid
   *  so 3 circles render in a triangular 2-top + 1-bottom-centred layout. */
  triangleBottomSpan: boolean;
} {
  switch (count) {
    case 2:
      // Two large circles side-by-side
      return { diameter: 9.5, gridTemplate: '1fr 1fr', gap: 1, triangleBottomSpan: false };
    case 3:
      // Triangular: 2 circles on top, 1 centred below
      return { diameter: 9, gridTemplate: '1fr 1fr', gap: 1, triangleBottomSpan: true };
    case 4:
      // 2×2 grid
      return { diameter: 9, gridTemplate: '1fr 1fr', gap: 1, triangleBottomSpan: false };
  }
}

/**
 * Render a single circle (border + label at top inside the circle).
 */
function renderCircle(label: string, diameter: number, borderColor: string, fontFamily: string): string {
  // Font size scales with the circle diameter — readable from across the room
  // but not so big it crowds the sorting space.
  const fontPt = Math.max(20, Math.min(48, Math.round(diameter * 4)));
  return `
    <div class="circle" style="
      width: ${diameter}cm;
      height: ${diameter}cm;
      border: ${CIRCLE_BORDER_CM}cm solid ${borderColor};
    ">
      <div class="circle-label" style="
        font-family: '${fontFamily}', cursive;
        font-size: ${fontPt}pt;
      ">${escapeHtml(label)}</div>
    </div>
  `;
}

/**
 * Generate the printable HTML for a sorting mat. Returns a full HTML document
 * ready to write into a print window — same pattern as the card-generator
 * print-utils so the user's existing "open print, save as PDF" muscle memory
 * carries over.
 */
export function generateSortingMat(config: SortingMatConfig): string {
  const { title, count, labels, borderColor, fontFamily } = config;
  const spec = getLayoutSpec(count);

  // Grid cells — render circles centred in their grid cell
  const cells: string[] = [];
  for (let i = 0; i < count; i++) {
    const isTriangleBottom = spec.triangleBottomSpan && i === count - 1;
    const cellStyle = isTriangleBottom
      ? 'grid-column: 1 / span 2; display: flex; justify-content: center;'
      : 'display: flex; justify-content: center; align-items: center;';
    cells.push(`
      <div class="grid-cell" style="${cellStyle}">
        ${renderCircle(labels[i] || '', spec.diameter, borderColor, fontFamily)}
      </div>
    `);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sorting Mat — Print</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: system-ui, sans-serif;
      background: white;
    }

    .page {
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      padding: ${PAGE_MARGIN_CM}cm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .page:last-child { page-break-after: auto; }

    .mat-title {
      font-family: '${fontFamily}', cursive;
      font-weight: bold;
      font-size: 32pt;
      text-align: center;
      color: #1f2937;
      padding: 0.5cm 0;
      flex-shrink: 0;
    }

    .mat-grid {
      flex: 1;
      display: grid;
      grid-template-columns: ${spec.gridTemplate};
      gap: ${spec.gap}cm;
      align-content: center;
      padding: 0.3cm 0;
    }

    .grid-cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .circle {
      background: white;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 1cm;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .circle-label {
      font-weight: bold;
      color: #1f2937;
      text-align: center;
      line-height: 1.1;
      max-width: 80%;
      word-wrap: break-word;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .circle {
        border-color: ${borderColor} !important;
      }
    }

    @media screen {
      body { padding: 20px; background: #f0f0f0; }
      .page {
        background: white;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    }
  </style>
</head>
<body>
  <div class="page">
    ${title ? `<div class="mat-title">${escapeHtml(title)}</div>` : ''}
    <div class="mat-grid">
      ${cells.join('')}
    </div>
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 500); };
  </script>
</body>
</html>`;
}
