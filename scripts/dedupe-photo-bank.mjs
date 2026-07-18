#!/usr/bin/env node
/**
 * One-pass EXACT-CONTENT dedupe of the montree_photo_bank.
 *
 * Downloads every bank object, sha256s the bytes, groups by hash. For any
 * group of >1 row that is byte-identical, keeps the EARLIEST row (created_at,
 * id tiebreak) and deletes the rest — removing the storage object first, then
 * the DB row (mirrors delete-non-jpeg-photo-bank.mjs ordering).
 *
 * Same-LABEL-but-different-CONTENT rows are legitimate variety and are LEFT
 * ALONE; they are listed at the end for optional human review.
 *
 * Run:
 *   DRY_RUN=1 node --env-file=.env.local scripts/dedupe-photo-bank.mjs
 *   node --env-file=.env.local scripts/dedupe-photo-bank.mjs
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';
const BUCKET = 'photo-bank';
const DL_CONCURRENCY = 8;
const STORAGE_BATCH = 50;
const DB_BATCH = 100;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAllRows() {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from('montree_photo_bank')
      .select('id, filename, label, storage_path, file_size, created_at, uploaded_by')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error('DB read failed:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function hashRow(row) {
  const { data, error } = await sb.storage.from(BUCKET).download(row.storage_path);
  if (error || !data) return { ...row, sha: null, dlError: error?.message || 'no data' };
  const buf = Buffer.from(await data.arrayBuffer());
  return { ...row, sha: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}

async function main() {
  console.log('=== Photo Bank EXACT-CONTENT dedupe ===');
  if (DRY_RUN) console.log('🟡 DRY RUN — nothing deleted.\n');

  const rows = await fetchAllRows();
  console.log(`Bank rows: ${rows.length}. Downloading + hashing (concurrency ${DL_CONCURRENCY})...`);

  const hashed = new Array(rows.length);
  let cursor = 0, done = 0, dlErrors = 0;
  async function worker() {
    while (cursor < rows.length) {
      const i = cursor++;
      hashed[i] = await hashRow(rows[i]);
      if (hashed[i].sha === null) dlErrors++;
      if (++done % 200 === 0) console.log(`  hashed ${done}/${rows.length}`);
    }
  }
  await Promise.all(Array.from({ length: DL_CONCURRENCY }, worker));
  console.log(`Hashed ${rows.length} (download errors: ${dlErrors}).\n`);

  // Group by sha (skip failed downloads)
  const bySha = new Map();
  for (const r of hashed) {
    if (!r.sha) continue;
    (bySha.get(r.sha) || bySha.set(r.sha, []).get(r.sha)).push(r);
  }

  // Exact-content duplicate groups (>1 row, identical bytes)
  const dupeGroups = [...bySha.values()].filter(g => g.length > 1);
  const toDelete = [];
  for (const g of dupeGroups) {
    // earliest first (already asc by created_at); tiebreak by id
    g.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : (a.id < b.id ? -1 : 1)));
    const keep = g[0];
    for (const r of g.slice(1)) toDelete.push({ ...r, keptId: keep.id, keptFilename: keep.filename });
  }

  console.log(`Exact-content duplicate groups: ${dupeGroups.length}`);
  console.log(`Rows to delete (all but earliest per group): ${toDelete.length}\n`);
  for (const g of dupeGroups.slice(0, 30)) {
    console.log(`  sha ${g[0].sha.slice(0, 12)}  x${g.length}: keep "${g[0].filename}" | drop ${g.slice(1).map(r => r.filename).join(', ')}`);
  }
  if (dupeGroups.length > 30) console.log(`  ...and ${dupeGroups.length - 30} more groups`);

  // Same-label, distinct-content (KEEP — report only)
  const byLabel = new Map();
  for (const r of hashed) {
    if (!r.sha) continue;
    const k = (r.label || '').toLowerCase().trim();
    (byLabel.get(k) || byLabel.set(k, []).get(k)).push(r);
  }
  const labelVariety = [];
  for (const [label, g] of byLabel) {
    const shas = new Set(g.map(r => r.sha));
    if (shas.size > 1) labelVariety.push({ label, distinct: shas.size, rows: g.length });
  }
  labelVariety.sort((a, b) => b.distinct - a.distinct);

  console.log(`\nSame-LABEL / distinct-CONTENT groups (KEPT for variety): ${labelVariety.length}`);
  for (const v of labelVariety.slice(0, 60)) {
    console.log(`  "${v.label}": ${v.distinct} distinct images across ${v.rows} rows`);
  }
  if (labelVariety.length > 60) console.log(`  ...and ${labelVariety.length - 60} more`);

  // Persist artifacts for the record
  fs.writeFileSync('/tmp/photo_bank_dedupe_delete.json', JSON.stringify(toDelete, null, 2));
  fs.writeFileSync('/tmp/photo_bank_label_variety.json', JSON.stringify(labelVariety, null, 2));
  console.log('\nArtifacts: /tmp/photo_bank_dedupe_delete.json, /tmp/photo_bank_label_variety.json');

  if (DRY_RUN) {
    console.log('\nDRY RUN complete. Re-run without DRY_RUN=1 to delete the duplicate rows.');
    return;
  }
  if (toDelete.length === 0) {
    console.log('\nNo exact-content duplicates to delete. Done.');
    return;
  }

  // Delete: storage objects first, then DB rows.
  const storagePaths = toDelete.map(r => r.storage_path).filter(Boolean);
  const ids = toDelete.map(r => r.id);

  console.log(`\nStep 1: removing ${storagePaths.length} storage objects...`);
  let removed = 0;
  for (let i = 0; i < storagePaths.length; i += STORAGE_BATCH) {
    const batch = storagePaths.slice(i, i + STORAGE_BATCH);
    const { data, error } = await sb.storage.from(BUCKET).remove(batch);
    if (error) console.warn(`  ⚠ storage batch error: ${error.message}`);
    else removed += (data || []).length;
  }
  console.log(`  storage removed: ${removed}`);

  console.log(`Step 2: deleting ${ids.length} DB rows...`);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += DB_BATCH) {
    const batch = ids.slice(i, i + DB_BATCH);
    const { error } = await sb.from('montree_photo_bank').delete().in('id', batch);
    if (error) console.error(`  ⚠ db batch error: ${error.message}`);
    else deleted += batch.length;
  }
  console.log(`  db rows deleted: ${deleted}`);

  console.log('\n=== DEDUPE COMPLETE ===');
  console.log(`Duplicate groups: ${dupeGroups.length} | storage removed: ${removed} | db deleted: ${deleted}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
