#!/usr/bin/env node
/**
 * scripts/curriculum/build-dark-phonics-deck.mjs — merges the 49 published
 * per-lesson Dark Phonics flashcards (dark-phonics/flashcards/lesson-NN.pdf)
 * into ONE printable deck and uploads it back to the bucket as
 *   flashcards/deck-all-lessons.pdf
 * Requires pdfunite (brew poppler) on PATH.
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Usage: node scripts/curriculum/build-dark-phonics-deck.mjs
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-deck-'));
const files = [];
let missing = 0;
for (let n = 5; n <= 53; n++) {
  const nn = String(n).padStart(2, '0');
  const key = `flashcards/lesson-${nn}.pdf`;
  const { data, error } = await supabase.storage.from('dark-phonics').download(key);
  if (error || !data) { console.error(`MISS ${key}: ${error?.message}`); missing++; continue; }
  const f = path.join(tmp, `lesson-${nn}.pdf`);
  fs.writeFileSync(f, Buffer.from(await data.arrayBuffer()));
  files.push(f);
}
console.log(`downloaded ${files.length} cards, ${missing} missing`);
if (files.length === 0) process.exit(1);

const out = path.join(tmp, 'deck-all-lessons.pdf');
execFileSync('/opt/homebrew/bin/pdfunite', [...files, out]);
const buf = fs.readFileSync(out);
if (buf.length < 50000) { console.error('deck suspiciously small'); process.exit(1); }
console.log(`merged deck: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);

const { error: upErr } = await supabase.storage.from('dark-phonics')
  .upload('flashcards/deck-all-lessons.pdf', buf, { contentType: 'application/pdf', upsert: true });
if (upErr) { console.error('upload failed:', upErr.message); process.exit(1); }
const { data: chk } = await supabase.storage.from('dark-phonics').download('flashcards/deck-all-lessons.pdf');
console.log(`uploaded + verified: ${chk?.size} bytes -> dark-phonics/flashcards/deck-all-lessons.pdf`);
console.log(`local copy kept at: ${out}`);
