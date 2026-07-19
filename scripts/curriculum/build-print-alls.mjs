#!/usr/bin/env node
/**
 * scripts/curriculum/build-print-alls.mjs — builds two combined "print all"
 * PDFs for the Dark Phonics site:
 *   (a) all 11 Easy Readers, in gate-ascending order  -> readers/all-readers.pdf
 *   (b) all 46 Vocab Packs, in ascending lesson order -> vocab-packs/all-vocab-packs.pdf
 * Sources are LOCAL files on the Mac (not re-downloaded from storage), then
 * uploaded to the `dark-phonics` bucket and verified by downloading back.
 *
 * 🚨 DUPLEX GUARD: every vocab pack must have an EVEN page count (picture
 * front + word back per card). An odd-page pack would shift every following
 * pack's fronts onto the wrong backs when merged. Hard-fails if violated.
 *
 * Requires pdfunite + pdfinfo (brew poppler) on PATH.
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Usage: node scripts/curriculum/build-print-alls.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = {};
for (const line of fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const PDFUNITE = '/opt/homebrew/bin/pdfunite';
const PDFINFO = '/opt/homebrew/bin/pdfinfo';

function pageCount(file) {
  const out = execFileSync(PDFINFO, [file], { encoding: 'utf8' });
  const m = out.match(/^Pages:\s+(\d+)/m);
  if (!m) throw new Error(`pdfinfo could not read page count for ${file}`);
  return parseInt(m[1], 10);
}

async function uploadAndVerify(bucketKey, buf) {
  const { error: upErr } = await supabase.storage.from('dark-phonics')
    .upload(bucketKey, buf, { contentType: 'application/pdf', upsert: true });
  if (upErr) { console.error(`upload failed (${bucketKey}):`, upErr.message); process.exit(1); }
  let chk = await supabase.storage.from('dark-phonics').download(bucketKey);
  if (chk.data && chk.data.size !== buf.length) {
    console.log(`  verify size mismatch (stale edge cache?) — waiting 60s and re-checking...`);
    await new Promise(r => setTimeout(r, 60000));
    chk = await supabase.storage.from('dark-phonics').download(bucketKey);
  }
  if (!chk.data) { console.error(`verify download failed (${bucketKey}):`, chk.error?.message); process.exit(1); }
  const ok = chk.data.size === buf.length;
  console.log(`  uploaded + verified: local ${buf.length} bytes vs remote ${chk.data.size} bytes -> ${ok ? 'MATCH' : 'MISMATCH'} (dark-phonics/${bucketKey})`);
  if (!ok) process.exit(1);
}

// ---------------------------------------------------------------------------
// (a) ALL READERS — gate-ascending order, read from the source html
// ---------------------------------------------------------------------------
async function buildAllReaders() {
  console.log('\n=== ALL READERS ===');
  const READERS_DIR = path.join(os.homedir(), 'Desktop', 'English Curriculum 2026', 'Dark Phonics', 'Easy Readers');
  // Gate-ascending order, taken from public/dark-phonics-readers.html entry order
  const slugs = [
    'the-cat-sat',      // Gate: Lesson 17
    'mud-pup',          // Gate: Lesson 19
    'hen-in-bed',       // Gate: Lesson 22
    'fox-in-a-box',     // Gate: Lesson 28
    'cat-cot-cut',       // Gate: Lesson 40
    'the-bell-fell',     // Gate: Lesson 41
    'fish-and-chick',    // Gate: Lesson 43
    'this-and-that',     // Gate: Lesson 46
    'jump-in-the-sand',  // Gate: Lesson 48
    'frog-and-crab',     // Gate: Lesson 51
    'big-splash',        // Gate: Lesson 53
  ];

  const files = [];
  let totalPages = 0;
  for (const slug of slugs) {
    const f = path.join(READERS_DIR, slug, 'book.pdf');
    if (!fs.existsSync(f)) { console.error(`MISSING reader: ${f}`); process.exit(1); }
    const pages = pageCount(f);
    totalPages += pages;
    console.log(`  ${slug}: ${pages} pages`);
    files.push(f);
  }
  console.log(`${files.length}/11 readers found, ${totalPages} total pages`);
  if (files.length !== 11) { console.error('expected exactly 11 readers'); process.exit(1); }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'print-all-readers-'));
  const out = path.join(tmp, 'all-readers.pdf');
  execFileSync(PDFUNITE, [...files, out]);
  const buf = fs.readFileSync(out);
  if (buf.length < 50000) { console.error('all-readers.pdf suspiciously small'); process.exit(1); }
  const mergedPages = pageCount(out);
  console.log(`merged: ${mergedPages} pages, ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
  if (mergedPages !== totalPages) { console.error(`page count mismatch: expected ${totalPages}, got ${mergedPages}`); process.exit(1); }

  await uploadAndVerify('readers/all-readers.pdf', buf);
  console.log(`local copy kept at: ${out}`);
  return { tmp, out };
}

// ---------------------------------------------------------------------------
// (b) ALL VOCAB PACKS — ascending lesson order, duplex-guarded
// ---------------------------------------------------------------------------
async function buildAllVocabPacks() {
  console.log('\n=== ALL VOCAB PACKS ===');
  const VOCAB_DIR = path.join(os.homedir(), 'Desktop', 'English Curriculum 2026', 'Dark Phonics', 'Vocab Packs');
  const allFiles = fs.readdirSync(VOCAB_DIR)
    .filter(f => /^lesson-\d{2}\.pdf$/.test(f))
    .sort(); // lesson-05 ... lesson-53, lexicographic == numeric ascending (zero-padded)

  if (allFiles.length !== 46) { console.error(`expected 46 vocab packs, found ${allFiles.length}`); process.exit(1); }

  const files = [];
  let totalPages = 0;
  const oddOffenders = [];
  for (const name of allFiles) {
    const f = path.join(VOCAB_DIR, name);
    const pages = pageCount(f);
    if (pages % 2 !== 0) oddOffenders.push({ name, pages });
    totalPages += pages;
    files.push(f);
  }
  console.log(`${files.length}/46 vocab packs found, ${totalPages} total pages`);

  if (oddOffenders.length > 0) {
    console.error('🚨 DUPLEX GUARD FAILED — odd page count(s) found (would shift every following pack):');
    for (const o of oddOffenders) console.error(`  ${o.name}: ${o.pages} pages`);
    process.exit(1);
  }
  console.log('duplex guard: all 46 packs have EVEN page counts — OK');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'print-all-vocab-'));
  const out = path.join(tmp, 'all-vocab-packs.pdf');
  execFileSync(PDFUNITE, [...files, out]);
  const buf = fs.readFileSync(out);
  if (buf.length < 100000) { console.error('all-vocab-packs.pdf suspiciously small'); process.exit(1); }
  const mergedPages = pageCount(out);
  console.log(`merged: ${mergedPages} pages, ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
  if (mergedPages !== totalPages) { console.error(`page count mismatch: expected ${totalPages}, got ${mergedPages}`); process.exit(1); }
  if (mergedPages % 2 !== 0) { console.error('merged vocab PDF has an odd total page count — duplex broken'); process.exit(1); }

  await uploadAndVerify('vocab-packs/all-vocab-packs.pdf', buf);
  console.log(`local copy kept at: ${out}`);
  return { tmp, out };
}

const readers = await buildAllReaders();
const vocab = await buildAllVocabPacks();

console.log('\n=== DONE ===');
console.log(`Readers local copy: ${readers.out}`);
console.log(`Vocab local copy:   ${vocab.out}`);
