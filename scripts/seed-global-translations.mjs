#!/usr/bin/env node
/**
 * One-time extraction: lift Whale Class translations into the global
 * montree_curriculum_translations table.
 *
 * Whale Class is the reference classroom — it has every standard work translated
 * into all 12 locales (~$30+ of paid AI translation already sunk into it). This
 * script promotes those translations into a shared library that every other
 * classroom can read from for free.
 *
 * Filters out custom works (work_key starting with 'custom_' OR is_custom=true)
 * — only the standard ~329 Montessori works belong in the global library.
 *
 * Idempotent: ON CONFLICT (work_key, locale) DO UPDATE. Safe to re-run if Whale
 * Class translations are improved later. To propagate updates back out to
 * existing classrooms, also run scripts/backfill-all-classroom-translations.mjs
 * after re-seeding.
 *
 * Usage:
 *   node scripts/seed-global-translations.mjs            # full seed
 *   node scripts/seed-global-translations.mjs --dry-run  # report only, no writes
 *
 * Required env (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const WHALE_CLASS_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

// All non-English locales. Mirrors SUPPORTED_LOCALES in lib/montree/i18n/locales.ts
// minus 'en' (English is the canonical content, sourced from the un-suffixed columns).
const LOCALES = ['zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'];

async function sb(path, opts = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

function buildSelectColumns() {
  // Base columns + name_chinese (legacy) + every locale-suffixed field
  const base = ['work_key', 'name', 'parent_description', 'why_it_matters', 'quick_guide', 'is_custom', 'name_chinese'];
  const localeCols = [];
  for (const l of LOCALES) {
    localeCols.push(`name_${l}`);
    localeCols.push(`parent_description_${l}`);
    localeCols.push(`why_it_matters_${l}`);
    localeCols.push(`guide_content_${l}`);
  }
  return [...base, ...localeCols].join(',');
}

async function fetchWhaleClassWorks() {
  // Filter out custom works — only standard 329 belong in the global library
  const select = encodeURIComponent(buildSelectColumns());
  const url =
    `montree_classroom_curriculum_works?` +
    `select=${select}` +
    `&classroom_id=eq.${WHALE_CLASS_ID}` +
    `&is_custom=eq.false` +
    `&work_key=not.like.custom_*`;

  const res = await sb(url);
  return await res.json();
}

function pivotToTranslationRows(works) {
  const rows = [];

  // English row first — canonical English content from the un-suffixed columns
  for (const w of works) {
    if (!w.name) continue;
    rows.push({
      work_key: w.work_key,
      locale: 'en',
      name: w.name,
      parent_description: w.parent_description ?? null,
      why_it_matters: w.why_it_matters ?? null,
      guide_content: w.quick_guide ?? null,
    });
  }

  // Each non-English locale
  for (const locale of LOCALES) {
    for (const w of works) {
      // Chinese name lives in name_zh in newer rows but legacy rows used name_chinese.
      // Prefer name_zh, fall back to name_chinese, otherwise skip.
      let name;
      if (locale === 'zh') {
        name = w.name_zh || w.name_chinese;
      } else {
        name = w[`name_${locale}`];
      }
      if (!name) continue; // Skip if not translated for this locale

      rows.push({
        work_key: w.work_key,
        locale,
        name,
        parent_description: w[`parent_description_${locale}`] ?? null,
        why_it_matters: w[`why_it_matters_${locale}`] ?? null,
        guide_content: w[`guide_content_${locale}`] ?? null,
      });
    }
  }

  return rows;
}

async function upsertRows(rows) {
  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await sb(`montree_curriculum_translations?on_conflict=work_key,locale`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    total += batch.length;
    console.log(`  upserted ${total}/${rows.length}`);
  }
  return total;
}

async function main() {
  console.log('--- seed-global-translations ---');
  console.log(`Whale Class ID: ${WHALE_CLASS_ID}`);
  console.log(`Locales: en + ${LOCALES.join(', ')}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  console.log('1. Fetching Whale Class standard works…');
  const works = await fetchWhaleClassWorks();
  console.log(`   Found ${works.length} standard works (custom works excluded)`);

  if (works.length === 0) {
    console.error('✖ No works found. Aborting.');
    process.exit(1);
  }

  console.log('2. Pivoting to (work_key, locale) rows…');
  const rows = pivotToTranslationRows(works);

  // Per-locale counts
  const byLocale = {};
  for (const r of rows) byLocale[r.locale] = (byLocale[r.locale] || 0) + 1;
  console.log('   Per-locale row counts:');
  for (const [locale, count] of Object.entries(byLocale)) {
    console.log(`     ${locale}: ${count}`);
  }
  console.log(`   Total rows to upsert: ${rows.length}`);

  if (DRY_RUN) {
    console.log('');
    console.log('Dry run complete. No writes performed.');
    return;
  }

  console.log('3. Upserting into montree_curriculum_translations…');
  const total = await upsertRows(rows);

  console.log('');
  console.log(`✔ Done. Upserted ${total} rows.`);
  console.log('');
  console.log('Next: run scripts/backfill-all-classroom-translations.mjs to fan');
  console.log('these translations out to every existing classroom.');
}

main().catch((err) => {
  console.error('✖ Failed:', err.message);
  process.exit(1);
});
