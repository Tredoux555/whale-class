#!/usr/bin/env node
/**
 * scripts/curriculum/upload-songs.mjs — Phase E song publisher.
 *
 * Uploads the picked, clean-named curriculum-song mp3s from the Mac
 *   ~/Desktop/English Curriculum 2026/Week NN/WNN <Title>[ (sound|word)].mp3
 * to Supabase Storage bucket `montree-media` at
 *   curriculum-songs/wNN-<role>.mp3
 *
 * Matching: each week's spec (lib/montree/english-curriculum/spec/week-NN.json)
 * lists songs[] with {role, title}. We find the mp3 on disk whose title matches
 * (normalize: lowercase, strip non-alphanumerics), disambiguating by role marker
 * when two songs in a week share a title. Files with "(take" in the name are
 * NOT clean picks — skipped + reported (expected: W30 sound song only).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (repo root). Bucket is public; upsert:true for idempotency.
 *
 * Usage:
 *   node scripts/curriculum/upload-songs.mjs            # upload
 *   node scripts/curriculum/upload-songs.mjs --dry-run  # match report only
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const SPEC_DIR = path.join(REPO, 'lib', 'montree', 'english-curriculum', 'spec');
const SONGS_ROOT = path.join(os.homedir(), 'Desktop', 'English Curriculum 2026');
const BUCKET = 'montree-media';
const DRY_RUN = process.argv.includes('--dry-run');

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

const pad = (n) => String(n).padStart(2, '0');
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Strip the WNN prefix + the role/take markers ONLY (never other parens, so a
// title like "It's A (Potato)" keeps "(Potato)"). Returns { core, fileRole }.
function parseFilename(base) {
  let s = base;
  let fileRole = null;
  const roleMatch = s.match(/\((sound|word)\)/i);
  if (roleMatch) fileRole = roleMatch[1].toLowerCase();
  // remove specific trailing markers
  s = s.replace(/\s*\((?:sound|word|take[^)]*)\)\s*/gi, ' ');
  // remove leading WNN prefix
  s = s.replace(/^W\d+\s+/i, '');
  return { core: s.trim(), fileRole };
}

async function main() {
  console.log(`=== Curriculum Songs: Upload to ${BUCKET}/curriculum-songs/ ${DRY_RUN ? '(DRY RUN)' : ''}===\n`);

  let uploaded = 0;
  let failed = 0;
  let totalBytes = 0;
  const skipped = [];   // {week, file, reason}
  const misses = [];    // {week, role, title, reason}

  for (let week = 1; week <= 58; week++) {
    const specPath = path.join(SPEC_DIR, `week-${pad(week)}.json`);
    if (!fs.existsSync(specPath)) { misses.push({ week, role: '-', title: '-', reason: 'no spec' }); continue; }
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const songs = spec.songs ?? [];

    const weekDir = path.join(SONGS_ROOT, `Week ${pad(week)}`);
    if (!fs.existsSync(weekDir)) { misses.push({ week, role: '-', title: '-', reason: 'no week dir' }); continue; }

    const allMp3 = fs.readdirSync(weekDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
    // Skip take-suffixed (not clean picks).
    const candidates = [];
    for (const f of allMp3) {
      const base = f.replace(/\.mp3$/i, '');
      if (/\(take/i.test(base)) { skipped.push({ week, file: f, reason: 'take-suffixed (not a clean pick)' }); continue; }
      const { core, fileRole } = parseFilename(base);
      candidates.push({ file: f, coreNorm: norm(core), fileRole, claimed: false });
    }

    // ── Pass 1: exact title match (role marker disambiguates same-title pairs) ──
    const resolved = new Map(); // song -> { chosen, how }
    for (const song of songs) {
      const titleNorm = norm(song.title);
      let matches = candidates.filter((c) => !c.claimed && c.coreNorm === titleNorm);
      if (matches.length > 1) {
        const byRole = matches.filter((c) => c.fileRole === song.role);
        if (byRole.length) matches = byRole;
      }
      if (matches.length) { matches[0].claimed = true; resolved.set(song, { chosen: matches[0], how: 'title' }); }
    }
    // ── Pass 2: fallback for unmatched songs (phonetic-respelled filenames, e.g.
    // W08 "Ih-Ih-In" vs spec "I-I-In"). Claim an unclaimed candidate by role, or
    // the sole remaining one. W30 sound stays unmatched (its only files are takes). ──
    for (const song of songs) {
      if (resolved.has(song)) continue;
      const free = candidates.filter((c) => !c.claimed);
      let pick = free.find((c) => c.fileRole === song.role);
      if (!pick && free.length === 1) pick = free[0];
      if (pick) { pick.claimed = true; resolved.set(song, { chosen: pick, how: 'role/remainder fallback' }); }
    }

    for (const song of songs) {
      const r = resolved.get(song);
      if (!r) {
        misses.push({ week, role: song.role, title: song.title, reason: 'no matching mp3 on disk' });
        continue;
      }
      const { chosen, how } = r;
      if (how !== 'title') {
        console.log(`  ⚑ W${pad(week)} ${song.role} "${song.title}" matched via ${how} ← ${chosen.file}`);
      }
      const filePath = path.join(weekDir, chosen.file);
      const buf = fs.readFileSync(filePath);
      const destPath = `curriculum-songs/w${pad(week)}-${song.role}.mp3`;

      if (DRY_RUN) {
        console.log(`  ○ W${pad(week)} ${song.role.padEnd(5)} "${song.title}"  ←  ${chosen.file}  →  ${destPath}  (${buf.length} bytes)`);
        totalBytes += buf.length;
        uploaded++;
        continue;
      }

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(destPath, buf, { contentType: 'audio/mpeg', upsert: true });
      if (error) {
        console.error(`  ❌ W${pad(week)} ${song.role} "${song.title}": ${error.message}`);
        failed++;
        continue;
      }
      console.log(`  ✅ W${pad(week)} ${song.role.padEnd(5)} → ${destPath}  (${buf.length} bytes)  ← ${chosen.file}`);
      uploaded++;
      totalBytes += buf.length;
    }
  }

  console.log(`\n=== ${DRY_RUN ? 'Dry-run' : 'Upload'} complete ===`);
  console.log(`✅ ${DRY_RUN ? 'Matched' : 'Uploaded'}: ${uploaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Total bytes: ${totalBytes} (${(totalBytes / 1048576).toFixed(1)} MB)`);
  console.log(`⏭️  Skipped (take-suffixed): ${skipped.length}`);
  for (const s of skipped) console.log(`     · Week ${pad(s.week)}: ${s.file} — ${s.reason}`);
  if (misses.length) {
    console.log(`⚠️  Title-match misses: ${misses.length}`);
    for (const m of misses) console.log(`     · W${pad(m.week)} ${m.role} "${m.title}" — ${m.reason}`);
  } else {
    console.log(`⚠️  Title-match misses: 0`);
  }
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
