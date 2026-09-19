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
  transcode_attempts?: number | null;
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
  /** `yuv420p` is the ONE pixel format every browser decodes. iPhone/JPEG-range
   *  sources report `yuvj420p`, which Safari renders but many decoders clip. */
  pixFmt: string | null;
  /** Degrees from a Display Matrix side_data or a `rotate` stream tag. 0 = upright. */
  rotation: number;
  /** `format.tags.encoder`, e.g. `Lavf60.16.100` when ffmpeg wrote the file. */
  encoder: string | null;
  /** `format.tags.compatible_brands`, e.g. `isomiso5hlsf`. */
  compatibleBrands: string | null;
  /** True when a `moof` box was found in the head of the file → fragmented mp4. */
  fragmented: boolean;
}

/** Brands that mark a fragmented / streaming-oriented mp4 no browser <video> likes. */
const BAD_BRANDS_RE = /hlsf|dash|iso6|msdh|msix|cmfc|piff/i;

/**
 * 🚨 PASSTHROUGH IS FOR OUR OWN OUTPUT ONLY (tightened 2026-09-19, second pass).
 *
 * The first pass asked "h264 + aac + mp4?" and passed the file through. A real
 * iPhone upload answers YES to all three and STILL does not play:
 *   pix_fmt yuvj420p · a -90° Display Matrix · major_brand iso5 ·
 *   compatible_brands isomiso5hlsf (a fragmented, HLS-flavoured mp4).
 * Each of those alone is enough to produce a dead player, and none of them is
 * visible in the codec name. So the question is no longer "could this play?"
 * but "did WE write it?" — because the file our own ffmpeg pipeline emits is
 * the only one we have actually proven plays everywhere.
 *
 * PURE — no I/O, so it is unit-testable. Passthrough requires ALL of:
 *   * video h264, audio aac or absent;
 *   * container mp4: format_name in the mp4 family AND extension .mp4/.m4v
 *     (a QuickTime .mov reports the same format_name, and Android Chrome's
 *     .mov support is not reliable);
 *   * pix_fmt EXACTLY `yuv420p` — `yuvj420p` and anything 10-bit transcodes;
 *   * zero rotation — a display matrix must be BAKED IN, not left for the
 *     player to honour (most in-page players do not);
 *   * compatible_brands free of fragmented/HLS/DASH markers, and no `moof`
 *     box in the file head;
 *   * `format.tags.encoder` starting with `Lavf` — i.e. muxed by ffmpeg,
 *     which in this bucket means our own transcode wrote it.
 * ANYTHING else re-encodes. That costs one ffmpeg pass on a file that might
 * have been fine; the other direction serves a teacher a broken card.
 */
export function decideBrowserPlayable(probe: VideoProbe, storagePath = ''): boolean {
  const vc = (probe.videoCodec || '').toLowerCase();
  const fmt = (probe.formatName || '').toLowerCase();
  const ac = (probe.audioCodec || '').toLowerCase();
  const pix = (probe.pixFmt || '').toLowerCase();
  const enc = probe.encoder || '';
  const brands = probe.compatibleBrands || '';

  if (vc !== 'h264') return false;
  if (!/\bmp4\b/.test(fmt)) return false;
  if (!/\.(mp4|m4v)$/i.test(storagePath || '')) return false;
  if (ac && ac !== 'aac') return false;
  if (pix !== 'yuv420p') return false;
  if (probe.rotation !== 0) return false;
  if (probe.fragmented) return false;
  if (BAD_BRANDS_RE.test(brands)) return false;
  if (!/^Lavf/i.test(enc)) return false;
  return true;
}

/**
 * Read the first 2MB of a file and look for a `moof` box. A fragmented mp4
 * carries one early; a plain progressive mp4 never does. Cheap, and it catches
 * the HLS-flavoured files an iPhone can produce regardless of what the brands say.
 */
async function looksFragmented(file: string): Promise<boolean> {
  let fh: Awaited<ReturnType<typeof fs.open>> | null = null;
  try {
    fh = await fs.open(file, 'r');
    const buf = Buffer.alloc(2 * 1024 * 1024);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    return buf.subarray(0, bytesRead).includes('moof', 0, 'latin1');
  } catch {
    return false;
  } finally {
    await fh?.close().catch(() => {});
  }
}

/** Parse a rotation out of a stream's side_data_list / tags. Always finite. */
function readRotation(stream: Record<string, unknown> | undefined): number {
  if (!stream) return 0;
  const sideData = (stream.side_data_list as Array<Record<string, unknown>> | undefined) || [];
  for (const sd of sideData) {
    const type = String(sd.side_data_type || '').toLowerCase();
    if (!type.includes('display matrix') && !type.includes('displaymatrix')) continue;
    const r = Number(sd.rotation);
    if (Number.isFinite(r) && Math.round(r) % 360 !== 0) return Math.round(r);
  }
  const tags = (stream.tags as Record<string, unknown> | undefined) || {};
  const tagRot = Number(tags.rotate);
  if (Number.isFinite(tagRot) && Math.round(tagRot) % 360 !== 0) return Math.round(tagRot);
  return 0;
}

/**
 * Probe a LOCAL file with ffprobe. Returns null when ffprobe is missing,
 * errors, or emits something we cannot parse — the caller must treat that as
 * "not playable" and transcode.
 */
export async function probeVideo(file: string): Promise<VideoProbe | null> {
  try {
    // -show_streams carries side_data_list (the rotation matrix) and pix_fmt;
    // -show_format carries the encoder + brand tags. Both are needed now.
    const { code, stdout } = await run('ffprobe', [
      '-v', 'error',
      '-show_streams',
      '-show_format',
      '-of', 'json',
      file,
    ], 30_000);
    if (code !== 0) return null;
    const parsed = JSON.parse(stdout) as {
      streams?: Array<Record<string, unknown>>;
      format?: { format_name?: string; tags?: Record<string, unknown> };
    };
    const streams = parsed.streams || [];
    const video = streams.find((st) => st.codec_type === 'video');
    const audio = streams.find((st) => st.codec_type === 'audio');
    const fmtTags = parsed.format?.tags || {};
    return {
      videoCodec: (video?.codec_name as string) || null,
      formatName: parsed.format?.format_name || null,
      audioCodec: (audio?.codec_name as string) || null,
      pixFmt: (video?.pix_fmt as string) || null,
      rotation: readRotation(video),
      encoder: (fmtTags.encoder as string) || null,
      compatibleBrands: (fmtTags.compatible_brands as string) || null,
      fragmented: await looksFragmented(file),
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
    pixFmt: probe.pixFmt,
    rotation: probe.rotation,
    fragmented: probe.fragmented,
    encoder: probe.encoder,
    brands: probe.compatibleBrands,
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
 * Statuses a row may be claimed FROM. 'processing' is absent on purpose: it
 * means someone else holds the row (or a redeploy stranded it, which is
 * reclaimStale's job in transcode-sweep.ts), never "free to take".
 */
const CLAIMABLE: Array<string | null> = [null, 'pending', 'failed'];

/**
 * Does this database have migration 355 (transcode_started_at / _attempts /
 * _error)? Probed ONCE per process and cached — the answer only changes on a
 * deploy-with-migration.
 */
let claimColumnsPresent: boolean | null = null;
export async function hasTranscodeClaimColumns(): Promise<boolean> {
  if (claimColumnsPresent !== null) return claimColumnsPresent;
  const { error } = await getSupabase()
    .from('montree_media')
    .select('id, transcode_started_at, transcode_attempts, transcode_error')
    .limit(1);
  claimColumnsPresent = !(error && (error.code === '42703' || error.code === 'PGRST204'));
  if (!claimColumnsPresent) {
    console.warn('[Transcode] migrations/355 not applied — claiming on status alone');
  }
  return claimColumnsPresent;
}

/**
 * 🚨 THE ONE CLAIM PATH. Every caller — the upload route's fire-and-forget, the
 * 5-minute in-process sweep, the cron route, the teacher's manual "convert now"
 * button — funnels through transcodeVideoMedia(), which calls this. There is no
 * second implementation to drift.
 *
 * The claim is a SINGLE CONDITIONAL UPDATE: `... WHERE id = ? AND
 * transcode_status = <the value we just read>`. Postgres serialises that at the
 * row level, so of two callers that read the same 'pending' row exactly one
 * gets rows back; the loser sees zero and walks away. A read-then-update
 * (what this replaced) let the upload's fire-and-forget and a sweep pass both
 * download, both encode and both upload the same clip.
 */
export async function claimMediaForTranscode(
  mediaId: string,
  observedStatus: string | null,
  observedAttempts: number | null | undefined
): Promise<boolean> {
  if (!CLAIMABLE.includes(observedStatus)) return false;
  const withColumns = await hasTranscodeClaimColumns();
  const patch: Record<string, unknown> = { transcode_status: 'processing' };
  if (withColumns) {
    patch.transcode_started_at = new Date().toISOString();
    patch.transcode_attempts = (observedAttempts ?? 0) + 1;
  }
  let q = getSupabase().from('montree_media').update(patch).eq('id', mediaId);
  // `.is(null)` and `.eq(value)` are different operators — SQL NULL never
  // equals itself, so a never-started row needs the IS NULL form.
  q = observedStatus === null ? q.is('transcode_status', null) : q.eq('transcode_status', observedStatus);
  const { data, error } = await q.select('id');
  if (error) {
    console.error('[Transcode] claim failed:', mediaId, error.message);
    return false;
  }
  return (data || []).length > 0;
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
    const BASE_COLS = 'id, media_type, storage_path, thumbnail_path, playback_path, transcode_status';
    let { data, error } = await supabase
      .from('montree_media')
      .select(`${BASE_COLS}, transcode_attempts`)
      .eq('id', mediaId)
      .maybeSingle();
    // Pre-355 database: no transcode_attempts column — read without it.
    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      ({ data, error } = await supabase
        .from('montree_media')
        .select(BASE_COLS)
        .eq('id', mediaId)
        .maybeSingle());
    }

    const row = data as VideoRow | null;
    if (error || !row) return { ok: false, mediaId, error: 'media row not found' };
    if (row.media_type !== 'video') return { ok: true, mediaId, skipped: 'not_a_video' };
    // A reset row (playback_path kept, status set back to 'pending') is
    // re-encoded; the old playback file keeps serving until the new one lands.
    if (row.playback_path && row.transcode_status !== 'pending') {
      return { ok: true, mediaId, skipped: 'already_transcoded', playbackPath: row.playback_path };
    }
    if (!row.storage_path) return { ok: false, mediaId, error: 'no storage_path' };

    // 🚨 CLAIM BEFORE ANY WORK. Two callers that read the same row both reach
    // here; exactly one wins the conditional UPDATE. The loser must return
    // WITHOUT downloading or encoding — that duplicated work is the bug.
    const claimed = await claimMediaForTranscode(mediaId, row.transcode_status, row.transcode_attempts);
    if (!claimed) return { ok: true, mediaId, skipped: 'claimed_elsewhere' };

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

    let { error: updErr } = await supabase
      .from('montree_media')
      .update({ ...update, transcode_error: null })
      .eq('id', mediaId);
    // Pre-355 database: no transcode_error column — retry without it.
    if (updErr && (updErr.code === '42703' || updErr.code === 'PGRST204')) {
      ({ error: updErr } = await supabase.from('montree_media').update(update).eq('id', mediaId));
    }
    if (updErr) throw new Error(`row update failed: ${updErr.message}`);

    return { ok: true, mediaId, playbackPath, posterPath: storedPoster || undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Transcode] ${mediaId} failed:`, message);
    try {
      const sb = getSupabase();
      // 42703-safe: transcode_error arrives with migration 355. Before it is
      // run, fall back to the status-only update rather than losing the flag.
      const { error: e1 } = await sb
        .from('montree_media')
        .update({ transcode_status: 'failed', transcode_error: message.slice(0, 1000) })
        .eq('id', mediaId);
      if (e1 && (e1.code === '42703' || e1.code === 'PGRST204')) {
        await sb.from('montree_media').update({ transcode_status: 'failed' }).eq('id', mediaId);
      }
    } catch { /* best effort */ }
    return { ok: false, mediaId, error: message };
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
