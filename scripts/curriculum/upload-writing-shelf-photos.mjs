#!/usr/bin/env node
/**
 * Ingest the Writing Shelf (Stage 2 encoding materials) photos into the LIVE
 * picture bank, so every image used on the v2 printables is browsable at
 * /montree/library/photo-bank.
 *
 * Sources (repo picture bank, agent-picked from Tredoux's MJ runs, Aug 2026):
 *   phonics-images/satpin-v2/cvc-photos/<word>.png      — object photos
 *   phonics-images/satpin-v2/sequences/<name>.png        — 4-step sequence frames
 *
 * WHAT IT WRITES (own prefix — never touches cvc-photos/* storage paths, so
 * the live satpin card set is untouched):
 *   storage : photo-bank/writing-shelf/<name>.jpg  (upsert, idempotent)
 *   db row  : label=<name>, category='picture-bank',
 *             tags=[<name>,'picture-bank','writing-shelf', ...role tag]
 *
 * Missing source files are skipped with a note (sequence sets B/C and 'tap'
 * arrive in batches) — just re-run after the next MJ batch lands.
 *
 * Run (on the Mac — the service key never leaves it):
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-writing-shelf-photos.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-writing-shelf-photos.mjs
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
const STORAGE_PREFIX = 'writing-shelf';
const CATEGORY = 'picture-bank';
const OBJ_ROOT = path.join(process.cwd(), 'phonics-images', 'satpin-v2', 'cvc-photos');
const SEQ_ROOT = path.join(process.cwd(), 'phonics-images', 'satpin-v2', 'sequences');

// Object photos: 12 dictation words + 6 chain-front words.
const OBJECTS = [
  'cat','pig','hat','mug','bed','dog','pen','bag','log','rug','cot','jam', // dictation
  'tap','mop','peg','bin','nut','rat',                                     // chain fronts
];
// Sequence frames: 3 sets x 4 (seed->flower, egg->hen, apple->core).
const SEQUENCES = [
  'seq-A-1','seq-A-2','seq-A-3','seq-A-4',
  'seq-B-1','seq-B-2','seq-B-3','seq-B-4',
  'seq-C-1','seq-C-2','seq-C-3','seq-C-4',
];

const ITEMS = [
  ...OBJECTS.map(w => ({ name: w, root: OBJ_ROOT, role: 'object' })),
  ...SEQUENCES.map(w => ({ name: w, root: SEQ_ROOT, role: 'sequence' })),
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/curriculum/upload-writing-shelf-photos.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tagsFor = (it) => [it.name, 'picture-bank', 'writing-shelf', it.role];

function sameTags(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const sa = [...a].sort(); const sb_ = [...b].sort();
  return sa.every((v, i) => v === sb_[i]);
}

async function jpegBuffer(srcPath) {
  const raw = await fsp.readFile(srcPath);
  return sharp(raw).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer();
}

async function main() {
  console.log('=== Writing Shelf photos -> photo-bank ===');
  if (DRY_RUN) console.log('DRY RUN - no uploads, no DB writes.\n');

  let uploaded = 0, updated = 0, unchanged = 0, failed = 0, missing = 0;

  for (const it of ITEMS) {
    const srcPath = path.join(it.root, `${it.name}.png`);
    if (!fs.existsSync(srcPath)) {
      console.log(`  - ${it.name}: not on disk yet, skipped`);
      missing++;
      continue;
    }
    const filename = `${it.name}.jpg`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;
    const tags = tagsFor(it);

    const { data: existing, error: lookupErr } = await sb
      .from('montree_photo_bank')
      .select('id, label, filename, tags, category, public_url, storage_path')
      .eq('storage_path', storagePath)
      .maybeSingle();
    if (lookupErr) { console.error(`  x ${it.name}: lookup - ${lookupErr.message}`); failed++; continue; }

    if (DRY_RUN) {
      console.log(`  ${(existing ? 'UPDATE-OR-KEEP' : 'INSERT').padEnd(15)} ${it.name.padEnd(9)} ${storagePath}`);
      if (existing) unchanged++; else uploaded++;
      continue;
    }

    try {
      const buffer = await jpegBuffer(srcPath);
      const size = buffer.length;
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw new Error(`storage: ${upErr.message}`);

      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      if (existing) {
        const drift = existing.label !== it.name || existing.filename !== filename ||
          existing.category !== CATEGORY || existing.public_url !== publicUrl ||
          !sameTags(existing.tags, tags);
        if (!drift) { console.log(`  o ${it.name} - storage refreshed, row already correct`); unchanged++; continue; }
        const { error: updErr } = await sb.from('montree_photo_bank').update({
          label: it.name, filename, tags, category: CATEGORY, public_url: publicUrl,
          file_size: size, mime_type: 'image/jpeg', is_public: true, is_approved: true,
        }).eq('id', existing.id);
        if (updErr) throw new Error(`db update: ${updErr.message}`);
        console.log(`  ~ ${it.name} - row updated`); updated++; continue;
      }

      const { error: insErr } = await sb.from('montree_photo_bank').insert({
        filename, label: it.name, tags, category: CATEGORY, storage_path: storagePath,
        public_url: publicUrl, file_size: size, mime_type: 'image/jpeg',
        uploaded_by: 'system', is_public: true, is_approved: true,
      });
      if (insErr) throw new Error(`db insert: ${insErr.message}`);
      console.log(`  + ${it.name} - uploaded + inserted (${(size / 1024).toFixed(0)}KB)`);
      uploaded++;
    } catch (e) {
      console.error(`  x ${it.name}: ${e.message}`); failed++;
    }
  }

  console.log(`\n=== DONE === inserted=${uploaded} updated=${updated} unchanged=${unchanged} skipped-missing=${missing} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main();
