#!/usr/bin/env node
/**
 * scripts/curriculum/upload-the-spat-book-to-picture-bank.mjs
 *
 * Ingests the 7 ORIGINAL "The ___ Spat!" (letter P dark-phonics book)
 * images — cover + 6 pages — from
 *   phonics-images/satpin-v2/books/the-spat/
 * into the shared Montree Picture Bank (Supabase `montree_photo_bank`
 * table + `photo-bank` storage bucket), for safekeeping now that these
 * images are the P lesson's canonical material-source images.
 *
 * These are the same 7 images (cover.png, spat-p1..spat-p6.png) whose
 * copies were placed at phonics-images/dark-phonics-books/the-spat/
 * (renamed p1-basin.png .. p6-potato.png) and used to generate this
 * book's satpin-paperwork materials. This script ingests the ORIGINALS,
 * under their own slug/labels, separate from that per-page book-art
 * ingest (upload-dark-phonics-book-art.mjs, which already covers the
 * renamed copies under label "the-spat p1-basin" etc).
 *
 * JPEG-ONLY bank rule (app/api/montree/photo-bank/route.ts): PNG sources
 * are converted to JPEG q90, transparency flattened white, in-memory;
 * repo files are never modified.
 *
 * IDEMPOTENT: dedupe key is (label, 'the-spat-book-original') tag — a
 * planned row is skipped if a bank row already exists with that exact
 * label AND already carries the 'the-spat-book-original' tag. Safe to
 * re-run.
 *
 * RUNS ONLY ON TREDOUX'S MAC (needs .env.local + network):
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-the-spat-book-to-picture-bank.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-the-spat-book-to-picture-bank.mjs
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
const DEDUPE_TAG = 'the-spat-book-original';

const SOURCE_DIR = path.join(REPO, 'phonics-images', 'satpin-v2', 'books', 'the-spat');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/curriculum/upload-the-spat-book-to-picture-bank.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// filename -> { label, wordTag }
const PLAN_META = {
  'cover.png':  { label: 'the spat — cover',   wordTag: 'cover' },
  'spat-p1.png': { label: 'a basin',            wordTag: 'basin' },
  'spat-p2.png': { label: 'the penguin spat',   wordTag: 'penguin' },
  'spat-p3.png': { label: 'the pig spat',       wordTag: 'pig' },
  'spat-p4.png': { label: 'the pelican spat',   wordTag: 'pelican' },
  'spat-p5.png': { label: 'the spat — recap',   wordTag: 'recap' },
  'spat-p6.png': { label: 'the potato spat',    wordTag: 'potato' },
};

function buildPlan() {
  const plan = [];
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('Missing source dir: ' + SOURCE_DIR);
    process.exit(1);
  }
  for (const [filename, meta] of Object.entries(PLAN_META)) {
    const src = path.join(SOURCE_DIR, filename);
    if (!fs.existsSync(src)) {
      console.warn(`  (skip, missing file) ${src}`);
      continue;
    }
    plan.push({
      src,
      srcName: filename,
      jpegName: `the-spat-${filename.replace(/\.png$/i, '')}.jpg`,
      label: meta.label,
      tags: ['dark-phonics', 'letter-p', 'the-spat', DEDUPE_TAG, meta.wordTag],
    });
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
  for (let a = 1; a <= 3; a++) {
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
  console.log('=== "The ___ Spat!" (letter P) originals -> Picture Bank (JPEG) ===');
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

  const toProcess = plan.filter((p) => !existing.has(`${p.label}::${DEDUPE_TAG}`));
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

  for (const it of toProcess) {
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
          category: 'dark-phonics',
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
