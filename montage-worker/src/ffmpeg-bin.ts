// Resolving the ffmpeg binary lives in its own module so both render.ts (the
// photo path) and clips.ts (the video path) can use it without an import cycle.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

let ffmpegBin: string | null = null;

/** System ffmpeg on PATH, else the bundled ffmpeg-static fallback. */
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
