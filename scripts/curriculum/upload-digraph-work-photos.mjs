#!/usr/bin/env node
/**
 * Ingest the DIGRAPH / BLEND WORK photos (sheets 25, 26, 27) into the LIVE
 * picture bank, so every image used on those printables is browsable at
 * /montree/library/photo-bank.
 *
 * Source (repo picture bank, Tredoux's MJ winners picked 2026-09-19):
 *   docs/picture-bank/photos/<word>/<word>.jpg
 *
 * WHAT IT WRITES (own prefix — never touches writing-shelf/* or cvc-photos/*):
 *   storage : photo-bank/digraph-work/<word>.jpg  (upsert, idempotent)
 *   db row  : label=<word>, category='picture-bank',
 *             tags=[<word>,'picture-bank','digraph-work']
 *
 * Same shape as upload-writing-shelf-photos.mjs — lookup by storage_path,
 * insert or update only on drift, skip what is not on disk.
 *
 * Run (on the Mac — the service key never leaves it):
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-digraph-work-photos.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-digraph-work-photos.mjs
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
const STORAGE_PREFIX = 'digraph-work';
const CATEGORY = 'picture-bank';
const BANK = path.join(process.cwd(), 'docs', 'picture-bank', 'photos');

// The 2026-09-19 pickups: Midjourney winners filed into the repo bank. Each
// batch carries its own role tag, so a word can be traced to the sheet it was
// commissioned for. Storage prefix stays digraph-work for both — it is the
// path, not the label, and moving it would orphan the rows already written.
const FIRST = [
  'back', 'bath', 'bench', 'branch', 'chest', 'chew', 'chin', 'feet', 'field',
  'foot', 'hoe', 'hook', 'neck', 'pea', 'shrimp', 'stitch', 'teeth', 'three',
  'thrush', 'toe', 'trash', 'wheat',
];
// Second pickup, the blend commission. `balance` is filed and ingested but is
// NOT on a mat: b-a-l-a-n-c-e carries no `bl`, so it can leave no gap.
const SECOND = [
  'balance', 'glass', 'skate', 'skirt', 'slide', 'smoke', 'snap', 'spade',
  'spot', 'step', 'stick', 'stop',
];
const ITEMS = [
  ...FIRST.map(w => ({ word: w, role: 'digraph-work' })),
  ...SECOND.map(w => ({ word: w, role: 'blend-work' })),
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/curriculum/upload-digraph-work-photos.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tagsFor = (it) => [it.word, 'picture-bank', it.role];

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
  console.log('=== digraph/blend work photos -> photo-bank ===');
  if (DRY_RUN) console.log('DRY RUN - no uploads, no DB writes.\n');

  let uploaded = 0, updated = 0, unchanged = 0, failed = 0, missing = 0;

  for (const it of ITEMS) {
    const w = it.word;
    const srcPath = path.join(BANK, w, `${w}.jpg`);
    if (!fs.existsSync(srcPath)) {
      console.log(`  - ${w}: not on disk, skipped`);
      missing++;
      continue;
    }
    const filename = `${w}.jpg`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;
    const tags = tagsFor(it);

    const { data: existing, error: lookupErr } = await sb
      .from('montree_photo_bank')
      .select('id, label, filename, tags, category, public_url, storage_path')
      .eq('storage_path', storagePath)
      .maybeSingle();
    if (lookupErr) { console.error(`  x ${w}: lookup - ${lookupErr.message}`); failed++; continue; }

    if (DRY_RUN) {
      console.log(`  ${(existing ? 'UPDATE-OR-KEEP' : 'INSERT').padEnd(15)} ${w.padEnd(9)} ${storagePath}`);
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
        const drift = existing.label !== w || existing.filename !== filename ||
          existing.category !== CATEGORY || existing.public_url !== publicUrl ||
          !sameTags(existing.tags, tags);
        if (!drift) { console.log(`  o ${w} - storage refreshed, row already correct`); unchanged++; continue; }
        const { error: updErr } = await sb.from('montree_photo_bank').update({
          label: w, filename, tags, category: CATEGORY, public_url: publicUrl,
          file_size: size, mime_type: 'image/jpeg', is_public: true, is_approved: true,
        }).eq('id', existing.id);
        if (updErr) throw new Error(`db update: ${updErr.message}`);
        console.log(`  ~ ${w} - row updated`); updated++; continue;
      }

      const { error: insErr } = await sb.from('montree_photo_bank').insert({
        filename, label: w, tags, category: CATEGORY, storage_path: storagePath,
        public_url: publicUrl, file_size: size, mime_type: 'image/jpeg',
        uploaded_by: 'system', is_public: true, is_approved: true,
      });
      if (insErr) throw new Error(`db insert: ${insErr.message}`);
      console.log(`  + ${w} - uploaded + inserted (${(size / 1024).toFixed(0)}KB)`);
      uploaded++;
    } catch (e) {
      console.error(`  x ${w}: ${e.message}`); failed++;
    }
  }

  console.log(`\n=== DONE === inserted=${uploaded} updated=${updated} unchanged=${unchanged} skipped-missing=${missing} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main();
