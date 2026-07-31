#!/usr/bin/env node
/**
 * Ingest the CVC decodable-word photos into the LIVE picture bank.
 *
 * SCOPE — this script owns the real-photo card pictures behind the decodable
 * ledger on /montree/library/satpin: one clean photoreal picture per decodable
 * word (single subject, plain white background) so every week's new words can
 * be built into three-part cards / matching work in the Picture Library hub.
 *
 * The 61 ledger words split four ways:
 *
 *   24  MJ-generated photos (2026-07-31 run, agent-picked + eyeballed) at
 *       phonics-images/satpin-v2/cvc-photos/<word>.png — actions/adjectives
 *       acted out by REAL animals per the _noToys rule and Tredoux's ruling
 *       (no AI children, animals act the verbs).
 *   12  words whose clean white-background photo already existed on disk at
 *       docs/picture-bank/photos/<word>/<word>.jpg but was never a basket
 *       word, so it never reached the bank (tap pan tin mat pot mud rat bed
 *       bug log wig bag).
 *   17  words that double as basket words — already live in the bank tagged
 *       'satpin-basket'; NOT re-uploaded, the page resolves them to the
 *       existing rows ('zip' resolves to the basket 'zipper' row via the
 *       page's CVC_PHOTO_LABEL override).
 *    8  never pictured: grammar words (at it is an in naps) + cast names
 *       (Sam Kim) — the page's CVC_UNPICTURED set, decided 2026-08-01.
 *
 * WHAT IT WRITES
 *   storage : photo-bank/cvc-photos/<word>.jpg   (upsert — reruns and
 *             replaced picks overwrite in place, no duplicate objects; MJ
 *             PNGs are converted to JPEG q90 on the way up so the bank stays
 *             100% JPEG)
 *   db row  : label=<word>, filename='<word>.jpg', category='picture-bank',
 *             tags=[<word>,'picture-bank','cvc-photo','week-<NN>']
 *
 * The 'cvc-photo' tag is what /montree/library/satpin prefers (after
 * 'satpin-basket') when the bank holds several rows sharing an exact label.
 *
 * IDEMPOTENT: keyed on storage_path, same as upload-satpin-basket-photos.mjs.
 * To replace a picture Tredoux dislikes: overwrite the source file, re-run.
 *
 * Run (on the Mac — the service key never leaves it):
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-cvc-photos.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-cvc-photos.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

const BUCKET = 'photo-bank';
const STORAGE_PREFIX = 'cvc-photos';
const CATEGORY = 'picture-bank';
const MJ_ROOT = path.join(process.cwd(), 'phonics-images', 'satpin-v2', 'cvc-photos');
const DOCS_ROOT = path.join(process.cwd(), 'docs', 'picture-bank', 'photos');

/**
 * word → { week, src } — week is the week the word is INTRODUCED (matches the
 * `decodable` arrays in app/montree/library/satpin/page.tsx; keep in step).
 * src 'mj' = phonics-images PNG, 'docs' = docs/picture-bank JPEG.
 */
const WORDS = [
  // MJ-generated (the 2026-07-31 run)
  { word: 'sat',   week: 3,  src: 'mj' },
  { word: 'sap',   week: 4,  src: 'mj' },
  { word: 'pat',   week: 4,  src: 'mj' },
  { word: 'spat',  week: 4,  src: 'mj' },
  { word: 'sit',   week: 5,  src: 'mj' },
  { word: 'sip',   week: 5,  src: 'mj' },
  { word: 'pit',   week: 5,  src: 'mj' },
  { word: 'spit',  week: 5,  src: 'mj' },
  { word: 'nap',   week: 6,  src: 'mj' },
  { word: 'nip',   week: 6,  src: 'mj' },
  { word: 'snap',  week: 6,  src: 'mj' },
  { word: 'pad',   week: 8,  src: 'mj' },
  { word: 'cot',   week: 11, src: 'mj' },
  { word: 'kit',   week: 12, src: 'mj' },
  { word: 'sick',  week: 13, src: 'mj' },
  { word: 'stuck', week: 15, src: 'mj' },
  { word: 'rug',   week: 16, src: 'mj' },
  { word: 'under', week: 16, src: 'mj' },
  { word: 'off',   week: 19, src: 'mj' },
  { word: 'run',   week: 20, src: 'mj' },
  { word: 'croc',  week: 20, src: 'mj' },
  { word: 'jam',   week: 21, src: 'mj' },
  { word: 'big',   week: 25, src: 'mj' },
  { word: 'squid', week: 27, src: 'mj' },
  // Existing clean photos that were never basket words
  { word: 'tap',   week: 4,  src: 'docs' },
  { word: 'pan',   week: 6,  src: 'docs' },
  { word: 'tin',   week: 6,  src: 'docs' },
  { word: 'mat',   week: 7,  src: 'docs' },
  { word: 'pot',   week: 10, src: 'docs' },
  { word: 'mud',   week: 15, src: 'docs' },
  { word: 'rat',   week: 16, src: 'docs' },
  { word: 'bed',   week: 18, src: 'docs' },
  { word: 'bug',   week: 18, src: 'docs' },
  { word: 'log',   week: 20, src: 'docs' },
  { word: 'wig',   week: 23, src: 'docs' },
  { word: 'bag',   week: 26, src: 'docs' },
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/curriculum/upload-cvc-photos.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function tagsFor(entry) {
  return [
    entry.word,
    'picture-bank',
    'cvc-photo',
    `week-${String(entry.week).padStart(2, '0')}`,
  ];
}

/** Same set + order ⇒ nothing to update. */
function sameTags(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb_ = [...b].sort();
  return sa.every((v, i) => v === sb_[i]);
}

function srcPathFor(entry) {
  return entry.src === 'mj'
    ? path.join(MJ_ROOT, `${entry.word}.png`)
    : path.join(DOCS_ROOT, entry.word, `${entry.word}.jpg`);
}

/** MJ PNGs → JPEG q90 flattened on white; docs JPEGs pass through untouched. */
async function jpegBuffer(entry) {
  const raw = await fsp.readFile(srcPathFor(entry));
  if (entry.src === 'docs') return raw;
  return sharp(raw).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer();
}

async function main() {
  console.log('=== CVC decodable-word photos -> photo-bank ===');
  if (DRY_RUN) console.log('🟡 DRY RUN — no uploads, no DB writes.\n');

  let uploaded = 0, updated = 0, unchanged = 0, failed = 0, missing = 0;
  const failures = [];

  for (const entry of WORDS) {
    const { word } = entry;
    const srcPath = srcPathFor(entry);
    if (!fs.existsSync(srcPath)) {
      console.error(`  ✗ ${word}: source not found — ${srcPath}`);
      missing++;
      continue;
    }

    const filename = `${word}.jpg`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;
    const tags = tagsFor(entry);

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
      console.log(`  ${action.padEnd(15)} ${word.padEnd(7)} ${storagePath}  src=${entry.src}  ${(size / 1024).toFixed(0)}KB`);
      if (existing) unchanged++; else uploaded++;
      continue;
    }

    try {
      const buffer = await jpegBuffer(entry);
      const size = buffer.length;

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
  console.log(DRY_RUN ? `Planned inserts:    ${uploaded}` : `Inserted:           ${uploaded}`);
  console.log(DRY_RUN ? `Already present:    ${unchanged}` : `Updated:            ${updated}`);
  if (!DRY_RUN) console.log(`Unchanged:          ${unchanged}`);
  console.log(`Source missing:     ${missing}`);
  console.log(`Failed:             ${failed}`);
  if (failures.length) {
    console.log('\nFailure detail:');
    for (const f of failures) console.log(`  ${f.word}: ${f.error}`);
  }
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
