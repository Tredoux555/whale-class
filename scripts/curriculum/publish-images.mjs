#!/usr/bin/env node
/**
 * scripts/curriculum/publish-images.mjs — the Phase-E IMAGE publisher.
 *
 * Mirrors upload-songs.mjs + set-audio-urls.mjs, for pictures. For every
 *   ~/Desktop/English Curriculum 2026/Week NN/images/*.{png,jpg,jpeg,webp}
 * it downscales to a ~900px-long-edge WEBP (q80), uploads to Supabase Storage
 *   montree-media/curriculum-images/wNN/<stem>.webp
 * and writes an `imageUrls` map into lib/montree/english-curriculum/spec/
 * week-NN.json so the web Curriculum Studio can show real pictures without the
 * art living on the operator's Mac (dropped images still override in the Studio).
 *
 * The map is keyed by the filename STEM: the numeric order prefix stripped, the
 * `-coloring` suffix KEPT, lower-cased ("01-chair.png" → "chair",
 * "chair-coloring.png" → "chair-coloring"). Each key round-trips through the
 * render engine's parseAssetFilename identically to the original filename, so
 * "chair" resolves as the image and "chair-coloring" as the colouring line-art.
 *
 * The spec edit is a SURGICAL single-line insert (one compact `"imageUrls": {…}`
 * line right after the opening brace) — the spec files have mixed formatting and
 * a full re-stringify would churn every file. Idempotent: any existing imageUrls
 * line is stripped first, then re-inserted.
 *
 * 🚨 The print/CLI path is UNAFFECTED — build-week.mjs still reads local files
 * from --assets; imageUrls is a Studio-only fallback.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Needs `sharp` (already a repo dependency).
 *
 * Usage:
 *   node scripts/curriculum/publish-images.mjs --week 1            # one week
 *   node scripts/curriculum/publish-images.mjs --week 1 --dry-run  # no upload, no spec write
 *   node scripts/curriculum/publish-images.mjs                     # all 58 weeks
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const SPEC_DIR = path.join(REPO, 'lib', 'montree', 'english-curriculum', 'spec');
const IMAGES_ROOT = path.join(os.homedir(), 'Desktop', 'English Curriculum 2026');
const BUCKET = 'montree-media';
const PREFIX = 'curriculum-images';
const BASE = 'https://montree.xyz/api/montree/media/proxy';
const MAX_EDGE = 900;
const WEBP_QUALITY = 80;
const SRC_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

const DRY_RUN = process.argv.includes('--dry-run');
function argWeek() {
  const i = process.argv.indexOf('--week');
  if (i >= 0 && process.argv[i + 1]) { const n = parseInt(process.argv[i + 1], 10); if (n >= 1 && n <= 58) return n; }
  return null;
}

// ── Load .env.local manually (split on FIRST '=' only) ──
function loadEnv() {
  const envPath = path.join(REPO, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_ROLE_KEY)) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = DRY_RUN && !SERVICE_ROLE_KEY ? null : createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const pad = (n) => String(n).padStart(2, '0');

/**
 * Filename → { stem } used both as the storage object name (<stem>.webp) and the
 * imageUrls key. Strip a leading numeric order prefix, drop the extension, lower-
 * case, KEEP the -coloring suffix, and make it URL-safe (whitespace → hyphen;
 * underscores kept — parseAssetFilename treats -/_/space as the same separator,
 * so the parsed word is identical either way). Returns null for non-images.
 */
function stemFor(filename) {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot) : '';
  if (!SRC_EXTS.includes(ext)) return null;
  let stem = lower.slice(0, dot);
  stem = stem.replace(/^\d+[-_\s]+/, '');   // strip "01-", "16_" order prefix
  stem = stem.replace(/\s+/g, '-').trim();  // URL-safe
  return stem || null;
}

async function processWeek(week, report) {
  const specPath = path.join(SPEC_DIR, `week-${pad(week)}.json`);
  if (!fs.existsSync(specPath)) { report.noSpec.push(week); return; }

  const imagesDir = path.join(IMAGES_ROOT, `Week ${pad(week)}`, 'images');
  if (!fs.existsSync(imagesDir)) { report.noImages.push(week); return; }

  const srcFiles = fs.readdirSync(imagesDir).filter((f) => SRC_EXTS.includes(path.extname(f).toLowerCase()));
  if (srcFiles.length === 0) { report.noImages.push(week); return; }

  const imageUrls = {};
  const stemsSeen = new Set();
  for (const f of srcFiles) {
    const stem = stemFor(f);
    if (!stem) continue;
    if (stemsSeen.has(stem)) console.log(`  ⚠ W${pad(week)}: duplicate stem "${stem}" (from ${f}) — overwriting`);
    stemsSeen.add(stem);

    const srcPath = path.join(imagesDir, f);
    let webp;
    try {
      webp = await sharp(srcPath)
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (e) {
      console.error(`  ❌ W${pad(week)} ${f}: encode failed — ${e.message}`);
      report.failed++;
      continue;
    }

    const dest = `${PREFIX}/w${pad(week)}/${stem}.webp`;
    const url = `${BASE}/${dest}`;
    imageUrls[stem] = url;
    report.bytes += webp.length;

    if (DRY_RUN) {
      console.log(`  ○ W${pad(week)} ${f}  →  ${dest}  (${(webp.length / 1024).toFixed(0)} KB)`);
      report.uploaded++;
      continue;
    }

    const { error } = await supabase.storage.from(BUCKET).upload(dest, webp, { contentType: 'image/webp', upsert: true });
    if (error) {
      // one retry for flaky uploads
      const retry = await supabase.storage.from(BUCKET).upload(dest, webp, { contentType: 'image/webp', upsert: true });
      if (retry.error) {
        console.error(`  ❌ W${pad(week)} ${f}: ${retry.error.message}`);
        report.failed++;
        delete imageUrls[stem];
        continue;
      }
    }
    console.log(`  ✅ W${pad(week)} ${f}  →  ${dest}  (${(webp.length / 1024).toFixed(0)} KB)`);
    report.uploaded++;
  }

  // ── Write imageUrls into the spec (surgical single-line insert) ──
  const stemKeys = Object.keys(imageUrls).sort();
  if (stemKeys.length === 0) return;
  const orig = fs.readFileSync(specPath, 'utf8');
  let lines = orig.split('\n');
  lines = lines.filter((l) => !/^\s*"imageUrls":/.test(l)); // idempotent strip
  const sorted = {};
  for (const k of stemKeys) sorted[k] = imageUrls[k];
  const inserted = `  "imageUrls": ${JSON.stringify(sorted)},`;
  // Insert right after the opening brace (first line "{").
  const braceIdx = lines.findIndex((l) => l.trim() === '{');
  const at = braceIdx >= 0 ? braceIdx + 1 : 1;
  lines.splice(at, 0, inserted);
  const out = lines.join('\n');

  if (out !== orig) {
    report.specsChanged++;
    if (DRY_RUN) console.log(`  ○ would patch week-${pad(week)}.json (${stemKeys.length} imageUrls)`);
    else { fs.writeFileSync(specPath, out); console.log(`  📝 patched week-${pad(week)}.json (${stemKeys.length} imageUrls)`); }
  }
}

async function main() {
  const only = argWeek();
  console.log(`=== Publish curriculum images → ${BUCKET}/${PREFIX}/ ${DRY_RUN ? '(DRY RUN) ' : ''}${only ? `[week ${only} only] ` : '[all 58 weeks] '}===\n`);

  const report = { uploaded: 0, failed: 0, bytes: 0, specsChanged: 0, noSpec: [], noImages: [] };
  const weeks = only ? [only] : Array.from({ length: 58 }, (_, i) => i + 1);
  for (const w of weeks) await processWeek(w, report);

  console.log(`\n=== ${DRY_RUN ? 'Dry-run' : 'Publish'} complete ===`);
  console.log(`✅ ${DRY_RUN ? 'Would upload' : 'Uploaded'}: ${report.uploaded}`);
  console.log(`❌ Failed: ${report.failed}`);
  console.log(`📦 Total: ${(report.bytes / 1048576).toFixed(1)} MB`);
  console.log(`📝 Specs ${DRY_RUN ? 'to change' : 'changed'}: ${report.specsChanged}`);
  if (report.noImages.length) console.log(`⚠️  No images/ dir: weeks ${report.noImages.join(', ')}`);
  if (report.noSpec.length) console.log(`⚠️  No spec: weeks ${report.noSpec.join(', ')}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
