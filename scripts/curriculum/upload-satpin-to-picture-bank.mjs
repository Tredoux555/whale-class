#!/usr/bin/env node
/**
 * scripts/curriculum/upload-satpin-to-picture-bank.mjs
 *
 * Ingests the SATPIN v2 Dark Phonics art set (book page art, canonical cast
 * sheets, letter posters) from phonics-images/satpin-v2/ into the shared
 * Montree Picture Bank (Supabase `montree_photo_bank` table + `photo-bank`
 * storage bucket).
 *
 * The Picture Bank is JPEG-only (see app/api/montree/photo-bank/route.ts —
 * 🚨 JPEG-ONLY comment). Source assets that are PNG (full-res Midjourney
 * downloads, cast sheets, letter posters rendered from PDF) are converted
 * to JPEG (quality 90, transparency flattened to white) before upload.
 * Source files in the repo are NEVER modified — conversion happens into an
 * in-memory buffer (optionally also written to a temp dir for inspection).
 *
 * Idempotent: skips any source file whose target .jpg filename already
 * exists in the bank, so re-runs only add what's missing.
 *
 * Modeled on scripts/upload-curriculum-images-to-photo-bank.mjs — same env
 * loading, same sharp conversion approach, same upload/insert shape.
 *
 * Run (from repo root, with .env.local containing NEXT_PUBLIC_SUPABASE_URL
 * and SUPABASE_SERVICE_ROLE_KEY):
 *
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-satpin-to-picture-bank.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-satpin-to-picture-bank.mjs
 *
 * Requires: npm packages already in the repo — @supabase/supabase-js, sharp.
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

const SOURCE_ROOT = path.join(REPO, 'phonics-images', 'satpin-v2');
const TMP_DIR = path.join(os.tmpdir(), 'montree-satpin-jpg');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- what to ingest + how to label/tag it ----
// Each entry: { dir, category, extraTags(filename) }
const GROUPS = [
  {
    dir: path.join(SOURCE_ROOT, 'books', 'spat'),
    category: 'dark-phonics',
    baseTags: ['dark-phonics', 'satpin-v2', 'reader-page', 'week-4', 'spat'],
  },
  {
    dir: path.join(SOURCE_ROOT, 'books', 'sit'),
    category: 'dark-phonics',
    baseTags: ['dark-phonics', 'satpin-v2', 'reader-page', 'week-5', 'sit-sit-sit'],
  },
  {
    dir: path.join(SOURCE_ROOT, 'books', 'nap'),
    category: 'dark-phonics',
    baseTags: ['dark-phonics', 'satpin-v2', 'reader-page', 'week-6', 'nap-ant-nap'],
  },
  {
    dir: path.join(SOURCE_ROOT, 'cast'),
    category: 'dark-phonics',
    baseTags: ['dark-phonics', 'satpin-v2', 'cast-sheet', 'character-reference'],
  },
  {
    dir: path.join(SOURCE_ROOT, 'posters'),
    category: 'dark-phonics',
    baseTags: ['dark-phonics', 'satpin-v2', 'letter-poster', 'wall-card'],
  },
];

function cleanLabel(filename) {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/-(fullres|webres|sig-patched-webres|sig-scrubbed|teacher)\b/gi, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function letterTagsFor(filename) {
  const m = filename.match(/poster-letter-([a-z])/i);
  return m ? [`letter-${m[1].toLowerCase()}`] : [];
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
  console.log('=== SATPIN v2 art -> Picture Bank (JPEG) ===');
  console.log(DRY_RUN ? '🟡 DRY RUN — no conversion writes, no uploads, no DB inserts.\n' : '');

  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error('Source dir not found:', SOURCE_ROOT);
    process.exit(1);
  }

  // Build the plan.
  const plan = [];
  for (const group of GROUPS) {
    if (!fs.existsSync(group.dir)) { console.warn('  (skip, missing dir) ' + group.dir); continue; }
    const files = fs.readdirSync(group.dir).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
    for (const f of files) {
      const jpegName = f.replace(/\.(png|jpe?g)$/i, '.jpg');
      const label = cleanLabel(f);
      const tags = [...new Set([
        ...group.baseTags,
        ...letterTagsFor(f),
        ...label.toLowerCase().split(/\s+/).filter(w => w.length > 1),
        label.toLowerCase(),
      ])];
      plan.push({ src: path.join(group.dir, f), srcName: f, jpegName, label, category: group.category, tags });
    }
  }
  console.log(`Planned: ${plan.length} files across ${GROUPS.length} groups.\n`);

  // Idempotency: which jpeg filenames already in the bank?
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
      console.log(`  ${it.jpegName}  [${it.category}]  ${it.width}x${it.height} ${(it.size / 1024).toFixed(0)}KB`);
      console.log(`      label="${it.label}"`);
      console.log(`      tags=${JSON.stringify(it.tags)}`);
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
    console.log('\nUpload failures detail:');
    for (const f of failures) console.log(`  ${f.file}: ${f.error}`);
  }
  console.log(`\nConverted JPEGs written to temp dir: ${TMP_DIR}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
