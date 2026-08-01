#!/usr/bin/env node
// Scoped helper for Week 5 (I) igloo/infant re-upload into the photo-bank
// bucket, mirroring scripts/curriculum/upload-satpin-basket-photos.mjs logic
// but limited to the two changed words (idempotent upsert by storage_path).

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = 'photo-bank';
const STORAGE_PREFIX = 'picture-bank';
const CATEGORY = 'picture-bank';
const SOURCE_ROOT = path.join(process.cwd(), 'docs', 'picture-bank', 'photos');

const ENTRIES = [
  { word: 'igloo', label: 'igloo', sourceFile: 'igloo', week: 5, letter: 'I' },
  { word: 'infant', label: 'infant', sourceFile: 'infant', week: 5, letter: 'I' },
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function tagsFor(entry) {
  const parts = entry.label.split(/[\s-]+/).filter(Boolean);
  const labelWords = [entry.label, ...parts].filter((v, i, a) => a.indexOf(v) === i);
  return [
    ...labelWords,
    'picture-bank',
    'satpin-basket',
    'az-basket',
    `letter-${entry.letter.toLowerCase()}`,
    `week-${String(entry.week).padStart(2, '0')}`,
  ];
}

async function main() {
  for (const entry of ENTRIES) {
    const { word, label, sourceFile } = entry;
    const srcPath = path.join(SOURCE_ROOT, sourceFile, `${sourceFile}.jpg`);
    if (!fs.existsSync(srcPath)) {
      console.error(`  ✗ ${word}: source not found — ${srcPath}`);
      continue;
    }
    const filename = `${sourceFile}.jpg`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;
    const tags = tagsFor(entry);

    const { data: existing, error: lookupErr } = await sb
      .from('montree_photo_bank')
      .select('id, label, filename, tags, category, public_url, storage_path')
      .eq('storage_path', storagePath)
      .maybeSingle();
    if (lookupErr) { console.error(`  ✗ ${word}: lookup — ${lookupErr.message}`); continue; }
    if (!existing) { console.error(`  ✗ ${word}: NO EXISTING ROW at ${storagePath} — refusing to guess, needs manual check`); continue; }

    const buffer = await fsp.readFile(srcPath);
    const size = buffer.length;

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
    if (upErr) { console.error(`  ✗ ${word}: storage — ${upErr.message}`); continue; }

    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    const { error: updErr } = await sb
      .from('montree_photo_bank')
      .update({
        label, filename, tags, category: CATEGORY,
        public_url: publicUrl, file_size: size, mime_type: 'image/jpeg',
        is_public: true, is_approved: true,
      })
      .eq('id', existing.id);
    if (updErr) { console.error(`  ✗ ${word}: db update — ${updErr.message}`); continue; }

    console.log(`  ✓ ${word} — row id=${existing.id} storage_path=${storagePath} size=${size}B url=${publicUrl}`);
  }
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
