#!/usr/bin/env node
/**
 * scripts/curriculum/build-week.mjs — the agent-drivable weekly-pack CLI.
 *
 * Renders a week's ten printable materials to HTML (via the SHARED render
 * engine) and then to PDF via headless Chrome, unattended, on the Mac.
 *
 * Usage:
 *   node scripts/curriculum/build-week.mjs --week 1
 *   node scripts/curriculum/build-week.mjs --week 3 --materials book,bingo
 *   node scripts/curriculum/build-week.mjs --week 2 --assets "/path/to/assets" --out "/path/to/pack"
 *   node scripts/curriculum/build-week.mjs --week 4 --gap-only     # just the missing-picture report
 *
 * Defaults:
 *   assets → ~/Desktop/English Curriculum 2026/Week NN/assets/
 *   out    → ~/Desktop/English Curriculum 2026/Week NN/pack/
 *
 * Missing assets = warnings + placeholder renders (unless --strict). Exit non-zero
 * only on hard errors. Chrome is auto-located (or CHROME_BIN); if absent the HTML
 * is still written and PDF is skipped with a note.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const SPEC_DIR = path.join(REPO, 'lib', 'montree', 'english-curriculum', 'spec');
const RENDER_ENTRY = path.join(REPO, 'lib', 'montree', 'english-curriculum', 'render', 'index.ts');
const FONT_DIR = path.join(REPO, 'public', 'fonts');

const ALL_MATERIALS = [
  'three_part_cards', 'flashcards', 'sentence_strips', 'matching', 'bingo', 'tracing',
  'coloring', 'dictionary_journal', 'book', 'vowel_wall', 'qr_cards',
  // Grace & Courtesy Intro Weeks only (default set derives per-spec below):
  'class_rules_poster',
];
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : def;
}
function flag(name) { return process.argv.includes(`--${name}`); }

function pad(n) { return String(n).padStart(2, '0'); }

async function bundleEngine() {
  // Emit INSIDE the repo (node_modules/.cache) so `packages: 'external'` imports
  // like qrcode resolve against the repo's node_modules at runtime.
  const cacheDir = path.join(REPO, 'node_modules', '.cache', 'curriculum-studio');
  fs.mkdirSync(cacheDir, { recursive: true });
  const outfile = path.join(cacheDir, `engine-${process.pid}.mjs`);
  await build({
    entryPoints: [RENDER_ENTRY],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile,
    packages: 'external', // qrcode resolved at runtime from node_modules
    alias: { '@': REPO },
    logLevel: 'error',
  });
  return outfile;
}

function scanAssets(dir) {
  const files = [];
  if (!dir || !fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const ext = path.extname(name).toLowerCase();
    if (!IMAGE_EXTS.includes(ext)) continue;
    files.push({ name, url: pathToFileURL(path.join(dir, name)).href });
  }
  return files;
}

/**
 * Prior-week asset folders, for reused images (potato.png, mat.png…). Derived
 * from this week's assets dir by convention (<root>/Week NN/<leaf>): scan
 * <root>/Week 01/<leaf> … <root>/Week (N-1)/<leaf>. Returns existing dirs only,
 * so it degrades to nothing when the layout doesn't match.
 */
function priorAssetDirs(assetsDir, weekNum) {
  const weekDir = path.dirname(assetsDir);   // <root>/Week NN
  const root = path.dirname(weekDir);        // <root>
  const leaf = path.basename(assetsDir);     // "assets"
  const dirs = [];
  for (let w = 1; w < weekNum; w++) {
    const d = path.join(root, `Week ${pad(w)}`, leaf);
    if (fs.existsSync(d)) dirs.push(d);
  }
  return dirs;
}

function findChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return null;
}

function htmlToPdf(chrome, htmlPath, pdfPath) {
  // Clear any stale/zero-byte artefact first so a failed render can't be mistaken
  // for a prior success.
  try { fs.rmSync(pdfPath, { force: true }); } catch { /* ignore */ }

  const r = spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 60000, encoding: 'utf8' });

  // spawn failure / timeout.
  if (r.error) throw r.error;

  // 🚨 Chrome can exit 0 yet write NOTHING (e.g. disk full → FILE_ERROR_NO_SPACE,
  // renderer crash). A 0-byte PDF was previously logged as a false "✓". Treat a
  // missing/empty output as a hard failure and surface Chrome's own reason.
  const size = fs.existsSync(pdfPath) ? fs.statSync(pdfPath).size : 0;
  if (size === 0) {
    const reason = String(r.stderr || '')
      .split('\n')
      .filter((l) => /ERROR|space|Failed|allocat|crash/i.test(l))
      .slice(-2).join(' | ')
      .trim() || `chrome exited ${r.status} with no output`;
    throw new Error(`0-byte PDF — ${reason}`);
  }
}

async function main() {
  const home = os.homedir();
  const introArg = arg('intro', null);

  // ── Resolve the spec: a numbered phonics week (--week N) OR a Grace & Courtesy
  //    Intro Week (--intro a|b). Intro weeks live in intro-week-<x>.json, default
  //    to the "Intro Week A/B" folders, and use an `images/` asset subfolder.
  let specPath, spec, defBase, defAssetLeaf, specLabel, priorWeekNum;
  if (introArg) {
    const key = String(introArg).trim().toLowerCase();
    if (key !== 'a' && key !== 'b') {
      console.error('✗ --intro must be "a" or "b".');
      process.exit(2);
    }
    specPath = path.join(SPEC_DIR, `intro-week-${key}.json`);
    if (!fs.existsSync(specPath)) {
      console.error(`✗ No intro spec (${specPath} not found).`);
      process.exit(2);
    }
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    defBase = path.join(home, 'Desktop', 'English Curriculum 2026', `Intro Week ${key.toUpperCase()}`);
    defAssetLeaf = 'images';
    specLabel = spec.displayName || `Intro Week ${key.toUpperCase()}`;
    priorWeekNum = 0; // intro weeks have no prior phonics folders
  } else {
    const weekNum = parseInt(arg('week', ''), 10);
    if (!weekNum || Number.isNaN(weekNum)) {
      console.error('Usage: node scripts/curriculum/build-week.mjs --week N | --intro a|b [--materials a,b] [--assets DIR] [--out DIR] [--gap-only] [--strict]');
      process.exit(2);
    }
    specPath = path.join(SPEC_DIR, `week-${pad(weekNum)}.json`);
    if (!fs.existsSync(specPath)) {
      console.error(`✗ No spec for week ${weekNum} (${specPath} not found). Authored weeks: ` +
        fs.readdirSync(SPEC_DIR).filter((f) => /^week-\d+\.json$/.test(f)).join(', '));
      process.exit(2);
    }
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    defBase = path.join(home, 'Desktop', 'English Curriculum 2026', `Week ${pad(weekNum)}`);
    defAssetLeaf = 'assets';
    specLabel = `Week ${weekNum} /${spec.sound}/`;
    priorWeekNum = weekNum;
  }

  const assetsDir = arg('assets', path.join(defBase, defAssetLeaf));
  const outDir = arg('out', path.join(defBase, 'pack'));
  const strict = flag('strict');

  const explicitMaterials = (arg('materials', '') || '')
    .split(',').map((s) => s.trim()).filter(Boolean);

  // Bundle + import the shared engine.
  const enginePath = await bundleEngine();
  const engine = await import(pathToFileURL(enginePath).href);
  const { buildMaterial, buildAssetMap, assetGapReport, materialTypesForSpec } = engine;

  // Default material set = whatever applies to THIS spec (phonics → the eleven;
  // Grace & Courtesy → rule flashcards + poster + colouring + song QR).
  const defaultTypes = materialTypesForSpec(spec).map((m) => m.type);
  const badMat = explicitMaterials.filter((m) => !ALL_MATERIALS.includes(m));
  if (badMat.length) console.warn(`⚠ ignoring unknown material(s): ${badMat.join(', ')}`);
  const toBuild = explicitMaterials.length
    ? explicitMaterials.filter((m) => ALL_MATERIALS.includes(m))
    : defaultTypes;

  // Scan assets → AssetMap (file:// URLs). Prior-week folders are a FALLBACK for
  // reused images; current-week files are listed LAST so they win in buildAssetMap.
  const priorDirs = priorAssetDirs(assetsDir, priorWeekNum);
  const priorFiles = priorDirs.flatMap(scanAssets);
  const files = scanAssets(assetsDir);
  const assets = buildAssetMap([...priorFiles, ...files]);
  console.log(`\n📦 ${specLabel} — ${files.length} asset file(s) in ${assetsDir}`);
  if (priorFiles.length) {
    console.log(`↺ ${priorFiles.length} file(s) available as fallback from ${priorDirs.length} earlier week folder(s).`);
  }

  // Gap report (the "what pictures do you still need" contract).
  const { missing } = assetGapReport(spec, assets);
  if (missing.length === 0) {
    console.log('✅ All manifest images present.\n');
  } else {
    console.log(`\n🖼  MISSING ${missing.length} image(s) — generate these (MJ prompts ready):\n`);
    for (const m of missing) {
      console.log(`  • ${m.file}   used by: ${m.usedBy.join(', ') || '—'}`);
      if (m.mjPrompt) console.log(`      MJ> ${m.mjPrompt}`);
    }
    console.log('');
  }

  if (flag('gap-only')) {
    cleanup(enginePath);
    process.exit(0);
  }

  if (strict && missing.length) {
    console.error('✗ --strict: refusing to render with missing assets.');
    cleanup(enginePath);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const fontBaseUrl = pathToFileURL(FONT_DIR).href;
  const chrome = findChrome();
  if (!chrome) console.warn('⚠ Chrome not found (set CHROME_BIN) — writing HTML only, skipping PDF.\n');

  let hadError = false;
  for (const type of toBuild) {
    try {
      const { html, warnings } = buildMaterial(type, spec, assets, { fontBaseUrl });
      const htmlPath = path.join(outDir, `${type}.html`);
      fs.writeFileSync(htmlPath, html);
      let line = `  ✓ ${type}.html`;
      if (chrome) {
        try {
          const pdfPath = path.join(outDir, `${type}.pdf`);
          htmlToPdf(chrome, htmlPath, pdfPath);
          line += `  → ${type}.pdf`;
        } catch (e) {
          line += `  (PDF failed: ${e.message})`;
          hadError = true;
        }
      }
      console.log(line);
      for (const w of warnings) console.log(`      ⚠ ${w}`);
    } catch (e) {
      console.error(`  ✗ ${type}: ${e.message}`);
      hadError = true;
    }
  }

  cleanup(enginePath);
  console.log(`\n📂 Output: ${outDir}\n`);
  process.exit(hadError ? 1 : 0);
}

/** Best-effort temp-bundle cleanup — never fatal (sandboxes may block unlink). */
function cleanup(p) {
  try { fs.rmSync(p, { force: true }); } catch { /* ignore */ }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
