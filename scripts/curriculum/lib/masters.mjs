/**
 * scripts/curriculum/lib/masters.mjs — THE picture source for printed materials.
 *
 * 🚨 LOCKED DECISION (Jul 2026). Printed materials use the curated Montessori
 * masters and NOTHING ELSE:
 *
 *     ~/Desktop/English Curriculum 2026/Week NN/images/<word>.png
 *     ~/Desktop/English Curriculum 2026/_all_images_flat/<word>.png
 *
 * These are the purpose-made set — 1344×896, single subject, centred, spotlit on
 * a deep forest-green backdrop, one consistent house style across all 58 weeks.
 * They are what publish-images.mjs uploads, so print and the web Studio show the
 * same picture.
 *
 * The repo's `phonics-images/` bank is NOT this. It is a mix of stock photos,
 * illustrated alphabet plates and Dark Phonics cast art, and drawing cards from
 * it produced a pack with a computer mouse for "mouse", a forest path for "sun"
 * and cartoon characters next to photographs. It is available only behind an
 * explicit `--image-source phonics` and is never the default.
 *
 * Filenames here already follow the render engine's own convention
 * (`<word>.png`, `<word>-coloring.png`), so no name derivation is needed — the
 * engine's parseAssetFilename reads them correctly as-is.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
const FLAT_DIR = '_all_images_flat';
const DEFAULT_FOLDER = 'English Curriculum 2026';

function expandHome(p) {
  if (!p) return p;
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

/**
 * Find the masters root. The same folder is reached by different paths depending
 * on where this runs: directly on the Mac, or through the Cowork device mount.
 */
export function findMastersRoot(configured) {
  const candidates = [];
  if (process.env.MONTREE_MASTERS) candidates.push(process.env.MONTREE_MASTERS);
  if (configured) candidates.push(expandHome(configured));
  candidates.push(path.join(os.homedir(), 'Desktop', DEFAULT_FOLDER));
  // Cowork mounts connected folders under /sessions/<id>/mnt/<folder-name>.
  try {
    for (const s of fs.readdirSync('/sessions')) {
      candidates.push(path.join('/sessions', s, 'mnt', DEFAULT_FOLDER));
    }
  } catch { /* not a Cowork VM */ }

  for (const c of candidates) {
    try { if (c && fs.statSync(c).isDirectory()) return c; } catch { /* next */ }
  }
  return null;
}

function pad(n) { return String(n).padStart(2, '0'); }

/** Scan one directory of engine-convention filenames. */
function scanDir(dir) {
  const files = [];
  let names;
  try { names = fs.readdirSync(dir); } catch { return files; }
  for (const name of names.sort()) {
    if (!IMAGE_EXTS.includes(path.extname(name).toLowerCase())) continue;
    files.push({ name, url: pathToFileURL(path.join(dir, name)).href });
  }
  return files;
}

/** The images folder for a week, handling the Intro Week layout too. */
export function weekImageDir(root, spec) {
  if (!root || !spec) return null;
  const candidates = [];
  if (spec.soundType === 'grace-courtesy' || spec.week > 100) {
    const key = spec.week === 101 ? 'A' : 'B';
    candidates.push(path.join(root, `Intro Week ${key}`, 'images'));
  }
  if (spec.week >= 1 && spec.week <= 58) {
    candidates.push(path.join(root, `Week ${pad(spec.week)}`, 'images'));
  }
  for (const c of candidates) {
    try { if (fs.statSync(c).isDirectory()) return c; } catch { /* next */ }
  }
  return null;
}

/**
 * Asset files from the masters, in ASCENDING priority (buildAssetMap lets later
 * entries win): the cross-week flat library first, then this week's own folder,
 * which is the authoritative art for the week.
 */
export function mastersAssetFiles(root, spec) {
  const flatDir = path.join(root, FLAT_DIR);
  const weekDir = weekImageDir(root, spec);
  const flat = scanDir(flatDir);
  const week = weekDir ? scanDir(weekDir) : [];
  return {
    files: [...flat, ...week],
    flatDir: fs.existsSync(flatDir) ? flatDir : null,
    flatCount: flat.length,
    weekDir,
    weekCount: week.length,
  };
}

/** Every word the masters can supply (for --list and word auto-picking). */
export function mastersWords(root) {
  const words = new Set();
  for (const dir of [path.join(root, FLAT_DIR)]) {
    for (const f of scanDir(dir)) {
      const stem = f.name.slice(0, f.name.lastIndexOf('.')).toLowerCase()
        .replace(/^\d+[-_\s]+/, '');
      if (/[-_\s]coloring$/.test(stem)) continue;
      words.add(stem.replace(/[-_\s]+/g, ' ').trim());
    }
  }
  return words;
}
