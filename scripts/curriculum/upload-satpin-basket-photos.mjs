#!/usr/bin/env node
/**
 * Ingest the 30 clean SATPIN object-basket photos into the LIVE picture bank.
 *
 * WHY THIS SCRIPT EXISTS
 * ----------------------
 * The clean Montessori set (single object, plain white background, no toys —
 * see the `_noToys` rule in scripts/curriculum/materials.config.json) lives at
 * `docs/picture-bank/photos/<word>/<word>.jpg`. Those files were NEVER visible
 * to the photo-bank API, because the sanctioned publisher —
 * `scripts/curriculum/picture-bank-add.mjs --publish` — does two things that
 * make its output invisible here:
 *
 *   1. it uploads to the 'dark-phonics' bucket under `picture-bank/*`, NOT the
 *      'photo-bank' bucket that `/api/montree/photo-bank` and the proxy read;
 *   2. it never inserts a `montree_photo_bank` row, and the API only ever
 *      returns rows from that table.
 *
 * 🚨 Do NOT "fix" picture-bank-add.mjs to compensate. Its bucket layout feeds
 * other Dark Phonics pipelines that resolve `dark-phonics/picture-bank/*`
 * directly. This script is the photo-bank-side ingest, modelled on
 * `scripts/upload-to-photo-bank.mjs` (BUCKET='photo-bank' + storage.upload
 * followed by a `montree_photo_bank` insert).
 *
 * WHAT IT WRITES
 *   storage : photo-bank/picture-bank/<word>.jpg   (upsert — reruns and
 *             toy-fix regenerations overwrite in place, no duplicate objects)
 *   db row  : label=<word>, filename='<word>.jpg', category='picture-bank',
 *             tags=[<word>,'picture-bank','satpin-basket','montessori',
 *                   'white-background']
 *
 * The 'satpin-basket' tag is what /montree/library/satpin prefers when the
 * bank holds several photos sharing an exact label (7 socks, 5 nails, …).
 *
 * IDEMPOTENT: a row already carrying `storage_path = picture-bank/<word>.jpg`
 * is UPDATED in place rather than duplicated; identical rows are left alone.
 *
 * Run:
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-satpin-basket-photos.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-satpin-basket-photos.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

const BUCKET = 'photo-bank';
const STORAGE_PREFIX = 'picture-bank';
const CATEGORY = 'picture-bank';
const SOURCE_ROOT = path.join(process.cwd(), 'docs', 'picture-bank', 'photos');

/** Canonical SATPIN object-basket words — docs/picture-bank/SATPIN-Object-Baskets.docx. */
const WORDS = [
  'sock', 'snake', 'star', 'soap', 'seal',
  'apple', 'ant', 'anchor', 'alligator', 'ambulance',
  'turtle', 'tiger', 'toothbrush', 'tomato', 'taxi',
  'pig', 'pen', 'penguin', 'pumpkin', 'panda',
  'igloo', 'iguana', 'inchworm', 'insect', 'infant',
  'nut', 'nest', 'net', 'napkin', 'nail',
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/curriculum/upload-satpin-basket-photos.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tagsFor = (word) => [word, 'picture-bank', 'satpin-basket', 'montessori', 'white-background'];

/** Same set + order ⇒ nothing to update. */
function sameTags(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb_ = [...b].sort();
  return sa.every((v, i) => v === sb_[i]);
}

async function main() {
  console.log('=== SATPIN basket photos -> photo-bank ===');
  if (DRY_RUN) console.log('🟡 DRY RUN — no uploads, no DB writes.\n');

  let uploaded = 0, updated = 0, unchanged = 0, failed = 0, missing = 0;
  const failures = [];

  for (const word of WORDS) {
    const srcPath = path.join(SOURCE_ROOT, word, `${word}.jpg`);
    if (!fs.existsSync(srcPath)) {
      console.error(`  ✗ ${word}: source not found — ${srcPath}`);
      missing++;
      continue;
    }

    const filename = `${word}.jpg`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;
    const tags = tagsFor(word);

    // Idempotency key is the storage path, not the filename: the bank already
    // holds unrelated legacy rows named "<word>.jpg" under photos/<epoch>_*.
    const { data: existing, error: lookupErr } = await sb
      .from('montree_photo_bank')
      .select('id, label, filename, tags, category, public_url, storage_path')
      .eq('storage_path', storagePath)
      .maybeSingle();

    if (lookupErr) {
      console.error(`  ✗ ${word}: lookup — ${lookupErr.message}`);
      failed++;
      failures.push({ word, error: lookupErr.message });
      continue;
    }

    if (DRY_RUN) {
      const size = fs.statSync(srcPath).size;
      const action = existing ? 'UPDATE-OR-KEEP' : 'INSERT';
      console.log(`  ${action.padEnd(15)} ${word.padEnd(11)} ${storagePath}  ${(size / 1024).toFixed(0)}KB`);
      console.log(`      label="${word}" category="${CATEGORY}" tags=${JSON.stringify(tags)}`);
      continue;
    }

    try {
      const buffer = await fsp.readFile(srcPath);
      const size = buffer.length;

      // upsert:true — a regenerated photo replaces the old object in place so
      // the public URL and every referencing row stay valid.
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw new Error(`storage: ${upErr.message}`);

      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      if (existing) {
        const drift =
          existing.label !== word ||
          existing.filename !== filename ||
          existing.category !== CATEGORY ||
          existing.public_url !== publicUrl ||
          !sameTags(existing.tags, tags);

        if (!drift) {
          console.log(`  ○ ${word} — storage refreshed, row already correct`);
          unchanged++;
          continue;
        }

        const { error: updErr } = await sb
          .from('montree_photo_bank')
          .update({
            label: word,
            filename,
            tags,
            category: CATEGORY,
            public_url: publicUrl,
            file_size: size,
            mime_type: 'image/jpeg',
            is_public: true,
            is_approved: true,
          })
          .eq('id', existing.id);
        if (updErr) throw new Error(`db update: ${updErr.message}`);

        console.log(`  ↻ ${word} — row updated`);
        updated++;
        continue;
      }

      const { error: insErr } = await sb.from('montree_photo_bank').insert({
        filename,
        label: word,
        tags,
        category: CATEGORY,
        storage_path: storagePath,
        public_url: publicUrl,
        file_size: size,
        mime_type: 'image/jpeg',
        uploaded_by: 'system',
        is_public: true,
        is_approved: true,
      });
      if (insErr) throw new Error(`db insert: ${insErr.message}`);

      console.log(`  ✅ ${word} — uploaded + inserted (${(size / 1024).toFixed(0)}KB)`);
      uploaded++;
    } catch (e) {
      console.error(`  ✗ ${word}: ${e.message}`);
      failed++;
      failures.push({ word, error: e.message });
    }
  }

  console.log('\n=== DONE ===');
  console.log(`Words:              ${WORDS.length}`);
  console.log(`Inserted:           ${uploaded}`);
  console.log(`Updated:            ${updated}`);
  console.log(`Unchanged:          ${unchanged}`);
  console.log(`Source missing:     ${missing}`);
  console.log(`Failed:             ${failed}`);
  if (failures.length) {
    console.log('\nFailure detail:');
    for (const f of failures) console.log(`  ${f.word}: ${f.error}`);
  }
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
