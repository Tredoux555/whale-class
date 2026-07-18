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
// Grace & Courtesy Intro Weeks live OUTSIDE the numbered 1–58 spine: source in
// `Intro Week A|B/images/`, spec in intro-week-a|b.json, uploaded under
// curriculum-images/intro-a|intro-b/. `--intro a|b` publishes one; `--intro all`
// (or bare, alongside no --week) publishes both.
function argIntro() {
  const i = process.argv.indexOf('--intro');
  if (i < 0) return null;
  const k = (process.argv[i + 1] || 'all').trim().toLowerCase();
  if (k === 'a' || k === 'b') return [k];
  if (k === 'all') return ['a', 'b'];
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

/**
 * Publish one folder of images → `curriculum-images/<destSub>/` and stamp the
 * given spec's imageUrls. Shared by numbered weeks (`Week NN/images` → w<NN>) and
 * the Grace & Courtesy Intro Weeks (`Intro Week A|B/images` → intro-a|intro-b).
 * `label` is a human tag ("W01", "Intro A") for logs + the report lists.
 */
async function publishFolder({ specPath, imagesDir, destSub, label, specName }, report) {
  if (!fs.existsSync(specPath)) { report.noSpec.push(label); return; }
  if (!fs.existsSync(imagesDir)) { report.noImages.push(label); return; }

  const srcFiles = fs.readdirSync(imagesDir).filter((f) => SRC_EXTS.includes(path.extname(f).toLowerCase()));
  if (srcFiles.length === 0) { report.noImages.push(label); return; }

  const imageUrls = {};
  const stemsSeen = new Set();
  for (const f of srcFiles) {
    const stem = stemFor(f);
    if (!stem) continue;
    if (stemsSeen.has(stem)) console.log(`  ⚠ ${label}: duplicate stem "${stem}" (from ${f}) — overwriting`);
    stemsSeen.add(stem);

    const srcPath = path.join(imagesDir, f);
    let webp;
    try {
      webp = await sharp(srcPath)
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (e) {
      console.error(`  ❌ ${label} ${f}: encode failed — ${e.message}`);
      report.failed++;
      continue;
    }

    const dest = `${PREFIX}/${destSub}/${stem}.webp`;
    const url = `${BASE}/${dest}`;
    imageUrls[stem] = url;
    report.bytes += webp.length;

    if (DRY_RUN) {
      console.log(`  ○ ${label} ${f}  →  ${dest}  (${(webp.length / 1024).toFixed(0)} KB)`);
      report.uploaded++;
      continue;
    }

    const { error } = await supabase.storage.from(BUCKET).upload(dest, webp, { contentType: 'image/webp', upsert: true });
    if (error) {
      // one retry for flaky uploads
      const retry = await supabase.storage.from(BUCKET).upload(dest, webp, { contentType: 'image/webp', upsert: true });
      if (retry.error) {
        console.error(`  ❌ ${label} ${f}: ${retry.error.message}`);
        report.failed++;
        delete imageUrls[stem];
        continue;
      }
    }
    console.log(`  ✅ ${label} ${f}  →  ${dest}  (${(webp.length / 1024).toFixed(0)} KB)`);
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
    if (DRY_RUN) console.log(`  ○ would patch ${specName} (${stemKeys.length} imageUrls)`);
    else { fs.writeFileSync(specPath, out); console.log(`  📝 patched ${specName} (${stemKeys.length} imageUrls)`); }
  }
}

async function processWeek(week, report) {
  return publishFolder({
    specPath: path.join(SPEC_DIR, `week-${pad(week)}.json`),
    imagesDir: path.join(IMAGES_ROOT, `Week ${pad(week)}`, 'images'),
    destSub: `w${pad(week)}`,
    label: `W${pad(week)}`,
    specName: `week-${pad(week)}.json`,
  }, report);
}

async function processIntro(key, report) {
  const K = key.toUpperCase();
  return publishFolder({
    specPath: path.join(SPEC_DIR, `intro-week-${key}.json`),
    imagesDir: path.join(IMAGES_ROOT, `Intro Week ${K}`, 'images'),
    destSub: `intro-${key}`,
    label: `Intro ${K}`,
    specName: `intro-week-${key}.json`,
  }, report);
}

async function main() {
  const intro = argIntro();
  const only = argWeek();
  const scopeLabel = intro
    ? `[intro ${intro.join(' + ')}] `
    : only ? `[week ${only} only] ` : '[all 58 weeks] ';
  console.log(`=== Publish curriculum images → ${BUCKET}/${PREFIX}/ ${DRY_RUN ? '(DRY RUN) ' : ''}${scopeLabel}===\n`);

  const report = { uploaded: 0, failed: 0, bytes: 0, specsChanged: 0, noSpec: [], noImages: [] };
  if (intro) {
    for (const k of intro) await processIntro(k, report);
  } else {
    const weeks = only ? [only] : Array.from({ length: 58 }, (_, i) => i + 1);
    for (const w of weeks) await processWeek(w, report);
  }

  console.log(`\n=== ${DRY_RUN ? 'Dry-run' : 'Publish'} complete ===`);
  console.log(`✅ ${DRY_RUN ? 'Would upload' : 'Uploaded'}: ${report.uploaded}`);
  console.log(`❌ Failed: ${report.failed}`);
  console.log(`📦 Total: ${(report.bytes / 1048576).toFixed(1)} MB`);
  console.log(`📝 Specs ${DRY_RUN ? 'to change' : 'changed'}: ${report.specsChanged}`);
  if (report.noImages.length) console.log(`⚠️  No images/ dir: ${report.noImages.join(', ')}`);
  if (report.noSpec.length) console.log(`⚠️  No spec: ${report.noSpec.join(', ')}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
