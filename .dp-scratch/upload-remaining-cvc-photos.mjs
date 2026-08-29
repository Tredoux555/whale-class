#!/usr/bin/env node
/**
 * Ingest the REMAINING Dark Phonics CVC object photos into the picture bank
 * — the 21 of the owner's 38-word photo set (lib/montree/journey/dark-bank.ts
 * DARK_PHOTO_WORDS) not already covered by
 * scripts/curriculum/upload-writing-shelf-photos.mjs's OBJECTS list (that
 * script's list also includes 'tap', which isn't one of the 38 — excluded
 * here on purpose).
 *
 * Modeled exactly on upload-writing-shelf-photos.mjs: same bucket
 * ('photo-bank'), same storage prefix ('writing-shelf'), same category
 * ('picture-bank'), same tag shape, same idempotent skip-if-unchanged
 * behaviour. Objects only — no sequence frames here (those stay in the
 * sibling script).
 *
 * Source PNGs are expected at phonics-images/satpin-v2/cvc-photos/<word>.png
 * (same root the sibling script reads from) — drop the owner's next MJ batch
 * there and re-run; missing files are skipped with a note, not an error.
 *
 * Run (on the Mac — the service key never leaves it):
 *   DRY_RUN=1 node --env-file=.env.local .dp-scratch/upload-remaining-cvc-photos.mjs
 *   node --env-file=.env.local .dp-scratch/upload-remaining-cvc-photos.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

const BUCKET = 'photo-bank';
const STORAGE_PREFIX = 'writing-shelf';
const CATEGORY = 'picture-bank';
const OBJ_ROOT = path.join(process.cwd(), 'phonics-images', 'satpin-v2', 'cvc-photos');

// The 38-word Dark Phonics photo set (lib/montree/journey/dark-bank.ts
// DARK_PHOTO_WORDS) minus the 17 of them already handled by
// upload-writing-shelf-photos.mjs's OBJECTS list (that list also has 'tap',
// which isn't one of the 38 — dropped, not counted as "already present").
const OBJECTS = [
  'big', 'croc', 'kit', 'nap', 'nip', 'off', 'pad', 'pat', 'pit', 'run',
  'sap', 'sat', 'sick', 'sip', 'sit', 'snap', 'spat', 'spit', 'squid',
  'stuck', 'under',
];

const ITEMS = OBJECTS.map((w) => ({ name: w, root: OBJ_ROOT, role: 'object' }));

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local .dp-scratch/upload-remaining-cvc-photos.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tagsFor = (it) => [it.name, 'picture-bank', 'writing-shelf', it.role];

function sameTags(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const sa = [...a].sort(); const sb_ = [...b].sort();
  return sa.every((v, i) => v === sb_[i]);
}

async function jpegBuffer(srcPath) {
  const raw = await fsp.readFile(srcPath);
  return sharp(raw).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer();
}

async function main() {
  console.log('=== Remaining Dark Phonics CVC photos -> photo-bank ===');
  if (DRY_RUN) console.log('DRY RUN - no uploads, no DB writes.\n');

  let uploaded = 0, updated = 0, unchanged = 0, failed = 0, missing = 0;

  for (const it of ITEMS) {
    const srcPath = path.join(it.root, `${it.name}.png`);
    if (!fs.existsSync(srcPath)) {
      console.log(`  - ${it.name}: not on disk yet, skipped`);
      missing++;
      continue;
    }
    const filename = `${it.name}.jpg`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;
    const tags = tagsFor(it);

    const { data: existing, error: lookupErr } = await sb
      .from('montree_photo_bank')
      .select('id, label, filename, tags, category, public_url, storage_path')
      .eq('storage_path', storagePath)
      .maybeSingle();
    if (lookupErr) { console.error(`  x ${it.name}: lookup - ${lookupErr.message}`); failed++; continue; }

    if (DRY_RUN) {
      console.log(`  ${(existing ? 'UPDATE-OR-KEEP' : 'INSERT').padEnd(15)} ${it.name.padEnd(9)} ${storagePath}`);
      if (existing) unchanged++; else uploaded++;
      continue;
    }

    try {
      const buffer = await jpegBuffer(srcPath);
      const size = buffer.length;
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw new Error(`storage: ${upErr.message}`);

      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      if (existing) {
        const drift = existing.label !== it.name || existing.filename !== filename ||
          existing.category !== CATEGORY || existing.public_url !== publicUrl ||
          !sameTags(existing.tags, tags);
        if (!drift) { console.log(`  o ${it.name} - storage refreshed, row already correct`); unchanged++; continue; }
        const { error: updErr } = await sb.from('montree_photo_bank').update({
          label: it.name, filename, tags, category: CATEGORY, public_url: publicUrl,
          file_size: size, mime_type: 'image/jpeg', is_public: true, is_approved: true,
        }).eq('id', existing.id);
        if (updErr) throw new Error(`db update: ${updErr.message}`);
        console.log(`  ~ ${it.name} - row updated`); updated++; continue;
      }

      const { error: insErr } = await sb.from('montree_photo_bank').insert({
        filename, label: it.name, tags, category: CATEGORY, storage_path: storagePath,
        public_url: publicUrl, file_size: size, mime_type: 'image/jpeg',
        uploaded_by: 'system', is_public: true, is_approved: true,
      });
      if (insErr) throw new Error(`db insert: ${insErr.message}`);
      console.log(`  + ${it.name} - uploaded + inserted (${(size / 1024).toFixed(0)}KB)`);
      uploaded++;
    } catch (e) {
      console.error(`  x ${it.name}: ${e.message}`); failed++;
    }
  }

  console.log(`\n=== DONE === inserted=${uploaded} updated=${updated} unchanged=${unchanged} skipped-missing=${missing} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main();
