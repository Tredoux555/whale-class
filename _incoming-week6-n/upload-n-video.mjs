#!/usr/bin/env node
/**
 * _incoming-week6-n/upload-n-video.mjs
 *
 * One-off: uploads the finished Letter N music video ("The Nest is in the
 * Nest") to Supabase Storage, in the shared `dark-phonics` bucket under
 * `videos/`, matching where letter P's finished video lives
 * (dark-phonics/videos/letter-p-pig-pen-pencil-v3.mp4).
 *
 * Modeled on _incoming-week5-i/upload-two-satpin.mjs and
 * upload-letter-i-book-to-picture-bank.mjs for the env/client pattern
 * (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local).
 *
 * Run from repo root:
 *   node --env-file=.env.local _incoming-week6-n/upload-n-video.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = 'dark-phonics';
const STORAGE_PATH = 'videos/letter-n-the-nest-is-in-the-nest-v1.mp4';
const SRC_PATH = '/Users/tredouxwillemse/Downloads/letter-n-the-nest-is-in-the-nest-v1.mp4';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local _incoming-week6-n/upload-n-video.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('=== LETTER N VIDEO → dark-phonics bucket ===\n');

  if (!fs.existsSync(SRC_PATH)) {
    console.error(`  ✗ source not found — ${SRC_PATH}`);
    process.exit(1);
  }

  const buffer = await fsp.readFile(SRC_PATH);
  const size = buffer.length;
  console.log(`  source: ${SRC_PATH} (${(size / 1024 / 1024).toFixed(1)}MB)`);

  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(STORAGE_PATH, buffer, { contentType: 'video/mp4', upsert: true });
  if (upErr) {
    console.error(`  ✗ storage upload failed — ${upErr.message}`);
    process.exit(1);
  }

  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(STORAGE_PATH);
  const publicUrl = urlData.publicUrl;

  console.log(`  ✓ uploaded — bucket=${BUCKET} path=${STORAGE_PATH} size=${size}B`);
  console.log(`  public url: ${publicUrl}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
