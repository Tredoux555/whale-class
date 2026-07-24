#!/usr/bin/env node
// Uploads rebuilt (clean-Montessori-image) letter vocab-pack PDFs to
// Supabase bucket `dark-phonics`, path `letter-vocab-packs/{letter}.pdf`.
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
const PDF_DIR = process.argv[2];
const LETTERS = ['a', 'd', 'g', 'i', 'm', 'n', 'o', 'p', 's', 't'];

async function main() {
  let uploaded = 0, failed = 0;
  for (const letter of LETTERS) {
    const filePath = path.join(PDF_DIR, `vocab-${letter}.pdf`);
    if (!fs.existsSync(filePath)) {
      console.error(`  ✗ MISSING FILE: ${letter}`);
      failed++;
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const storagePath = `letter-vocab-packs/${letter}.pdf`;
    const { error } = await sb.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (error) {
      console.error(`  ✗ ${letter}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${letter} (${(buf.length / 1024).toFixed(0)}KB)`);
      uploaded++;
    }
  }
  console.log(`\nUploaded: ${uploaded}  Failed: ${failed}`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
