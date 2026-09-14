// lib/story/vault/transcode.ts
//
// 🚨 WHY THIS EXISTS
// Vault videos arrive straight off an iPhone as .MOV, and modern iOS records
// HEVC (hvc1) by default. Safari decodes that; Chrome, Firefox and Android do
// NOT — the vault viewer showed a black rectangle with working audio. The
// bytes were fine, the codec was unplayable.
//
// After a direct/chunked upload lands, the server probes the object and, if it
// is not already H.264-in-MP4, re-encodes it to H.264 (yuv420p) + AAC with
// +faststart, uploads the MP4 NEXT TO the original, repoints
// vault_files.file_url/filename at it and deletes the original object.
// Everything downstream (signed-download, the viewer, delete) keys off
// file_url, so nothing else had to change.
//
// ffmpeg/ffprobe are installed system-wide in the app image (Dockerfile:
// `apt-get install ... ffmpeg`), so we shell out rather than add a binary npm
// package. `which ffmpeg` is checked once per process and a missing binary is
// reported as a clean 'failed', never a crash.
//
// 🚨 DELIBERATELY DEPENDENCY-FREE OF NEXT AND OF THE `@/` ALIAS. Only node
// builtins + @supabase/supabase-js. That is what lets
// scripts/transcode-vault-backlog.ts import this exact module from a plain
// `node --experimental-strip-types` run instead of keeping a second copy of
// the conversion logic that can drift.
//
// MEMORY: Railway boxes are small and vault videos run to hundreds of MB, so
// the source is STREAMED from a signed URL to a temp file (never buffered),
// and the encoded MP4 is handed to the uploader as a lazily-read Blob
// (fs.openAsBlob) wherever the runtime supports it. Temp files are always
// removed in `finally`.
//
// NODE RUNTIME ONLY — child_process + fs. Any route importing this must
// declare `export const runtime = 'nodejs'`.

import { spawn } from 'child_process';
import { createWriteStream, promises as fs, openAsBlob } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'vault-secure';

/** Cap the long side of the OUTPUT at 1080p height; never upscale. */
export const MAX_HEIGHT = 1080;

/**
 * How long a 'processing' claim is believed before another worker may take the
 * row. Comfortably longer than the worst realistic encode (a 535MB 1080p clip
 * is minutes, not tens of minutes) and shorter than a person's patience.
 */
export const STALE_CLAIM_MS = 20 * 60 * 1000;

/** Containers a browser will happily demux when the codec is right. */
const MP4_EXT = /\.(mp4|m4v)$/i;

/** Extensions the vault UI treats as video (mirrors dashboard/utils.ts). */
const VIDEO_EXTS = new Set([
  'mp4', 'webm', 'mov', 'avi', 'mkv', '3gp', '3g2', 'm4v', 'wmv',
]);

export function isVaultVideoFilename(filename: string): boolean {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTS.has(ext);
}

/**
 * The -vf chain for the playback MP4. PURE — exported so the geometry can be
 * unit-tested without ffmpeg.
 *
 * 🚨 EVERY LINK PROTECTS THE DISPLAY ASPECT:
 *   1. `scale=iw*sar:ih` — bake non-square pixels (phones emit SAR != 1:1)
 *      into real pixels first, so the measurements below are the true
 *      DISPLAY size, not the storage size.
 *   2. the conditional scale — ONLY shrinks, and only when the height exceeds
 *      the cap. Otherwise the native resolution is kept, merely rounded to an
 *      even number of pixels (libx264 refuses odd dimensions with yuv420p).
 *      Nothing here can stretch: there is no pad and no forced W:H.
 *   3. `setsar=1` — square pixels out, so no player has to guess.
 *   4. `format=yuv420p` — the one pixel format every browser decodes.
 *
 * Rotation is handled UPSTREAM by ffmpeg's `-autorotate`, on by default: the
 * display matrix is applied before the filter graph, so iw/ih here are already
 * upright. 🚨 Never pass `-noautorotate`.
 */
export function buildVaultVideoFilter(maxHeight: number = MAX_HEIGHT): string {
  const cap = Math.max(2, Math.floor(maxHeight / 2) * 2);
  return [
    'scale=iw*sar:ih',
    `scale='if(gt(ih,${cap}),trunc(iw*${cap}/ih/2)*2,trunc(iw/2)*2)':'if(gt(ih,${cap}),${cap},trunc(ih/2)*2)'`,
    'setsar=1',
    'format=yuv420p',
  ].join(',');
}

/** `vault/1736-abc.MOV` → `vault/1736-abc` (directory + basename, no ext). */
export function stripExtension(storagePath: string): string {
  const dot = storagePath.lastIndexOf('.');
  const slash = storagePath.lastIndexOf('/');
  return dot > slash ? storagePath.slice(0, dot) : storagePath;
}

/** `IMG_0042.MOV` → `IMG_0042.mp4`. */
export function mp4Filename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return (dot > 0 ? filename.slice(0, dot) : filename) + '.mp4';
}

export type VaultTranscodeStatus =
  | 'pending'
  | 'processing'
  | 'done'
  | 'failed'
  | 'skipped';

export interface VaultTranscodeResult {
  ok: boolean;
  fileId: number;
  /** Set when the row was rewritten to a converted MP4. */
  newPath?: string;
  newFilename?: string;
  /** Why nothing was done (already h264, not a video, already claimed, …). */
  skipped?: string;
  error?: string;
  /** What the row's transcode_status ended up as, when we set one. */
  status?: VaultTranscodeStatus;
}

interface VaultRow {
  id: number;
  filename: string;
  file_url: string | null;
  encrypted_key: string | null;
  transcode_status: string | null;
}

let cachedClient: SupabaseClient | null = null;

/**
 * Service-role client. Built here rather than imported from lib/story-db so
 * this module stays free of `next/*` and of the `@/` alias (see header).
 */
export function getVaultSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/** Run a command, resolving with exit code + captured output. */
function run(
  cmd: string,
  args: string[],
  timeoutMs = 600_000
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code: code ?? -1, stdout, stderr }); });
  });
}

/** The video codec of the first video stream, lowercased ('' when unknown). */
async function probeVideoCodec(input: string): Promise<string> {
  try {
    const { stdout } = await run('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      '-of', 'default=nw=1:nk=1',
      input,
    ], 60_000);
    return stdout.trim().split(/\s+/)[0]?.toLowerCase() || '';
  } catch {
    return '';
  }
}

/** True when the source carries at least one audio stream. */
async function hasAudioStream(file: string): Promise<boolean> {
  try {
    const { stdout } = await run('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a',
      '-show_entries', 'stream=index',
      '-of', 'csv=p=0',
      file,
    ], 30_000);
    return stdout.trim().length > 0;
  } catch {
    // ffprobe unhappy — assume audio and let ffmpeg decide.
    return true;
  }
}

/** Stream a signed URL straight to disk. Never buffers the body. */
async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`download failed: HTTP ${res.status}`);
  }
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(dest));
}

/**
 * Body for a storage upload that does not pull the whole file into the heap
 * where the runtime allows it. `fs.openAsBlob` reads lazily; older runtimes
 * fall back to a Buffer (still correct, just heavier).
 */
async function fileUploadBody(file: string, contentType: string): Promise<Blob | Buffer> {
  // 🚨 `openAsBlob` lives on node:fs, NOT on fs/promises — reaching for it on
  // the promises object silently yields undefined and quietly re-introduces the
  // whole-file heap allocation this function exists to avoid.
  if (typeof openAsBlob === 'function') {
    try {
      return await openAsBlob(file, { type: contentType });
    } catch {
      /* runtime without it (or a read error) — fall back to a Buffer */
    }
  }
  return fs.readFile(file);
}

/**
 * "That column isn't there" — i.e. migration 357/358 has not been run yet.
 *
 * 🚨 POSTGREST REPORTS THIS TWO DIFFERENT WAYS and both must be caught:
 *   42703   — Postgres itself, when the column is named in a SELECT/filter.
 *   PGRST204 — PostgREST's own schema cache, when the column is named in an
 *              INSERT/UPDATE *payload*. Checking only 42703 makes every write
 *              path look like a hard failure on a pre-migration database.
 */
export function isMissingColumnError(err: { code?: string } | null | undefined): boolean {
  return err?.code === '42703' || err?.code === 'PGRST204';
}

const isMissingColumn = isMissingColumnError;

/**
 * Convert one PLAIN vault video row to H.264/AAC MP4, in place.
 *
 * NEVER THROWS — always resolves with a VaultTranscodeResult, so a
 * fire-and-forget caller cannot produce an unhandled rejection.
 *
 * Idempotent and race-safe: the row is CLAIMED with a conditional update
 * (`transcode_status` still null/pending/failed) before any work starts, so two
 * concurrent callers cannot both encode the same file.
 */
export async function transcodeVaultVideo(
  fileId: number,
  opts: { supabase?: SupabaseClient; dryRun?: boolean } = {}
): Promise<VaultTranscodeResult> {
  const supabase = opts.supabase ?? getVaultSupabase();
  let tmpDir: string | null = null;
  let claimed = false;

  try {
    const { data, error } = await supabase
      .from('vault_files')
      .select('id, filename, file_url, encrypted_key, transcode_status')
      .eq('id', fileId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      if (isMissingColumn(error)) {
        return { ok: true, fileId, skipped: 'migration_pending' };
      }
      return { ok: false, fileId, error: error.message };
    }

    const row = data as VaultRow | null;
    if (!row) return { ok: false, fileId, error: 'vault row not found' };
    if (row.encrypted_key !== 'plain') return { ok: true, fileId, skipped: 'encrypted' };
    if (!row.file_url) return { ok: false, fileId, error: 'no file_url' };
    if (!isVaultVideoFilename(row.filename)) return { ok: true, fileId, skipped: 'not_a_video' };
    if (row.transcode_status === 'done' || row.transcode_status === 'skipped') {
      return { ok: true, fileId, skipped: `already_${row.transcode_status}` };
    }

    const match = String(row.file_url).match(/vault\/[^?]+/);
    if (!match) return { ok: false, fileId, error: 'unexpected file_url shape' };
    const originalPath = match[0];

    if (opts.dryRun) {
      return {
        ok: true,
        fileId,
        skipped: 'dry_run',
        newPath: originalPath,
        newFilename: row.filename,
      };
    }

    // ── CLAIM ───────────────────────────────────────────────────────────────
    // Conditional update: only a row still null/pending/failed — or one whose
    // 'processing' claim has gone STALE — can be taken. A second live caller
    // affects 0 rows and bails instead of racing us.
    //
    // 🚨 THE STALE CLAUSE IS LOAD-BEARING. 'processing' is written before a
    // multi-minute ffmpeg pass; a deploy, an OOM kill or a Railway restart
    // mid-encode used to strand the row in 'processing' FOREVER — the grid
    // would spin "Converting…" and poll for eternity, and neither a retry nor
    // the backlog script could ever pick it up again. A claim older than
    // STALE_CLAIM_MS is therefore assumed dead and reclaimed. A 'processing'
    // row with a NULL timestamp predates this column, so it is stale too.
    const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
    const CLAIMABLE =
      'transcode_status.is.null,transcode_status.eq.pending,transcode_status.eq.failed';
    const CLAIMABLE_WITH_STALE =
      `${CLAIMABLE},and(transcode_status.eq.processing,transcode_started_at.lt.${staleBefore})` +
      ',and(transcode_status.eq.processing,transcode_started_at.is.null)';

    let claimRows: { id: number }[] | null = null;
    let { data: claimData, error: claimErr } = await supabase
      .from('vault_files')
      .update({ transcode_status: 'processing', transcode_started_at: new Date().toISOString() })
      .eq('id', fileId)
      .is('deleted_at', null)
      .or(CLAIMABLE_WITH_STALE)
      .select('id');

    // Pre-357b database: no transcode_started_at column. Claim without it —
    // that loses only the stale-reclaim, never correctness.
    if (claimErr && isMissingColumn(claimErr)) {
      ({ data: claimData, error: claimErr } = await supabase
        .from('vault_files')
        .update({ transcode_status: 'processing' })
        .eq('id', fileId)
        .is('deleted_at', null)
        .or(CLAIMABLE)
        .select('id'));
      // Still 42703 ⇒ transcode_status itself is missing: migration 357 unrun.
      if (claimErr && isMissingColumn(claimErr)) {
        return { ok: true, fileId, skipped: 'migration_pending' };
      }
    }

    claimRows = claimData as { id: number }[] | null;
    if (claimErr) {
      return { ok: false, fileId, error: `claim failed: ${claimErr.message}` };
    }
    if (!claimRows || claimRows.length === 0) {
      return { ok: true, fileId, skipped: 'already_claimed' };
    }
    claimed = true;

    // ── PROBE (over the network, before spending a download) ────────────────
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(originalPath, 60 * 60);
    if (signErr || !signed?.signedUrl) {
      throw new Error(`createSignedUrl failed: ${signErr?.message || 'no url'}`);
    }

    const alreadyMp4 = MP4_EXT.test(originalPath) && MP4_EXT.test(row.filename);
    let codec = await probeVideoCodec(signed.signedUrl);
    if (codec === 'h264' && alreadyMp4) {
      await supabase.from('vault_files').update({ transcode_status: 'skipped' }).eq('id', fileId);
      claimed = false;
      return { ok: true, fileId, skipped: 'already_h264_mp4', status: 'skipped' };
    }

    // ── DOWNLOAD (streamed to disk) ─────────────────────────────────────────
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-transcode-'));
    const srcExt = (originalPath.split('.').pop() || 'mov').toLowerCase().slice(0, 5);
    const srcFile = path.join(tmpDir, `src-${randomUUID()}.${srcExt}`);
    const outFile = path.join(tmpDir, 'out.mp4');
    await downloadToFile(signed.signedUrl, srcFile);

    // The network probe can come back empty on a flaky range request; a local
    // probe is authoritative, and a local h264-in-mp4 still needs no encode.
    if (!codec) {
      codec = await probeVideoCodec(srcFile);
      if (codec === 'h264' && alreadyMp4) {
        await supabase.from('vault_files').update({ transcode_status: 'skipped' }).eq('id', fileId);
        claimed = false;
        return { ok: true, fileId, skipped: 'already_h264_mp4', status: 'skipped' };
      }
    }

    // ── ENCODE ──────────────────────────────────────────────────────────────
    const withAudio = await hasAudioStream(srcFile);
    const args = [
      '-y', '-i', srcFile,
      '-vf', buildVaultVideoFilter(),
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
    ];
    if (withAudio) args.push('-c:a', 'aac', '-b:a', '128k');
    else args.push('-an');
    args.push(outFile);

    const enc = await run('ffmpeg', args);
    if (enc.code !== 0) throw new Error(`ffmpeg exit ${enc.code}: ${enc.stderr.slice(-800)}`);
    const outStat = await fs.stat(outFile);
    if (!outStat.size) throw new Error('ffmpeg produced an empty file');

    // ── UPLOAD next to the original ─────────────────────────────────────────
    // 🚨 When the source was ALREADY a .mp4 (HEVC-in-mp4 is common on iOS 11+),
    // `${base}.mp4` IS the original path. Writing there would both serve stale
    // CDN bytes and make the cleanup below delete the file we just made, so we
    // take a distinct name in that case and the original is removed normally.
    const base = stripExtension(originalPath);
    const newPath = `${base}.mp4` === originalPath ? `${base}-h264.mp4` : `${base}.mp4`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, await fileUploadBody(outFile, 'video/mp4'), {
        contentType: 'video/mp4',
        upsert: true,
      });
    if (upErr) throw new Error(`mp4 upload failed: ${upErr.message}`);

    // ── RECORD ──────────────────────────────────────────────────────────────
    const newFilename = mp4Filename(row.filename);
    const { error: updErr } = await supabase
      .from('vault_files')
      .update({
        file_url: newPath,
        filename: newFilename,
        file_size: outStat.size,
        transcode_status: 'done',
      })
      .eq('id', fileId);
    if (updErr) throw new Error(`row update failed: ${updErr.message}`);
    claimed = false;

    // ── DROP THE ORIGINAL ───────────────────────────────────────────────────
    // Only after the row points at the new object, so a failure here leaves a
    // harmless orphan rather than a row pointing at nothing.
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([originalPath]);
    if (rmErr) console.error(`[VaultTranscode] ${fileId} original remove failed:`, rmErr.message);

    console.log(`[VaultTranscode] ${fileId} ${codec || 'unknown'} → h264 · ${originalPath} → ${newPath}`);
    return { ok: true, fileId, newPath, newFilename, status: 'done' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[VaultTranscode] ${fileId} failed:`, message);
    if (claimed) {
      try {
        await (opts.supabase ?? getVaultSupabase())
          .from('vault_files')
          .update({ transcode_status: 'failed' })
          .eq('id', fileId);
      } catch { /* best effort */ }
    }
    return { ok: false, fileId, error: message, status: 'failed' };
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
