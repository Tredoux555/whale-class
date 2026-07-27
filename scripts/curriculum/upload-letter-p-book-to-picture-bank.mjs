#!/usr/bin/env node
/**
 * scripts/curriculum/upload-letter-p-book-to-picture-bank.mjs
 *
 * Ingests the five page photographs of the Letter P initial-sound book
 * ("The Pig Ate a Pineapple") into the shared Montree Picture Bank
 * (Supabase `montree_photo_bank` table + `photo-bank` storage bucket).
 *
 * These are PHOTOGRAPHS, not the locked Dark Phonics pen-and-ink house style —
 * a deliberate one-book exception (see CLAUDE.md "Letter P photo-illustrated
 * exception"). They are tagged `photo-illustrated` so they can be found and
 * re-styled later if that call is reversed.
 *
 * NOTE: these do NOT belong in the Montessori Picture Bank
 * (docs/picture-bank/photos/<word>/<word>.jpg) — that one is single holdable
 * objects on WHITE and these are two-object scenes on grey; they fail
 * picture-bank-add.mjs --audit on border luminance (measured 100-140, needs
 * >=225). This script targets the general teaching Picture Library instead.
 *
 * Modeled on upload-satpin-to-picture-bank.mjs — same env loading, same sharp
 * conversion, same upload/insert shape. Idempotent: skips any page whose
 * target .jpg filename is already a row in the bank.
 *
 * Run from repo root:
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-letter-p-book-to-picture-bank.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-letter-p-book-to-picture-bank.mjs
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

const SLUG = 'the-pig-ate-a-pineapple';
const SRC_DIR = path.join(REPO, 'phonics-images', 'satpin-v2', 'books', 'pig');

const BASE_TAGS = [
  'dark-phonics', 'satpin-v2', 'reader-page',
  'letter-p', 'initial-sound', 'photo-illustrated', SLUG,
];

/** Page art → the label a teacher would actually search for. */
const PAGES = [
  { file: SLUG + '-p1-pineapple-v1.png', label: 'pig ate a pineapple', extra: ['pineapple', 'pig'] },
  { file: SLUG + '-p2-pen-v1.png',       label: 'pig ate a pen',       extra: ['pen', 'pig'] },
  { file: SLUG + '-p3-pencil-v1.png',    label: 'pig ate a pencil',    extra: ['pencil', 'pig'] },
  { file: SLUG + '-p4-pan-v1.png',       label: 'pig ate a pan',       extra: ['pan', 'pig'] },
  { file: SLUG + '-p5-pig-sick-v1.png',  label: 'pig was sick',        extra: ['sick', 'pig'] },
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/curriculum/upload-letter-p-book-to-picture-bank.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — nothing will be written ===\n' : '=== LETTER P BOOK → PICTURE BANK ===\n');

  // Which target filenames already exist? (idempotence)
  const jpegNames = PAGES.map((p) => p.file.replace(/\.png$/i, '.jpg'));
  const { data: existing, error: exErr } = await sb
    .from('montree_photo_bank').select('filename').in('filename', jpegNames);
  if (exErr) { console.error('lookup failed:', exErr.message); process.exit(1); }
  const already = new Set((existing || []).map((r) => r.filename));

  let uploaded = 0, skipped = 0, failed = 0;

  for (const page of PAGES) {
    const src = path.join(SRC_DIR, page.file);
    const jpegName = page.file.replace(/\.png$/i, '.jpg');

    if (!fs.existsSync(src)) { console.error(`  ✗ missing source: ${page.file}`); failed++; continue; }
    if (already.has(jpegName)) { console.log(`  – already in bank: ${jpegName}`); skipped++; continue; }

    try {
      const buf = await sharp(src).flatten({ background: '#ffffff' })
        .jpeg({ quality: 90 }).toBuffer();
      const meta = await sharp(buf).metadata();

      if (DRY_RUN) {
        console.log(`  would upload ${jpegName}  (${meta.width}x${meta.height}, ${(buf.length / 1024).toFixed(0)}KB)  label="${page.label}"`);
        uploaded++;
        continue;
      }

      const storagePath = `photos/${Date.now()}_${jpegName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await sb.storage.from(BUCKET)
        .upload(storagePath, buf, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw new Error('storage: ' + upErr.message);

      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);

      const { error: dbErr } = await sb.from('montree_photo_bank').insert({
        filename: jpegName,
        label: page.label,
        tags: [...BASE_TAGS, ...page.extra],
        category: 'dark-phonics',
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        file_size: buf.length,
        width: meta.width,
        height: meta.height,
        mime_type: 'image/jpeg',
        uploaded_by: 'system',
        is_public: true,
        is_approved: true,
      });
      if (dbErr) throw new Error('db: ' + dbErr.message);

      console.log(`  ✓ ${jpegName}  →  "${page.label}"`);
      uploaded++;
    } catch (e) {
      console.error(`  ✗ ${page.file}: ${e.message}`);
      failed++;
    }
  }

  console.log('\n=== DONE ===');
  console.log(`Uploaded: ${uploaded}   Skipped: ${skipped}   Failed: ${failed}`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
