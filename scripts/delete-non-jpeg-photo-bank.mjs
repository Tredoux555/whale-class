// scripts/delete-non-jpeg-photo-bank.mjs
// DESTRUCTIVE — reads the audit dump from /tmp/non_jpeg_photo_bank_rows.json
// and removes the rows from BOTH the photo-bank Storage bucket AND the
// montree_photo_bank table.
//
// Run with:
//   node --env-file=.env.local scripts/delete-non-jpeg-photo-bank.mjs
//
// To do a dry-run preview only:
//   DRY_RUN=1 node --env-file=.env.local scripts/delete-non-jpeg-photo-bank.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'photo-bank';
const INPUT_PATH = '/tmp/non_jpeg_photo_bank_rows.json';
const STORAGE_BATCH = 50;
const DB_BATCH = 100;

async function removeStorageBatch(paths) {
  if (paths.length === 0) return { removed: 0, errors: [] };
  const { data, error } = await sb.storage.from(BUCKET).remove(paths);
  if (error) {
    return { removed: 0, errors: [{ paths, message: error.message }] };
  }
  return { removed: (data || []).length, errors: [] };
}

async function deleteDbBatch(ids) {
  if (ids.length === 0) return { deleted: 0, errors: [] };
  const { error } = await sb
    .from('montree_photo_bank')
    .delete()
    .in('id', ids);
  if (error) {
    return { deleted: 0, errors: [{ ids, message: error.message }] };
  }
  return { deleted: ids.length, errors: [] };
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Missing audit dump at ${INPUT_PATH}. Run audit-non-jpeg-photo-bank.mjs first.`);
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  console.log(`Loaded ${rows.length} rows from ${INPUT_PATH}`);
  if (DRY_RUN) console.log('🟡 DRY RUN — nothing will actually be deleted.\n');

  // Collect storage paths (storage_path + thumbnail_path) and DB ids
  const storagePaths = [];
  const ids = [];
  for (const r of rows) {
    if (r.storage_path) storagePaths.push(r.storage_path);
    if (r.thumbnail_path) storagePaths.push(r.thumbnail_path);
    if (r.id) ids.push(r.id);
  }

  console.log(`  storage objects to remove: ${storagePaths.length}`);
  console.log(`  DB rows to delete: ${ids.length}\n`);

  if (DRY_RUN) {
    console.log('Sample storage paths to remove:');
    storagePaths.slice(0, 10).forEach(p => console.log(`  ${p}`));
    console.log('\nSample DB ids to delete:');
    ids.slice(0, 10).forEach(i => console.log(`  ${i}`));
    console.log('\nDry run complete. Re-run without DRY_RUN=1 to execute.');
    return;
  }

  // 1. Storage cleanup in batches of STORAGE_BATCH
  console.log(`Step 1: removing ${storagePaths.length} storage objects in batches of ${STORAGE_BATCH}…`);
  let totalRemoved = 0;
  const storageErrors = [];
  for (let i = 0; i < storagePaths.length; i += STORAGE_BATCH) {
    const batch = storagePaths.slice(i, i + STORAGE_BATCH);
    const { removed, errors } = await removeStorageBatch(batch);
    totalRemoved += removed;
    storageErrors.push(...errors);
    process.stdout.write(`  batch ${Math.floor(i / STORAGE_BATCH) + 1}: removed ${removed}/${batch.length}\n`);
  }
  console.log(`  Storage total removed: ${totalRemoved}`);
  if (storageErrors.length > 0) {
    console.warn(`  ⚠ ${storageErrors.length} storage batch errors:`);
    storageErrors.forEach(e => console.warn(`    ${e.message}`));
  }

  // 2. DB cleanup in batches of DB_BATCH
  console.log(`\nStep 2: deleting ${ids.length} DB rows in batches of ${DB_BATCH}…`);
  let totalDeleted = 0;
  const dbErrors = [];
  for (let i = 0; i < ids.length; i += DB_BATCH) {
    const batch = ids.slice(i, i + DB_BATCH);
    const { deleted, errors } = await deleteDbBatch(batch);
    totalDeleted += deleted;
    dbErrors.push(...errors);
    process.stdout.write(`  batch ${Math.floor(i / DB_BATCH) + 1}: deleted ${deleted}/${batch.length}\n`);
  }
  console.log(`  DB total deleted: ${totalDeleted}`);
  if (dbErrors.length > 0) {
    console.error(`  ⚠ ${dbErrors.length} DB batch errors:`);
    dbErrors.forEach(e => console.error(`    ${e.message}`));
  }

  console.log('\n✓ Cleanup complete.');
  console.log(`  Storage objects removed: ${totalRemoved}`);
  console.log(`  DB rows deleted:         ${totalDeleted}`);
  console.log('\nNext: re-run scripts/audit-non-jpeg-photo-bank.mjs to confirm 0 non-JPEG rows remain.');
}

main().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
