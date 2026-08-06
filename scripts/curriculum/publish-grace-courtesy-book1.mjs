#!/usr/bin/env node
/**
 * scripts/curriculum/publish-grace-courtesy-book1.mjs — uploads Grace &
 * Courtesy Lesson 1 ("Walking Feet") to the public `grace-courtesy` bucket:
 *   songs/lesson-01.mp3
 *   pictures/lesson-01.png
 *   books/walking-feet.pdf
 *   books/covers/walking-feet.png
 * so app/montree/library/grace-courtesy/page.tsx can link them via the media
 * proxy: https://montree.xyz/api/montree/media/proxy/<path>?bucket=grace-courtesy
 *
 * Creates the `grace-courtesy` bucket (public) if it doesn't exist yet.
 *
 * Source PDF/cover/song-card: phonics-images/grace-courtesy-books/walking-feet/
 * Source song: ~/Downloads/Walking Feet (1).mp3 (the Aug 6 "lighter" Suno take)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Idempotent (upsert). Verifies each upload with a download afterwards.
 *
 * Usage: node scripts/curriculum/publish-grace-courtesy-book1.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const DRY = process.argv.includes('--dry-run');

const env = {};
for (const line of fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing Supabase env in .env.local'); process.exit(1); }
const supabase = createClient(URL, KEY);

const BUCKET = 'grace-courtesy';
const ART = path.join(REPO, 'phonics-images', 'grace-courtesy-books', 'walking-feet');
const SONG_SRC = path.join(os.homedir(), 'Downloads', 'Walking Feet (1).mp3');

const FILES = [
  { src: path.join(ART, 'walking-feet.pdf'), dest: 'books/walking-feet.pdf', contentType: 'application/pdf' },
  { src: path.join(ART, 'cover.png'), dest: 'books/covers/walking-feet.png', contentType: 'image/png' },
  { src: path.join(ART, 'song-card.png'), dest: 'pictures/lesson-01.png', contentType: 'image/png' },
  { src: SONG_SRC, dest: 'songs/lesson-01.mp3', contentType: 'audio/mpeg' },
];

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) { console.error('listBuckets failed:', error.message); process.exit(1); }
  const exists = (buckets || []).some((b) => b.name === BUCKET);
  if (exists) { console.log(`Bucket '${BUCKET}' already exists.`); return; }
  if (DRY) { console.log(`DRY  would create public bucket '${BUCKET}'`); return; }
  const { error: cErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: '50MB',
  });
  if (cErr) { console.error(`createBucket failed: ${cErr.message}`); process.exit(1); }
  console.log(`Created public bucket '${BUCKET}'.`);
}

async function main() {
  await ensureBucket();
  let ok = 0, fail = 0;
  for (const f of FILES) {
    if (!fs.existsSync(f.src) || fs.statSync(f.src).size < 1000) {
      console.error(`FAIL missing/too-small: ${f.src}`); fail++; continue;
    }
    if (DRY) { console.log(`DRY  would upload ${f.dest} <- ${f.src}`); continue; }
    const buf = fs.readFileSync(f.src);
    const { error } = await supabase.storage.from(BUCKET)
      .upload(f.dest, buf, { contentType: f.contentType, upsert: true });
    if (error) { console.error(`FAIL [${f.dest}] upload: ${error.message}`); fail++; continue; }
    const { data, error: dlErr } = await supabase.storage.from(BUCKET).download(f.dest);
    if (dlErr || !data || data.size !== buf.length) {
      console.error(`FAIL [${f.dest}] verify: ${dlErr?.message || `size ${data?.size} != ${buf.length}`}`); fail++; continue;
    }
    console.log(`OK   ${f.dest} ${(buf.length / 1024 | 0)} KB -> ${BUCKET}/${f.dest}`);
    ok++;
  }
  console.log(`----\nDone: ${ok} uploaded, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main();
