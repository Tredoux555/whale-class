// scripts/backfill-vault-media.mjs
//
// One-time backfill to make the EXISTING story-vault backlog fast on mobile —
// the fix/story-vault-mobile-jun13 deploy only sped up NEW uploads. This brings
// pre-existing media up to the same fast paths:
//
//   IMAGES  → generate a ~480px JPEG thumbnail (decrypting the original first
//             when it's AES-encrypted), store it UNENCRYPTED next to the
//             original, and set vault_files.thumbnail_path. The grid then loads
//             a few-KB thumbnail instead of a full-res decrypt per tile.
//
//   VIDEOS  → if still AES-encrypted at rest, decrypt and re-store as a PLAIN
//             object (encrypted_key='plain'), exactly like new video uploads.
//             Plain videos stream via a Range-seekable signed URL (smooth on
//             iOS); encrypted videos can't be range-decrypted, so every seek
//             re-decrypts the whole file → the jank we're fixing. Security
//             posture is unchanged from what the team already accepted for new
//             videos: vault videos are gated by admin JWT + vault token + short
//             signed URLs, not at-rest encryption.
//
// Idempotent: images that already have thumbnail_path and videos already
// encrypted_key='plain' are skipped. Per-file errors are logged and skipped —
// one bad file never aborts the run.
//
// Usage (run on the Mac, repo root, reads .env.local):
//   node scripts/backfill-vault-media.mjs              # DRY RUN (default) — reports only
//   node scripts/backfill-vault-media.mjs --commit     # actually write
//   node scripts/backfill-vault-media.mjs --commit --images-only
//   node scripts/backfill-vault-media.mjs --commit --videos-only
//
// Old encrypted objects are LEFT in place (orphaned) after a video is
// re-stored — safety over tidiness. Clean them up later once playback is
// verified.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const COMMIT = process.argv.includes('--commit');
const IMAGES_ONLY = process.argv.includes('--images-only');
const VIDEOS_ONLY = process.argv.includes('--videos-only');
const DO_IMAGES = !VIDEOS_ONLY;
const DO_VIDEOS = !IMAGES_ONLY;
const BUCKET = 'vault-secure';

// ---- env ----------------------------------------------------------------
function loadEnv() {
  const p = path.join(process.cwd(), '.env.local');
  const txt = fs.readFileSync(p, 'utf8');
  const env = {};
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}
const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const VAULT_PASSWORD = env.VAULT_PASSWORD;
if (!SUPABASE_URL || !SERVICE_KEY || !VAULT_PASSWORD) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VAULT_PASSWORD in .env.local');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---- helpers ------------------------------------------------------------
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif']);
const VIDEO_MIME = {
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mkv: 'video/x-matroska', avi: 'video/x-msvideo', '3gp': 'video/3gpp', '3g2': 'video/3gpp2',
  wmv: 'video/x-ms-wmv',
};
const ext = (name) => (name.split('.').pop() || '').toLowerCase();
const isImage = (name) => IMAGE_EXTS.has(ext(name));
const isVideo = (name) => Object.prototype.hasOwnProperty.call(VIDEO_MIME, ext(name));
const storagePath = (fileUrl) => (String(fileUrl).match(/vault\/[^?]+/) || [null])[0];

function decrypt(buf) {
  const salt = buf.subarray(0, 32);
  const iv = buf.subarray(32, 48);
  const tag = buf.subarray(48, 64);
  const ct = buf.subarray(64);
  const key = crypto.pbkdf2Sync(VAULT_PASSWORD, salt, 100000, 32, 'sha256');
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

async function downloadBuf(p) {
  const { data, error } = await supabase.storage.from(BUCKET).download(p);
  if (error || !data) throw new Error(`download failed: ${error?.message || 'no data'}`);
  return Buffer.from(await data.arrayBuffer());
}

// ---- main ---------------------------------------------------------------
const { data: rows, error } = await supabase
  .from('vault_files')
  .select('id, filename, file_url, encrypted_key, thumbnail_path')
  .is('deleted_at', null)
  .order('uploaded_at', { ascending: true });
if (error) { console.error('list error:', error.message); process.exit(1); }

const imagesNeedingThumb = rows.filter(r => isImage(r.filename) && !r.thumbnail_path);
const videosEncrypted = rows.filter(r => isVideo(r.filename) && r.encrypted_key !== 'plain');

console.log('================ VAULT BACKFILL ================');
console.log(`mode: ${COMMIT ? 'COMMIT (writing)' : 'DRY RUN (no writes)'}`);
console.log(`total vault files: ${rows.length}`);
console.log(`images: ${rows.filter(r => isImage(r.filename)).length}  (missing thumbnail: ${imagesNeedingThumb.length})`);
console.log(`videos: ${rows.filter(r => isVideo(r.filename)).length}  (still encrypted: ${videosEncrypted.length})`);
console.log('================================================\n');

const result = { thumbsDone: 0, thumbsFail: 0, vidsDone: 0, vidsFail: 0, skipped: 0 };

// IMAGES → thumbnails
if (DO_IMAGES) {
  for (const r of imagesNeedingThumb) {
    const p = storagePath(r.file_url);
    if (!p) { console.warn(`[img ${r.id}] bad file_url, skip`); result.skipped++; continue; }
    if (!COMMIT) { console.log(`[img ${r.id}] would thumbnail  ${r.filename}`); continue; }
    try {
      let buf = await downloadBuf(p);
      if (r.encrypted_key !== 'plain') buf = decrypt(buf);
      const thumb = await sharp(buf).rotate().resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
      const thumbName = `${p}.thumb.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(thumbName, thumb, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw new Error(`thumb upload: ${upErr.message}`);
      const { error: dbErr } = await supabase.from('vault_files').update({ thumbnail_path: thumbName }).eq('id', r.id);
      if (dbErr) throw new Error(`db update: ${dbErr.message}`);
      result.thumbsDone++;
      console.log(`[img ${r.id}] ✓ thumbnail  ${r.filename}`);
    } catch (e) {
      result.thumbsFail++;
      console.warn(`[img ${r.id}] ✗ ${r.filename}: ${e.message}`);
    }
  }
}

// VIDEOS → re-store plain
if (DO_VIDEOS) {
  for (const r of videosEncrypted) {
    const p = storagePath(r.file_url);
    if (!p) { console.warn(`[vid ${r.id}] bad file_url, skip`); result.skipped++; continue; }
    if (!COMMIT) { console.log(`[vid ${r.id}] would re-store plain  ${r.filename}`); continue; }
    try {
      const encBuf = await downloadBuf(p);
      const plain = decrypt(encBuf);
      const e = ext(r.filename);
      const contentType = VIDEO_MIME[e] || 'application/octet-stream';
      const newPath = `vault/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${e || 'mp4'}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, plain, { contentType, upsert: false });
      if (upErr) throw new Error(`plain upload: ${upErr.message}`);
      const { error: dbErr } = await supabase.from('vault_files')
        .update({ file_url: newPath, encrypted_key: 'plain' })
        .eq('id', r.id);
      if (dbErr) throw new Error(`db update: ${dbErr.message}`);
      result.vidsDone++;
      console.log(`[vid ${r.id}] ✓ re-stored plain  ${r.filename}  (${(plain.length/1048576).toFixed(1)}MB)  old object left at ${p}`);
    } catch (e) {
      result.vidsFail++;
      console.warn(`[vid ${r.id}] ✗ ${r.filename}: ${e.message}`);
    }
  }
}

console.log('\n================ SUMMARY ================');
if (!COMMIT) {
  console.log(`DRY RUN — would create ${imagesNeedingThumb.length} thumbnails, re-store ${videosEncrypted.length} videos.`);
  console.log('Re-run with --commit to apply.');
} else {
  console.log(`thumbnails: ${result.thumbsDone} ok, ${result.thumbsFail} failed`);
  console.log(`videos re-stored: ${result.vidsDone} ok, ${result.vidsFail} failed`);
  console.log(`skipped (bad url): ${result.skipped}`);
}
console.log('========================================');
