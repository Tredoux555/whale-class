// scripts/cleanup-orphan-photo-bank-storage.mjs
// Re-attempts storage cleanup for paths that the deletion script failed on
// (typically due to transient `fetch failed` errors). Smaller batches + retries.
//
// Reads /tmp/non_jpeg_photo_bank_rows.json and removes any storage path that
// is still present in the photo-bank bucket. Safe to re-run.
//
// Run with:
//   node --env-file=.env.local scripts/cleanup-orphan-photo-bank-storage.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'photo-bank';
const INPUT_PATH = '/tmp/non_jpeg_photo_bank_rows.json';
const STORAGE_BATCH = 10;
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function tryRemove(paths, attempt = 1) {
  try {
    const { data, error } = await sb.storage.from(BUCKET).remove(paths);
    if (error) {
      if (attempt < MAX_RETRIES) {
        await sleep(750 * attempt);
        return tryRemove(paths, attempt + 1);
      }
      return { removed: 0, error: error.message };
    }
    return { removed: (data || []).length, error: null };
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      await sleep(750 * attempt);
      return tryRemove(paths, attempt + 1);
    }
    return { removed: 0, error: String(e?.message || e) };
  }
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Missing audit dump at ${INPUT_PATH}.`);
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const paths = [];
  for (const r of rows) {
    if (r.storage_path) paths.push(r.storage_path);
    if (r.thumbnail_path) paths.push(r.thumbnail_path);
  }
  console.log(`Attempting cleanup of ${paths.length} storage paths in batches of ${STORAGE_BATCH}…`);

  let totalRemoved = 0;
  const persistentErrors = [];
  for (let i = 0; i < paths.length; i += STORAGE_BATCH) {
    const batch = paths.slice(i, i + STORAGE_BATCH);
    const { removed, error } = await tryRemove(batch);
    totalRemoved += removed;
    process.stdout.write(`  batch ${Math.floor(i / STORAGE_BATCH) + 1}/${Math.ceil(paths.length / STORAGE_BATCH)}: removed ${removed}/${batch.length}${error ? ` (err: ${error})` : ''}\n`);
    if (error) persistentErrors.push({ batch, error });
    // small pause to be gentle on the storage API
    await sleep(150);
  }

  console.log(`\nDone. Total removed in this pass: ${totalRemoved}`);
  if (persistentErrors.length > 0) {
    console.warn(`⚠ ${persistentErrors.length} batches still errored after ${MAX_RETRIES} retries.`);
    persistentErrors.forEach(e => console.warn(`  ${e.error}`));
  } else {
    console.log('✓ No persistent errors.');
  }
}

main().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
