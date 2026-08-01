#!/usr/bin/env node
/**
 * _incoming-week5-i/upload-letter-i-book-to-picture-bank.mjs
 *
 * Ingests the five page photographs of the Letter I initial-sound book
 * ("Into the Igloo") into the shared Montree Picture Bank
 * (Supabase `montree_photo_bank` table + `photo-bank` storage bucket).
 *
 * These are PHOTOGRAPHS, not the locked Montree Phonics pen-and-ink house
 * style — the SECOND deliberate, sanctioned exception after the Letter P book
 * (see CLAUDE.md "Letter P photo-illustrated exception" and the Jul-27
 * handoff). They are tagged `photo-illustrated` so they can be found and
 * re-styled later if that call is reversed.
 *
 * NOTE: these do NOT belong in the Montessori Picture Bank
 * (docs/picture-bank/photos/<word>/<word>.jpg) — that one is single holdable
 * objects on WHITE and these are wide snow scenes; they fail
 * picture-bank-add.mjs --audit on border luminance. This script targets the
 * general teaching Picture Library instead.
 *
 * Modeled line-for-line on upload-letter-p-book-to-picture-bank.mjs — same env
 * loading, same sharp conversion, same upload/insert shape. Idempotent: skips
 * any page whose target .jpg filename is already a row in the bank.
 *
 * The source art still sits where Midjourney delivered it
 * (_incoming-week5-i/book-scenes/); `src` is the on-disk name and `file` is the
 * canonical book-page name the bank stores it under, matching the pig set.
 *
 * Run from repo root:
 *   DRY_RUN=1 node --env-file=.env.local _incoming-week5-i/upload-letter-i-book-to-picture-bank.mjs
 *   node --env-file=.env.local _incoming-week5-i/upload-letter-i-book-to-picture-bank.mjs
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// This script lives in _incoming-week5-i/ (next to the art it ingests), not in
// scripts/curriculum/ like its letter-P sibling — so paths resolve off
// __dirname directly rather than off a repo root.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';
const BUCKET = 'photo-bank';

const SLUG = 'into-the-igloo';
const SRC_DIR = path.join(__dirname, 'book-scenes');

const BASE_TAGS = [
  'dark-phonics', 'satpin-v2', 'reader-page',
  'letter-i', 'initial-sound', 'photo-illustrated', SLUG,
];

/** Page art → the label a teacher would actually search for. */
const PAGES = [
  { src: 'iguana-scene.png',      file: SLUG + '-p1-iguana-v1.png',   label: 'iguana went into the igloo',   extra: ['iguana', 'igloo'] },
  { src: 'inchworm-scene.png',    file: SLUG + '-p2-inchworm-v1.png', label: 'inchworm went into the igloo', extra: ['inchworm', 'igloo'] },
  { src: 'infant-scene.png',      file: SLUG + '-p3-infant-v1.png',   label: 'infant went into the igloo',   extra: ['infant', 'igloo'] },
  { src: 'insect-scene.png',      file: SLUG + '-p4-insect-v1.png',   label: 'insect went into the igloo',   extra: ['insect', 'igloo'] },
  { src: 'warm-inside-scene.png', file: SLUG + '-p5-warm-inside-v1.png', label: 'warm inside the igloo',     extra: ['warm', 'igloo'] },
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local _incoming-week5-i/upload-letter-i-book-to-picture-bank.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — nothing will be written ===\n' : '=== LETTER I BOOK → PICTURE BANK ===\n');

  // Which target filenames already exist? (idempotence)
  const jpegNames = PAGES.map((p) => p.file.replace(/\.png$/i, '.jpg'));
  const { data: existing, error: exErr } = await sb
    .from('montree_photo_bank').select('filename').in('filename', jpegNames);
  if (exErr) { console.error('lookup failed:', exErr.message); process.exit(1); }
  const already = new Set((existing || []).map((r) => r.filename));

  let uploaded = 0, skipped = 0, failed = 0;

  for (const page of PAGES) {
    const src = path.join(SRC_DIR, page.src);
    const jpegName = page.file.replace(/\.png$/i, '.jpg');

    if (!fs.existsSync(src)) { console.error(`  ✗ missing source: ${page.src}`); failed++; continue; }
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
