/**
 * scripts/curriculum/lib/picture-bank.mjs — THE picture source for shelf materials.
 *
 * 🚨 LOCKED. Printed Montessori materials use the Montessori Picture Bank and
 * nothing else:
 *
 *     docs/picture-bank/photos/<word>/<word>.jpg
 *
 * Photoreal studio photographs of one concrete, holdable object on white. Every
 * object passes the selection rule recorded in
 * docs/picture-bank/HANDOFF_PICTURE_BANK_Jul23.md: a 3–4 year old names it on
 * sight, you can put a real one in the child's hand, and it photographs clean as
 * a single object on white.
 *
 * ── TWO TRACKS, NEVER MIXED ────────────────────────────────────────────────
 * The repo holds several picture sets and only this one is for shelf work:
 *
 *   ✅ docs/picture-bank/photos/          photoreal object on white  → SHELF / 3-part cards
 *   ❌ English Curriculum 2026/Week NN/   spotlit on forest green    → Dark Phonics
 *   ❌ phonics-images/satpin-v2/          googly-eye characters      → Dark Phonics circle time
 *   ❌ phonics-images/alphabet-v1/        illustrated plates         → not photoreal
 *   ❌ phonics-images/pink*|blue*|green*  assorted stock photos      → not the curated set
 *
 * The Dark Phonics art is deliberately stylised and correct for circle and
 * lesson work. It is wrong for a 3-part card, which has to answer a child's
 * "what is this?" about an object they can hold. scripts/curriculum/
 * swap-picture-bank-images.py exists precisely because Week-sourced art had to
 * be swapped OUT of the packs for these photos.
 *
 * Presentation matters as much as the file: these are shown `object-fit:contain`
 * on white, never `cover`. A 1344×896 photo of a saw cropped to a square loses
 * the ends of the saw.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
export const BANK_REL = path.join('docs', 'picture-bank', 'photos');

/** Locate the picture bank inside the repo. */
export function findPictureBank(repoRoot, configured) {
  const candidates = [
    process.env.MONTREE_PICTURE_BANK,
    configured && (path.isAbsolute(configured) ? configured : path.join(repoRoot, configured)),
    path.join(repoRoot, BANK_REL),
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (fs.statSync(c).isDirectory()) return c; } catch { /* next */ }
  }
  return null;
}

/**
 * Index the bank. Layout is one folder per word holding `<word>.<ext>`; the
 * FOLDER name is the word, so a stray differently-named file inside cannot
 * silently become a new vocabulary entry.
 */
export function scanPictureBank(bankDir) {
  const entries = [];
  let dirs;
  try { dirs = fs.readdirSync(bankDir, { withFileTypes: true }); } catch { return entries; }
  for (const d of dirs.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!d.isDirectory()) continue;
    const word = d.name.toLowerCase().replace(/[-_\s]+/g, ' ').trim();
    if (!word) continue;
    const folder = path.join(bankDir, d.name);
    let picked = null;
    for (const ext of PHOTO_EXTS) {
      const p = path.join(folder, `${d.name}${ext}`);
      if (fs.existsSync(p) && fs.statSync(p).size > 0) { picked = p; break; }
    }
    if (!picked) {
      // Tolerate a differently-named single photo, but only if unambiguous.
      const files = fs.readdirSync(folder)
        .filter((n) => PHOTO_EXTS.includes(path.extname(n).toLowerCase()))
        .filter((n) => fs.statSync(path.join(folder, n)).size > 0);
      if (files.length === 1) picked = path.join(folder, files[0]);
    }
    if (!picked) continue;
    entries.push({ word, absPath: picked, ext: path.extname(picked).toLowerCase() });
  }
  return entries;
}

/**
 * Asset files for the render engine. The engine keys images off the filename, so
 * hand it `<word><ext>` derived from the FOLDER name.
 */
export function pictureBankAssetFiles(bankDir) {
  const entries = scanPictureBank(bankDir);
  return {
    files: entries.map((e) => ({ name: `${e.word}${e.ext}`, url: pathToFileURL(e.absPath).href })),
    words: new Set(entries.map((e) => e.word)),
    count: entries.length,
  };
}

/**
 * Force `contain` on white for every picture in a rendered document.
 *
 * The engine's card/strip/bingo CSS uses `object-fit:cover`, which is right for
 * full-bleed art and wrong for an isolated object on white — a wide photo gets
 * its edges cropped off. Injected as a late override so the shared engine and
 * the Studio are left untouched. Mirrors what swap-picture-bank-images.py
 * already does in the Dark Phonics packs: `object-fit:contain;background:#fff`.
 */
export function forceContainOnWhite(html) {
  const css = 'img{object-fit:contain!important;background:#fff!important;}';
  return html.includes('</style>')
    ? html.replace('</style>', `${css}</style>`)
    : html.replace('</head>', `<style>${css}</style></head>`);
}
