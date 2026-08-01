#!/usr/bin/env node
/**
 * scripts/curriculum/upload-dark-phonics-book-art.mjs
 *
 * Ingests two Dark Phonics image sets into the shared Montree Picture Bank
 * (Supabase `montree_photo_bank` table + `photo-bank` storage bucket).
 * Clones the pattern from upload-dark-phonics-bank.mjs /
 * upload-satpin-basket-photos.mjs — JPEG-ONLY bank rule
 * (app/api/montree/photo-bank/route.ts): PNG sources are converted to JPEG
 * q90, transparency flattened white, in-memory; repo files are never
 * modified.
 *
 * SET 1 — book page art (27 books x 4-5 pages = 133 images)
 *   source: phonics-images/dark-phonics-books/<slug>/<key>.png
 *   label (LOCKED — the page code queries this):
 *     "<slug> <key>"   e.g. "snake-in-my-sock p1-snake"
 *   tags: ['dark-phonics-book', 'dark-phonics-book-<slug>',
 *          '<page key word, e.g. snake>', 'book-page']
 *
 * SET 2 — vocab word images
 *   source: "<Desktop>/English Curriculum 2026/Dark Phonics/Vocab/<word>.png"
 *   (flat files only — the sibling `scenes/` subfolder is a different,
 *   lesson-scene asset set and is out of scope here)
 *   label: the bare word, e.g. "tiger"
 *   tags: ['dark-phonics-vocab', '<word>', 'picture-bank']
 *   Photoreal duplicates sharing these labels already exist tagged
 *   'satpin-basket' from upload-satpin-basket-photos.mjs — left untouched,
 *   by design.
 *
 * IDEMPOTENT: dedupe key is (label, this set's primary tag) — a planned row
 * is skipped if a bank row already exists with that exact label AND already
 * carries 'dark-phonics-book' (set 1) or 'dark-phonics-vocab' (set 2). Safe
 * to re-run.
 *
 * RUNS ONLY ON TREDOUX'S MAC (needs .env.local + network):
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-dark-phonics-book-art.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-dark-phonics-book-art.mjs
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

const BOOKS_DIR = path.join(REPO, 'phonics-images', 'dark-phonics-books');
const VOCAB_DIR =
  '/Users/tredouxwillemse/Desktop/English Curriculum 2026/Dark Phonics/Vocab';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/curriculum/upload-dark-phonics-book-art.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** 'p1-snake' -> 'snake'; 'p5-recap' -> 'recap'; falls back to the key itself. */
function keyWord(key) {
  const m = key.match(/^p\d+-(.+)$/);
  return m ? m[1] : key;
}

function buildPlan() {
  const plan = [];

  // --- Set 1: book page art ---
  if (fs.existsSync(BOOKS_DIR)) {
    for (const slug of fs.readdirSync(BOOKS_DIR).sort()) {
      const dir = path.join(BOOKS_DIR, slug);
      if (!fs.statSync(dir).isDirectory()) continue;
      const files = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort();
      for (const f of files) {
        const key = f.replace(/\.png$/i, '');
        const label = `${slug} ${key}`;
        plan.push({
          src: path.join(dir, f),
          srcName: `${slug}/${f}`,
          jpegName: `dark-phonics-book-${slug}-${key}.jpg`,
          label,
          set: 'book',
          dedupeTag: 'dark-phonics-book',
          tags: ['dark-phonics-book', `dark-phonics-book-${slug}`, keyWord(key), 'book-page'],
        });
      }
    }
  } else {
    console.warn('  (skip, missing dir) ' + BOOKS_DIR);
  }

  // --- Set 2: vocab word images (flat files only; skip scenes/ subfolder) ---
  if (fs.existsSync(VOCAB_DIR)) {
    const files = fs.readdirSync(VOCAB_DIR).filter((f) => /\.png$/i.test(f)).sort();
    for (const f of files) {
      const word = f.replace(/\.png$/i, '');
      plan.push({
        src: path.join(VOCAB_DIR, f),
        srcName: f,
        jpegName: `dark-phonics-vocab-${word}.jpg`,
        label: word,
        set: 'vocab',
        dedupeTag: 'dark-phonics-vocab',
        tags: ['dark-phonics-vocab', word, 'picture-bank'],
      });
    }
  } else {
    console.warn('  (skip, missing dir) ' + VOCAB_DIR);
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
  console.log('=== Dark Phonics book art + vocab -> Picture Bank (JPEG) ===');
  if (DRY_RUN) console.log('🟡 DRY RUN — no conversion writes, no uploads, no DB inserts.\n');

  const plan = buildPlan();
  const bookCount = plan.filter((p) => p.set === 'book').length;
  const vocabCount = plan.filter((p) => p.set === 'vocab').length;
  console.log(`Planned: ${plan.length} files (book: ${bookCount}, vocab: ${vocabCount}).\n`);

  // Idempotency: existing rows keyed by `${label}::${tag}` for every tag they
  // carry — a planned row is "already ingested" only if a bank row shares its
  // exact label AND already carries this set's primary tag. This can never
  // collide with the photoreal satpin-basket duplicates that share vocab
  // labels (they carry 'satpin-basket', not 'dark-phonics-vocab').
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
      console.log(`  INSERT  [${it.set}]  label="${it.label}"  tags=${JSON.stringify(it.tags)}`);
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
            category: it.set === 'book' ? 'dark-phonics-book' : 'dark-phonics-vocab',
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
        console.log(`  ✓ [${it.set}] ${it.label}`);
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
