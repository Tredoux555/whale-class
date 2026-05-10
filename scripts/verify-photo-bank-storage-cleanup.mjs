// scripts/verify-photo-bank-storage-cleanup.mjs
// Verifies that the storage paths from the audit dump are no longer present in the bucket.
//
// Run with:
//   node --env-file=.env.local scripts/verify-photo-bank-storage-cleanup.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'photo-bank';
const INPUT_PATH = '/tmp/non_jpeg_photo_bank_rows.json';

async function main() {
  const rows = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const paths = rows.map(r => r.storage_path).filter(Boolean);
  console.log(`Verifying ${paths.length} paths…`);

  // Get the file basenames (paths look like 'photos/<id>_<name>.<ext>')
  // Then list 'photos/' prefix and check overlap
  const { data: list, error } = await sb.storage.from(BUCKET).list('photos', {
    limit: 1000,
    offset: 0,
  });
  if (error) {
    console.error('Storage list failed:', error.message);
    process.exit(1);
  }

  const existing = new Set((list || []).map(o => `photos/${o.name}`));
  console.log(`Storage 'photos/' folder currently has ${existing.size} files (max 1000 in this listing).`);

  let stillThere = 0;
  for (const p of paths) {
    if (existing.has(p)) stillThere++;
  }
  console.log(`Of the ${paths.length} non-JPEG paths, ${stillThere} still exist in storage.`);
  if (stillThere > 0) {
    console.log('\nFirst 10 still-present paths:');
    let i = 0;
    for (const p of paths) {
      if (i >= 10) break;
      if (existing.has(p)) {
        console.log(`  ${p}`);
        i++;
      }
    }
  } else {
    console.log('✓ All non-JPEG storage objects appear to be removed (or page beyond first 1000).');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
