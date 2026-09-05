// lib/montree/writing-shelf/generator/page-shell.ts
//
// The print-window document that every Writing Shelf generator emits.
//
// The one structural rule: `@page { margin: 0 }`. A non-zero @page margin is
// resolved against the printable area, which is NOT the same box on the front
// and the back of a sheet on most printers — that alone throws a duplex job
// out by several millimetres, before any per-printer calibration is applied.
// So the page box is the FULL physical sheet and every position inside it is
// absolute, in millimetres, from the paper's own edges.

import { CUT_GUIDE_CSS, escapeHtml } from './cut-guides';
import { PRINT_FONT_STACK, andikaFontFaceCss } from '../../print/fonts';

export type Paper = 'A4' | 'A3';
export type Orientation = 'portrait' | 'landscape';

/** Millimetres, short edge first. */
const PAPER_MM: Record<Paper, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
};

export interface PageSize {
  width: number;
  height: number;
}

export function pageSize(paper: Paper, orientation: Orientation): PageSize {
  const [short, long] = PAPER_MM[paper];
  return orientation === 'portrait'
    ? { width: short, height: long }
    : { width: long, height: short };
}

/** Re-exported so callers of this library need only one import. */
export { PRINT_FONT_STACK as KIDS_FONT, andikaFontFaceCss } from '../../print/fonts';

export interface PrintPage {
  /** Complete inner HTML of this printed side. */
  html: string;
  /**
   * Optional inline style for the page box itself — this is where the duplex
   * calibration transform goes, on BACK pages only. Empty at the 0/0 default,
   * so an uncalibrated back page keeps exactly the front page's box tree.
   */
  style?: string;
}

export interface PrintDocumentOptions {
  title: string;
  paper: Paper;
  orientation: Orientation;
  /** The printed sides, in order. */
  pages: Array<PrintPage | string>;
  /** Extra CSS appended after the shell's own. */
  css?: string;
  /** @font-face rules. Defaults to the bundled Andika at absolute /fonts urls. */
  fontFaceCss?: string;
}

export function printDocument(options: PrintDocumentOptions): string {
  const { title, paper, orientation, pages, css = '', fontFaceCss = andikaFontFaceCss() } = options;
  const { width, height } = pageSize(paper, orientation);

  const body = pages
    .map((page) => {
      const p: PrintPage = typeof page === 'string' ? { html: page } : page;
      const style = p.style ? ` style="${p.style}"` : '';
      return `<div class="page"${style}>${p.html}</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
${fontFaceCss}
  /* 🔒 DUPLEX REGISTRATION — @page margin MUST stay 0. See the note at the
     top of page-shell.ts. */
  @page { size: ${paper} ${orientation}; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: ${PRINT_FONT_STACK}; color: #141110; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page {
    position: relative;
    width: ${width}mm;
    height: ${height}mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  ${CUT_GUIDE_CSS}
  ${css}
</style></head><body>
${body}
</body></html>`;
}
