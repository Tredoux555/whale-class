#!/usr/bin/env node
/**
 * scripts/curriculum/satpin-paperwork/build_three_part.mjs
 *
 * Standalone, offline reproduction of the three-part-cards trio for a Dark
 * Phonics cast book (the-sat, the-pit, the-spat, ...) — same visual output as
 * make-material.mjs's `three_part_cards` builder, without needing that script's
 * loadEngine() bootstrap (which requires lib/montree/english-curriculum/render/
 * *.ts sources that are not present in every checkout — this container only
 * ships the pre-built scripts/curriculum/dist/render-engine.mjs bundle).
 *
 * This script does NOT modify make-material.mjs, engine.mjs, chrome.mjs,
 * render-engine.mjs, or split_three_part.py. It imports the committed
 * render-engine bundle directly (buildMaterial/buildAssetMap — the exact same
 * template code that produced the reference public/dark-phonics-materials/
 * <book>/three-part-cards-{control,pictures,labels}.pdf files), drives Chrome
 * via the existing lib/chrome.mjs helper, and shells out to the existing
 * split_three_part.py to cut the 3-page source into the three final PDFs.
 *
 * Usage:
 *   node build_three_part.mjs --slug the-sat \
 *     --words ant,snake,star,cat \
 *     --art /path/sat-p1.png,/path/sat-p2.png,/path/sat-p5.png,/path/sat-p6.png \
 *     --outdir /path/to/outdir
 *
 * Words and --art are paired by position (word[i] uses art[i]). --outdir gets:
 *   three_part_cards_source.pdf   (the 3-page control/pictures/labels source)
 *   three-part-cards-control.pdf
 *   three-part-cards-pictures.pdf
 *   three-part-cards-labels.pdf
 *
 * Picture fit is "cover" (crop-to-fill), matching the Dark Phonics cast-book
 * look used in the reference trio (see materials.config.json's _twoTracks note
 * — this is deliberately the OTHER track from the Montessori Picture Bank's
 * contain-on-white shelf cards).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CURRICULUM_DIR = path.join(__dirname, '..'); // scripts/curriculum
const ENGINE_DIST = path.join(CURRICULUM_DIR, 'dist', 'render-engine.mjs');
const CHROME_LIB = path.join(CURRICULUM_DIR, 'lib', 'chrome.mjs');
const SPLIT_PY = path.join(__dirname, 'split_three_part.py');

// System-installed Andika (fonts-sil-andika package) — same family the
// reference cards use. Falls back to whatever the caller passes via
// --font-dir, or to Chrome's generic cursive fallback if neither exists.
const SYSTEM_ANDIKA_DIRS = [
  '/usr/share/fonts/truetype/andika',
  path.join(CURRICULUM_DIR, '..', '..', 'public', 'fonts'), // repo convention, if ever present
];

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : def;
}
function flag(name) { return process.argv.includes(`--${name}`); }
function list(name) {
  return (arg(name, '') || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function usage() {
  console.log(`
build_three_part.mjs — reproduce a three-part-cards trio offline, using the
same render-engine template make-material.mjs uses.

  --slug <book-slug>     e.g. the-sat (used only for naming/log output)
  --words w1,w2,...      words, paired by position with --art
  --art p1.png,p2.png    absolute paths to the matching artwork, same order
  --outdir <dir>         where to write the source + 3 split PDFs
  --card-size <cm>       override the 7.5cm card edge (optional)
  --font-dir <dir>       directory containing Andika-Regular.ttf/Andika-Bold.ttf
                          (default: auto-detect system Andika install)
  --html-only            write the source HTML/PDF but skip the split step
  --keep-source          keep the intermediate 3-page source PDF (default: keep)
`);
}

async function main() {
  if (flag('help') || flag('h')) { usage(); process.exit(0); }

  const slug = arg('slug', 'material');
  const words = list('words').map((w) => w.toLowerCase());
  const art = list('art');
  const outDir = arg('outdir', null);
  const cardSize = arg('card-size', null);

  if (!words.length) { usage(); console.error('✗ --words is required.'); process.exit(2); }
  if (art.length !== words.length) {
    usage();
    console.error(`✗ --art must have exactly as many entries as --words (got ${art.length} art for ${words.length} words).`);
    process.exit(2);
  }
  if (!outDir) { usage(); console.error('✗ --outdir is required.'); process.exit(2); }
  for (const p of art) {
    if (!fs.existsSync(p)) { console.error(`✗ art file not found: ${p}`); process.exit(2); }
  }

  fs.mkdirSync(outDir, { recursive: true });

  // ── Font base: prefer an explicit --font-dir, else the first system Andika
  // install that actually has both weights. ──────────────────────────────────
  const explicitFontDir = arg('font-dir', null);
  const candidateFontDirs = explicitFontDir ? [explicitFontDir] : SYSTEM_ANDIKA_DIRS;
  let fontDir = null;
  for (const d of candidateFontDirs) {
    if (fs.existsSync(path.join(d, 'Andika-Regular.ttf')) && fs.existsSync(path.join(d, 'Andika-Bold.ttf'))) {
      fontDir = d;
      break;
    }
  }
  if (!fontDir) {
    console.warn('⚠ No Andika-Regular.ttf/Andika-Bold.ttf found — labels will fall back to Comic Sans/cursive.');
  }
  const fontBaseUrl = fontDir ? pathToFileURL(fontDir).href : '/fonts';

  // ── Load the committed render-engine bundle directly (bypasses
  // make-material.mjs's loadEngine(), which requires the *.ts render sources
  // that this checkout does not carry — the pre-built dist bundle is enough). ──
  if (!fs.existsSync(ENGINE_DIST)) {
    console.error(`✗ Render engine bundle not found: ${ENGINE_DIST}`);
    console.error('  This script needs the already-committed scripts/curriculum/dist/render-engine.mjs.');
    process.exit(2);
  }
  const engine = await import(pathToFileURL(ENGINE_DIST).href);
  const { buildMaterial, buildAssetMap } = engine;

  // ── Asset map: word -> art file, built the same way buildAssetMap expects
  // (name = "<word><ext>", url = file:// URL) so resolveImage() finds it under
  // the exact key each word normalises to. ───────────────────────────────────
  const assetFiles = words.map((w, i) => ({
    name: `${w}${path.extname(art[i]) || '.png'}`,
    url: pathToFileURL(path.resolve(art[i])).href,
  }));
  const assets = buildAssetMap(assetFiles);

  // ── Minimal spec. buildThreePartCards only reads spec.week (for the HTML
  // <title>, cosmetic) and spec.materials.threePartCards. ────────────────────
  const spec = {
    week: 0,
    letterDisplay: slug,
    materials: { threePartCards: words },
  };

  const buildOpts = { fontBaseUrl };
  if (cardSize) buildOpts.cardSizeCm = parseFloat(cardSize);

  const { html, warnings } = buildMaterial('three_part_cards', spec, assets, buildOpts);
  for (const w of warnings ?? []) console.warn(`⚠ ${w}`);

  const htmlPath = path.join(outDir, `${slug}-three-part-cards-source.html`);
  fs.writeFileSync(htmlPath, html);
  console.log(`✓ wrote ${htmlPath}`);

  if (flag('html-only')) { console.log('\n(--html-only: skipping PDF + split)'); process.exit(0); }

  // ── PDF via the existing (unmodified) chrome.mjs helper. ────────────────────
  const { findChrome, htmlToPdf } = await import(pathToFileURL(CHROME_LIB).href);
  const chrome = findChrome();
  if (!chrome) {
    console.error('✗ No Chrome/Chromium found (set CHROME_BIN, or check /opt/pw-browsers).');
    process.exit(2);
  }
  const sourcePdf = path.join(outDir, `${slug}-three-part-cards-source.pdf`);
  const size = htmlToPdf(chrome, htmlPath, sourcePdf);
  console.log(`✓ wrote ${sourcePdf}  (${Math.round(size / 1024)} KB, 3 pages: control, pictures, labels)`);

  // ── Split via the existing (unmodified) split_three_part.py. ────────────────
  const r = spawnSync('python3', [SPLIT_PY, '--in', sourcePdf, '--outdir', outDir], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('✗ split_three_part.py failed.');
    process.exit(r.status || 1);
  }

  if (!flag('keep-source')) {
    // keep by default — cheap, and useful for debugging a bad card.
  }

  console.log(`\n📂 ${outDir}`);
}

main().catch((e) => {
  console.error('Fatal:', e?.stack || e);
  process.exit(1);
});
