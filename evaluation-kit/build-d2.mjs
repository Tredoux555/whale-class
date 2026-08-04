#!/usr/bin/env node
/**
 * build-d2.mjs — one-shot build of the shippable D2 tablet HTML.
 *
 * Runs gen-d2-projection.mjs (same directory) against the canonical item
 * bank to produce the tablet-safe projected JSON, then inlines that JSON
 * into app.template.html in place of the single __BANK_JSON__ placeholder.
 *
 * This is the whole "art-swap wave" pipeline in one command: whenever the
 * canonical bank changes (new stimuli art, milestone edits, etc.), re-run
 * this script to regenerate D2_montree_milestones_app.html. No manual
 * copy-pasting of JSON into the template is needed.
 *
 * Usage: node build-d2.mjs [--bank <item-bank.json>] [--tpl <app.template.html>] [--out <out.html>]
 *   --bank  canonical bank file, forwarded verbatim to gen-d2-projection.mjs
 *           (default: ../lib/montree/evaluation/item-bank.json, same default
 *           gen-d2-projection.mjs uses, resolved relative to this file)
 *   --tpl   HTML template with a single __BANK_JSON__ placeholder
 *           (default: ./app.template.html, next to this script)
 *   --out   output HTML file
 *           (default: ./D2_montree_milestones_app.html, next to this script)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const opt = (flag, dflt) => (argv.includes(flag) ? path.resolve(argv[argv.indexOf(flag) + 1]) : dflt);

const BANK = opt('--bank', path.join(ROOT, '../lib/montree/evaluation/item-bank.json'));
const TPL = opt('--tpl', path.join(ROOT, 'app.template.html'));
const OUT = opt('--out', path.join(ROOT, 'D2_montree_milestones_app.html'));
const GEN = path.join(ROOT, 'gen-d2-projection.mjs');

// 1) project the canonical bank into a scratch file via gen-d2-projection.mjs
//    (same script, same invariant checks, every time — no drift between the
//    "real" projector and whatever a build script might reimplement).
const projected = path.join(os.tmpdir(), `bank.projected.${process.pid}.json`);
execFileSync(process.execPath, [GEN, '--bank', BANK, '--out', projected], { stdio: 'inherit' });

// 2) inline the projected JSON into the template.
const tpl = fs.readFileSync(TPL, 'utf8');
const json = fs.readFileSync(projected, 'utf8');
if (tpl.split('__BANK_JSON__').length - 1 !== 1) {
  throw new Error(`expected exactly one __BANK_JSON__ placeholder in ${TPL}`);
}
fs.writeFileSync(OUT, tpl.replace('__BANK_JSON__', () => json));
fs.rmSync(projected, { force: true });

console.log(`wrote ${OUT}  ${fs.statSync(OUT).size} bytes`);
