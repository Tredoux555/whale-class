#!/usr/bin/env node
/**
 * Writing Shelf ADD-ON generator — sample output, for an auditor.
 *
 * Writes the DEFAULT-config print HTML of every work the generator can make
 * into _to_delete/ws-gen-samples/, so the layout can be opened in a browser
 * and printed without running the Next app. The photographs are replaced by a
 * self-contained placeholder data-URI and the Andika faces are inlined as
 * base64 @font-face, so each file stands on its own with no network, no photo
 * bank and no /fonts route — and still renders in the real printed face.
 *
 * The generator library is TypeScript with no React and no DOM, so this script
 * compiles just that library to CommonJS with the repo's own tsc (there is no
 * tsx or ts-node in this checkout) and requires the result.
 *
 * Run:  node scripts/curriculum/writing-shelf/generator-samples.mjs
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const BUILD = join(REPO, '_to_delete', 'ws-gen-build');
const OUT = join(REPO, '_to_delete', 'ws-gen-samples');

console.log('compiling lib/montree/writing-shelf/generator -> _to_delete/ws-gen-build ...');
execFileSync('npx', ['tsc', '-p', 'tsconfig.wsgen.json'], { cwd: REPO, stdio: 'inherit' });

const require_ = createRequire(import.meta.url);
const gen = require_(join(BUILD, 'lib', 'montree', 'writing-shelf', 'generator', 'index.js'));
const calib = require_(join(BUILD, 'lib', 'montree', 'print', 'calibration-sheet.js'));

/**
 * The two bundled Andika faces, inlined. The app serves these from /fonts, but
 * a sample opened straight off disk has no server, and without the real face
 * the backs fall through the stack to whatever the machine has — which is the
 * serif the audit caught.
 */
function inlineAndikaFontFaceCss() {
  const dir = join(REPO, 'public', 'fonts');
  const face = (file, weight) => {
    const b64 = readFileSync(join(dir, file)).toString('base64');
    return (
      `@font-face{font-family:'Andika';src:url(data:font/ttf;base64,${b64}) format('truetype');` +
      `font-weight:${weight};font-style:normal;font-display:swap;}`
    );
  };
  return [face('Andika-Regular.ttf', 400), face('Andika-Bold.ttf', 700)].join('\n');
}

const FONT_CSS = inlineAndikaFontFaceCss();

/** A self-contained stand-in for a photo-bank photograph. */
function placeholderPhoto(word) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">` +
    `<rect width="300" height="300" fill="#F4F1EC"/>` +
    `<circle cx="150" cy="128" r="78" fill="#CFE3D4" stroke="#8C857B" stroke-width="3"/>` +
    `<text x="150" y="142" font-family="sans-serif" font-size="42" text-anchor="middle" fill="#141110">${word}</text>` +
    `<text x="150" y="258" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#8C857B">sample photo</text>` +
    `</svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
}

function withPhotos(config) {
  return {
    ...config,
    fontFaceCss: FONT_CSS,
    cards: config.cards.map((c) => ({ ...c, photoUrl: placeholderPhoto(c.word) })),
  };
}

const withFont = (config) => ({ ...config, fontFaceCss: FONT_CSS });

mkdirSync(OUT, { recursive: true });

const samples = [
  ['sound-frame-mat-A4.html', gen.buildSoundFrameMatHtml(withFont(gen.defaultMatConfigA4()))],
  ['sound-frame-mat-A3.html', gen.buildSoundFrameMatHtml(withFont(gen.defaultMatConfigA3()))],
  ['chain-cards-A4.html', gen.buildFlipCardsHtml(withPhotos(gen.defaultChainCardsConfig()))],
  ['dictation-photo-cards-A4.html', gen.buildFlipCardsHtml(withPhotos(gen.defaultDictationCardsConfig()))],
  ['dictation-photo-cards-A4-no-photos.html', gen.buildFlipCardsHtml(withFont(gen.defaultDictationCardsConfig()))],
  ['duplex-calibration-sheet-A4.html', calib.buildCalibrationSheetHtml({ fontFaceCss: FONT_CSS })],
];

for (const [name, html] of samples) {
  writeFileSync(join(OUT, name), html, 'utf8');
  console.log(`  ${name}  ${(html.length / 1024).toFixed(1)} KB`);
}

// A few numbers an auditor can check against the handoff without opening a browser.
const a4 = gen.matGeometry(gen.defaultMatConfigA4());
const a3 = gen.matGeometry(gen.defaultMatConfigA3());
const fmt = (s) => `${s.count} x ${s.frameWidth.toFixed(2)} x ${s.frameHeight.toFixed(2)} mm, gaps ${s.gutter.toFixed(2)} mm`;
console.log('\nmat A4  trim %d x %d — front %s | back %s', a4.trimWidth, a4.trimHeight, fmt(a4.front), fmt(a4.back));
console.log('mat A3  trim %d x %d — front %s | back %s', a3.trimWidth, a3.trimHeight, fmt(a3.front), fmt(a3.back));
console.log('warnings:', [...a4.warnings, ...a3.warnings].length === 0 ? 'none' : [...a4.warnings, ...a3.warnings]);
console.log(`\nwrote ${samples.length} files to ${OUT}`);
