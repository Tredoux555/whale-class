#!/usr/bin/env node
/**
 * scripts/curriculum/upload-grace-courtesy-book-art.mjs
 *
 * Ingests Grace & Courtesy book page art into the shared Montree Picture
 * Bank (Supabase `montree_photo_bank` table + `photo-bank` storage
 * bucket) -- same pipeline as upload-dark-phonics-book-art.mjs's "book"
 * set, just pointed at a different source tree and tag namespace.
 * JPEG-ONLY bank rule (app/api/montree/photo-bank/route.ts): sources are
 * converted to JPEG q90, transparency flattened white, in-memory; repo
 * files are never modified.
 *
 * source: phonics-images/grace-courtesy-books/<slug>/<file>
 * label (LOCKED -- app/montree/library/grace-courtesy/page.tsx's
 *        fetchBookPictures() queries this, same pattern as Dark Phonics):
 *   "<slug> <key>"   e.g. "walking-feet p2-ant"
 * tags: ['grace-courtesy-book', 'grace-courtesy-book-<slug>',
 *        '<page key word>', 'book-page']
 *
 * KEY_MAP below is explicit per book (filenames in
 * phonics-images/grace-courtesy-books/<slug>/ don't self-describe a page
 * number/word the way the Dark Phonics p1-snake.png convention does) --
 * add one entry per new book as the series grows one book at a time.
 *
 * IDEMPOTENT: dedupe key is (label, 'grace-courtesy-book') -- a planned
 * row is skipped if a bank row already exists with that exact label and
 * already carries 'grace-courtesy-book'. Safe to re-run.
 *
 * RUNS ONLY ON TREDOUX'S MAC (needs .env.local + network):
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-grace-courtesy-book-art.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-grace-courtesy-book-art.mjs
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';
const BUCKET = 'photo-bank';
const CONCURRENCY = 4;
const MAX_RETRIES = 3;

const BOOKS_DIR = path.join(REPO, 'phonics-images', 'grace-courtesy-books');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/curriculum/upload-grace-courtesy-book-art.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// slug -> [[filename, key], ...] in reading-page order.
const KEY_MAP = {
  'walking-feet': [
    ['page-01-cover.jpg', 'p1-cover'],
    ['page-02.jpg', 'p2-ant'],
    ['page-03.jpg', 'p3-potato'],
    ['page-04.jpg', 'p4-crash'],
    ['page-05.jpg', 'p5-cat'],
    ['page-06.jpg', 'p6-lineup'],
    ['page-07.jpg', 'p7-blocks'],
    ['page-08.jpg', 'p8-song'],
  ],
  'indoor-voice': [
    ['page-01-cover.jpg', 'p1-cover'],
    ['page-02.jpg', 'p2-beads'],
    ['page-03.jpg', 'p3-potato'],
    ['page-04.jpg', 'p4-crash'],
    ['page-05.jpg', 'p5-cat'],
    ['page-06.jpg', 'p6-huddle'],
    ['page-07.jpg', 'p7-blocks'],
    ['page-08.jpg', 'p8-song'],
  ],
};

/** 'p2-ant' -> 'ant'; falls back to the key itself. */
function keyWord(key) {
  const m = key.match(/^p\d+-(.+)$/);
  return m ? m[1] : key;
}


function buildPlan() {
  const plan = [];
  for (const slug of Object.keys(KEY_MAP)) {
    const dir = path.join(BOOKS_DIR, slug);
    if (!fs.existsSync(dir)) {
      console.warn('  (skip, missing dir) ' + dir);
      continue;
    }
    for (const [fname, key] of KEY_MAP[slug]) {
      const src = path.join(dir, fname);
      if (!fs.existsSync(src)) {
        console.warn(`  (skip, missing file) ${src}`);
        continue;
      }
      const label = `${slug} ${key}`;
      plan.push({
        src,
        srcName: `${slug}/${fname}`,
        jpegName: `grace-courtesy-book-${slug}-${key}.jpg`,
        label,
        dedupeTag: 'grace-courtesy-book',
        tags: ['grace-courtesy-book', `grace-courtesy-book-${slug}`, keyWord(key), 'book-page'],
      });
    }
  }
  return plan;
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
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * a));
    }
  }
  throw lastErr;
}


async function main() {
  console.log('=== Grace & Courtesy book art -> Picture Bank (JPEG) ===');
  if (DRY_RUN) console.log('🟡 DRY RUN — no conversion writes, no uploads, no DB inserts.\n');

  const plan = buildPlan();
  console.log(`Planned: ${plan.length} files.\n`);

  const existing = new Set();
  {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb
        .from('montree_photo_bank')
        .select('label, tags')
        .range(from, from + PAGE - 1);
      if (error) {
        console.error('DB read failed:', error.message);
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      for (const r of data) {
        const tags = Array.isArray(r.tags) ? r.tags : [];
        for (const t of tags) existing.add(`${r.label}::${t}`);
      }
      if (data.length < PAGE) break;
    }
  }

  const toProcess = plan.filter((p) => !existing.has(`${p.label}::${p.dedupeTag}`));
  const alreadyInBank = plan.length - toProcess.length;
  console.log(`Skipping ${alreadyInBank} already ingested; converting ${toProcess.length}...\n`);

  if (DRY_RUN) {
    for (const it of toProcess) {
      console.log(`  INSERT  label="${it.label}"  tags=${JSON.stringify(it.tags)}`);
    }
    console.log(`\nDRY RUN totals -> would upload ${toProcess.length}, skip ${alreadyInBank}`);
    return;
  }

  let uploaded = 0, failed = 0, convertFailed = 0;
  const failures = [];
  let cursor = 0;

  async function worker() {
    while (cursor < toProcess.length) {
      const it = toProcess[cursor++];
      let converted;
      try {
        converted = await convertToJpeg(it.src);
      } catch (e) {
        convertFailed++;
        console.error(`  ✗ convert ${it.srcName}: ${e.message}`);
        continue;
      }
      const { buffer, width, height } = converted;
      const timestamp = Date.now();
      const sanitized = it.jpegName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `photos/${timestamp}_${sanitized}`;

      try {
        await withRetry(async () => {
          const { error } = await sb.storage
            .from(BUCKET)
            .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: false });
          if (error) throw new Error('storage: ' + error.message);
        });
        const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
        await withRetry(async () => {
          const { error } = await sb.from('montree_photo_bank').insert({
            filename: it.jpegName,
            label: it.label,
            tags: it.tags,
            category: 'grace-courtesy-book',
            storage_path: storagePath,
            public_url: urlData.publicUrl,
            file_size: buffer.length,
            width,
            height,
            mime_type: 'image/jpeg',
            uploaded_by: 'system',
            is_public: true,
            is_approved: true,
          });
          if (error) throw new Error('db: ' + error.message);
        });
        uploaded++;
        console.log(`  ✓ ${it.label}`);
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
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
