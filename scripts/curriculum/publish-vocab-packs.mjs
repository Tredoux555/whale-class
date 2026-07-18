#!/usr/bin/env node
/**
 * scripts/curriculum/publish-vocab-packs.mjs — uploads the 46 Dark Phonics
 * per-song vocab card PDFs to the public `dark-phonics` bucket as
 *   vocab-packs/lesson-NN.pdf
 * so public/dark-phonics-songs.html can link them via the media proxy:
 *   https://montree.xyz/api/montree/media/proxy/vocab-packs/lesson-NN.pdf?bucket=dark-phonics&v=1
 *
 * Source: ~/Desktop/English Curriculum 2026/Dark Phonics/Vocab Packs/lesson-NN.pdf
 * Lesson numbers come from lib/montree/english-curriculum/spec/dark-phonics-hardcards.json
 * ("songs" keys) — lessons 5-53 except 33/34/46 (skipped_lessons, no concrete noun).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Idempotent (upsert). Verifies each upload with a download-back afterwards
 * (NOT the montree.xyz proxy — an early proxy fetch poisons the Cloudflare
 * edge cache for 7 days).
 *
 * Usage: node scripts/curriculum/publish-vocab-packs.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const DRY = process.argv.includes('--dry-run');

// env from .env.local
const env = {};
for (const line of fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing Supabase env in .env.local'); process.exit(1); }
const supabase = createClient(URL, KEY);

const manifest = JSON.parse(fs.readFileSync(
  path.join(REPO, 'lib/montree/english-curriculum/spec/dark-phonics-hardcards.json'), 'utf8'));
const lessons = Object.keys(manifest.songs).map(Number).sort((a, b) => a - b);
const ROOT = path.join(os.homedir(), 'Desktop', 'English Curriculum 2026', 'Dark Phonics', 'Vocab Packs');

let ok = 0, fail = 0;
for (const n of lessons) {
  const nn = String(n).padStart(2, '0');
  const src = path.join(ROOT, `lesson-${nn}.pdf`);
  if (!fs.existsSync(src) || fs.statSync(src).size < 20000) {
    console.error(`FAIL [lesson-${nn}] missing/too-small ${src}`); fail++; continue;
  }
  const dest = `vocab-packs/lesson-${nn}.pdf`;
  if (DRY) { console.log(`DRY  [lesson-${nn}] would upload ${dest}`); continue; }
  const buf = fs.readFileSync(src);
  const { error } = await supabase.storage.from('dark-phonics')
    .upload(dest, buf, { contentType: 'application/pdf', upsert: true });
  if (error) { console.error(`FAIL [lesson-${nn}] upload: ${error.message}`); fail++; continue; }
  // verify by downloading back from storage (never the montree.xyz proxy — cache poison risk)
  const { data, error: dlErr } = await supabase.storage.from('dark-phonics').download(dest);
  if (dlErr || !data || data.size !== buf.length) {
    console.error(`FAIL [lesson-${nn}] verify: ${dlErr?.message || `size ${data?.size} != ${buf.length}`}`); fail++; continue;
  }
  console.log(`OK   [lesson-${nn}] ${(buf.length / 1024 | 0)} KB -> dark-phonics/${dest}`);
  ok++;
}
console.log(`----\nDone: ${ok} uploaded, ${fail} failed (of ${lessons.length} lessons in manifest).`);
process.exit(fail ? 1 : 0);
