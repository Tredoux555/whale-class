// Render pipeline: bundle once (cached) -> selectComposition -> renderFrames
// (jpeg image sequence) -> ffmpeg encode + mux.
//
// 🚨 We NEVER use Remotion's in-process final encode — it hung at audio-mix in
// Phase 0. An image sequence + ffmpeg is inspectable and reliable.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import { resolveFfmpeg } from './ffmpeg-bin';
import { bundle } from '@remotion/bundler';
import {
  selectComposition,
  renderFrames,
  CancelSignal,
} from '@remotion/renderer';
import { REMOTION_ENTRY, REMOTION_PUBLIC, JOB_PHOTOS_DIR } from './config';
import type { WorkerConfig } from './config';
import { COMPOSITION_ID } from '../remotion/src/Root';
import { computeTimeline } from '../remotion/src/timing';
import type { MontageProps } from '../remotion/src/timing';
import {
  AUDIO_RATE,
  concatSegments,
  mixMusic,
  type DuckInterval,
  type NormalisedClip,
} from './clips';

let bundlePromise: Promise<string> | null = null;
let activeFfmpeg: ChildProcess | null = null;

// Cache the bundle for the process lifetime (spec: bundle once).
export function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: REMOTION_ENTRY,
      // Keep the public dir as-is so photos/job + assets resolve via staticFile.
      publicDir: REMOTION_PUBLIC,
      onProgress: (p) => {
        if (p === 100) console.log('[render] bundle ready');
      },
    });
  }
  return bundlePromise;
}

// 🚨 bundle() COPIES publicDir into <bundle>/public ONCE, at bundle time, and
// the bundle above is cached for the whole process lifetime. The per-job
// photos are written into REMOTION_PUBLIC/photos/job by the pipeline AFTER
// that copy has happened, so from the SECOND job in a process onward the
// browser is served whatever job #1 left in the snapshot:
//   - a job with <= as many photos silently renders the previous job's images;
//   - a job with more photos 404s on the first index the snapshot lacks
//     ("Error loading image with src: http://localhost:3000/public/photos/job/09.jpg"
//     — that origin is Remotion's own static server for the bundle dir, not
//     the Next app).
// Re-sync photos/job into the live bundle before every render. The renderer's
// static server streams from disk per request, so a post-bundle write is
// picked up; for the first job of a process this rewrites byte-identical
// files, leaving that path's output unchanged.
function syncJobPhotosIntoBundle(bundleDir: string): void {
  const dest = path.join(bundleDir, 'public', 'photos', 'job');
  try {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    if (!fs.existsSync(JOB_PHOTOS_DIR)) return;
    const names = fs.readdirSync(JOB_PHOTOS_DIR);
    for (const name of names) {
      const from = path.join(JOB_PHOTOS_DIR, name);
      if (!fs.statSync(from).isFile()) continue;
      fs.copyFileSync(from, path.join(dest, name));
    }
    console.log(`[render] synced ${names.length} job photo(s) into bundle`);
  } catch (err) {
    // Never fail the render here — if the sync could not run, the render
    // proceeds exactly as it did before and surfaces its own error.
    console.warn('[render] job photo sync failed:', (err as Error).message);
  }
}

function chromiumOptions() {
  return { gl: 'angle' as const };
}

function browserExe(cfg: WorkerConfig): string | undefined {
  return cfg.browserExecutable || undefined;
}

// ffmpeg binary resolution moved to ./ffmpeg-bin (shared with clips.ts).
export { resolveFfmpeg } from './ffmpeg-bin';

export function killActiveFfmpeg(): void {
  if (activeFfmpeg && !activeFfmpeg.killed) {
    try {
      activeFfmpeg.kill('SIGKILL');
    } catch {
      /* ignore */
    }
  }
  activeFfmpeg = null;
}

// Detect the frame filename pattern renderFrames emitted (naming/padding vary
// by Remotion version). Returns { pattern, startNumber } for ffmpeg -i.
function detectFramePattern(framesDir: string): {
  pattern: string;
  startNumber: number;
} {
  const files = fs
    .readdirSync(framesDir)
    .filter((f) => /\.(jpe?g)$/i.test(f))
    .sort();
  if (files.length === 0) {
    throw new Error(`No frames were written to ${framesDir}`);
  }
  // Frames look like "element-0.jpeg" or "element-0000.jpeg".
  const m = files[0].match(/^(.*?)(\d+)(\.(?:jpe?g))$/i);
  if (!m) {
    throw new Error(`Unexpected frame filename: ${files[0]}`);
  }
  const prefix = m[1];
  const ext = m[3];
  // Padding width = digit-count of the numeric part in the first file.
  const width = m[2].length;
  const nums = files
    .map((f) => {
      const mm = f.match(/(\d+)(?:\.(?:jpe?g))$/i);
      return mm ? parseInt(mm[1], 10) : NaN;
    })
    .filter((n) => !Number.isNaN(n));
  const startNumber = Math.min(...nums);
  const pattern = `${prefix}%0${width}d${ext}`;
  return { pattern, startNumber };
}

export interface RenderInput {
  cfg: WorkerConfig;
  props: MontageProps;
  mp3Path: string;
  workDir: string; // per-job scratch
  concurrency: number;
  cancelSignal?: CancelSignal;
  /**
   * Migration 353 — normalised video clips to splice between the photo
   * region and the end card. Empty / omitted keeps the pre-353 path
   * (single ffmpeg encode+mux) byte-for-byte.
   */
  clips?: NormalisedClip[];
}

export interface RenderOutput {
  mp4Path: string;
  durationSec: number;
  frameCount: number;
}

export async function renderMontage(input: RenderInput): Promise<RenderOutput> {
  const { cfg, props, mp3Path, workDir, concurrency, cancelSignal } = input;
  const serveUrl = await getBundle();
  // Cached bundle + per-job public assets: refresh the copy the browser sees.
  syncJobPhotosIntoBundle(serveUrl);

  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps: props as unknown as Record<string, unknown>,
    browserExecutable: browserExe(cfg),
    chromeMode: 'chrome-for-testing',
    chromiumOptions: chromiumOptions(),
  });

  const framesDir = path.join(workDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  // 🚨 Leave one core free. On a 2-vCPU box, concurrency == cpu count starved
  // the main thread and the render stalled AFTER all frames until the timeout.
  const cpuCount = os.cpus().length || 1;
  const effectiveConcurrency = Math.max(
    1,
    Math.min(concurrency, cpuCount - 1)
  );
  console.log(
    `[render] effective concurrency ${effectiveConcurrency} (configured ${concurrency}, cpus ${cpuCount}), ${composition.durationInFrames} frames`
  );

  await renderFrames({
    composition,
    serveUrl,
    inputProps: props as unknown as Record<string, unknown>,
    outputDir: framesDir,
    imageFormat: 'jpeg',
    jpegQuality: 90,
    concurrency: effectiveConcurrency,
    browserExecutable: browserExe(cfg),
    chromeMode: 'chrome-for-testing',
    chromiumOptions: chromiumOptions(),
    cancelSignal,
    onStart: () => {
      console.log('[render] frame rendering started');
    },
    onFrameUpdate: (framesRendered) => {
      if (framesRendered % 150 === 0) {
        console.log(
          `[render] frames ${framesRendered}/${composition.durationInFrames}`
        );
      }
    },
  });

  const photoDurationSec = composition.durationInFrames / composition.fps;
  const mp4Path = path.join(workDir, 'out.mp4');
  const clips = input.clips ?? [];

  if (clips.length === 0) {
    // --- pre-353 path, untouched -----------------------------------------
    await encodeAndMux({
      framesDir,
      mp3Path,
      mp4Path,
      durationSec: photoDurationSec,
    });
    return {
      mp4Path,
      durationSec: photoDurationSec,
      frameCount: composition.durationInFrames,
    };
  }

  // --- mixed timeline: [title+photos] [clips] [end card] -----------------
  const durationSec = await assembleMixed({
    framesDir,
    workDir,
    mp3Path,
    mp4Path,
    props,
    clips,
    fps: composition.fps,
    totalFrames: composition.durationInFrames,
  });

  return {
    mp4Path,
    durationSec,
    frameCount: Math.round(durationSec * composition.fps),
  };
}

// =========================================================================
// Mixed timeline (migration 353)
// =========================================================================

interface AssembleInput {
  framesDir: string;
  workDir: string;
  mp3Path: string;
  mp4Path: string;
  props: MontageProps;
  clips: NormalisedClip[];
  fps: number;
  totalFrames: number;
}

/**
 * Encode a contiguous run of rendered frames into ONE segment that matches the
 * clip profile exactly (H.264 yuv420p + a silent AAC track), so every segment
 * handed to the concat demuxer has the same stream layout.
 */
export async function encodeFrameSegment(opts: {
  framesDir: string;
  pattern: string;
  startNumber: number;
  frameCount: number;
  fps: number;
  dest: string;
}): Promise<void> {
  const { framesDir, pattern, startNumber, frameCount, fps, dest } = opts;
  const bin = resolveFfmpeg();
  const args = [
    '-hide_banner', '-nostdin',
    '-framerate', String(fps),
    '-start_number', String(startNumber),
    '-i', path.join(framesDir, pattern),
    '-f', 'lavfi',
    '-i', `anullsrc=channel_layout=stereo:sample_rate=${AUDIO_RATE}`,
    '-frames:v', String(frameCount),
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-r', String(fps),
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
    '-y', dest,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    activeFfmpeg = child;
    let stderr = '';
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    child.on('error', (err) => {
      activeFfmpeg = null;
      reject(new Error(`ffmpeg spawn failed: ${err.message}`));
    });
    child.on('close', (code) => {
      activeFfmpeg = null;
      if (code === 0 && fs.existsSync(dest)) resolve();
      else reject(new Error(`frame segment encode exited ${code}. Tail:\n${stderr.slice(-2000)}`));
    });
  });
}

async function assembleMixed(input: AssembleInput): Promise<number> {
  const { framesDir, workDir, mp3Path, mp4Path, props, clips, fps, totalFrames } = input;
  const { pattern, startNumber } = detectFramePattern(framesDir);
  const segDir = path.join(workDir, 'segments');
  fs.mkdirSync(segDir, { recursive: true });

  // The clips are spliced at the SAME seam the end card starts on, so the
  // film reads: title → photos → clips → end card. computeTimeline is pure
  // and is the very function the composition's calculateMetadata used, so
  // this split index agrees with the frames on disk.
  const timeline = computeTimeline(props, fps);
  const splitFrames = Math.max(
    1,
    Math.min(totalFrames - 1, Math.round(timeline.endCardStartSec * fps))
  );
  const tailFrames = totalFrames - splitFrames;

  const headPath = path.join(segDir, 'a-head.mp4');
  await encodeFrameSegment({
    framesDir, pattern, startNumber,
    frameCount: splitFrames, fps, dest: headPath,
  });

  const tailPath = path.join(segDir, 'z-tail.mp4');
  await encodeFrameSegment({
    framesDir, pattern,
    startNumber: startNumber + splitFrames,
    frameCount: tailFrames, fps, dest: tailPath,
  });

  const headSec = splitFrames / fps;
  const tailSec = tailFrames / fps;

  // Ducking envelope: only clips that actually carry sound push the music down.
  const duckIntervals: DuckInterval[] = [];
  let cursor = headSec;
  for (const clip of clips) {
    if (clip.hasAudio) {
      duckIntervals.push({ startSec: cursor, endSec: cursor + clip.durationSec });
    }
    cursor += clip.durationSec;
  }
  const totalDurationSec = cursor + tailSec;

  const concatPath = path.join(segDir, 'concat.mp4');
  await concatSegments(
    [headPath, ...clips.map((c) => c.file), tailPath],
    concatPath,
    segDir
  );

  console.log(
    `[render] mixed timeline: ${headSec.toFixed(2)}s photos + ${clips.length} clip(s) ` +
      `(${(cursor - headSec).toFixed(2)}s, ${duckIntervals.length} with audio) + ` +
      `${tailSec.toFixed(2)}s end card = ${totalDurationSec.toFixed(2)}s`
  );

  await mixMusic({
    videoPath: concatPath,
    mp3Path,
    destPath: mp4Path,
    totalDurationSec,
    duckIntervals,
  });

  return totalDurationSec;
}

interface EncodeInput {
  framesDir: string;
  mp3Path: string;
  mp4Path: string;
  durationSec: number;
}

export async function encodeAndMux(input: EncodeInput): Promise<void> {
  const { framesDir, mp3Path, mp4Path, durationSec } = input;
  const { pattern, startNumber } = detectFramePattern(framesDir);
  const bin = resolveFfmpeg();

  const fadeStart = Math.max(0, durationSec - 2);
  const args = [
    '-framerate',
    '30',
    '-start_number',
    String(startNumber),
    '-i',
    path.join(framesDir, pattern),
    '-i',
    mp3Path,
    '-t',
    durationSec.toFixed(3),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-af',
    `afade=t=out:st=${fadeStart.toFixed(3)}:d=2`,
    '-movflags',
    '+faststart',
    '-shortest',
    '-y',
    mp4Path,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    activeFfmpeg = child;
    let stderr = '';
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    child.on('error', (err) => {
      activeFfmpeg = null;
      reject(new Error(`ffmpeg spawn failed: ${err.message}`));
    });
    child.on('close', (code) => {
      activeFfmpeg = null;
      if (code === 0 && fs.existsSync(mp4Path)) {
        resolve();
      } else {
        reject(
          new Error(
            `ffmpeg exited ${code}. Tail:\n${stderr.slice(-2000)}`
          )
        );
      }
    });
  });
}
