#!/usr/bin/env node
/**
 * scripts/curriculum/make-material.mjs — "make me 3-part cards for the letter s".
 *
 * build-week.mjs can only build a whole authored week from a week-NN.json plus a
 * hand-populated assets folder. This is the ad-hoc door into the SAME render
 * engine: name a letter, a pattern or a bare word list, get PDFs.
 *
 *   node scripts/curriculum/make-material.mjs --letter s
 *   node scripts/curriculum/make-material.mjs --letter s --materials three_part_cards
 *   node scripts/curriculum/make-material.mjs --words cat,hat,mat,sat --label "Short a"
 *   node scripts/curriculum/make-material.mjs --letter sh --out ~/Desktop/sh-pack
 *   node scripts/curriculum/make-material.mjs --list
 *
 * 🚨 PICTURES come from the Montessori Picture Bank and nothing else —
 * docs/picture-bank/photos/<word>/<word>.jpg, photoreal studio photographs of one
 * holdable object on WHITE. LOCKED in materials.config.json; lib/picture-bank.mjs
 * explains the two-tracks rule and why the Dark Phonics art (forest-green spotlit
 * Week NN images, googly-eye satpin characters) must never appear on a shelf
 * material. A word with no photo renders as the engine's placeholder tile and is
 * reported — never silently filled from another set.
 *
 * A letter an authored week already teaches uses THAT WEEK'S SPEC UNCHANGED, so
 * the output matches the Curriculum Studio exactly. Anything else is synthesised.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { buildImageIndex, inlineAssetImages, contestedWords, OVERRIDES_FILE } from './lib/image-manifest.mjs';
import { findMastersRoot, mastersAssetFiles, mastersWords, weekImageDir } from './lib/masters.mjs';
import { findPictureBank, pictureBankAssetFiles, forceContainOnWhite } from './lib/picture-bank.mjs';
import {
  loadWeekIndex, findWeekForLetter, loadWeekSpec, pickWordsForLetter, synthesiseSpec,
} from './lib/word-source.mjs';
import { loadEngine } from './lib/engine.mjs';
import { findChrome, htmlToPdf } from './lib/chrome.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const SPEC_DIR = path.join(REPO, 'lib', 'montree', 'english-curriculum', 'spec');
const FONT_DIR = path.join(REPO, 'public', 'fonts');
const IMAGE_BANK = path.join(REPO, 'phonics-images');
const CONFIG_PATH = path.join(__dirname, 'materials.config.json');

/** The saved picture-source decision. See materials.config.json. */
function loadConfig() {
  const defaults = {
    imageSource: 'picturebank',
    pictureBankDir: 'docs/picture-bank/photos',
    fit: 'contain-white',
    mastersRoot: null,
  };
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; }
  catch { return defaults; }
}

/** The five that earn their keep in a normal week of lessons. */
const DEFAULT_MATERIALS = ['three_part_cards', 'sentence_strips', 'matching', 'bingo', 'tracing'];
const ALL_MATERIALS = [
  'three_part_cards', 'flashcards', 'sentence_strips', 'matching', 'bingo', 'tracing',
  'coloring', 'dictionary_journal', 'book', 'vowel_wall', 'qr_cards',
];
/** Friendly words a human (or an agent relaying one) is likely to say. */
const ALIASES = {
  '3partcards': 'three_part_cards', '3part': 'three_part_cards', 'threepart': 'three_part_cards',
  'threepartcards': 'three_part_cards', 'cards': 'three_part_cards', 'nomenclature': 'three_part_cards',
  'strips': 'sentence_strips', 'sentencestrips': 'sentence_strips', 'sentences': 'sentence_strips',
  'match': 'matching', 'wordpicture': 'matching', 'matchingsheet': 'matching',
  'trace': 'tracing', 'handwriting': 'tracing', 'worksheet': 'tracing',
  'flashcard': 'flashcards', 'colouring': 'coloring', 'colour': 'coloring', 'color': 'coloring',
  'journal': 'dictionary_journal', 'dictionary': 'dictionary_journal',
  'reader': 'book', 'posters': 'vowel_wall', 'poster': 'vowel_wall', 'wall': 'vowel_wall',
  'qr': 'qr_cards', 'songcards': 'qr_cards',
};

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : def;
}
function flag(name) { return process.argv.includes(`--${name}`); }
function list(name) {
  return (arg(name, '') || '').split(',').map((s) => s.trim()).filter(Boolean);
}
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'material';
}
function normaliseMaterial(m) {
  const k = String(m).toLowerCase().replace(/[\s_-]/g, '');
  if (ALIASES[k]) return ALIASES[k];
  const direct = String(m).toLowerCase().replace(/[\s-]/g, '_');
  return ALL_MATERIALS.includes(direct) ? direct : null;
}

/** Prefer the Desktop (where his other packs live); fall back inside the repo. */
function defaultOutBase() {
  const desktop = path.join(os.homedir(), 'Desktop', 'Montree Materials');
  try {
    fs.mkdirSync(desktop, { recursive: true });
    fs.accessSync(desktop, fs.constants.W_OK);
    return desktop;
  } catch {
    return path.join(REPO, 'materials-out');
  }
}

/**
 * Embed the Andika TTFs directly in the document. Pictures alone are not enough
 * for a portable HTML: without the font the cards fall back to Comic Sans, and
 * the whole point of Andika is the single-storey 'a' a child is learning to write.
 */
function inlineFonts(html) {
  return html.replace(/url\('[^']*\/(Andika-(?:Regular|Bold)\.ttf)'\)/g, (whole, file) => {
    const p = path.join(FONT_DIR, file);
    if (!fs.existsSync(p)) return whole;
    return `url('data:font/ttf;base64,${fs.readFileSync(p).toString('base64')}')`;
  });
}

/**
 * Make a document portable WITHOUT inlining: copy every picture and font it
 * references into `<out>/assets/` and rewrite the URLs to relative paths.
 *
 * --inline-images is the wrong tool for the curated masters. They are 1344×896
 * PNGs at ~1.5MB, and bingo alone references pictures ~120 times across six
 * boards plus calling cards — base64 turned one document into 232MB. Copying the
 * files beside the HTML keeps full print quality and stays proportional to the
 * number of DISTINCT pictures.
 */
async function portableize(html, outDir, { jpeg = true } = {}) {
  const assetDir = path.join(outDir, 'assets');
  fs.mkdirSync(assetDir, { recursive: true });
  const copied = new Map();

  // The masters are PNGs, which is the wrong container for a photograph: a
  // 1.5MB PNG becomes ~200KB of JPEG at q92 with nothing visible lost at card
  // size. Without this a letter's pack is ~86MB of PDF instead of ~7MB.
  // sharp is already a repo dependency; if it will not load (it is a native
  // module, so not in a Linux VM sharing a macOS node_modules) the PNGs are
  // copied through unchanged rather than failing the build.
  let sharp = null;
  if (jpeg) {
    try { ({ default: sharp } = await import('sharp')); }
    catch { sharp = null; }
  }
  const toJpeg = new Map();
  if (sharp) {
    const urls = [...html.matchAll(/(?:src="|url\(')(file:\/\/[^"')]+\.png)(?:"|'\))/g)]
      .map((m) => m[1]);
    for (const url of new Set(urls)) {
      let src;
      try { src = fileURLToPath(url); } catch { continue; }
      if (!fs.existsSync(src)) continue;
      const name = `${path.basename(src, '.png')}.jpg`;
      const dest = path.join(assetDir, name);
      try {
        if (!fs.existsSync(dest)) {
          await sharp(src).jpeg({ quality: 92, progressive: true, mozjpeg: true }).toFile(dest);
        }
        toJpeg.set(url, `assets/${name}`);
      } catch { /* fall through to a straight copy */ }
    }
  }

  const rewrite = (url) => {
    if (toJpeg.has(url)) return toJpeg.get(url);
    if (copied.has(url)) return copied.get(url);
    let src;
    try { src = fileURLToPath(url); } catch { return null; }
    if (!fs.existsSync(src)) return null;
    // Keep names unique across source folders: <stem>[-n]<ext>
    let name = path.basename(src);
    let i = 1;
    while (fs.existsSync(path.join(assetDir, name))
      && fs.readFileSync(path.join(assetDir, name)).compare(fs.readFileSync(src)) !== 0) {
      const ext = path.extname(path.basename(src));
      name = `${path.basename(src, ext)}-${i++}${ext}`;
    }
    const dest = path.join(assetDir, name);
    if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
    const rel = `assets/${name}`;
    copied.set(url, rel);
    return rel;
  };

  const out = html.replace(/(?:src="|url\(')(file:\/\/[^"')]+)(?:"|'\))/g, (whole, url) => {
    const rel = rewrite(url);
    if (!rel) return whole;
    return whole.replace(url, rel);
  });
  return { html: out, count: copied.size + toJpeg.size, jpeg: toJpeg.size, assetDir };
}

function usage() {
  console.log(`
make-material.mjs — Montessori materials from a letter, a pattern, or a word list.

  --letter <s|sh|a_e>     the sound to build for (uses the authored week if one exists)
  --week <N>              build an authored week directly
  --words a,b,c           an arbitrary word list instead of a letter
  --label "Short a"       heading for a --words build
  --materials <list>      default: ${DEFAULT_MATERIALS.join(', ')}
                          or "all" for all ${ALL_MATERIALS.length}
  --out <dir>             default: ~/Desktop/Montree Materials/<slug>
  --assets <dir>          extra pictures, highest priority
  --auto-words            ignore the authored word list; pick words we have photos for
  --image-source <s>      picturebank (default, LOCKED) | curriculum-art | phonics
                          picturebank = photoreal object on white, shelf-compliant.
                          The others are DARK PHONICS art — never mix them in.
  --contain / --cover     how pictures fill a card. contain-on-white is the default
                          for the picture bank; --cover crops to fill (Dark Phonics).
  --online-images         also allow published montree.xyz images (needs network)
  --card-size <cm>        override the 7.5cm card edge
  --inline-images         embed pictures as data: URLs (small pictures only)
  --portable-dir          copy pictures+fonts to <out>/assets/ with relative paths
                          (use this with the full-res masters, not --inline-images)
  --no-jpeg               with --portable-dir, keep PNGs instead of JPEG q92
                          (PNG photos make a letter's pack ~86MB instead of ~7MB)
  --html-only             skip the PDF step
  --gap-only              just report which pictures are missing
  --list                  show every letter/week available, with picture coverage
  --contested             words claimed by more than one picture, and which won
  --json                  machine-readable summary on stdout

Material names: ${ALL_MATERIALS.join(', ')}
`);
}

async function main() {
  if (flag('help') || flag('h')) { usage(); process.exit(0); }

  const weekIndex = loadWeekIndex(SPEC_DIR);
  const cfg = loadConfig();
  const imageSource = arg('image-source', cfg.imageSource || 'masters');

  // ── The picture source ────────────────────────────────────────────────────
  // 'masters' is the locked default: the curated Montessori set. Anything else
  // has to be asked for by name, and never happens as a silent fallback.
  // The Montessori Picture Bank — the locked default.
  const bankDir = imageSource === 'picturebank' ? findPictureBank(REPO, cfg.pictureBankDir) : null;
  const pbank = bankDir ? pictureBankAssetFiles(bankDir) : null;
  if (imageSource === 'picturebank' && !pbank?.count) {
    console.error('\n✗ Cannot find the Montessori Picture Bank.');
    console.error(`  Looked for: ${path.join(REPO, cfg.pictureBankDir || 'docs/picture-bank/photos')}`);
    console.error('  It is the only picture set printed materials use — photoreal object on');
    console.error('  white (see materials.config.json + docs/picture-bank/).');
    console.error('  Set MONTREE_PICTURE_BANK, or name another set explicitly with');
    console.error('  --image-source curriculum-art|phonics (both are DARK PHONICS art).');
    process.exit(2);
  }

  // The forest-green Week NN curriculum art. Dark Phonics look; opt-in only.
  const mastersRoot = imageSource === 'curriculum-art' ? findMastersRoot(cfg.mastersRoot) : null;
  if (imageSource === 'curriculum-art' && !mastersRoot) {
    console.error('\n✗ Cannot find the Week NN curriculum art (~/Desktop/English Curriculum 2026).');
    process.exit(2);
  }
  if (mastersRoot) console.warn('\n⚠ --image-source curriculum-art: forest-green DARK PHONICS art, not shelf-compliant.');

  // phonics-images is scanned only when explicitly selected.
  const bank = imageSource === 'phonics' ? buildImageIndex(arg('image-bank', IMAGE_BANK)) : null;
  const extraDir = arg('assets', null);
  const extra = extraDir ? buildImageIndex(extraDir) : null;

  for (const b of bank?.overrides?.bad ?? []) console.warn(`⚠ ${OVERRIDES_FILE}: ${b}`);

  /** Words the active source can supply — drives --list and --auto-words. */
  const availableWords = pbank?.words
    ?? (mastersRoot ? mastersWords(mastersRoot) : (bank?.words ?? new Set()));

  // ── --contested: where two banks claim the same word ──────────────────────
  // Directory priority silently picks one. Usually fine; occasionally the banks
  // disagree about what a word even depicts, and that only shows up on a card.
  if (flag('contested')) {
    if (!bank) {
      console.error(`✗ --contested inspects the phonics-images bank; add --image-source phonics.`);
      process.exit(2);
    }
    const rows = contestedWords(bank);
    console.log(`\n🔍 ${rows.length} word(s) claimed by more than one picture:\n`);
    for (const r of rows) {
      console.log(`  ${r.word}${r.coloring ? ' (coloring)' : ''}`);
      console.log(`     using  ${r.chosen}`);
      for (const a of r.alternatives) console.log(`       also  ${a}`);
    }
    console.log(`\nTo pin a different one, add phonics-images/${OVERRIDES_FILE}:`);
    console.log('  { "mouse": "alphabet-v1/plates/m-mouse.jpg" }\n');
    process.exit(0);
  }

  // ── --list: what can I ask for, and will it have pictures? ────────────────
  if (flag('list')) {
    const label = pbank ? `Montessori Picture Bank (${pbank.count} objects on white)`
      : mastersRoot ? `Week NN curriculum art — DARK PHONICS (${mastersRoot})`
      : `phonics-images bank — DARK PHONICS + stock`;
    console.log(`\n📚 ${weekIndex.length} authored weeks · pictures from ${label}\n`);
    for (const w of weekIndex) {
      const spec = loadWeekSpec(w);
      const words = spec.materials?.threePartCards ?? [];
      const dir = mastersRoot ? weekImageDir(mastersRoot, spec) : null;
      const wordsHere = dir ? new Set(fs.readdirSync(dir).map((n) => n.replace(/\.[a-z]+$/i, '').toLowerCase())) : new Set();
      const have = words.filter((x) => wordsHere.has(x.toLowerCase()) || availableWords.has(x.toLowerCase())).length;
      const bar = words.length ? `${have}/${words.length}` : '—';
      console.log(`  week ${String(w.week).padStart(2)}  ${w.sound.padEnd(16)} ${w.letterDisplay.padEnd(16)} pictures ${bar}`);
    }
    console.log('');
    process.exit(0);
  }

  // ── Resolve the spec ──────────────────────────────────────────────────────
  const letter = arg('letter', null);
  const weekArg = arg('week', null);
  const words = list('words');
  const label = arg('label', '');

  let spec = null;
  let source = '';
  let slug = '';

  if (words.length) {
    spec = synthesiseSpec({ words, letter: letter || '', label, frame: arg('frame', 'I see a ___.') });
    source = `word list (${words.length} words)`;
    slug = slugify(label || words.slice(0, 3).join('-'));
  } else if (weekArg) {
    const entry = weekIndex.find((w) => String(w.week) === String(weekArg));
    if (!entry) {
      console.error(`✗ No authored week ${weekArg}. Try --list.`);
      process.exit(2);
    }
    spec = loadWeekSpec(entry);
    source = `authored week ${entry.week} (/${entry.sound}/)`;
    slug = `week-${String(entry.week).padStart(2, '0')}-${slugify(entry.sound)}`;
  } else if (letter) {
    const entry = findWeekForLetter(weekIndex, letter);
    if (entry && !flag('auto-words')) {
      spec = loadWeekSpec(entry);
      source = `authored week ${entry.week} (/${entry.sound}/) — the curriculum's own words`;
      slug = `letter-${slugify(letter)}`;
    } else {
      const picked = pickWordsForLetter(letter, availableWords, parseInt(arg('count', '8'), 10));
      if (!picked.length) {
        console.error(`✗ No authored week for "${letter}" and no local pictures start with it.`);
        console.error('  Give the words explicitly:  --words sun,sock,star');
        process.exit(2);
      }
      spec = synthesiseSpec({
        words: picked,
        letter,
        label,
        soundType: 'aeiou'.includes(letter) && letter.length === 1 ? 'vowel' : 'consonant',
      });
      source = entry
        ? `--auto-words: ${picked.length} words chosen from the local picture bank`
        : `no authored week for "${letter}" — ${picked.length} words chosen from the local picture bank`;
      slug = `letter-${slugify(letter)}`;
    }
  } else {
    usage();
    console.error('✗ Give me one of --letter, --week or --words.');
    process.exit(2);
  }

  // ── Materials ─────────────────────────────────────────────────────────────
  const rawMaterials = list('materials');
  let materials;
  if (rawMaterials.length === 1 && rawMaterials[0].toLowerCase() === 'all') materials = [...ALL_MATERIALS];
  else if (rawMaterials.length) {
    materials = [];
    for (const m of rawMaterials) {
      const n = normaliseMaterial(m);
      if (n) materials.push(n);
      else console.warn(`⚠ ignoring unknown material "${m}"`);
    }
  } else materials = [...DEFAULT_MATERIALS];
  if (!materials.length) { console.error('✗ No valid materials requested.'); process.exit(2); }

  // ── Pictures: online (optional) < local bank < --assets ───────────────────
  const assetFiles = [];
  let sourceLine = '';
  if (flag('online-images') && spec.imageUrls) {
    for (const [key, url] of Object.entries(spec.imageUrls)) {
      assetFiles.push({ name: `${key}.png`, url });
    }
  }
  if (pbank) {
    assetFiles.push(...pbank.files);
    sourceLine = `Montessori Picture Bank — ${pbank.count} photoreal objects on white`;
  } else if (mastersRoot) {
    const m = mastersAssetFiles(mastersRoot, spec);
    assetFiles.push(...m.files);
    sourceLine = `curated masters — ${m.weekCount} from ${m.weekDir ? path.basename(path.dirname(m.weekDir)) + '/images' : 'no week folder'}`
      + `, ${m.flatCount} in _all_images_flat`;
    if (!m.weekCount && !m.flatCount) {
      console.error(`\n✗ The masters folder has no images for this build: ${mastersRoot}`);
      process.exit(2);
    }
  } else if (bank) {
    assetFiles.push(...bank.files);
    sourceLine = `⚠ phonics-images bank (NOT the curated set) — ${bank.words.size} words`;
  }
  if (extra) assetFiles.push(...extra.files);

  const { engine, rebuilt, bundlePath } = await loadEngine(REPO, { force: flag('rebuild') });
  const { buildMaterial, buildAssetMap, assetGapReport } = engine;
  const assets = buildAssetMap(assetFiles);

  // --inline-images makes each HTML carry its own pictures, so it can be printed
  // on a machine that cannot see this image bank (that is how the Cowork path
  // gets a PDF: build HTML here, render it in the cloud).
  let inlineStats = null;
  if (flag('inline-images')) {
    const m = spec.materials ?? {};
    const needed = new Set([
      ...(m.threePartCards ?? []), ...(m.matching ?? []), ...(m.bingoPool ?? []),
      ...(m.coloring ?? []), ...(m.dictionary ?? []), ...(m.tracing?.words ?? []),
      ...(spec.book?.spreads ?? []).map((s) => s.image),
      ...(m.ruleCards ?? []).map((r) => r.image),
      spec.anchorWord,
      // sentence strips pick their picture from the words inside each sentence
      ...(m.sentences ?? []).flatMap((s) => String(s).toLowerCase().match(/[a-z']+/g) ?? []),
    ].filter(Boolean).map((w) => String(w).toLowerCase()));
    inlineStats = inlineAssetImages(assets, needed);
  }

  const outDir = arg('out', path.join(defaultOutBase(), slug));

  console.log(`\n🌳 ${spec.letterDisplay || spec.sound} — ${source}`);
  console.log(`   words: ${(spec.materials?.threePartCards ?? []).join(', ') || '—'}`);
  console.log(`   source: ${sourceLine}`);
  console.log(`   pictures: ${Object.keys(assets.images).length} available`
    + `${inlineStats ? ` · ${inlineStats.inlined} embedded in the HTML` : ''}`
    + `${rebuilt ? ' · render bundle rebuilt' : ''}`);

  // The week manifest lists every picture the week could ever want — including
  // book spreads and colouring line art. Only the materials actually requested
  // matter here, and the builders themselves are the ground truth for that: each
  // one warns for exactly the pictures it reached for and did not find.
  const fontBaseUrl = pathToFileURL(FONT_DIR).href;
  const cardSize = arg('card-size', null);
  const buildOpts = { fontBaseUrl };
  if (cardSize) buildOpts.cardSizeCm = parseFloat(cardSize);

  const MISSING_RE = /missing image for "([^"]+)"/;
  const dryRun = materials.map((t) => buildMaterial(t, spec, assets, buildOpts));
  const missingWords = [...new Set(
    dryRun.flatMap((r) => r.warnings ?? [])
      .map((w) => w.match(MISSING_RE)?.[1])
      .filter(Boolean),
  )].sort();

  // Keep the authored MJ prompts around for whatever IS missing — that is the
  // fastest route from "this card is a placeholder" to "this card has a photo".
  const { missing } = assetGapReport(spec, assets);
  const promptFor = new Map(missing.map((m) => [m.file.replace(/\.[a-z]+$/, ''), m.mjPrompt]));

  if (missingWords.length) {
    console.log(`\n🖼  ${missingWords.length} picture(s) missing for what you asked for — those tiles print as placeholders:`);
    for (const w of missingWords) console.log(`     • ${w}`);
    if (!flag('online-images') && spec.imageUrls) {
      console.log('     ↳ --online-images pulls your published versions for these.');
    }
    console.log(`     ↳ or drop <word>.png files in a folder and pass --assets <folder>.`);
  } else {
    console.log('\n✅ Every picture resolved locally.');
  }
  if (flag('gap-only')) process.exit(0);

  // ── Render ────────────────────────────────────────────────────────────────
  fs.mkdirSync(outDir, { recursive: true });

  const containOnWhite = flag('cover')
    ? false
    : (flag('contain') || (cfg.fit === 'contain-white' && !!pbank));

  const chrome = flag('html-only') ? null : findChrome();
  if (!chrome && !flag('html-only')) {
    console.warn('\n⚠ No Chrome found (set CHROME_BIN) — writing HTML only.');
  }

  console.log('');
  const results = [];
  let failed = 0;
  for (const type of materials) {
    const rec = { material: type, html: null, pdf: null, warnings: [], error: null };
    try {
      const { html, warnings } = buildMaterial(type, spec, assets, buildOpts);
      const htmlPath = path.join(outDir, `${type}.html`);
      let outHtml = inlineStats ? inlineFonts(html) : html;
      // Isolated objects on white must never be cropped to fill a square.
      if (containOnWhite) outHtml = forceContainOnWhite(outHtml);
      if (flag('portable-dir')) {
        const p = await portableize(outHtml, outDir, { jpeg: !flag('no-jpeg') });
        outHtml = p.html;
        rec.assetsCopied = p.count;
        rec.assetsAsJpeg = p.jpeg;
      }
      fs.writeFileSync(htmlPath, outHtml);
      rec.html = htmlPath;
      rec.warnings = warnings ?? [];

      let line = `  ✓ ${type}.html`;
      if (chrome) {
        const pdfPath = path.join(outDir, `${type}.pdf`);
        try {
          const size = htmlToPdf(chrome, htmlPath, pdfPath);
          rec.pdf = pdfPath;
          line += `  →  ${type}.pdf  (${Math.round(size / 1024)} KB)`;
        } catch (e) {
          rec.error = e.message;
          line += `  ✗ PDF: ${e.message}`;
          failed++;
        }
      }
      console.log(line);
      const shown = new Set();
      for (const w of rec.warnings) {
        const k = w.replace(/"[^"]*"/, '"…"');
        if (shown.has(k)) continue;
        shown.add(k);
        console.log(`      ⚠ ${w}`);
      }
    } catch (e) {
      rec.error = e.message;
      console.error(`  ✗ ${type}: ${e.message}`);
      failed++;
    }
    results.push(rec);
  }

  const summary = {
    ok: failed === 0,
    source,
    letterDisplay: spec.letterDisplay,
    week: spec.week,
    words: spec.materials?.threePartCards ?? [],
    outDir,
    bundlePath,
    missingPictures: missingWords,
    /** Ready-to-run prompts for the pictures that are still placeholders. */
    missingPicturePrompts: Object.fromEntries(
      missingWords.map((w) => [w, promptFor.get(w) || '']).filter(([, p]) => p),
    ),
    materials: results,
  };
  fs.writeFileSync(path.join(outDir, '_summary.json'), JSON.stringify(summary, null, 2));

  if (flag('json')) console.log(`\n${JSON.stringify(summary, null, 2)}`);
  console.log(`\n📂 ${outDir}\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e?.stack || e);
  process.exit(1);
});
