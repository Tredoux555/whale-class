#!/usr/bin/env node
// Cache-bust fix: the satpin page renders basket photos via
// getThumbnailUrl(storage_path, ...) -> /api/montree/media/proxy/<storage_path>?w=&q=
// which Cloudflare caches keyed on storage_path (+w+q) — NOT on public_url.
// Overwriting picture-bank/<word>.jpg in place therefore leaves stale bytes
// cached at the edge indefinitely. Fix: give the new photo a NEW storage_path
// so the proxy URL is a guaranteed cache miss, and repoint the DB row at it.

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'photo-bank';
const SOURCE_ROOT = path.join(process.cwd(), 'docs', 'picture-bank', 'photos');

const WORDS = ['igloo', 'infant'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  for (const word of WORDS) {
    const oldPath = `picture-bank/${word}.jpg`;
    const newFilename = `${word}-v2.jpg`;
    const newPath = `picture-bank/${newFilename}`;
    const srcPath = path.join(SOURCE_ROOT, word, `${word}.jpg`);

    const { data: existing, error: lookupErr } = await sb
      .from('montree_photo_bank')
      .select('id, label, filename, tags, category, public_url, storage_path')
      .eq('storage_path', oldPath)
      .maybeSingle();
    if (lookupErr) { console.error(`  ✗ ${word}: lookup — ${lookupErr.message}`); continue; }
    if (!existing) { console.error(`  ✗ ${word}: no row at ${oldPath}`); continue; }

    const buffer = await fsp.readFile(srcPath);
    const size = buffer.length;

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(newPath, buffer, { contentType: 'image/jpeg', upsert: true });
    if (upErr) { console.error(`  ✗ ${word}: storage — ${upErr.message}`); continue; }

    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(newPath);
    const publicUrl = urlData.publicUrl;

    const { error: updErr } = await sb
      .from('montree_photo_bank')
      .update({
        storage_path: newPath,
        filename: newFilename,
        public_url: publicUrl,
        file_size: size,
        mime_type: 'image/jpeg',
      })
      .eq('id', existing.id);
    if (updErr) { console.error(`  ✗ ${word}: db update — ${updErr.message}`); continue; }

    console.log(`  ✓ ${word} — row id=${existing.id} old=${oldPath} new_storage_path=${newPath} size=${size}B url=${publicUrl}`);
  }
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
