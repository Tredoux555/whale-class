#!/usr/bin/env node
/**
 * scripts/curriculum/picture-bank-add.mjs — the way photos ENTER the picture bank.
 *
 * Generated art is worthless until it is filed correctly, so this is the only
 * sanctioned door in. It validates against the shelf rules, files by word, and
 * (with --publish) pushes to the same Supabase path the live site reads.
 *
 *   # file one photo you just generated
 *   node scripts/curriculum/picture-bank-add.mjs --word snake --from ~/Downloads/xyz.png
 *
 *   # sweep a folder of Midjourney downloads named "<word>*.png"
 *   node scripts/curriculum/picture-bank-add.mjs --sweep ~/Downloads/mj-picture-bank
 *
 *   # audit what is already in the bank against the rules
 *   node scripts/curriculum/picture-bank-add.mjs --audit
 *
 *   # push to Supabase dark-phonics/picture-bank/<word>.jpg (the online pipeline)
 *   node scripts/curriculum/picture-bank-add.mjs --publish --word snake
 *
 * THE SHELF RULES (docs/picture-bank/HANDOFF_PICTURE_BANK_Jul23.md), checked here:
 *   1. one real photographed object, not an illustration or a character
 *   2. plain white background — the card is printed on white, so a dark or
 *      coloured ground reads as a mistake
 *   3. the subject must actually be visible against that white (a white towel on
 *      white is a blank card)
 *   4. big enough to print at 300dpi on a 7.5cm card (≥900px on the short edge)
 *
 * Rules 1 is a human judgement and is NOT auto-passed — the tool reports what it
 * can measure and refuses to pretend about the rest.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const BANK = path.join(REPO, 'docs', 'picture-bank', 'photos');
const EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Pictures are fitted `contain` into the card, so the image's LONG edge maps to
 * the card's printable width (7.5cm less the white border ≈ 7.1cm ≈ 2.8in).
 * 300dpi across that needs ~840px on the long edge; Midjourney's 1344×896 gives
 * ~480dpi, comfortably clear. There is no separate short-edge requirement — an
 * earlier version demanded 900 on the short edge and failed 192 of 201 sound
 * photos on arithmetic alone.
 */
const MIN_LONG_EDGE = 840;
/** Mean luminance of the border ring, above which the ground counts as white. */
const WHITE_MIN = 225;
/** Minimum spread between the border ring and the centre, or nothing is visible. */
const SUBJECT_MIN_CONTRAST = 18;

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : def;
}
function flag(name) { return process.argv.includes(`--${name}`); }
function expand(p) { return p?.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p; }

/**
 * Measure an image with python/PIL — no native node image dep, so this works in a
 * Linux VM sharing a macOS node_modules where sharp cannot load.
 */
function measure(file) {
  const py = `
import json, sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w, h = im.size
s = im.resize((64, 64))
px = s.load()
ring, mid = [], []
for y in range(64):
    for x in range(64):
        r, g, b = px[x, y]
        lum = 0.299*r + 0.587*g + 0.114*b
        edge = x < 4 or x > 59 or y < 4 or y > 59
        (ring if edge else mid).append(lum)
ringavg = sum(ring)/len(ring)
# the darkest decile of the middle is the subject, not the backdrop bleeding in
mid.sort()
subject = sum(mid[:len(mid)//10])/max(1, len(mid)//10)
print(json.dumps({'w': w, 'h': h, 'ring': round(ringavg, 1), 'subject': round(subject, 1)}))
`;
  try {
    const out = execFileSync('python3', ['-c', py, file], { encoding: 'utf8' });
    return JSON.parse(out);
  } catch (e) {
    return { error: e.message.split('\n')[0] };
  }
}

function checks(m) {
  const problems = [];
  if (m.error) return [`unreadable: ${m.error}`];
  if (Math.max(m.w, m.h) < MIN_LONG_EDGE) {
    problems.push(`too small to print at 300dpi: ${m.w}×${m.h} (need ≥${MIN_LONG_EDGE} long edge)`);
  }
  if (m.ring < WHITE_MIN) {
    problems.push(`background is not white (border luminance ${m.ring}/255) — breaks the shelf rule`);
  }
  if (m.ring - m.subject < SUBJECT_MIN_CONTRAST) {
    problems.push(`subject barely visible against white (contrast ${Math.round(m.ring - m.subject)}) — prints as a near-blank card`);
  }
  return problems;
}

/** Convert to a print-ready JPEG at the bank's canonical path. */
function fileIntoBank(word, src, { force = false } = {}) {
  const dir = path.join(BANK, word);
  const dest = path.join(dir, `${word}.jpg`);
  if (fs.existsSync(dest) && !force) {
    return { ok: false, reason: `already in the bank (use --force to replace): ${dest}` };
  }
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(dest)) {
    const bak = path.join(dir, `${word}.replaced-${fs.statSync(dest).mtimeMs}.jpg`);
    fs.renameSync(dest, bak);
  }
  const py = `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
im.save(sys.argv[2], 'JPEG', quality=92, optimize=True, progressive=True)
`;
  execFileSync('python3', ['-c', py, src, dest]);
  return { ok: true, dest };
}

function bankWords() {
  try {
    return fs.readdirSync(BANK, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name).sort();
  } catch { return []; }
}

function bankPhoto(word) {
  for (const e of EXTS) {
    const p = path.join(BANK, word, `${word}${e}`);
    if (fs.existsSync(p) && fs.statSync(p).size > 0) return p;
  }
  return null;
}

// ── --audit ────────────────────────────────────────────────────────────────
function audit() {
  const words = bankWords();
  const bad = [];
  console.log(`\n🔍 auditing ${words.length} bank entries against the shelf rules\n`);
  for (const w of words) {
    const p = bankPhoto(w);
    if (!p) { bad.push([w, ['no photo file']]); continue; }
    const problems = checks(measure(p));
    if (problems.length) bad.push([w, problems]);
  }
  for (const [w, problems] of bad) {
    console.log(`  ✗ ${w}`);
    for (const pr of problems) console.log(`      ${pr}`);
  }
  console.log(`\n${words.length - bad.length}/${words.length} pass the measurable checks.`);
  console.log('Subject correctness (is that actually a snake a child would name?) is a');
  console.log('human call — look at the contact sheets, this tool cannot judge it.\n');
  return bad.length ? 1 : 0;
}

// ── --publish (the online pipeline) ────────────────────────────────────────
async function publish(words) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('✗ --publish needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.');
    console.error('  Run with: node --env-file=.env.local scripts/curriculum/picture-bank-add.mjs --publish …');
    return 2;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Same bucket + path the live media packs already read
  // (see upload-picture-bank-vocab.mjs and swap-picture-bank-images.py).
  const BUCKET = 'dark-phonics';
  let done = 0, failed = 0;
  for (const w of words) {
    const p = bankPhoto(w);
    if (!p) { console.error(`  ✗ ${w}: not in the bank`); failed++; continue; }
    const { error } = await sb.storage.from(BUCKET)
      .upload(`picture-bank/${w}.jpg`, fs.readFileSync(p), {
        contentType: 'image/jpeg', upsert: true,
      });
    if (error) { console.error(`  ✗ ${w}: ${error.message}`); failed++; }
    else { console.log(`  ✓ ${w} → ${BUCKET}/picture-bank/${w}.jpg`); done++; }
  }
  console.log(`\n${done} uploaded, ${failed} failed.`);
  return failed ? 1 : 0;
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  if (flag('audit')) process.exit(audit());

  if (flag('publish')) {
    const w = arg('word');
    const words = w ? [w.toLowerCase()] : bankWords();
    process.exit(await publish(words));
  }

  const sweepDir = expand(arg('sweep'));
  const from = expand(arg('from'));
  const word = arg('word')?.toLowerCase().trim();

  if (!sweepDir && !(from && word)) {
    console.log(`
picture-bank-add.mjs — file generated photos into the Montessori Picture Bank.

  --word <w> --from <file>   file one photo as <w>
  --sweep <dir>              file every "<word>*.<ext>" in a folder
  --audit                    check the whole bank against the measurable rules
  --publish [--word <w>]     upload to Supabase dark-phonics/picture-bank/
  --force                    replace an existing entry (the old one is kept
                             alongside as <word>.replaced-<ms>.jpg)
  --lenient                  file it even if a check fails (still reports)
`);
    process.exit(2);
  }

  const jobs = [];
  if (sweepDir) {
    const known = new Set(bankWords());
    for (const name of fs.readdirSync(sweepDir).sort()) {
      if (!EXTS.includes(path.extname(name).toLowerCase())) continue;
      // "snake.png", "snake-2.png", "snake_final.png" → snake
      const stem = path.basename(name, path.extname(name)).toLowerCase();
      const guess = stem.split(/[-_.\s]/)[0];
      if (!guess) continue;
      jobs.push({ word: guess, src: path.join(sweepDir, name), known: known.has(guess) });
    }
    if (!jobs.length) { console.log(`Nothing to file in ${sweepDir}`); process.exit(0); }
  } else {
    jobs.push({ word, src: from, known: bankWords().includes(word) });
  }

  let filed = 0, refused = 0;
  for (const j of jobs) {
    if (!fs.existsSync(j.src)) { console.error(`  ✗ ${j.word}: ${j.src} not found`); refused++; continue; }
    const m = measure(j.src);
    const problems = checks(m);
    if (problems.length && !flag('lenient')) {
      console.error(`  ✗ ${j.word}  REFUSED (${m.w}×${m.h}, ground ${m.ring})`);
      for (const p of problems) console.error(`      ${p}`);
      console.error('      → regenerate, or --lenient to file it anyway');
      refused++;
      continue;
    }
    const r = fileIntoBank(j.word, j.src, { force: flag('force') });
    if (!r.ok) { console.error(`  ✗ ${j.word}: ${r.reason}`); refused++; continue; }
    const note = problems.length ? `  ⚠ filed with ${problems.length} problem(s)` : '';
    console.log(`  ✓ ${j.word}  ${m.w}×${m.h}  ground ${m.ring}  → ${path.relative(REPO, r.dest)}${note}${j.known ? '' : '  (new word)'}`);
    filed++;
  }
  console.log(`\n${filed} filed, ${refused} refused.`);
  if (filed) console.log('Publish when ready:  node --env-file=.env.local scripts/curriculum/picture-bank-add.mjs --publish');
  process.exit(refused && !filed ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e?.stack || e); process.exit(1); });
