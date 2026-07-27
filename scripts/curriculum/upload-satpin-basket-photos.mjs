#!/usr/bin/env node
/**
 * Ingest the clean object-basket photos of the FULL 27-week initial-sound
 * series into the LIVE picture bank.
 *
 * SCOPE — this script owns every basket photo behind /montree/library/satpin.
 * It started as the SATPIN-only ingest (30 words) and now carries the whole
 * ESTABLISHED curriculum: 27 weeks, 26 letter baskets x 5 words = 130 photos.
 *
 *   weeks 1–6    S A T P I N            — the SATPIN block, original order
 *   weeks 7–27   M D G O C K ck E U R H B F L J V W X Y Z Qu
 *                — the in-house readers order, per
 *                  docs/curriculum/dark-phonics-readers/HANDOFF_DARK_PHONICS_READERS_Jul25.md
 *
 * 🚨 Week 13 (ck) is a DIGRAPH week with no object basket: it holds no words
 * and no photos and appears below only so the week numbers stay honest. Do
 * not "fill it in".
 *
 * The six SATPIN letters (S A T P I N) keep their canonical words from
 * `docs/picture-bank/SATPIN-Object-Baskets.docx`; the other twenty letters
 * take theirs from `docs/picture-bank/AZ-Object-Baskets.docx`, which is
 * adopted for THOSE LETTERS ONLY — where the two lists disagree on
 * S/A/T/P/I/N, SATPIN's list wins (decided by Tredoux 2026-07-27).
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
 *   storage : photo-bank/picture-bank/<basename>.jpg   (upsert — reruns and
 *             toy-fix regenerations overwrite in place, no duplicate objects)
 *   db row  : label=<label>, filename='<basename>.jpg', category='picture-bank',
 *             tags=[<label words>,'picture-bank','satpin-basket','az-basket',
 *                   'letter-<x>','week-<NN>']
 *
 * The 'satpin-basket' tag is what /montree/library/satpin prefers when the
 * bank holds several photos sharing an exact label (7 socks, 5 nails, …).
 * Every row in the series carries it, SATPIN and A–Z alike.
 *
 * IDEMPOTENT: a row already carrying `storage_path = picture-bank/<x>.jpg`
 * is UPDATED in place rather than duplicated; identical rows are left alone.
 * All 130 rows carry one tag scheme — the 30 SATPIN rows first ingested under
 * the older scheme were re-tagged in place when the established week numbering
 * landed, so nothing in the bank is tagged two different ways.
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

/**
 * The established 27-week series, in curriculum order. Mirrors the WEEKS
 * manifest in app/montree/library/satpin/page.tsx — keep the two in step.
 *
 * A word is either a plain string (source photos/<word>/<word>.jpg, bank label
 * <word>) or an override object:
 *   { word, label?, sourceFile? }
 *     word        what the library page displays
 *     label       photo-bank label the page fetches by        (default: word)
 *     sourceFile  photos/<sourceFile>/<sourceFile>.jpg and
 *                 storage picture-bank/<sourceFile>.jpg       (default: label)
 *
 * Three words need overrides: 'sea urchin' (file seaurchin.jpg), 'yo-yo'
 * (file yoyo.jpg) and 'six' — which is taught as the letter-X word but is
 * pictured, filed and labelled as 'dice'.
 */
const SERIES = [
  { week: 1,  letter: 'S',  words: ['sock', 'snake', 'star', 'soap', 'seal'] },
  { week: 2,  letter: 'A',  words: ['apple', 'ant', 'anchor', 'alligator', 'ambulance'] },
  { week: 3,  letter: 'T',  words: ['turtle', 'tiger', 'toothbrush', 'tomato', 'taxi'] },
  { week: 4,  letter: 'P',  words: ['pig', 'pen', 'penguin', 'pumpkin', 'panda'] },
  { week: 5,  letter: 'I',  words: ['igloo', 'iguana', 'inchworm', 'insect', 'infant'] },
  { week: 6,  letter: 'N',  words: ['nut', 'nest', 'net', 'napkin', 'nail'] },
  { week: 7,  letter: 'M',  words: ['mug', 'mouse', 'mushroom', 'magnet', 'monkey'] },
  { week: 8,  letter: 'D',  words: ['dog', 'duck', 'doll', 'drum', 'dinosaur'] },
  { week: 9,  letter: 'G',  words: ['goat', 'guitar', 'glove', 'grapes', 'gift'] },
  { week: 10, letter: 'O',  words: ['octopus', 'orange', 'owl', 'otter', 'ostrich'] },
  { week: 11, letter: 'C',  words: ['cat', 'cup', 'car', 'comb', 'cow'] },
  { week: 12, letter: 'K',  words: ['key', 'kite', 'koala', 'kangaroo', 'kettle'] },
  // Digraph week — no object basket, so nothing to ingest. Here for the count.
  { week: 13, letter: 'ck', words: [] },
  { week: 14, letter: 'E',  words: ['egg', 'elephant', 'envelope', 'eraser', 'eagle'] },
  { week: 15, letter: 'U',  words: ['umbrella', 'unicorn', 'ukulele', 'unicycle', { word: 'sea urchin', sourceFile: 'seaurchin' }] },
  { week: 16, letter: 'R',  words: ['ring', 'rabbit', 'rocket', 'robot', 'rose'] },
  { week: 17, letter: 'H',  words: ['hat', 'horse', 'hammer', 'hen', 'heart'] },
  { week: 18, letter: 'B',  words: ['ball', 'banana', 'bell', 'boat', 'bear'] },
  { week: 19, letter: 'F',  words: ['fish', 'fork', 'frog', 'feather', 'fan'] },
  { week: 20, letter: 'L',  words: ['leaf', 'lion', 'ladder', 'lemon', 'lizard'] },
  { week: 21, letter: 'J',  words: ['jar', 'jet', 'jug', 'jacket', 'jellyfish'] },
  { week: 22, letter: 'V',  words: ['van', 'violin', 'vase', 'volcano', 'vest'] },
  { week: 23, letter: 'W',  words: ['watch', 'whale', 'wagon', 'worm', 'wolf'] },
  { week: 24, letter: 'X',  words: ['xylophone', 'fox', 'box', 'ox', { word: 'six', label: 'dice' }] },
  { week: 25, letter: 'Y',  words: [{ word: 'yo-yo', sourceFile: 'yoyo' }, 'yak', 'yarn', 'yacht', 'yam'] },
  { week: 26, letter: 'Z',  words: ['zebra', 'zipper', 'zucchini', 'zero', 'zeppelin'] },
  { week: 27, letter: 'Qu', words: ['queen', 'quill', 'quilt', 'quarter', 'quail'] },
];

/** Normalise a manifest word (string | override object) into a full entry. */
function toEntry(block, raw) {
  const spec = typeof raw === 'string' ? { word: raw } : raw;
  const label = spec.label ?? spec.word;
  return {
    word: spec.word,
    label,
    sourceFile: spec.sourceFile ?? label,
    week: block.week,
    letter: block.letter,
  };
}

const ENTRIES = SERIES.flatMap((block) => block.words.map((raw) => toEntry(block, raw)));

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/curriculum/upload-satpin-basket-photos.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Full-series tag set: the label plus its component words (so 'sea urchin' is
 * findable as 'sea' or 'urchin'), then the bank/series/letter/week markers.
 * Applied to all 130 rows — SATPIN included, so every row's `week-<NN>` agrees
 * with the established numbering.
 */
function tagsFor(entry) {
  const parts = entry.label.split(/[\s-]+/).filter(Boolean);
  const labelWords = [entry.label, ...parts].filter((v, i, a) => a.indexOf(v) === i);
  return [
    ...labelWords,
    'picture-bank',
    'satpin-basket',
    'az-basket',
    `letter-${entry.letter.toLowerCase()}`,
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

async function main() {
  console.log('=== A–Z basket photos -> photo-bank (27-week established series) ===');
  if (DRY_RUN) console.log('🟡 DRY RUN — no uploads, no DB writes.\n');

  // One storage path per entry: a collision would silently overwrite a photo.
  const seen = new Map();
  for (const e of ENTRIES) {
    const key = `${STORAGE_PREFIX}/${e.sourceFile}.jpg`;
    if (seen.has(key)) {
      console.error(`Duplicate storage path ${key} — "${seen.get(key)}" and "${e.word}"`);
      process.exit(1);
    }
    seen.set(key, e.word);
  }

  let uploaded = 0, updated = 0, unchanged = 0, failed = 0, missing = 0;
  const failures = [];

  for (const entry of ENTRIES) {
    const { word, label, sourceFile } = entry;
    const srcPath = path.join(SOURCE_ROOT, sourceFile, `${sourceFile}.jpg`);
    if (!fs.existsSync(srcPath)) {
      console.error(`  ✗ ${word}: source not found — ${srcPath}`);
      missing++;
      continue;
    }

    const filename = `${sourceFile}.jpg`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;
    const tags = tagsFor(entry);

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
      console.log(`      label="${label}" category="${CATEGORY}" tags=${JSON.stringify(tags)}`);
      if (existing) unchanged++; else uploaded++;
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
          existing.label !== label ||
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
            label,
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
        label,
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
  console.log(`Weeks:              ${SERIES.length}`);
  console.log(`Words:              ${ENTRIES.length}`);
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
