#!/usr/bin/env node
// scripts/lens/make-icons.mjs
// Generate the Montree Lens PWA icon set from one SVG, using the `sharp` that
// is already a dependency of this repo (no new package, no Docker change).
//
//   node scripts/lens/make-icons.mjs
//
// Writes public/lens/icon-<size>.png (+ maskable + apple-touch) and the source
// public/lens/icon.svg. Idempotent — re-run it after editing the SVG below and
// commit whatever changes.
//
// 🚨 MASKABLE IS A DIFFERENT DRAWING, NOT A DIFFERENT SIZE. Android crops a
// maskable icon to whatever shape the launcher wants, and the safe zone is the
// centre 80%. So the maskable variant is rendered with the mark at 60% of the
// canvas on a full-bleed field, and the plain variant with the mark at 78% —
// using one file for both is how you get a launcher icon with its edges shaved
// off.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'public', 'lens');

// Montree "dark forest" palette — MONTREE_BRAND_PALETTE.md.
const FIELD = '#03261D'; // the deep green behind the gold mark
const GOLD = '#E8C96A';
const EMERALD = '#34D399';

/**
 * The mark: an aperture ring with a single emerald leaf-stroke through it —
 * a lens that is looking at something growing. Drawn on a 512 grid.
 *
 * @param {number} scale 0..1, how much of the canvas the mark occupies
 */
function markSvg(scale) {
  const c = 256;
  const r = 200 * scale;
  const inner = r * 0.52;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${FIELD}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="${r * 0.085}"/>
  <circle cx="${c}" cy="${c}" r="${inner}" fill="none" stroke="${GOLD}" stroke-width="${r * 0.05}" opacity="0.55"/>
  <path d="M ${c - inner * 0.75} ${c + inner * 0.7}
           C ${c - inner * 0.2} ${c + inner * 0.8}, ${c + inner * 0.75} ${c + inner * 0.1}, ${c + inner * 0.7} ${c - inner * 0.75}
           C ${c + inner * 0.05} ${c - inner * 0.6}, ${c - inner * 0.6} ${c - inner * 0.05}, ${c - inner * 0.75} ${c + inner * 0.7} Z"
        fill="${EMERALD}" opacity="0.92"/>
  <path d="M ${c - inner * 0.75} ${c + inner * 0.7} L ${c + inner * 0.55} ${c - inner * 0.55}"
        stroke="${FIELD}" stroke-width="${r * 0.05}" stroke-linecap="round"/>
</svg>`;
}

const SIZES = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const plain = markSvg(0.78);
  const maskable = markSvg(0.6);

  await writeFile(path.join(OUT_DIR, 'icon.svg'), plain, 'utf8');

  for (const size of SIZES) {
    await sharp(Buffer.from(plain))
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, `icon-${size}.png`));
  }
  for (const size of [192, 512]) {
    await sharp(Buffer.from(maskable))
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, `icon-${size}-maskable.png`));
  }
  // iOS ignores the manifest's icons and reads apple-touch-icon; 180 is the
  // size every current iPhone asks for.
  await sharp(Buffer.from(plain))
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));

  console.log(`Wrote ${SIZES.length + 3} icons + icon.svg to public/lens/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
