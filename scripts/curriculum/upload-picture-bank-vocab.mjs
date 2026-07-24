#!/usr/bin/env node
// Uploads the 71 Montessori picture-bank vocab jpgs (used across the 10
// Dark Phonics media-pack letter pages) to Supabase storage bucket
// `dark-phonics`, path `picture-bank/{word}.jpg`. Idempotent (upsert:true).
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const BUCKET = 'dark-phonics';
const PHOTOS_ROOT = process.argv[2];
const WORDS_FILE = process.argv[3];

if (!PHOTOS_ROOT || !WORDS_FILE) {
  console.error('Usage: node upload-picture-bank-vocab.mjs <photos_root> <words_file>');
  process.exit(1);
}

const words = fs.readFileSync(WORDS_FILE, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);

async function main() {
  let uploaded = 0, failed = 0;
  for (const word of words) {
    const filePath = path.join(PHOTOS_ROOT, word, `${word}.jpg`);
    if (!fs.existsSync(filePath)) {
      console.error(`  ✗ MISSING FILE: ${word}`);
      failed++;
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const storagePath = `picture-bank/${word}.jpg`;
    const { error } = await sb.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) {
      console.error(`  ✗ ${word}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${word} (${(buf.length / 1024).toFixed(0)}KB)`);
      uploaded++;
    }
  }
  console.log(`\nUploaded: ${uploaded}  Failed: ${failed}`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
