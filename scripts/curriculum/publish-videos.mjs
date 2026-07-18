#!/usr/bin/env node
/**
 * scripts/curriculum/publish-videos.mjs — the Phase-E MUSIC VIDEO publisher.
 *
 * Mirrors upload-songs.mjs + set-audio-urls.mjs (audio) and publish-images.mjs
 * (images). For every rendered mvgen video
 *   ~/Desktop/Music Videos/WNN <Title>[ (sound|word)]/WNN <Title>[...].mp4
 * this uploads to Supabase Storage
 *   montree-media/curriculum-videos/wNN-<role>.mp4
 * and stamps, in lib/montree/english-curriculum/spec/week-NN.json:
 *   songs[i].videoUrl =
 *     "https://montree.xyz/api/montree/media/proxy/curriculum-videos/wNN-<role>.mp4"
 * (same absolute montree.xyz proxy shape as audioUrl — confirmed against
 * app/montree/library/curriculum-studio/page.tsx, which renders <video src=
 * {s.videoUrl}> once the field is set, and spec/types.ts's videoUrl doc comment).
 *
 * ── MATCHING (adapted from build-capcut-packages.py's find_mp3 title-matching,
 *    which already solved the phonetic-respelled-filename problem for this same
 *    corpus, e.g. folder "W08 Ih-Ih-In (sound)" vs spec title "I-I-In") ──
 * Folder name = "W{NN} {title}[ (sound|word)]". Strip the WNN prefix, extract an
 * optional trailing "(sound)"/"(word)" role tag (does NOT strip other parens,
 * e.g. "W01 It's A (Potato)" keeps "(Potato)" as part of the title), normalize
 * (lowercase, alnum-only) and two-pass match against spec.songs[]:
 *   Pass 1 — exact normalized title match (role tag disambiguates same-title ties)
 *   Pass 2 — fallback: an unclaimed folder by role tag, or the sole remainder
 * Folders starting with "_" (e.g. _capcut_packages, _projects, _thumbnails,
 * _stale_pre_image_fix, _tile_tool) are never treated as song candidates.
 *
 * ── QUALITY GATE ── only publishes videos whose shot_report.json summary carries
 * "timing_source": "align" (the certified word-song/sound-song alignment path).
 * Any rendered folder with no shot_report.json, or timing_source !== "align"
 * (older stale/pre-formula renders — e.g. W01, W02 word "Where Is Segina?", W11,
 * W22, W56 as of Jul 15), is SKIPPED and listed, never published. A song whose
 * gates.pass.all is explicitly false (e.g. an energy-gate failure) still PASSES
 * the timing_source gate and IS published — but is flagged in the report as
 * "⚑ energy gate failed" so a human can decide whether to re-render later.
 *
 * ── PUBLISH PHASE vs STAMP PHASE (decoupled, both idempotent) ──
 * Phase A uploads qualifying mp4s (skip re-upload if an object of the same byte
 * size already exists at the destination, unless --force; retries each upload
 * up to 3x with backoff — uploads are known to flake with transient "fetch
 * failed" errors per the Jul-13 publish notes).
 * Phase B re-lists the ACTUAL bucket contents under curriculum-videos/ (not the
 * local match set) and stamps videoUrl into every week spec whose song has a
 * corresponding wNN-role.mp4 object in storage — same pattern as
 * set-audio-urls.mjs. This means a spec is only ever touched when a real,
 * already-uploaded video exists for it; a week with no video (e.g. W01 tonight)
 * is never opened for writing. Each spec file is read fresh from disk
 * immediately before it is written (never held in memory across the run), so
 * this script is safe to run concurrently with other agents editing other
 * week specs.
 *
 * Never prompts. Exits non-zero only on total failure (no qualifying video
 * published/stamped at all when candidates existed and no partial success).
 * Individual per-video failures are logged + skipped, not fatal — this script
 * is designed to be run unattended and repeatedly by a fleet monitor as new
 * videos finish rendering (`node scripts/curriculum/publish-videos.mjs --all`).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (repo root). Bucket is public; upsert:true for idempotency.
 *
 * Usage:
 *   node scripts/curriculum/publish-videos.mjs --all            # publish everything qualifying
 *   node scripts/curriculum/publish-videos.mjs --week 9         # one week only
 *   node scripts/curriculum/publish-videos.mjs --dry-run         # match + gate report only
 *   node scripts/curriculum/publish-videos.mjs --force           # re-upload even if size matches
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const SPEC_DIR = path.join(REPO, 'lib', 'montree', 'english-curriculum', 'spec');
const VIDEOS_ROOT = path.join(os.homedir(), 'Desktop', 'Music Videos');
const BUCKET = 'montree-media';
const PREFIX = 'curriculum-videos';
const BASE = 'https://montree.xyz/api/montree/media/proxy';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
function argWeek() {
  const i = process.argv.indexOf('--week');
  if (i >= 0 && process.argv[i + 1]) { const n = parseInt(process.argv[i + 1], 10); if (n >= 1 && n <= 58) return n; }
  return null;
}
const ONLY_WEEK = argWeek();

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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Folder name (post "WNN " strip) → { core title, role tag }. Mirrors
// build-capcut-packages.py role_tag()/strip_tag() — only strips a literal
// "(sound)" or "(word)" tag, never any other parenthetical.
function parseFolderTitle(rest) {
  let s = rest;
  let folderRole = null;
  const roleMatch = s.match(/\((sound|word)\)/i);
  if (roleMatch) folderRole = roleMatch[1].toLowerCase();
  s = s.replace(/\s*\((?:sound|word)\)\s*/gi, ' ');
  return { core: s.trim(), folderRole };
}

/** Discover every week/song-candidate folder on disk, with its quality-gate state. */
function discoverCandidates() {
  const byWeek = new Map(); // week -> [{folder, dirPath, coreNorm, folderRole, mp4Path, mp4Bytes, hasShotReport, timingSource, energyFailed, claimed}]
  if (!fs.existsSync(VIDEOS_ROOT)) return byWeek;
  const entries = fs.readdirSync(VIDEOS_ROOT, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const name = ent.name;
    if (name.startsWith('_') || name.startsWith('.')) continue;
    const m = name.match(/^W(\d{2})\s+(.+)$/);
    if (!m) continue;
    const week = parseInt(m[1], 10);
    if (ONLY_WEEK && week !== ONLY_WEEK) continue;
    const { core, folderRole } = parseFolderTitle(m[2]);
    const dirPath = path.join(VIDEOS_ROOT, name);

    const files = fs.readdirSync(dirPath);
    const mp4s = files.filter((f) => f.toLowerCase().endsWith('.mp4'));
    let mp4Path = null;
    let mp4Bytes = 0;
    if (mp4s.length >= 1) {
      mp4Path = path.join(dirPath, mp4s[0]);
      try { mp4Bytes = fs.statSync(mp4Path).size; } catch { /* ignore */ }
    }

    const shotReportPath = path.join(dirPath, 'shot_report.json');
    let hasShotReport = false;
    let timingSource = null;
    let energyFailed = false;
    if (fs.existsSync(shotReportPath)) {
      hasShotReport = true;
      try {
        const report = JSON.parse(fs.readFileSync(shotReportPath, 'utf8'));
        timingSource = report?.summary?.timing_source ?? null;
        if (report?.summary?.gates?.pass?.all === false) energyFailed = true;
      } catch (e) {
        console.error(`  ⚠ ${name}: shot_report.json unparsable — ${e.message}`);
      }
    }

    const cand = {
      folder: name, dirPath, coreNorm: norm(core), folderRole,
      mp4Path, mp4Bytes, hasShotReport, timingSource, energyFailed, claimed: false,
    };
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push(cand);
  }
  return byWeek;
}

/** Two-pass title/role match, per song, against this week's candidates. */
function resolveWeekSongs(songs, candidates) {
  const resolved = new Map(); // song -> { chosen, how }
  // Pass 1: exact normalized title match (role tag disambiguates ties).
  for (const song of songs) {
    const titleNorm = norm(song.title);
    let matches = candidates.filter((c) => !c.claimed && c.coreNorm === titleNorm);
    if (matches.length > 1) {
      const byRole = matches.filter((c) => c.folderRole === song.role);
      if (byRole.length) matches = byRole;
    }
    if (matches.length) { matches[0].claimed = true; resolved.set(song, { chosen: matches[0], how: 'title' }); }
  }
  // Pass 2: fallback — unclaimed candidate by role, or the sole remainder.
  for (const song of songs) {
    if (resolved.has(song)) continue;
    const free = candidates.filter((c) => !c.claimed);
    let pick = free.find((c) => c.folderRole === song.role);
    if (!pick && free.length === 1) pick = free[0];
    if (pick) { pick.claimed = true; resolved.set(song, { chosen: pick, how: 'role/remainder fallback' }); }
  }
  return resolved;
}

async function uploadWithRetry(destPath, buf, maxAttempts = 3) {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(destPath, buf, { contentType: 'video/mp4', cacheControl: '3600', upsert: true });
    if (!error) return { ok: true };
    lastErr = error;
    console.error(`    ⚠ upload attempt ${attempt}/${maxAttempts} failed for ${destPath}: ${error.message}`);
    if (attempt < maxAttempts) await sleep(1000 * 3 ** (attempt - 1)); // 1s, 3s, 9s
  }
  return { ok: false, error: lastErr };
}

async function listExistingVideoSizes() {
  const sizes = new Map(); // 'wNN-role.mp4' -> size bytes
  const { data, error } = await supabase.storage.from(BUCKET).list(PREFIX, { limit: 1000 });
  if (error) { console.error(`❌ storage list failed: ${error.message}`); return sizes; }
  for (const o of data ?? []) {
    if (o?.name) sizes.set(o.name, o?.metadata?.size ?? null);
  }
  return sizes;
}

async function main() {
  console.log(`=== Publish curriculum videos → ${BUCKET}/${PREFIX}/ ${DRY_RUN ? '(DRY RUN) ' : ''}${ONLY_WEEK ? `[week ${ONLY_WEEK} only] ` : '[all 58 weeks] '}${FORCE ? '[force] ' : ''}===\n`);

  const byWeek = discoverCandidates();

  const toPublish = [];   // {week, role, title, folder, mp4Path, mp4Bytes, energyFailed, destName}
  const skippedStale = []; // {week, role, title, folder, reason}
  const missing = [];      // {week, role, title, reason}

  const weeks = ONLY_WEEK ? [ONLY_WEEK] : Array.from({ length: 58 }, (_, i) => i + 1);
  for (const week of weeks) {
    const specPath = path.join(SPEC_DIR, `week-${pad(week)}.json`);
    if (!fs.existsSync(specPath)) continue;
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const songs = spec.songs ?? [];
    if (!songs.length) continue;

    const candidates = byWeek.get(week) ?? [];
    const resolved = resolveWeekSongs(songs, candidates);

    for (const song of songs) {
      const r = resolved.get(song);
      if (!r) { missing.push({ week, role: song.role, title: song.title, reason: 'no video folder on disk' }); continue; }
      const { chosen, how } = r;
      if (how !== 'title') console.log(`  ⚑ W${pad(week)} ${song.role} "${song.title}" matched via ${how} ← ${chosen.folder}`);

      if (!chosen.mp4Path) { missing.push({ week, role: song.role, title: song.title, reason: `folder "${chosen.folder}" found but no mp4 file` }); continue; }
      if (!chosen.hasShotReport) { skippedStale.push({ week, role: song.role, title: song.title, folder: chosen.folder, reason: 'no shot_report.json' }); continue; }
      if (chosen.timingSource !== 'align') { skippedStale.push({ week, role: song.role, title: song.title, folder: chosen.folder, reason: `timing_source=${chosen.timingSource ?? 'null'} (not certified — stale/pre-formula render)` }); continue; }

      toPublish.push({
        week, role: song.role, title: song.title, folder: chosen.folder,
        mp4Path: chosen.mp4Path, mp4Bytes: chosen.mp4Bytes, energyFailed: chosen.energyFailed,
        destName: `w${pad(week)}-${song.role}.mp4`,
      });
    }
  }

  console.log(`\n=== Discovery ===`);
  console.log(`✅ Qualifying (timing_source=align): ${toPublish.length}`);
  console.log(`⏭️  Stale/unqualified (found but not published): ${skippedStale.length}`);
  for (const s of skippedStale) console.log(`     · W${pad(s.week)} ${s.role} "${s.title}" (${s.folder}) — ${s.reason}`);
  console.log(`❓ No video found: ${missing.length}`);
  for (const m of missing) console.log(`     · W${pad(m.week)} ${m.role} "${m.title}" — ${m.reason}`);

  if (toPublish.length === 0) {
    console.log('\nNothing to publish this run.');
    if (DRY_RUN || skippedStale.length + missing.length === 0) process.exit(0);
    // Still run the stamp phase below in case earlier uploads exist unstamped.
  }

  // ── Phase A: upload ──
  console.log(`\n=== Phase A: upload ${DRY_RUN ? '(dry run — skipped)' : ''} ===`);
  let uploaded = 0, uploadFailed = 0, skippedIdentical = 0, totalBytes = 0;
  const failures = [];
  const existingSizes = DRY_RUN ? new Map() : await listExistingVideoSizes();

  for (const item of toPublish) {
    const flag = item.energyFailed ? '  ⚑ energy gate failed (published anyway)' : '';
    if (DRY_RUN) {
      console.log(`  ○ W${pad(item.week)} ${item.role.padEnd(5)} "${item.title}"  ←  ${item.folder}  →  ${PREFIX}/${item.destName}  (${item.mp4Bytes} bytes)${flag}`);
      totalBytes += item.mp4Bytes;
      uploaded++;
      continue;
    }

    const existingSize = existingSizes.get(item.destName);
    if (!FORCE && existingSize != null && existingSize === item.mp4Bytes) {
      console.log(`  ⏩ W${pad(item.week)} ${item.role.padEnd(5)} "${item.title}" — already uploaded (${item.mp4Bytes} bytes match), skipping${flag}`);
      skippedIdentical++;
      totalBytes += item.mp4Bytes;
      continue;
    }

    let buf;
    try {
      buf = fs.readFileSync(item.mp4Path);
    } catch (e) {
      console.error(`  ❌ W${pad(item.week)} ${item.role}: read failed — ${e.message}`);
      uploadFailed++;
      failures.push({ ...item, error: `read failed: ${e.message}` });
      continue;
    }

    const destPath = `${PREFIX}/${item.destName}`;
    const result = await uploadWithRetry(destPath, buf);
    if (!result.ok) {
      console.error(`  ❌ W${pad(item.week)} ${item.role} "${item.title}": ${result.error?.message}`);
      uploadFailed++;
      failures.push({ ...item, error: result.error?.message });
      continue;
    }
    console.log(`  ✅ W${pad(item.week)} ${item.role.padEnd(5)} → ${destPath}  (${buf.length} bytes)  ← ${item.folder}${flag}`);
    uploaded++;
    totalBytes += buf.length;
  }

  console.log(`\n=== Phase A complete ===`);
  console.log(`✅ ${DRY_RUN ? 'Would upload' : 'Uploaded'}: ${uploaded}`);
  console.log(`⏩ Already uploaded (skipped, size match): ${skippedIdentical}`);
  console.log(`❌ Upload failed: ${uploadFailed}`);
  for (const f of failures) console.log(`     · W${pad(f.week)} ${f.role} "${f.title}" — ${f.error}`);
  console.log(`📦 Total bytes handled: ${totalBytes} (${(totalBytes / 1048576).toFixed(1)} MB)`);

  if (DRY_RUN) {
    console.log('\nDry run — no spec files touched.');
    process.exit(0);
  }

  // ── Phase B: stamp specs from ACTUAL bucket contents (idempotent, safe to
  // re-run; only ever touches a spec that has a real published video). ──
  console.log(`\n=== Phase B: stamp videoUrl into specs (driven by storage, not local matches) ===`);
  const published = new Map(); // 'wNN-role' -> true
  {
    const { data, error } = await supabase.storage.from(BUCKET).list(PREFIX, { limit: 1000 });
    if (error) { console.error(`❌ storage list failed: ${error.message}`); process.exit(uploaded > 0 ? 0 : 1); }
    for (const o of data ?? []) {
      const m = /^w(\d{2})-(sound|word)\.mp4$/.exec(o.name);
      if (m) published.set(`w${m[1]}-${m[2]}`, true);
    }
  }
  console.log(`Found ${published.size} published video object(s) in ${BUCKET}/${PREFIX}/`);

  let specsChanged = 0, linesAdded = 0;
  const stampMissing = [];
  for (let week = 1; week <= 58; week++) {
    const p = path.join(SPEC_DIR, `week-${pad(week)}.json`);
    if (!fs.existsSync(p)) continue;

    // Re-read fresh from disk right before touching — never hold a stale copy,
    // another agent may be editing a different week's spec concurrently.
    const orig = fs.readFileSync(p, 'utf8');
    let spec;
    try { spec = JSON.parse(orig); } catch (e) { console.error(`  ✗ W${pad(week)}: spec unparsable — ${e.message}`); continue; }
    const songs = spec.songs ?? [];
    if (!songs.length) continue;

    const anySongPublished = songs.some((s) => published.has(`w${pad(week)}-${s.role}`));
    if (!anySongPublished) continue; // never open this file for writing

    let lines = orig.split('\n');
    lines = lines.filter((l) => !/^\s*"videoUrl":/.test(l)); // idempotent strip

    for (const song of songs) {
      const key = `w${pad(week)}-${song.role}`;
      if (!published.has(key)) { stampMissing.push(`W${pad(week)} ${song.role} "${song.title}" — no published video, videoUrl left unset`); continue; }
      const url = `${BASE}/${PREFIX}/${key}.mp4`;

      // Anchor: find this song's "role" line, then look forward (within the
      // song block) for its "audioUrl" line to insert right after it; else
      // insert right after the "role" line itself.
      const roleIdx = lines.findIndex((l) => new RegExp(`^\\s*"role":\\s*"${song.role}",?\\s*$`).test(l));
      if (roleIdx === -1) { console.error(`  ✗ W${pad(week)}: role line for "${song.role}" not found`); continue; }
      let anchorIdx = roleIdx;
      for (let i = roleIdx + 1; i < Math.min(roleIdx + 8, lines.length); i++) {
        if (/^\s*"audioUrl":/.test(lines[i])) { anchorIdx = i; break; }
        if (/^\s*"role":/.test(lines[i])) break; // hit the next song block first
      }
      const indent = (lines[anchorIdx].match(/^(\s*)/) || ['', ''])[1];
      const newLine = `${indent}"videoUrl": ${JSON.stringify(url)},`;
      lines.splice(anchorIdx + 1, 0, newLine);
      linesAdded++;
    }

    const out = lines.join('\n');
    if (out !== orig) {
      specsChanged++;
      fs.writeFileSync(p, out);
      console.log(`  ✅ patched week-${pad(week)}.json`);
    }
  }

  console.log(`\n=== Phase B complete ===`);
  console.log(`Specs changed: ${specsChanged}`);
  console.log(`videoUrl lines added: ${linesAdded}`);
  if (stampMissing.length) { console.log(`Songs left without videoUrl (not yet published): ${stampMissing.length}`); stampMissing.forEach((m) => console.log(`  · ${m}`)); }

  console.log(`\n=== Run complete ===`);
  const totalFailure = uploaded === 0 && skippedIdentical === 0 && specsChanged === 0 && toPublish.length > 0;
  if (totalFailure) {
    console.error('❌ Total failure: candidates existed but nothing published or stamped.');
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
