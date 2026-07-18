#!/usr/bin/env node
/**
 * scripts/curriculum/publish-easy-readers.mjs — uploads the 11 Dark Phonics
 * Easy Reader book PDFs to the public `dark-phonics` bucket as
 *   readers/<slug>.pdf
 * so public/dark-phonics-readers.html can link them via the media proxy:
 *   https://montree.xyz/api/montree/media/proxy/readers/<slug>.pdf?bucket=dark-phonics
 *
 * Source: ~/Desktop/English Curriculum 2026/Dark Phonics/Easy Readers/<slug>/book.pdf
 * Slugs come from lib/montree/english-curriculum/spec/easy-readers-manifest-v2.json.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Idempotent (upsert). Verifies each upload with a HEAD download afterwards.
 *
 * Usage: node scripts/curriculum/publish-easy-readers.mjs [--dry-run]
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
  path.join(REPO, 'lib/montree/english-curriculum/spec/easy-readers-manifest-v2.json'), 'utf8'));
const ROOT = path.join(os.homedir(), 'Desktop', 'English Curriculum 2026', 'Dark Phonics', 'Easy Readers');

let ok = 0, fail = 0;
for (const r of manifest.readers) {
  const src = path.join(ROOT, r.slug, 'book.pdf');
  if (!fs.existsSync(src) || fs.statSync(src).size < 20000) {
    console.error(`FAIL [${r.slug}] missing/too-small ${src}`); fail++; continue;
  }
  const dest = `readers/${r.slug}.pdf`;
  if (DRY) { console.log(`DRY  [${r.slug}] would upload ${dest}`); continue; }
  const buf = fs.readFileSync(src);
  const { error } = await supabase.storage.from('dark-phonics')
    .upload(dest, buf, { contentType: 'application/pdf', upsert: true });
  if (error) { console.error(`FAIL [${r.slug}] upload: ${error.message}`); fail++; continue; }
  // verify
  const { data, error: dlErr } = await supabase.storage.from('dark-phonics').download(dest);
  if (dlErr || !data || data.size !== buf.length) {
    console.error(`FAIL [${r.slug}] verify: ${dlErr?.message || `size ${data?.size} != ${buf.length}`}`); fail++; continue;
  }
  console.log(`OK   [${r.slug}] ${(buf.length / 1024 | 0)} KB -> dark-phonics/${dest}`);
  ok++;
}
console.log(`----\nDone: ${ok} uploaded, ${fail} failed.`);
process.exit(fail ? 1 : 0);
