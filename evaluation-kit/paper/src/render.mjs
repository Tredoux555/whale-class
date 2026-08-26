/**
 * Montree Milestones — paper pack PDF renderer.
 *
 * Loads each generated HTML document with Playwright/Chromium and prints it to A4 portrait,
 * one PDF per pack:
 *
 *   D3_paper_pack_<ageBand>_form<Form>.pdf   (8: A3/A4/A5/G1 × A/B)
 *   D3_scoring_sheets_only.pdf               (1)
 *
 * Each document is printed unit by unit — a unit is one run of pages sharing a running header
 * (`GUIDE`, `SCRIPT · WORD & SOUND PLAY`, `RECORD SHEET · …`). Printing per unit is what makes
 * Chromium's `pageNumber`/`totalPages` resolve to the section-relative `N OF M` the packs use,
 * and it keeps the page chrome (header/footer/margins) correct for cover, divider, teacher and
 * child pages, which differ. The per-unit PDFs are then concatenated with pdf-lib. Inside a unit
 * the flow is ordinary CSS pagination — nothing is hand-placed.
 *
 * Chromium must already be installed. `playwright install` is never run from here.
 *
 * Usage:  node render.mjs [htmlDir] [outDir]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, basename } from 'node:path';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAPER_DIR = resolve(HERE, '..');

/* A4 as the original packs measure: 209.9 × 297.0 mm = 594.96 × 841.92 pt.
   Chromium quantises the requested paper width, so '209.9mm' lands on 595.92 pt; '8.2633in'
   (the same 209.9 mm expressed in inches) is the value that reproduces 594.96 pt exactly. */
export const PAGE = { width: '8.2633in', height: '297.0mm' };

/** Page chrome per unit kind. */
export const CHROME = {
  cover: { header: false, footer: false, margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' } },
  child: { header: false, footer: false, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } },
  divider: { header: true, footer: false, margin: { top: '20mm', bottom: '15mm', left: '18mm', right: '18mm' } },
  teacher: { header: true, footer: true, margin: { top: '20mm', bottom: '15mm', left: '18mm', right: '18mm' } },
};

const CHROME_CSS = `
  <style>
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .bar{width:100%;font-family:'Work Sans','Helvetica Neue',Arial,sans-serif;
      font-size:6.4pt;color:#8a827a;display:flex;justify-content:space-between;
      align-items:baseline;letter-spacing:.1em;text-transform:uppercase;font-weight:500}
    .bar .r{text-align:right;white-space:nowrap}
    .foot{text-transform:none;letter-spacing:0;font-size:6.4pt;border-top:.2mm solid #e7e2db;
      padding-top:1.5mm}
    .foot .r{letter-spacing:.08em;text-transform:uppercase}
  </style>`;

export const headerTemplate = (left, right, numbered) => `
  ${CHROME_CSS}
  <div style="width:100%;padding:6mm 18mm 0">
    <div class="bar"><div class="l">${left}</div><div class="r">${right}${
      numbered ? ' · <span class="pageNumber"></span> of <span class="totalPages"></span>' : ''
    }</div></div>
  </div>`;

export const footerTemplate = (stamp) => `
  ${CHROME_CSS}
  <div style="width:100%;padding:0 18mm 8mm">
    <div class="bar foot"><div class="l">A developmental check-in, not a test. Criterion-referenced;
      no ranking, no percentiles.</div><div class="r">${stamp}</div></div>
  </div>`;

export const EMPTY = '<span></span>';

/** Render one HTML document to a single merged PDF buffer. */
export async function renderDocument(browser, htmlPath, bankVersion) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });

  const units = await page.$$eval('section.unit', (nodes) =>
    nodes.map((n, i) => ({
      i,
      kind: n.dataset.kind,
      hdr: n.dataset.hdr || '',
      hdrLeft: n.dataset.hdrLeft || '',
      numbered: n.dataset.numbered === '1',
    })),
  );

  // Isolation stylesheet: show exactly one unit at a time so each section paginates on its own.
  await page.addStyleTag({
    content: `body[data-only] section.unit{display:none!important}
      body[data-only] section.unit.only{display:block!important;break-after:auto;page-break-after:auto}`,
  });

  const stamp = `Bank ${bankVersion}`;
  const parts = [];
  for (const u of units) {
    await page.evaluate((i) => {
      document.body.dataset.only = String(i);
      document.querySelectorAll('section.unit').forEach((n, j) => n.classList.toggle('only', i === j));
    }, u.i);

    const chrome = CHROME[u.kind] ?? CHROME.teacher;
    const buf = await page.pdf({
      width: PAGE.width,
      height: PAGE.height,
      printBackground: true,
      preferCSSPageSize: false,
      margin: chrome.margin,
      displayHeaderFooter: chrome.header || chrome.footer,
      headerTemplate: chrome.header ? headerTemplate(u.hdrLeft, u.hdr, u.numbered) : EMPTY,
      footerTemplate: chrome.footer ? footerTemplate(stamp) : EMPTY,
    });
    parts.push({ buf, unit: u });
  }
  await page.close();

  const merged = await PDFDocument.create();
  const perUnit = [];
  for (const p of parts) {
    const src = await PDFDocument.load(p.buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const pg of pages) merged.addPage(pg);
    perUnit.push({ ...p.unit, pages: src.getPageCount() });
  }
  return { bytes: await merged.save(), perUnit };
}

/**
 * Map a generated HTML filename to its PDF name. The band pattern is `[A-Z]\d` rather than
 * `A\d` on purpose: Montree Canopy is band `G1`, and the earlier `A\d`-only pattern threw on
 * pack_G1_A.html, which is why no Canopy PDF was ever emitted. Returns null for anything
 * unrecognised so renderAll can skip rather than crash.
 */
export function outputNameFor(file) {
  if (file === 'scoring_sheets_only.html') return 'D3_scoring_sheets_only.pdf';
  const m = /^pack_([A-Z]\d)_([AB])\.html$/.exec(file);
  return m ? `D3_paper_pack_${m[1]}_form${m[2]}.pdf` : null;
}

export async function renderAll(htmlDir = resolve(PAPER_DIR, 'build'), outDir = PAPER_DIR) {
  mkdirSync(outDir, { recursive: true });

  // Version stamp is copied verbatim from the bank, via the generated cover.
  const files = readdirSync(htmlDir).filter((f) => f.endsWith('.html')).sort();
  const first = readFileSync(resolve(htmlDir, files[0]), 'utf8');
  const bankVersion = (/Item bank ([0-9][^ <·]*)/.exec(first) || [, '?'])[1];

  const browser = await chromium.launch();
  const report = [];
  try {
    for (const f of files) {
      const out = outputNameFor(f);
      if (!out) {
        console.warn(`skipping ${f} — not a recognised pack filename`);
        continue;
      }
      const t0 = Date.now();
      const { bytes, perUnit } = await renderDocument(browser, resolve(htmlDir, f), bankVersion);
      writeFileSync(resolve(outDir, out), bytes);
      report.push({ out, pages: perUnit.reduce((n, u) => n + u.pages, 0), perUnit, ms: Date.now() - t0 });
      console.log(
        `${out}  ${report[report.length - 1].pages} pages  ${(bytes.length / 1024).toFixed(0)} KB  ${
          Date.now() - t0
        } ms`,
      );
    }
  } finally {
    await browser.close();
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const htmlDir = process.argv[2] ? resolve(process.argv[2]) : resolve(PAPER_DIR, 'build');
  const outDir = process.argv[3] ? resolve(process.argv[3]) : PAPER_DIR;
  const report = await renderAll(htmlDir, outDir);
  console.log('\nunit breakdown (first document):');
  for (const u of report[0].perUnit)
    console.log(`  ${String(u.pages).padStart(3)}  ${u.kind.padEnd(8)} ${u.hdr}`);
}
