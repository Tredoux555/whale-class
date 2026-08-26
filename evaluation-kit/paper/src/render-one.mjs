/**
 * Montree Milestones — resumable single-pack PDF renderer.
 *
 * `render.mjs` renders every pack in one process. That is the right tool on a build box, but
 * it needs several minutes of uninterrupted wall clock, which some remote/sandboxed shells do
 * not give you (processes are killed when the calling shell returns). This driver renders ONE
 * document, one unit at a time, caching each unit's PDF on disk. Re-run it until it prints
 * COMPLETE — every run picks up where the last one stopped. Output is byte-for-byte the same
 * pipeline as render.mjs: the same CHROME table, the same header/footer templates, the same
 * per-unit printing that makes `N OF M` resolve section-relative.
 *
 * Usage:
 *   node render-one.mjs <pack.html> <out.pdf> [cacheDir] [budgetMs]
 *
 * Exit codes: 0 = complete (PDF written) · 2 = partial, run again · 1 = error.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, basename } from 'node:path';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { PAGE, CHROME, headerTemplate, footerTemplate, EMPTY } from './render.mjs';

const [, , htmlArg, outArg, cacheArg, budgetArg] = process.argv;
if (!htmlArg || !outArg) {
  console.error('usage: node render-one.mjs <pack.html> <out.pdf> [cacheDir] [budgetMs]');
  process.exit(1);
}
const htmlPath = resolve(htmlArg);
const outPath = resolve(outArg);
const cacheDir = resolve(cacheArg || `/tmp/montree-render/${basename(htmlPath, '.html')}`);
const budgetMs = Number(budgetArg || 32000);
mkdirSync(cacheDir, { recursive: true });

const bankVersion = (/Item bank ([0-9][^ <·]*)/.exec(readFileSync(htmlPath, 'utf8')) || [, '?'])[1];
const stamp = `Bank ${bankVersion}`;
const t0 = Date.now();

const browser = await chromium.launch();
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

await page.addStyleTag({
  content: `body[data-only] section.unit{display:none!important}
    body[data-only] section.unit.only{display:block!important;break-after:auto;page-break-after:auto}`,
});

const unitFile = (i) => resolve(cacheDir, `unit-${String(i).padStart(2, '0')}.pdf`);
let rendered = 0;
let stopped = false;

for (const u of units) {
  if (existsSync(unitFile(u.i))) continue;
  if (Date.now() - t0 > budgetMs) { stopped = true; break; }
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
  writeFileSync(unitFile(u.i), buf);
  rendered++;
  console.log(`unit ${u.i}/${units.length - 1} ${u.kind} — ${(buf.length / 1024).toFixed(0)} KB`);
}
await browser.close();

const done = units.filter((u) => existsSync(unitFile(u.i))).length;
console.log(`cached ${done}/${units.length} units (this run: ${rendered}, ${Date.now() - t0} ms)`);

if (done < units.length || stopped) {
  console.log(`PARTIAL — re-run to continue (cache: ${cacheDir})`);
  process.exit(2);
}

const merged = await PDFDocument.create();
for (const u of units) {
  const src = await PDFDocument.load(readFileSync(unitFile(u.i)));
  const pages = await merged.copyPages(src, src.getPageIndices());
  for (const pg of pages) merged.addPage(pg);
}
const bytes = await merged.save();
writeFileSync(outPath, bytes);
console.log(`COMPLETE ${basename(outPath)} — ${merged.getPageCount()} pages, ${(bytes.length / 1024).toFixed(0)} KB`);
