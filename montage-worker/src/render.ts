// Render pipeline: bundle once (cached) -> selectComposition -> renderFrames
// (jpeg image sequence) -> ffmpeg encode + mux.
//
// 🚨 We NEVER use Remotion's in-process final encode — it hung at audio-mix in
// Phase 0. An image sequence + ffmpeg is inspectable and reliable.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { bundle } from '@remotion/bundler';
import {
  selectComposition,
  renderFrames,
  CancelSignal,
} from '@remotion/renderer';
import { REMOTION_ENTRY, REMOTION_PUBLIC } from './config';
import type { WorkerConfig } from './config';
import { COMPOSITION_ID } from '../remotion/src/Root';
import type { MontageProps } from '../remotion/src/timing';

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

function chromiumOptions() {
  return { gl: 'angle' as const };
}

function browserExe(cfg: WorkerConfig): string | undefined {
  return cfg.browserExecutable || undefined;
}

// Resolve an ffmpeg binary: system ffmpeg on PATH, else ffmpeg-static.
let ffmpegBin: string | null = null;
export function resolveFfmpeg(): string {
  if (ffmpegBin) return ffmpegBin;
  const sys = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (!sys.error && sys.status === 0) {
    ffmpegBin = 'ffmpeg';
    return ffmpegBin;
  }
  // Fallback (also de-risks the Docker image).
  const staticPath = requireFfmpegStatic();
  if (!staticPath) {
    throw new Error('No ffmpeg found on PATH and ffmpeg-static unavailable');
  }
  ffmpegBin = staticPath;
  return ffmpegBin;
}

function requireFfmpegStatic(): string | null {
  try {
    // Lazy — only loaded when system ffmpeg is absent.
    const require = createRequire(import.meta.url);
    const mod = require('ffmpeg-static');
    return typeof mod === 'string' ? mod : mod?.default ?? null;
  } catch {
    return null;
  }
}

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
}

export interface RenderOutput {
  mp4Path: string;
  durationSec: number;
  frameCount: number;
}

export async function renderMontage(input: RenderInput): Promise<RenderOutput> {
  const { cfg, props, mp3Path, workDir, concurrency, cancelSignal } = input;
  const serveUrl = await getBundle();

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

  const durationSec = composition.durationInFrames / composition.fps;
  const mp4Path = path.join(workDir, 'out.mp4');
  await encodeAndMux({ framesDir, mp3Path, mp4Path, durationSec });

  return {
    mp4Path,
    durationSec,
    frameCount: composition.durationInFrames,
  };
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
