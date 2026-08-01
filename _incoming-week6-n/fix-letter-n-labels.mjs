#!/usr/bin/env node
/**
 * _incoming-week6-n/fix-letter-n-labels.mjs
 *
 * One-off correction for the Letter N book scene-picture labels in
 * montree_photo_bank. upload-letter-n-book-to-picture-bank.mjs ingested them
 * with "The " prepended and capitalized ("The nut is in the nest"), diverging
 * from the convention set by the Letter P and Letter I ingestion scripts
 * (lowercase, no leading article: "pig ate a pineapple", "iguana went into
 * the igloo"). The Satpin page's book.pictureLabels for N ('nut is in the
 * nest', etc.) match that P/I convention, and fetchByLabel() in
 * app/montree/library/satpin/page.tsx requires an EXACT (trimmed,
 * lower-cased) label match — so the N scene pictures never resolved,
 * showing "no picture" placeholders in prod.
 *
 * This script relabels the 5 existing N rows (matched by filename, not by
 * old label, so it's safe to re-run) to the exact lowercase/no-article form.
 * DB-side fix — no code change needed since P/I already establish that
 * label==pictureLabels-string convention.
 *
 * Run from repo root:
 *   DRY_RUN=1 node --env-file=.env.local _incoming-week6-n/fix-letter-n-labels.mjs
 *   node --env-file=.env.local _incoming-week6-n/fix-letter-n-labels.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local _incoming-week6-n/fix-letter-n-labels.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// filename -> corrected label (matches page.tsx book.pictureLabels for N exactly)
const FIXES = [
  { filename: 'the-nest-is-in-the-nest-p1-nut-v1.jpg',    label: 'nut is in the nest' },
  { filename: 'the-nest-is-in-the-nest-p2-net-v1.jpg',    label: 'net is in the nest' },
  { filename: 'the-nest-is-in-the-nest-p3-napkin-v1.jpg', label: 'napkin is in the nest' },
  { filename: 'the-nest-is-in-the-nest-p4-nail-v1.jpg',   label: 'nail is in the nest' },
  { filename: 'the-nest-is-in-the-nest-p5-nest-v1.jpg',   label: 'nest is in the nest' },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — nothing will be written ===\n' : '=== FIXING LETTER N PICTURE LABELS ===\n');

  const { data: rows, error: fetchErr } = await sb
    .from('montree_photo_bank')
    .select('id, filename, label')
    .in('filename', FIXES.map(f => f.filename));

  if (fetchErr) { console.error('lookup failed:', fetchErr.message); process.exit(1); }

  let updated = 0, missing = 0, failed = 0;

  for (const fix of FIXES) {
    const row = (rows || []).find(r => r.filename === fix.filename);
    if (!row) { console.error(`  ✗ no row found for filename: ${fix.filename}`); missing++; continue; }

    if (row.label === fix.label) {
      console.log(`  – already correct: ${fix.filename}  label="${row.label}"`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  would update ${fix.filename}: "${row.label}" -> "${fix.label}"`);
      updated++;
      continue;
    }

    const { error: updErr } = await sb
      .from('montree_photo_bank')
      .update({ label: fix.label })
      .eq('id', row.id);

    if (updErr) {
      console.error(`  ✗ ${fix.filename}: ${updErr.message}`);
      failed++;
      continue;
    }

    console.log(`  ✓ ${fix.filename}: "${row.label}" -> "${fix.label}"`);
    updated++;
  }

  console.log('\n=== DONE ===');
  console.log(`Updated: ${updated}   Missing: ${missing}   Failed: ${failed}`);
  if (failed || missing) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
