#!/usr/bin/env node
/**
 * scripts/curriculum/publish-phonics-audio.mjs
 *
 * Uploads the ElevenLabs voice bank at
 *   curriculum/assets/audio/elevenlabs-master/{words,letters,phonemes,feedback}/<name>.mp3
 * to the PUBLIC `dark-phonics` Supabase Storage bucket under
 *   dark-phonics-audio/{words,letters,phonemes,feedback}/<name>.mp3
 *
 * WHY the `dark-phonics` bucket (not `static-assets`):
 *  - dark-phonics-lesson-player.html already streams songs + films from it via
 *    /api/montree/media/proxy/<key>?bucket=dark-phonics (REMOTE_SONG/REMOTE_VIDEO),
 *    so the proxy allowlist + CSP media-src path is already proven in prod.
 *  - `static-assets` is bound to the "key = repo path minus public/" convention
 *    (MIGRATION_NOTES_static-assets.md). This bank lives in curriculum/assets/,
 *    not public/, so it does not belong to that mapping.
 *
 * Live URL shape:
 *   https://montree.xyz/api/montree/media/proxy/dark-phonics-audio/words/snake.mp3?bucket=dark-phonics
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (repo root) — same pattern as publish-static-materials.mjs. upsert:true.
 *
 * Usage:
 *   node scripts/curriculum/publish-phonics-audio.mjs --dry-run
 *   node scripts/curriculum/publish-phonics-audio.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const BUCKET = 'dark-phonics';
const KEY_PREFIX = 'dark-phonics-audio';
const SRC = path.join(REPO, 'curriculum/assets/audio/elevenlabs-master');
const GROUPS = ['words', 'letters', 'phonemes', 'feedback'];

const DRY_RUN = process.argv.slice(2).includes('--dry-run');

// ── .env.local loader (same minimal parser as the sibling publish scripts) ──
function loadEnv() {
  const p = path.join(REPO, '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error('[FATAL] Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(URL_, KEY, { auth: { persistSession: false } });

// ── collect ──
const jobs = [];
for (const g of GROUPS) {
  const dir = path.join(SRC, g);
  if (!fs.existsSync(dir)) {
    console.warn(`[skip] no such group dir: ${g}`);
    continue;
  }
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.toLowerCase().endsWith('.mp3')) continue;
    jobs.push({ local: path.join(dir, f), key: `${KEY_PREFIX}/${g}/${f}`, group: g });
  }
}

console.log(`[plan] bucket=${BUCKET} files=${jobs.length}`);
for (const g of GROUPS) {
  console.log(`       ${g}: ${jobs.filter((j) => j.group === g).length}`);
}
if (DRY_RUN) {
  console.log('[dry-run] no uploads performed');
  process.exit(0);
}

// ── upload ──
let ok = 0;
const failed = [];
for (const j of jobs) {
  const body = fs.readFileSync(j.local);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(j.key, body, { contentType: 'audio/mpeg', upsert: true });
  if (error) {
    failed.push(`${j.key}: ${error.message}`);
    console.error(`[FAIL] ${j.key} — ${error.message}`);
  } else {
    ok++;
    if (ok % 25 === 0) console.log(`  …${ok}/${jobs.length}`);
  }
}

console.log(`[done] uploaded=${ok} failed=${failed.length}`);
if (failed.length) {
  for (const f of failed) console.error('  ' + f);
  process.exit(1);
}
