#!/usr/bin/env node
/**
 * scripts/curriculum/set-audio-urls.mjs — stamp songs[].audioUrl into the specs.
 *
 * For every curriculum song whose mp3 was uploaded to
 *   montree-media/curriculum-songs/wNN-<role>.mp3
 * this sets, in lib/montree/english-curriculum/spec/week-NN.json:
 *   songs[i].audioUrl =
 *     "https://montree.xyz/api/montree/media/proxy/curriculum-songs/wNN-<role>.mp3"
 * (ABSOLUTE — the QR is scanned by phones; the proxy defaults to the montree-media
 * bucket and forwards Range headers.)
 *
 * The set of songs to stamp is driven off STORAGE (list of curriculum-songs/*),
 * so a song with no uploaded mp3 (e.g. W30 sound) is left without an audioUrl.
 *
 * Edits are SURGICAL line inserts (a new "audioUrl" line right after each song's
 * "role" line, same indentation) — the spec files have mixed formatting and no
 * single serializer reproduces them, so a full re-stringify would churn 44 files.
 * Idempotent: any existing "audioUrl" lines are stripped first, then re-inserted.
 *
 * Usage:
 *   node scripts/curriculum/set-audio-urls.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const SPEC_DIR = path.join(REPO, 'lib', 'montree', 'english-curriculum', 'spec');
const BUCKET = 'montree-media';
const PREFIX = 'curriculum-songs';
const BASE = 'https://montree.xyz/api/montree/media/proxy';
const DRY_RUN = process.argv.includes('--dry-run');

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
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const pad = (n) => String(n).padStart(2, '0');

async function listUploaded() {
  const keys = new Set();
  const { data, error } = await supabase.storage.from(BUCKET).list(PREFIX, { limit: 1000 });
  if (error) { console.error('❌ storage list failed:', error.message); process.exit(1); }
  for (const o of data ?? []) {
    const m = /^w(\d{2})-(sound|word)\.mp3$/.exec(o.name);
    if (m) keys.add(`w${m[1]}-${m[2]}`);
  }
  return keys;
}

async function main() {
  const uploaded = await listUploaded();
  console.log(`Found ${uploaded.size} uploaded song object(s) in ${BUCKET}/${PREFIX}/\n`);

  let filesChanged = 0;
  let linesAdded = 0;
  const missing = [];

  for (let week = 1; week <= 58; week++) {
    const p = path.join(SPEC_DIR, `week-${pad(week)}.json`);
    if (!fs.existsSync(p)) continue;
    const spec = JSON.parse(fs.readFileSync(p, 'utf8'));
    const songs = spec.songs ?? [];

    let lines = fs.readFileSync(p, 'utf8').split('\n');
    // Strip any pre-existing audioUrl lines (idempotency).
    lines = lines.filter((l) => !/^\s*"audioUrl":/.test(l));

    // Insert per song, targeting each role line by role value in order.
    // Rebuild the array so index math stays correct across inserts.
    for (const song of songs) {
      const key = `w${pad(week)}-${song.role}`;
      if (!uploaded.has(key)) { missing.push(`W${pad(week)} ${song.role} "${song.title}" — no uploaded mp3, audioUrl left unset`); continue; }
      const url = `${BASE}/${PREFIX}/${key}.mp3`;
      const idx = lines.findIndex((l) => new RegExp(`^\\s*"role":\\s*"${song.role}",?\\s*$`).test(l));
      if (idx === -1) { console.error(`  ✗ W${pad(week)}: role line for "${song.role}" not found`); continue; }
      const indent = (lines[idx].match(/^(\s*)/) || ['', ''])[1];
      const newLine = `${indent}"audioUrl": ${JSON.stringify(url)},`;
      lines.splice(idx + 1, 0, newLine);
      linesAdded++;
    }

    const out = lines.join('\n');
    const orig = fs.readFileSync(p, 'utf8');
    if (out !== orig) {
      filesChanged++;
      if (DRY_RUN) console.log(`  ○ would patch week-${pad(week)}.json`);
      else { fs.writeFileSync(p, out); console.log(`  ✅ patched week-${pad(week)}.json`); }
    }
  }

  console.log(`\n=== ${DRY_RUN ? 'Dry-run' : 'Patch'} complete ===`);
  console.log(`Files changed: ${filesChanged}`);
  console.log(`audioUrl lines added: ${linesAdded}`);
  if (missing.length) { console.log(`Songs left without audioUrl: ${missing.length}`); missing.forEach((m) => console.log(`  · ${m}`)); }
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
