#!/usr/bin/env node
/**
 * scripts/curriculum/upload-dark-phonics-bank.mjs
 *
 * Ingests the COMPLETE Dark Phonics art bank into the shared Montree Picture
 * Bank (Supabase `montree_photo_bank` table + `photo-bank` storage bucket):
 *
 *   - reader page art        phonics-images/satpin-v2/books/<book>/   (spat, sit, nap + wk1-3 books where present)
 *   - isolated vocab plates  phonics-images/satpin-v2/vocab-iso/
 *   - patched letter plates  phonics-images/satpin-v2/letters/
 *   - alphabet deck plates   phonics-images/alphabet-v1/plates/       (L11-31 flashcard picks, <letter>-<word>.jpg)
 *   - canonical cast sheets  phonics-images/satpin-v2/cast/
 *   - song cards             phonics-images/dark-phonics-song-cards/  (lessons 05-31)
 *   - Montessori photo set   phonics-images/montessori-real/<letter>/<word>.png (realistic three-part-card photos)
 *
 * JPEG-ONLY bank rule (app/api/montree/photo-bank/route.ts): PNG sources are
 * converted to JPEG q90, transparency flattened white, in-memory; repo files
 * are never modified. Idempotent by target .jpg filename — safe to re-run.
 * Extends scripts/curriculum/upload-satpin-to-picture-bank.mjs (same env,
 * sharp conversion, upload/insert shape).
 *
 * RUNS ONLY ON TREDOUX'S MAC (needs .env.local + network):
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-dark-phonics-bank.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-dark-phonics-bank.mjs
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';
const BUCKET = 'photo-bank';
const CONCURRENCY = 4;
const MAX_RETRIES = 3;

const PI = path.join(REPO, 'phonics-images');
const SATPIN = path.join(PI, 'satpin-v2');
const TMP_DIR = path.join(os.tmpdir(), 'montree-dark-phonics-jpg');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SOUND_BY_LESSON = {
  '05':'s','06':'a','07':'t','08':'p','09':'i','10':'n','11':'m','12':'d','13':'g',
  '14':'o','15':'c','16':'k','17':'ck','18':'e','19':'u','20':'r','21':'h','22':'b',
  '23':'f','24':'l','25':'j','26':'v','27':'w','28':'x','29':'y','30':'z','31':'qu',
};

// Static groups (flat dirs). { dir, baseTags, extraTags(filename)? }
const GROUPS = [
  { dir: path.join(SATPIN,'books','spat'),  baseTags: ['dark-phonics','satpin-v2','reader-page','week-4','spat'] },
  { dir: path.join(SATPIN,'books','sit'),   baseTags: ['dark-phonics','satpin-v2','reader-page','week-5','sit-sit-sit'] },
  { dir: path.join(SATPIN,'books','nap'),   baseTags: ['dark-phonics','satpin-v2','reader-page','week-6','nap-ant-nap'] },
  { dir: path.join(SATPIN,'books','sock'),  baseTags: ['dark-phonics','satpin-v2','reader-page','week-1','snake-in-my-sock'] },
  { dir: path.join(SATPIN,'books','apple'), baseTags: ['dark-phonics','satpin-v2','reader-page','week-2','an-apple-for-ant'] },
  { dir: path.join(SATPIN,'books','sat'),   baseTags: ['dark-phonics','satpin-v2','reader-page','week-3','the-sat'] },
  { dir: path.join(SATPIN,'vocab-iso'),     baseTags: ['dark-phonics','satpin-v2','vocab','isolated','flashcard'] },
  { dir: path.join(SATPIN,'letters'),       baseTags: ['dark-phonics','satpin-v2','letter-plate','patched'] },
  { dir: path.join(SATPIN,'cast'),          baseTags: ['dark-phonics','satpin-v2','cast-sheet','character-reference'] },
  { dir: path.join(PI,'alphabet-v1','plates'), baseTags: ['dark-phonics','alphabet-v1','vocab','flashcard','deck-plate'],
    extraTags: f => { const m = f.match(/^(qu|ck|[a-z])-([a-z-]+)\./i); return m ? [`letter-${m[1]}`, m[2]] : []; } },
  { dir: path.join(PI,'dark-phonics-song-cards'), baseTags: ['dark-phonics','song-card','lesson-picture'],
    extraTags: f => { const m = f.match(/lesson-(\d\d)/); return m && SOUND_BY_LESSON[m[1]] ? [`lesson-${m[1]}`, `letter-${SOUND_BY_LESSON[m[1]]}`] : []; } },
];

function cleanLabel(filename) {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function convertToJpeg(srcPath) {
  const img = sharp(srcPath).flatten({ background: '#ffffff' }).jpeg({ quality: 90 });
  const buffer = await img.toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width || null, height: meta.height || null };
}

async function withRetry(fn) {
  let lastErr;
  for (let a = 1; a <= MAX_RETRIES; a++) {
    try { return await fn(); }
    catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 400 * a)); }
  }
  throw lastErr;
}

async function main() {
  console.log('=== Dark Phonics complete art bank -> Picture Bank (JPEG) ===');
  console.log(DRY_RUN ? '🟡 DRY RUN — no conversion writes, no uploads, no DB inserts.\n' : '');

  const plan = [];

  // Flat groups
  for (const group of GROUPS) {
    if (!fs.existsSync(group.dir)) { console.warn('  (skip, missing dir) ' + group.dir); continue; }
    const files = fs.readdirSync(group.dir).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
    for (const f of files) {
      const jpegName = f.replace(/\.(png|jpe?g)$/i, '.jpg');
      const label = cleanLabel(f);
      const extra = group.extraTags ? group.extraTags(f) : [];
      const tags = [...new Set([
        ...group.baseTags, ...extra,
        ...label.toLowerCase().split(/\s+/).filter(w => w.length > 1),
        label.toLowerCase(),
      ])];
      plan.push({ src: path.join(group.dir, f), srcName: f, jpegName, label, category: 'dark-phonics', tags });
    }
  }

  // montessori-real/<letter>/<word>.png — nested by letter; realistic photo set.
  const MR = path.join(PI, 'montessori-real');
  if (fs.existsSync(MR)) {
    for (const letter of fs.readdirSync(MR).sort()) {
      const dir = path.join(MR, letter);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f)).sort()) {
        const word = f.replace(/\.[^/.]+$/, '');
        // letter-prefixed target filename so 'duck' under d/ck/qu don't collide in the bank
        const jpegName = `montessori-real-${letter}-${word}.jpg`;
        plan.push({
          src: path.join(dir, f), srcName: `${letter}/${f}`, jpegName,
          label: `${word} (real photo)`, category: 'dark-phonics',
          tags: [...new Set(['dark-phonics','montessori-real','realistic-photo','three-part-card', `letter-${letter}`, word])],
        });
      }
    }
  } else {
    console.warn('  (skip, missing dir) ' + MR);
  }

  console.log(`Planned: ${plan.length} files.\n`);

  // Idempotency
  const existing = new Set();
  {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from('montree_photo_bank')
        .select('filename').range(from, from + PAGE - 1);
      if (error) { console.error('DB read failed:', error.message); process.exit(1); }
      if (!data || data.length === 0) break;
      for (const r of data) existing.add(r.filename);
      if (data.length < PAGE) break;
    }
  }
  console.log(`Bank already holds ${existing.size} filenames.`);

  const toProcess = plan.filter(p => !existing.has(p.jpegName));
  const alreadyInBank = plan.length - toProcess.length;
  console.log(`Skipping ${alreadyInBank} already in bank; converting ${toProcess.length}...\n`);

  if (!DRY_RUN) await fsp.mkdir(TMP_DIR, { recursive: true });

  const converted = [];
  let convertFailed = 0;
  for (const item of toProcess) {
    try {
      const { buffer, width, height } = await convertToJpeg(item.src);
      item.buffer = buffer; item.width = width; item.height = height; item.size = buffer.length;
      if (!DRY_RUN) await fsp.writeFile(path.join(TMP_DIR, item.jpegName), buffer);
      converted.push(item);
    } catch (e) {
      convertFailed++;
      console.error(`  ✗ convert ${item.srcName}: ${e.message}`);
    }
  }
  console.log(`Converted: ${converted.length}  |  convert failures: ${convertFailed}`);

  if (DRY_RUN) {
    console.log('\n--- PLANNED ROWS ---');
    for (const it of converted) {
      console.log(`  ${it.jpegName}  ${it.width}x${it.height} ${(it.size / 1024).toFixed(0)}KB  label="${it.label}"`);
    }
    console.log(`\nDRY RUN totals -> would upload ${converted.length}, skip ${alreadyInBank}, convert-fail ${convertFailed}`);
    return;
  }

  let uploaded = 0, failed = 0;
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < converted.length) {
      const it = converted[cursor++];
      const timestamp = Date.now();
      const sanitized = it.jpegName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `photos/${timestamp}_${sanitized}`;
      try {
        await withRetry(async () => {
          const { error } = await sb.storage.from(BUCKET)
            .upload(storagePath, it.buffer, { contentType: 'image/jpeg', upsert: false });
          if (error) throw new Error('storage: ' + error.message);
        });
        const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
        await withRetry(async () => {
          const { error } = await sb.from('montree_photo_bank').insert({
            filename: it.jpegName,
            label: it.label,
            tags: it.tags,
            category: it.category,
            storage_path: storagePath,
            public_url: urlData.publicUrl,
            file_size: it.size,
            width: it.width,
            height: it.height,
            mime_type: 'image/jpeg',
            uploaded_by: 'system',
            is_public: true,
            is_approved: true,
          });
          if (error) throw new Error('db: ' + error.message);
        });
        uploaded++;
        console.log(`  ✓ ${it.jpegName}`);
      } catch (e) {
        failed++;
        failures.push({ file: it.srcName, error: e.message });
        console.error(`  ✗ ${it.srcName}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('\n=== INGEST COMPLETE ===');
  console.log(`Uploaded:          ${uploaded}`);
  console.log(`Skipped (in bank): ${alreadyInBank}`);
  console.log(`Convert failures:  ${convertFailed}`);
  console.log(`Upload failures:   ${failed}`);
  if (failures.length) {
    for (const f of failures) console.log(`  ${f.file}: ${f.error}`);
  }
  console.log(`\nConverted JPEGs written to temp dir: ${TMP_DIR}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
