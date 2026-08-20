#!/usr/bin/env node
/**
 * scripts/curriculum/publish-static-materials.mjs
 *
 * Sync script for the `static-assets` Supabase Storage bucket, which since
 * the Aug 2026 migration (see MIGRATION_NOTES_static-assets.md) is where the
 * live site actually serves public/dark-phonics-materials/, public/dark-
 * phonics-books/, public/satpin-materials/, public/satpin-books/, and
 * public/shelf-packs/ from — those dirs are gitignored and NOT shipped in
 * the Docker build (see .dockerignore). next.config.ts rewrites() forward
 * requests like /dark-phonics-materials/foo.pdf to this app's own
 * /api/montree/media/proxy/bucket/static-assets/dark-phonics-materials/foo.pdf
 * route (never straight to *.supabase.co — see next.config.ts comments on
 * why: Cloudflare rejects an external rewrite destination on this host).
 *
 * Prior to this script the Aug migration's initial upload was a one-time
 * manual operation — there was no repeatable sync path for regenerated PDFs.
 * This fills that gap, generically: it does not hardcode any family/file
 * list. Give it a directory (or directories) to walk, an explicit file list,
 * or a --since date, and it uploads whatever it finds.
 *
 * ── BUCKET PATH MAPPING (per MIGRATION_NOTES_static-assets.md: "Moved (same
 *    subpaths)") ── For any local file at repo-relative path
 *      public/<rest>
 *    the bucket object path is simply
 *      <rest>
 *    e.g. public/dark-phonics-materials/snake-in-my-sock/build-it-sheet.pdf
 *      -> static-assets bucket key dark-phonics-materials/snake-in-my-sock/build-it-sheet.pdf
 *      -> live at https://montree.xyz/dark-phonics-materials/snake-in-my-sock/build-it-sheet.pdf
 *    public/dark-phonics-books/works/snake-in-my-sock/snake-in-my-sock-work1-picture-match.pdf
 *      -> dark-phonics-books/works/snake-in-my-sock/snake-in-my-sock-work1-picture-match.pdf
 *      -> live at https://montree.xyz/dark-phonics-books/works/snake-in-my-sock/snake-in-my-sock-work1-picture-match.pdf
 * (Video files are the one exception under the migration — public/montree-
 * splash-video*.mp4 map to videos/... — out of scope for this script, which
 * only ever uploads files that already live under public/, mapped 1:1 minus
 * the "public/" prefix; it never needs a video-specific rule.)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (repo root) — same pattern as publish-videos.mjs. Bucket is public;
 * upsert:true for idempotency.
 *
 * Usage:
 *   node scripts/curriculum/publish-static-materials.mjs --dry-run
 *     # default dirs: public/dark-phonics-materials/, public/dark-phonics-books/works/
 *   node scripts/curriculum/publish-static-materials.mjs
 *     # real upload, default dirs, all *.pdf
 *   node scripts/curriculum/publish-static-materials.mjs --since 2026-08-19
 *     # only files with mtime >= that date (local time, start of day)
 *   node scripts/curriculum/publish-static-materials.mjs --dir public/satpin-materials
 *     # walk a different dir (repeatable)
 *   node scripts/curriculum/publish-static-materials.mjs path/to/file1.pdf path/to/file2.pdf
 *     # explicit repo-relative file list (skips directory discovery entirely)
 *
 * Exits non-zero if ANY file fails to upload.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const BUCKET = 'static-assets';

const DEFAULT_DIRS = [
  'public/dark-phonics-materials',
  'public/dark-phonics-books/works',
];

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}

const sinceRaw = argValue('--since');
const SINCE = sinceRaw ? new Date(`${sinceRaw}T00:00:00`) : null;
if (sinceRaw && Number.isNaN(SINCE?.getTime())) {
  console.error(`❌ --since ${sinceRaw} is not a valid date (expected YYYY-MM-DD)`);
  process.exit(1);
}

const explicitDirs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) explicitDirs.push(args[i + 1]);
}

// Positional (non-flag) args = explicit repo-relative file paths.
const explicitFiles = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--dry-run') continue;
  if (a === '--since') { i++; continue; }
  if (a === '--dir') { i++; continue; }
  if (a.startsWith('--')) continue;
  explicitFiles.push(a);
}

// ── Load .env.local manually (values may contain '=': split on FIRST '=' only) ──
function loadEnv() {
  const envPath = path.join(REPO, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** repo-relative "public/<rest>" -> bucket key "<rest>" (migration notes: same subpaths). */
function toBucketKey(repoRelPath) {
  const norm = repoRelPath.split(path.sep).join('/');
  if (!norm.startsWith('public/')) {
    throw new Error(`"${repoRelPath}" is not under public/ — mapping only defined for public/<rest> -> <rest>`);
  }
  return norm.slice('public/'.length);
}

/** Recursively find every file under `dir` (repo-relative), filtered by --since if set. */
function walkDir(dirRelPath) {
  const abs = path.join(REPO, dirRelPath);
  const out = [];
  if (!fs.existsSync(abs)) {
    console.error(`  ⚠ dir not found, skipping: ${dirRelPath}`);
    return out;
  }
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) { stack.push(full); continue; }
      if (!ent.isFile()) continue;
      const relToRepo = path.relative(REPO, full);
      if (SINCE) {
        const mtime = fs.statSync(full).mtime;
        if (mtime < SINCE) continue;
      }
      out.push(relToRepo);
    }
  }
  return out;
}

async function uploadWithRetry(destPath, buf, maxAttempts = 3) {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(destPath, buf, { contentType: 'application/pdf', cacheControl: '3600', upsert: true });
    if (!error) return { ok: true };
    lastErr = error;
    console.error(`    ⚠ upload attempt ${attempt}/${maxAttempts} failed for ${destPath}: ${error.message}`);
    if (attempt < maxAttempts) await sleep(1000 * 3 ** (attempt - 1)); // 1s, 3s, 9s
  }
  return { ok: false, error: lastErr };
}

async function main() {
  let files;
  if (explicitFiles.length) {
    files = explicitFiles;
  } else {
    const dirs = explicitDirs.length ? explicitDirs : DEFAULT_DIRS;
    files = dirs.flatMap(walkDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  }
  files.sort();

  console.log(`=== Publish static materials → ${BUCKET}/ ${DRY_RUN ? '(DRY RUN) ' : ''}${SINCE ? `[mtime >= ${sinceRaw}] ` : ''}===`);
  console.log(`Found ${files.length} file(s) to publish.\n`);

  if (files.length === 0) {
    console.log('Nothing to publish.');
    process.exit(0);
  }

  let uploaded = 0, failed = 0, totalBytes = 0;
  const failures = [];

  for (const relPath of files) {
    const absPath = path.join(REPO, relPath);
    let bucketKey;
    try {
      bucketKey = toBucketKey(relPath);
    } catch (e) {
      console.error(`  ❌ ${relPath}: ${e.message}`);
      failed++;
      failures.push({ relPath, error: e.message });
      continue;
    }

    let bytes;
    try {
      bytes = fs.statSync(absPath).size;
    } catch (e) {
      console.error(`  ❌ ${relPath}: stat failed — ${e.message}`);
      failed++;
      failures.push({ relPath, error: `stat failed: ${e.message}` });
      continue;
    }

    if (DRY_RUN) {
      console.log(`  ○ ${relPath}  →  ${BUCKET}/${bucketKey}  (${bytes} bytes)`);
      uploaded++;
      totalBytes += bytes;
      continue;
    }

    let buf;
    try {
      buf = fs.readFileSync(absPath);
    } catch (e) {
      console.error(`  ❌ ${relPath}: read failed — ${e.message}`);
      failed++;
      failures.push({ relPath, error: `read failed: ${e.message}` });
      continue;
    }

    const result = await uploadWithRetry(bucketKey, buf);
    if (!result.ok) {
      console.error(`  ❌ ${relPath} → ${bucketKey}: ${result.error?.message}`);
      failed++;
      failures.push({ relPath, error: result.error?.message });
      continue;
    }
    console.log(`  ✅ ${relPath}  →  ${BUCKET}/${bucketKey}  (${buf.length} bytes)`);
    uploaded++;
    totalBytes += buf.length;
  }

  console.log(`\n=== Run complete ===`);
  console.log(`${DRY_RUN ? 'Would upload' : 'Uploaded'}: ${uploaded}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) failures.forEach((f) => console.log(`  · ${f.relPath} — ${f.error}`));
  console.log(`Total bytes: ${totalBytes} (${(totalBytes / 1048576).toFixed(1)} MB)`);

  if (failed > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
