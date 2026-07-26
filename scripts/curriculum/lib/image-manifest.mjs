/**
 * scripts/curriculum/lib/image-manifest.mjs — the LOCAL phonics-images index.
 *
 * The render engine's buildAssetMap() keys images off the FILENAME
 * (parseAssetFilename). phonics-images/ does not follow that convention
 * everywhere, so this module derives the real vocabulary word for every file and
 * hands the engine a synthetic `<word><ext>` name. That is the whole trick: the
 * engine stays untouched, and 500+ existing photos become addressable by word.
 *
 * 🚨 THE THREE NAMING DIALECTS in phonics-images/:
 *   1. phase banks       pink1/ pink2_short_a/ blue1_blends/ green2_vowel_teams/
 *                        → "<word>.jpg"                         sun.jpg      → sun
 *   2. alphabet plates   alphabet-v1/plates/
 *                        → "<grapheme>-<word>.jpg"              ck-sock.jpg  → sock
 *                        (the engine alone would read this as the word "ck sock")
 *   3. cast portraits    satpin-v2/cast/
 *                        → "cast-<word>[-junk].png"             cast-ant.png → ant
 *
 * Book spreads, wall posters, letter art and song cards are NOT single-subject
 * vocabulary pictures, so they are excluded rather than mis-indexed.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

/** Directories whose files are not single-subject vocabulary pictures. */
const EXCLUDE = [
  /^satpin-v2\/books\//,
  /^satpin-v2\/posters\//,
  /^satpin-v2\/letters\//,
  /^dark-phonics-song-cards\//,
  /(^|\/)_/, // _v1-square-superseded and friends
];

/**
 * Ascending picture quality for three-part cards. When two files claim the same
 * word the HIGHER number wins, so the purpose-built isolated vocab shots beat the
 * alphabet plates, which beat character portraits.
 */
const DIR_PRIORITY = [
  [/^satpin-v2\/cast\//, 1],
  [/^alphabet-v1\/plates\//, 2],
  [/^green[0-9]/, 3],
  [/^blue[0-9]/, 4],
  [/^pink2/, 5],
  [/^pink1\//, 6],
  [/^satpin-v2\/vocab-iso\//, 7],
];

/** Leading grapheme label on the alphabet plates ("ck-sock", "b-banana"). */
const GRAPHEME_PREFIX = /^(ck|qu|sh|ch|th|ph|wh|[a-z])-(?=.)/;

/** Production-pipeline suffixes on cast portraits ("cast-potato-teacher"). */
const CAST_JUNK = /[-_](sig-scrubbed|sig-patched|patched|webres|teacher|iso)$/;

function priorityFor(rel) {
  for (const [re, p] of DIR_PRIORITY) if (re.test(rel)) return p;
  return 0;
}

/**
 * Derive the vocabulary word a file depicts, or null if the file is not a
 * word picture. Returns the canonical key form the engine uses: lower-case,
 * hyphens/underscores/whitespace collapsed to single spaces.
 */
export function deriveWord(relPath) {
  const rel = String(relPath).replace(/\\/g, '/').replace(/^\.\//, '');
  if (EXCLUDE.some((re) => re.test(rel))) return null;

  const base = rel.split('/').pop();
  const ext = path.extname(base).toLowerCase();
  if (!IMAGE_EXTS.includes(ext)) return null;

  let stem = base.slice(0, base.length - ext.length).toLowerCase();

  // Dialect 3 — cast portraits. Strip the prefix, then any pipeline suffixes.
  if (/^satpin-v2\/cast\//.test(rel)) {
    stem = stem.replace(/^cast-/, '');
    let prev;
    do { prev = stem; stem = stem.replace(CAST_JUNK, ''); } while (stem !== prev);
  }

  // Dialect 2 — alphabet plates carry the grapheme they illustrate.
  if (/^alphabet-v1\/plates\//.test(rel)) {
    stem = stem.replace(GRAPHEME_PREFIX, '');
  }

  // Shared with the engine: numeric order prefix, then the -coloring flag.
  stem = stem.replace(/^\d+[-_\s]+/, '');
  const coloring = /[-_\s]coloring$/.test(stem);
  stem = stem.replace(/[-_\s]coloring$/, '');

  const word = stem.replace(/[-_\s]+/g, ' ').trim();
  if (!word) return null;
  return { word, coloring, ext };
}

/** Walk a directory tree, returning paths relative to it. */
function walk(root, rel = '', out = []) {
  let entries;
  try { entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(root, r, out);
    else if (e.isFile()) out.push(r);
  }
  return out;
}

/** Index every word picture under a phonics-images-shaped directory. */
export function scanImageBank(rootDir) {
  const entries = [];
  if (!rootDir || !fs.existsSync(rootDir)) return entries;
  for (const rel of walk(rootDir)) {
    const d = deriveWord(rel);
    if (!d) continue;
    entries.push({
      word: d.word,
      coloring: d.coloring,
      ext: d.ext,
      relPath: rel,
      absPath: path.join(rootDir, rel),
      priority: priorityFor(rel),
    });
  }
  return entries;
}

/**
 * Collapse to one picture per word. Highest directory priority wins; ties break
 * alphabetically on path so a rebuild is always byte-identical.
 */
export function bestPerWord(entries) {
  const best = new Map();
  for (const e of entries) {
    const key = `${e.coloring ? 'c' : 'i'}|${e.word}`;
    const cur = best.get(key);
    if (!cur
      || e.priority > cur.priority
      || (e.priority === cur.priority && e.relPath < cur.relPath)) {
      best.set(key, e);
    }
  }
  return best;
}

/**
 * The engine-facing view: synthetic `<word><ext>` filenames so buildAssetMap
 * derives exactly the word we resolved here, never the raw on-disk name.
 */
export function toAssetFiles(best) {
  const files = [];
  for (const e of best.values()) {
    const name = `${e.word}${e.coloring ? '-coloring' : ''}${e.ext}`;
    files.push({ name, url: pathToFileURL(e.absPath).href });
  }
  return files.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Human/agent-readable index, written next to the bank for inspection. */
export function manifestObject(best, rootDir) {
  const images = {};
  const coloring = {};
  for (const e of [...best.values()].sort((a, b) => (a.word < b.word ? -1 : 1))) {
    (e.coloring ? coloring : images)[e.word] = e.relPath;
  }
  return {
    generatedFrom: rootDir,
    counts: { images: Object.keys(images).length, coloring: Object.keys(coloring).length },
    images,
    coloring,
  };
}

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

/**
 * Rewrite an AssetMap's file:// entries as data: URLs, so the rendered HTML
 * carries its own pictures. Needed whenever the HTML will be printed somewhere
 * other than the machine holding the image bank.
 *
 * Only `needed` words are inlined — inlining a 500-photo bank would produce a
 * document measured in hundreds of megabytes.
 */
export function inlineAssetImages(assets, needed) {
  const want = new Set([...needed].map((w) => String(w).toLowerCase().replace(/[-_\s]+/g, ' ').trim()));
  let inlined = 0, skipped = 0;
  for (const bucket of ['images', 'coloring']) {
    const map = assets[bucket];
    if (!map) continue;
    for (const [word, url] of Object.entries(map)) {
      if (!want.has(word) || !url.startsWith('file://')) continue;
      try {
        const p = fileURLToPathSafe(url);
        const ext = path.extname(p).toLowerCase();
        const mime = MIME[ext];
        if (!mime) { skipped++; continue; }
        map[word] = `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
        inlined++;
      } catch { skipped++; }
    }
  }
  return { inlined, skipped };
}

function fileURLToPathSafe(url) {
  return decodeURIComponent(String(url).replace(/^file:\/\//, ''));
}

/**
 * Optional `word-overrides.json` at the root of the bank — the escape hatch for
 * when directory priority picks the wrong picture. Directory ranking is a decent
 * heuristic, but it cannot know that green2_vowel_teams/mouse.jpg is a computer
 * mouse while alphabet-v1/plates/m-mouse.jpg is the animal.
 *
 *   { "mouse": "alphabet-v1/plates/m-mouse.jpg" }
 *
 * Paths are relative to the bank. An override always wins.
 */
export const OVERRIDES_FILE = 'word-overrides.json';

export function applyOverrides(best, rootDir) {
  const p = path.join(rootDir, OVERRIDES_FILE);
  if (!fs.existsSync(p)) return { applied: 0, bad: [] };
  let map;
  try { map = JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return { applied: 0, bad: ['unreadable word-overrides.json'] }; }

  let applied = 0;
  const bad = [];
  for (const [rawWord, rel] of Object.entries(map)) {
    if (rawWord.startsWith('_') || typeof rel !== 'string') continue; // "_comment" keys
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) { bad.push(`${rawWord} → ${rel} (not found)`); continue; }
    const ext = path.extname(abs).toLowerCase();
    if (!IMAGE_EXTS.includes(ext)) { bad.push(`${rawWord} → ${rel} (not an image)`); continue; }
    const word = String(rawWord).toLowerCase().replace(/[-_\s]+/g, ' ').trim();
    const coloring = /[-_\s]coloring$/.test(word);
    best.set(`${coloring ? 'c' : 'i'}|${word.replace(/[-_\s]coloring$/, '')}`, {
      word: word.replace(/[-_\s]coloring$/, ''),
      coloring, ext, relPath: rel, absPath: abs, priority: 999,
    });
    applied++;
  }
  return { applied, bad };
}

/** One call: scan a bank and return everything the CLI needs. */
export function buildImageIndex(rootDir) {
  const entries = scanImageBank(rootDir);
  const best = bestPerWord(entries);
  const overrides = applyOverrides(best, rootDir);
  return {
    entries,
    best,
    overrides,
    files: toAssetFiles(best),
    words: new Set([...best.values()].filter((e) => !e.coloring).map((e) => e.word)),
    manifest: manifestObject(best, rootDir),
  };
}

/**
 * Words that more than one file claims. Directory priority resolves these
 * silently, which is right most of the time and wrong when two banks disagree
 * about what a word depicts — so make them inspectable.
 */
export function contestedWords(index) {
  const bySource = new Map();
  for (const e of index.entries) {
    const k = `${e.coloring ? 'c' : 'i'}|${e.word}`;
    if (!bySource.has(k)) bySource.set(k, []);
    bySource.get(k).push(e);
  }
  const out = [];
  for (const [k, list] of bySource) {
    if (list.length < 2) continue;
    const winner = index.best.get(k);
    out.push({
      word: list[0].word,
      coloring: list[0].coloring,
      chosen: winner?.relPath ?? null,
      alternatives: list.map((e) => e.relPath).filter((p) => p !== winner?.relPath).sort(),
    });
  }
  return out.sort((a, b) => (a.word < b.word ? -1 : 1));
}
