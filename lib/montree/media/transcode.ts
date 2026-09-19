// lib/montree/media/transcode.ts
//
// 🚨 WHY THIS EXISTS
// CameraCapture used to record `video/webm;codecs=vp9` (Opus audio). Chrome on
// Android and desktop play that fine; iOS Safari and QuickTime cannot decode
// VP9/Opus AT ALL, so every teacher-recorded clip was a dead card on an iPhone.
// Capture now prefers H.264 MP4 where MediaRecorder supports it, but:
//   * Chrome on Android still hands us WebM in many builds, and
//   * the clips already in the bucket are WebM forever.
// So the server normalises anything that isn't already an MP4 into
// H.264 (yuv420p) + AAC with +faststart, next to the original in storage, and
// records the result in montree_media.playback_path (migration 354).
//
// It also grabs a poster JPEG (frame at ~1s) into the EXISTING thumbnail_path
// column. That does double duty: it gives the <video> element a poster on the
// feed, and it gives the photo-identification pipeline (which is image-only —
// it hands Anthropic a public image URL) something to look at, so videos stop
// sitting on "Untagged" forever.
//
// ffmpeg/ffprobe are installed system-wide in the main-app Docker image
// (see Dockerfile: `apt-get install ... ffmpeg`), so we shell out rather than
// pull in a binary npm package.
//
// NODE RUNTIME ONLY — uses child_process + fs. Any route that calls this must
// declare `export const runtime = 'nodejs'`.

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { getSupabase } from '@/lib/supabase-client';

const BUCKET = 'montree-media';
export const MAX_LONG_EDGE = 1280;

/**
 * The -vf chain for the playback MP4. PURE — exported so it can be unit-tested
 * without ffmpeg (tests/media-transcode-filter.test.ts).
 *
 * 🚨 EVERY LINK EXISTS TO PROTECT THE DISPLAY ASPECT. A phone's MediaRecorder
 * can hand us non-square pixels (SAR ≠ 1:1) and/or a rotation matrix, and the
 * old chain measured the raw `iw`/`ih` and copied the source SAR through, so
 * an anamorphic source came out with the wrong shape on screen:
 *
 *   1. `scale=iw*sar:ih` — bake any non-square pixels into real pixels FIRST,
 *      so `a` below is the true DISPLAY aspect, not the storage aspect.
 *   2. the fit-within scale — cap the long edge, derive the other side with
 *      `-2` (aspect-preserving AND even, which libx264 requires). `trunc(../2)*2`
 *      keeps the capped side even too, for an odd-width source.
 *      Never a pad, never a forced W:H — nothing here can stretch.
 *   3. `setsar=1` — square pixels in the output, so no player has to guess.
 *   4. `format=yuv420p` — the one pixel format Safari/QuickTime will decode.
 *
 * Rotation is handled UPSTREAM by ffmpeg's `-autorotate`, which is ON by
 * default: the display matrix is applied before the filter graph, so `iw`/`ih`
 * here are already the upright dimensions. 🚨 Never pass `-noautorotate`.
 */
export function buildTranscodeVideoFilter(maxLongEdge: number = MAX_LONG_EDGE): string {
  const cap = Math.max(2, Math.floor(maxLongEdge));
  return [
    'scale=iw*sar:ih',
    `scale='if(gt(a,1),trunc(min(${cap},iw)/2)*2,-2)':'if(gt(a,1),-2,trunc(min(${cap},ih)/2)*2)'`,
    'setsar=1',
    'format=yuv420p',
  ].join(',');
}

const SCALE_FILTER = buildTranscodeVideoFilter();

/**
 * Encoder settings for the playback MP4. PURE — exported for tests.
 *
 * 🚨 BITRATE IS CAPPED ON PURPOSE. CRF alone (the old `-crf 23`, no maxrate)
 * let noisy phone footage balloon to ~7.5 Mbps (an 8 s clip = 7.8 MB), which
 * stalls and stutters on classroom Wi-Fi and in China. CRF 26 + a 2.5 Mbps
 * VBV ceiling lands ~1.5–2.5 Mbps at 1280 px with no visible loss on a phone.
 * Main@4.0 decodes on every iPhone/Android in service; CFR 30 fps removes the
 * variable frame timing MediaRecorder WebM carries, which some players judder on.
 */
export function buildTranscodeEncoderArgs(withAudio: boolean): string[] {
  const args = [
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '26',
    '-maxrate', '2500k',
    '-bufsize', '5000k',
    '-profile:v', 'main',
    '-level', '4.0',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
  ];
  if (withAudio) args.push('-c:a', 'aac', '-b:a', '96k', '-ac', '2');
  else args.push('-an');
  args.push('-movflags', '+faststart');
  return args;
}

export interface TranscodeResult {
  ok: boolean;
  mediaId: string;
  playbackPath?: string;
  posterPath?: string;
  skipped?: string;
  error?: string;
}

interface VideoRow {
  id: string;
  media_type: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  playback_path: string | null;
  transcode_status: string | null;
}

/** Run a command, resolving with exit code + captured stderr (ffmpeg logs there). */
function run(cmd: string, args: string[], timeoutMs = 240_000): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let stdout = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); if (stderr.length > 20_000) stderr = stderr.slice(-20_000); });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code: code ?? -1, stderr, stdout }); });
  });
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
    // ffprobe missing or unhappy — assume audio and let ffmpeg sort it out.
    return true;
  }
}

/**
 * The ENCODED frame size of a finished file. Written to montree_media
 * width/height so every consumer (Studio stage, worker crop clamp) sizes
 * itself from the file it actually plays, not from the source's dimensions.
 */
async function probeDimensions(file: string): Promise<{ width: number; height: number } | null> {
  try {
    const { stdout } = await run('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0:s=x',
      file,
    ], 30_000);
    const m = stdout.trim().match(/^(\d+)x(\d+)/);
    if (!m) return null;
    const width = Number(m[1]);
    const height = Number(m[2]);
    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}

/** `a/b/c/clip.webm` → `a/b/c/clip` (no extension, directory preserved). */
function stripExtension(storagePath: string): string {
  const dot = storagePath.lastIndexOf('.');
  const slash = storagePath.lastIndexOf('/');
  return dot > slash ? storagePath.slice(0, dot) : storagePath;
}

/**
 * What ffprobe found in a video file. `null` fields mean "absent or unknown".
 */
export interface VideoProbe {
  videoCodec: string | null;
  formatName: string | null;
  audioCodec: string | null;
}

/**
 * 🚨 PLAYABILITY IS A CODEC QUESTION, NOT A FILENAME QUESTION (fixed 2026-09-19).
 *
 * This used to be `isIosPlayableContainer()`, a regex on the storage path:
 * `.mp4|.m4v|.mov` → "playable, skip ffmpeg". That is WRONG for the single most
 * common video a teacher uploads. An iPhone records `.mov` in **HEVC (H.265)**
 * by default, and Chrome on Android/desktop cannot decode HEVC at all — so the
 * clip was stamped `transcode_status:'done'`, served raw, and showed a dead
 * player on every non-Apple device. The extension told us nothing about the
 * bytes inside.
 *
 * PURE — no I/O, so it is unit-testable. A file counts as browser-playable ONLY
 * when all three hold:
 *   * video codec is h264 (the one codec every browser in service decodes),
 *   * the container is MP4/M4V (ffprobe reports the mp4 family as
 *     `mov,mp4,m4a,3gp,3g2,mj2` — a QuickTime `.mov` reports the SAME string,
 *     so the extension is checked too: `.mov` goes to ffmpeg even when its
 *     codecs are fine, because Android Chrome's `.mov` support is not reliable),
 *   * audio is aac, or there is no audio stream at all.
 * ANYTHING else — hevc/h265, vp9, av1, opus audio, webm, mkv — transcodes.
 */
export function decideBrowserPlayable(probe: VideoProbe, storagePath = ''): boolean {
  const vc = (probe.videoCodec || '').toLowerCase();
  const fmt = (probe.formatName || '').toLowerCase();
  const ac = (probe.audioCodec || '').toLowerCase();

  if (vc !== 'h264') return false;
  if (!/\bmp4\b/.test(fmt)) return false;
  // The mp4 family and QuickTime share one format_name, so fall back to the
  // extension to tell them apart. No extension at all → treat as unknown.
  if (!/\.(mp4|m4v)$/i.test(storagePath || '')) return false;
  if (ac && ac !== 'aac') return false;
  return true;
}

/**
 * Probe a LOCAL file with ffprobe. Returns null when ffprobe is missing,
 * errors, or emits something we cannot parse — the caller must treat that as
 * "not playable" and transcode.
 */
export async function probeVideo(file: string): Promise<VideoProbe | null> {
  try {
    const { code, stdout } = await run('ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=index,codec_type,codec_name',
      '-show_entries', 'format=format_name',
      '-of', 'json',
      file,
    ], 30_000);
    if (code !== 0) return null;
    const parsed = JSON.parse(stdout) as {
      streams?: Array<{ codec_type?: string; codec_name?: string }>;
      format?: { format_name?: string };
    };
    const streams = parsed.streams || [];
    const video = streams.find((st) => st.codec_type === 'video');
    const audio = streams.find((st) => st.codec_type === 'audio');
    return {
      videoCodec: video?.codec_name || null,
      formatName: parsed.format?.format_name || null,
      audioCodec: audio?.codec_name || null,
    };
  } catch {
    return null;
  }
}

/**
 * Probe + decide, with the decision written to the log so a Railway tail shows
 * exactly why a clip was (or was not) re-encoded.
 *
 * 🚨 FAILS TOWARDS TRANSCODE. A probe that cannot run returns false, which
 * costs one ffmpeg pass on a file that may not have needed it. The other
 * direction — defaulting to "playable" — is the bug this replaces: it serves an
 * undecodable file and the teacher just sees a broken card.
 */
export async function isBrowserPlayableFile(file: string, storagePath = ''): Promise<boolean> {
  const probe = await probeVideo(file);
  if (!probe) {
    console.log('[video-transcode] probe', {
      codec: null, format: null, audio: null, decision: 'transcode (probe failed)', storagePath,
    });
    return false;
  }
  const playable = decideBrowserPlayable(probe, storagePath);
  console.log('[video-transcode] probe', {
    codec: probe.videoCodec,
    format: probe.formatName,
    audio: probe.audioCodec,
    decision: playable ? 'passthrough' : 'transcode',
    storagePath,
  });
  return playable;
}

/**
 * Where the playback MP4 goes. Normally `<original>.mp4` next to the original.
 * 🚨 When the ORIGINAL is itself `.mp4` (MP4-first capture, or a re-encode of
 * one), that would be the original's own path and the upload would overwrite
 * the only copy of the teacher's recording — so it goes to `-playback.mp4`.
 */
export function playbackPathFor(storagePath: string): string {
  const base = stripExtension(storagePath);
  const candidate = `${base}.mp4`;
  return candidate === storagePath ? `${base}-playback.mp4` : candidate;
}

/**
 * Transcode one montree_media video row to H.264/AAC MP4 + poster JPEG.
 *
 * Idempotent-ish: a row that already has playback_path is skipped UNLESS its
 * transcode_status has been reset to 'pending' — that is the re-encode path
 * (e.g. to re-compress clips made before the bitrate cap). Never
 * throws — always resolves with a TranscodeResult so fire-and-forget callers
 * cannot produce an unhandled rejection.
 */
export async function transcodeVideoMedia(mediaId: string): Promise<TranscodeResult> {
  const supabase = getSupabase();
  let tmpDir: string | null = null;

  try {
    const { data, error } = await supabase
      .from('montree_media')
      .select('id, media_type, storage_path, thumbnail_path, playback_path, transcode_status')
      .eq('id', mediaId)
      .maybeSingle();

    const row = data as VideoRow | null;
    if (error || !row) return { ok: false, mediaId, error: 'media row not found' };
    if (row.media_type !== 'video') return { ok: true, mediaId, skipped: 'not_a_video' };
    // A reset row (playback_path kept, status set back to 'pending') is
    // re-encoded; the old playback file keeps serving until the new one lands.
    if (row.playback_path && row.transcode_status !== 'pending') {
      return { ok: true, mediaId, skipped: 'already_transcoded', playbackPath: row.playback_path };
    }
    if (!row.storage_path) return { ok: false, mediaId, error: 'no storage_path' };

    await supabase.from('montree_media').update({ transcode_status: 'processing' }).eq('id', mediaId);

    // ── 1. Download the original ────────────────────────────────────────────
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(row.storage_path);
    if (dlErr || !blob) throw new Error(`download failed: ${dlErr?.message || 'no body'}`);

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'montree-transcode-'));
    const srcExt = (row.storage_path.split('.').pop() || 'webm').toLowerCase().slice(0, 5);
    const srcFile = path.join(tmpDir, `src-${randomUUID()}.${srcExt}`);
    const outFile = path.join(tmpDir, 'out.mp4');
    const posterFile = path.join(tmpDir, 'poster.jpg');
    await fs.writeFile(srcFile, Buffer.from(await blob.arrayBuffer()));

    // ── 2. Probe, then transcode unless the file is ALREADY browser-playable ─
    // 🚨 THE PROBE IS THE GATE, NOT THE EXTENSION. An iPhone `.mov` is HEVC and
    // must be re-encoded even though its container looks fine; a real
    // H.264/AAC MP4 is passed through untouched. See decideBrowserPlayable().
    const passthrough = await isBrowserPlayableFile(srcFile, row.storage_path);

    if (!passthrough) {
      const withAudio = await hasAudioStream(srcFile);
      const args = [
        '-y', '-i', srcFile,
        '-vf', SCALE_FILTER,
        ...buildTranscodeEncoderArgs(withAudio),
        outFile,
      ];

      const enc = await run('ffmpeg', args);
      if (enc.code !== 0) throw new Error(`ffmpeg exit ${enc.code}: ${enc.stderr.slice(-800)}`);
    }

    // Everything below reads the file the app will actually play: the new MP4
    // on the transcode path, the original on the passthrough path.
    const playFile = passthrough ? srcFile : outFile;

    // ── 3. Poster frame (~1s in; fall back to frame 0 for very short clips) ──
    // 🚨 Taken from playFile with NO filter. The playback file is already the rotated,
    // scaled, square-pixel picture, so the poster is the SAME frame geometry
    // the player will show. Re-running the scale here could only ever make the
    // poster disagree with the video it sits on.
    let posterOk = false;
    for (const seek of ['1', '0']) {
      const p = await run('ffmpeg', [
        '-y', '-ss', seek, '-i', playFile,
        '-frames:v', '1', '-q:v', '3',
        posterFile,
      ], 60_000);
      if (p.code === 0) {
        const st = await fs.stat(posterFile).catch(() => null);
        if (st && st.size > 0) { posterOk = true; break; }
      }
    }

    // ── 4. Upload results next to the original ──────────────────────────────
    const base = stripExtension(row.storage_path);
    // upsert:true below → a re-encode OVERWRITES the same object, so the URL
    // is stable; getVideoPlaybackUrl() adds ?v=<updated_at> to beat the edge cache.
    // Passthrough: the original IS the playback file — nothing to upload, and
    // playback_path simply points at storage_path.
    const playbackPath = passthrough ? row.storage_path : playbackPathFor(row.storage_path);
    const posterPath = `${base}-poster.jpg`;

    if (!passthrough) {
      const mp4Bytes = await fs.readFile(outFile);
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(playbackPath, mp4Bytes, {
        contentType: 'video/mp4',
        upsert: true,
      });
      if (upErr) throw new Error(`mp4 upload failed: ${upErr.message}`);
    }

    let storedPoster: string | null = null;
    if (posterOk) {
      const posterBytes = await fs.readFile(posterFile);
      const { error: posterErr } = await supabase.storage.from(BUCKET).upload(posterPath, posterBytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (posterErr) console.error('[Transcode] poster upload failed:', posterErr.message);
      else storedPoster = posterPath;
    }

    // ── 5. Record it ────────────────────────────────────────────────────────
    // 🚨 The dimensions recorded are the OUTPUT's, not the source's: the row
    // describes the file the app actually plays (playback_path), so anything
    // that reserves a box for this clip reserves the right SHAPE.
    const outDims = await probeDimensions(playFile);
    const update: Record<string, unknown> = {
      playback_path: playbackPath,
      transcode_status: 'done',
      // Drives the ?v= cache-buster in getVideoPlaybackUrl(): a re-encode
      // written over the same object must not be masked by Cloudflare's copy.
      updated_at: new Date().toISOString(),
    };
    if (outDims) {
      update.width = outDims.width;
      update.height = outDims.height;
    }
    // Only claim thumbnail_path if nothing is there — never clobber a real thumb.
    if (storedPoster && !row.thumbnail_path) update.thumbnail_path = storedPoster;

    const { error: updErr } = await supabase.from('montree_media').update(update).eq('id', mediaId);
    if (updErr) throw new Error(`row update failed: ${updErr.message}`);

    return { ok: true, mediaId, playbackPath, posterPath: storedPoster || undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Transcode] ${mediaId} failed:`, message);
    try {
      await getSupabase().from('montree_media').update({ transcode_status: 'failed' }).eq('id', mediaId);
    } catch { /* best effort */ }
    return { ok: false, mediaId, error: message };
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
