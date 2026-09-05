#!/usr/bin/env node
/**
 * Ingest the unplaced circle-time/preschool draft art (Aug 30 - Sep 4 2026 MJ
 * session, recovered from Downloads) into the LIVE picture bank so it is
 * browsable and reusable, even though it isn't wired into any specific
 * circle-time week yet.
 *
 * See phonics-images/circle-time-drafts/MANIFEST.md for why these are
 * unplaced (style suffix doesn't match any locked docs/circle-time/
 * mj-prompts-week*.md file).
 *
 * storage : photo-bank/circle-time-drafts/<slug>.jpg (upsert, idempotent)
 * db row  : label=<slug>, category='picture-bank',
 *           tags=[<slug>,'picture-bank','circle-time-draft']
 *
 * Run (on the Mac, from the repo root):
 *   DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-circle-time-drafts.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-circle-time-drafts.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fsp from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

const BUCKET = 'photo-bank';
const STORAGE_PREFIX = 'circle-time-drafts';
const CATEGORY = 'picture-bank';
const SRC_ROOT = path.join(process.cwd(), 'phonics-images', 'circle-time-drafts');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function jpegBuffer(srcPath) {
  const raw = await fsp.readFile(srcPath);
  return sharp(raw).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer();
}

async function main() {
  console.log('=== Circle-time drafts -> photo-bank ===');
  if (DRY_RUN) console.log('DRY RUN - no uploads, no DB writes.\n');

  const files = (await fsp.readdir(SRC_ROOT)).filter(f => f.endsWith('.png'));
  let uploaded = 0, unchanged = 0, failed = 0;

  for (const fn of files) {
    const name = fn.replace(/\.png$/, '');
    const srcPath = path.join(SRC_ROOT, fn);
    const filename = `${name}.jpg`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;
    const tags = [name, 'picture-bank', 'circle-time-draft'];

    const { data: existing, error: lookupErr } = await sb
      .from('montree_photo_bank')
      .select('id, label, tags, storage_path')
      .eq('storage_path', storagePath)
      .maybeSingle();

    if (lookupErr) {
      console.log(`  ! ${name}: lookup error ${lookupErr.message}`);
      failed++;
      continue;
    }

    if (existing) {
      console.log(`  UNCHANGED  ${name}  (already in bank)`);
      unchanged++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  WOULD UPLOAD  ${name}  ${storagePath}`);
      uploaded++;
      continue;
    }

    try {
      const buf = await jpegBuffer(srcPath);
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(storagePath, buf, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
      const { error: insErr } = await sb.from('montree_photo_bank').insert({
        label: name,
        filename,
        storage_path: storagePath,
        public_url: pub.publicUrl,
        category: CATEGORY,
        tags,
        uploaded_by: 'system',
      });
      if (insErr) throw insErr;

      console.log(`  UPLOADED  ${name}`);
      uploaded++;
    } catch (e) {
      console.log(`  ! ${name}: FAILED ${e.message || e}`);
      failed++;
    }
  }

  console.log(`\n=== DONE === uploaded=${uploaded} unchanged=${unchanged} failed=${failed} total=${files.length}`);
}

main();
