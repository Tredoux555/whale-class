// Video clips in a montage (migration 353).
//
// ARCHITECTURE — deliberately the SAME shape as the existing photo path:
// Remotion renders a JPEG image sequence, ffmpeg does every encode and mux.
// Clips are NOT routed through Remotion's <OffthreadVideo>: that would put
// video decoding inside headless Chrome in the Railway image, which is exactly
// the class of thing that hung the in-process audio mix in Phase 0.
//
// Instead each clip is normalised by ffmpeg to the montage's output profile
// (1080x1920 / 30fps / yuv420p / H.264 + AAC 48k stereo) so that the photo
// segments and the clips can be joined with the concat demuxer and `-c copy`.
//
// The resulting film is:  [title + photos]  [clip…]  [end card]
// — one MP4, one music bed, the clips' own audio kept under it.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { resolveFfmpeg } from './ffmpeg-bin';

/** Output profile — must match remotion/src/Root.tsx (WIDTH/HEIGHT) + FPS. */
export const OUT_WIDTH = 1080;
export const OUT_HEIGHT = 1920;
export const OUT_FPS = 30;
export const AUDIO_RATE = 48000;

/** Default per-clip cap. Overridable per job (montree_montage_jobs.max_clip_seconds). */
export const DEFAULT_MAX_CLIP_SECONDS = 8;

/**
 * Total seconds of clip allowed in one film. Clips count against the montage's
 * duration budget (timing.ts trims the photo region by exactly this much), so
 * this ceiling is what stops a film of twenty clips.
 */
export const MAX_CLIPS_TOTAL_SEC = 24;

/** Never include more than this many clips, however short they are. */
export const MAX_CLIPS = 6;

/** Music level while a clip with its own audio is playing. */
export const DUCKED_MUSIC_VOLUME = 0.25;

export interface ProbeResult {
  durationSec: number;
  hasAudio: boolean;
}

export interface NormalisedClip {
  id: string;
  file: string;
  durationSec: number;
  hasAudio: boolean;
}

export interface ClipWindow {
  startSec: number;
  durationSec: number;
}

// --- ffmpeg helpers -------------------------------------------------------

export interface FfmpegRun {
  code: number | null;
  stderr: string;
}

export function runFfmpeg(args: string[]): Promise<FfmpegRun> {
  const bin = resolveFfmpeg();
  return new Promise<FfmpegRun>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 40000) stderr = stderr.slice(-40000);
    });
    child.on('error', (err) =>
      reject(new Error(`ffmpeg spawn failed: ${err.message}`))
    );
    child.on('close', (code) => resolve({ code, stderr }));
  });
}

async function runFfmpegOrThrow(args: string[], what: string): Promise<void> {
  const { code, stderr } = await runFfmpeg(args);
  if (code !== 0) {
    throw new Error(`${what} failed (ffmpeg exit ${code}). Tail:\n${stderr.slice(-2000)}`);
  }
}

/**
 * Duration + audio-stream presence, read off ffmpeg's own banner. ffprobe is
 * NOT used: `ffmpeg-static` (the Docker fallback) ships no ffprobe binary,
 * and `ffmpeg -i` prints everything we need on stderr.
 */
export async function probeMedia(file: string): Promise<ProbeResult> {
  // `-i <file>` with no output exits 1 by design after printing the banner.
  const { stderr } = await runFfmpeg(['-hide_banner', '-i', file]);
  const dur = stderr.match(/Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/);
  const durationSec = dur
    ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3])
    : 0;
  const hasAudio = /Stream #\d+:\d+(?:\[[^\]]*\])?(?:\([^)]*\))?:\s*Audio:/.test(
    stderr
  );
  return { durationSec, hasAudio };
}

/**
 * Which window of a clip to keep.
 *   - clip <= cap                 -> the whole thing
 *   - cap < clip <= 2*cap         -> the first `cap` seconds
 *   - clip > 2*cap                -> `cap` seconds from the MIDDLE
 * (the middle of a long clip is where the action is; the start of a long
 * recording is usually the teacher framing the shot).
 */
export function clipWindow(durationSec: number, maxClipSeconds: number): ClipWindow {
  const cap = Math.max(1, maxClipSeconds);
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return { startSec: 0, durationSec: cap };
  }
  if (durationSec <= cap) return { startSec: 0, durationSec };
  if (durationSec > cap * 2) {
    return { startSec: Math.max(0, (durationSec - cap) / 2), durationSec: cap };
  }
  return { startSec: 0, durationSec: cap };
}

/**
 * Normalise ONE clip to the montage output profile. Always ends up with an
 * audio stream (silence is synthesised when the source has none) so every
 * segment fed to the concat demuxer has an identical stream layout.
 */
export async function normaliseClip(opts: {
  src: string;
  dest: string;
  window: ClipWindow;
  hasAudio: boolean;
}): Promise<void> {
  const { src, dest, window, hasAudio } = opts;
  const vf = [
    `scale=${OUT_WIDTH}:${OUT_HEIGHT}:force_original_aspect_ratio=increase`,
    `crop=${OUT_WIDTH}:${OUT_HEIGHT}`,
    `fps=${OUT_FPS}`,
    'setsar=1',
    'format=yuv420p',
  ].join(',');

  const args: string[] = ['-hide_banner', '-nostdin'];
  // -ss BEFORE -i is the fast, keyframe-accurate seek; -t after it bounds the
  // window. Both are re-encoded below so the cut lands frame-accurately.
  if (window.startSec > 0) args.push('-ss', window.startSec.toFixed(3));
  args.push('-i', src);
  if (!hasAudio) {
    args.push(
      '-f', 'lavfi',
      '-i', `anullsrc=channel_layout=stereo:sample_rate=${AUDIO_RATE}`
    );
  }
  args.push(
    '-t', window.durationSec.toFixed(3),
    '-map', '0:v:0',
    '-map', hasAudio ? '0:a:0' : '1:a:0',
    '-vf', vf,
    '-r', String(OUT_FPS),
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.0',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-ar', String(AUDIO_RATE),
    '-ac', '2',
    '-shortest',
    '-y', dest
  );
  await runFfmpegOrThrow(args, `clip normalise (${path.basename(src)})`);
}

export interface PrepareClipsInput {
  clips: { id: string; file: string; durationSeconds: number | null }[];
  workDir: string;
  maxClipSeconds: number;
  /** Total clip seconds allowed in this film. */
  budgetSec?: number;
}

/**
 * Probe → trim → normalise every clip, honouring the per-clip cap and the
 * whole-film clip budget. Clips that fail to normalise are dropped with a
 * logged reason rather than failing the job — a montage without one clip is
 * better than no montage.
 */
export async function prepareClips(
  input: PrepareClipsInput
): Promise<{ clips: NormalisedClip[]; skipped: { id: string; reason: string }[] }> {
  const budget = input.budgetSec ?? MAX_CLIPS_TOTAL_SEC;
  const outDir = path.join(input.workDir, 'clips-norm');
  fs.mkdirSync(outDir, { recursive: true });

  const out: NormalisedClip[] = [];
  const skipped: { id: string; reason: string }[] = [];
  let used = 0;

  for (const clip of input.clips) {
    if (out.length >= MAX_CLIPS) {
      skipped.push({ id: clip.id, reason: `clip limit (${MAX_CLIPS}) reached` });
      continue;
    }
    const remaining = budget - used;
    if (remaining < 1.5) {
      skipped.push({ id: clip.id, reason: 'clip budget exhausted' });
      continue;
    }
    try {
      const probe = await probeMedia(clip.file);
      const sourceDur =
        probe.durationSec > 0 ? probe.durationSec : clip.durationSeconds ?? 0;
      const cap = Math.min(input.maxClipSeconds, remaining);
      const window = clipWindow(sourceDur, cap);
      const dest = path.join(outDir, `${clip.id}.mp4`);
      await normaliseClip({
        src: clip.file,
        dest,
        window,
        hasAudio: probe.hasAudio,
      });
      // Trust the ENCODED file's duration, not the requested window — the
      // ducking envelope below is built from these numbers.
      const after = await probeMedia(dest);
      const durationSec = after.durationSec > 0 ? after.durationSec : window.durationSec;
      used += durationSec;
      out.push({ id: clip.id, file: dest, durationSec, hasAudio: probe.hasAudio });
    } catch (err) {
      const reason = (err as Error).message;
      console.warn(`[clips] dropping ${clip.id}: ${reason}`);
      skipped.push({ id: clip.id, reason });
    }
  }
  return { clips: out, skipped };
}

// --- concat ---------------------------------------------------------------

function concatListFile(dir: string, files: string[]): string {
  const listPath = path.join(dir, 'concat.txt');
  const body = files
    .map((f) => `file '${f.replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(listPath, `${body}\n`);
  return listPath;
}

/**
 * Join identically-encoded segments. Tries stream copy first (instant, lossless)
 * and falls back to a re-encode if the demuxer refuses the mix.
 */
export async function concatSegments(
  segments: string[],
  dest: string,
  workDir: string
): Promise<void> {
  const list = concatListFile(workDir, segments);
  const base = ['-hide_banner', '-nostdin', '-f', 'concat', '-safe', '0', '-i', list];
  const copyRun = await runFfmpeg([
    ...base,
    '-c', 'copy',
    '-movflags', '+faststart',
    '-y', dest,
  ]);
  if (copyRun.code === 0 && fs.existsSync(dest)) return;
  console.warn('[clips] concat -c copy failed, re-encoding. Tail:\n' + copyRun.stderr.slice(-1200));
  await runFfmpegOrThrow(
    [
      ...base,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-ar', String(AUDIO_RATE), '-ac', '2',
      '-movflags', '+faststart',
      '-y', dest,
    ],
    'concat re-encode'
  );
}

// --- music bed with ducking ----------------------------------------------

export interface DuckInterval {
  startSec: number;
  endSec: number;
}

/**
 * ffmpeg `volume` expression for the music bed: full volume everywhere except
 * inside a clip that has its OWN audio, where it drops to DUCKED_MUSIC_VOLUME.
 * A clip with no audio stream leaves the music at full volume — exactly as if
 * it were a photo.
 */
export function duckExpression(intervals: DuckInterval[]): string | null {
  const usable = intervals.filter((i) => i.endSec > i.startSec);
  if (usable.length === 0) return null;
  const tests = usable
    .map((i) => `between(t,${i.startSec.toFixed(3)},${i.endSec.toFixed(3)})`)
    .join('+');
  return `if(gt(${tests},0),${DUCKED_MUSIC_VOLUME},1)`;
}

export interface MixInput {
  videoPath: string;   // concatenated montage (video + per-clip audio)
  mp3Path: string;
  destPath: string;
  totalDurationSec: number;
  duckIntervals: DuckInterval[];
}

/**
 * Lay the music under the finished picture. The concat's own audio track
 * (clip sound, silence over the photo segments) is mixed at full level with
 * the music, which ducks under every clip that actually has sound.
 */
export async function mixMusic(input: MixInput): Promise<void> {
  const { videoPath, mp3Path, destPath, totalDurationSec, duckIntervals } = input;
  const fadeStart = Math.max(0, totalDurationSec - 2);
  const expr = duckExpression(duckIntervals);
  const musicChain = [
    expr ? `volume='${expr}':eval=frame` : null,
    `afade=t=out:st=${fadeStart.toFixed(3)}:d=2`,
  ]
    .filter(Boolean)
    .join(',');

  const filter =
    `[1:a]${musicChain}[mus];` +
    `[0:a][mus]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`;

  await runFfmpegOrThrow(
    [
      '-hide_banner', '-nostdin',
      '-i', videoPath,
      '-i', mp3Path,
      '-filter_complex', filter,
      '-map', '0:v:0',
      '-map', '[aout]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '160k',
      '-ar', String(AUDIO_RATE),
      '-ac', '2',
      '-t', totalDurationSec.toFixed(3),
      '-movflags', '+faststart',
      '-y', destPath,
    ],
    'music mix'
  );
}
