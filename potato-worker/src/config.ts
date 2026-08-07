// Environment parsing for the Potato Snaps render worker. Fail fast on the one
// truly-required var (DATABASE_URL); everything else has a sane default or
// degrades gracefully.
//
// Trimmed from montree-worker/src/config.ts: no MAIN_APP_URL / worker secret —
// this worker has NO completion callback. It stamps tp_montage_jobs directly.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const WORKER_ROOT = path.resolve(__dirname, '..');
export const REMOTION_ROOT = path.join(WORKER_ROOT, 'remotion');
export const REMOTION_ENTRY = path.join(REMOTION_ROOT, 'src', 'index.ts');
export const REMOTION_PUBLIC = path.join(REMOTION_ROOT, 'public');
export const JOB_PHOTOS_DIR = path.join(REMOTION_PUBLIC, 'photos', 'job');
export const MUSIC_DIR = path.join(WORKER_ROOT, 'assets', 'music');

function req(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v.trim();
}

function opt(name: string, fallback = ''): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v || !v.trim()) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export interface WorkerConfig {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  browserExecutable: string;
  pollIntervalMs: number;
  renderConcurrency: number;
  mediaBucket: string;
  jobTimeoutMs: number;
  maxAttempts: number;
  staleMinutes: number;
}

export function loadConfig(): WorkerConfig {
  return {
    databaseUrl: req('DATABASE_URL'),
    // SUPABASE_URL is the documented name for this service; the
    // NEXT_PUBLIC_ alias is accepted so a variable copied straight off the
    // montage-worker service still works.
    supabaseUrl: opt('SUPABASE_URL', opt('NEXT_PUBLIC_SUPABASE_URL')),
    supabaseServiceKey: opt('SUPABASE_SERVICE_ROLE_KEY'),
    browserExecutable: opt('REMOTION_BROWSER_EXECUTABLE'),
    pollIntervalMs: num('POLL_INTERVAL_MS', 15000),
    renderConcurrency: num('RENDER_CONCURRENCY', 2),
    mediaBucket: opt('POTATO_MEDIA_BUCKET', 'potato-snaps'),
    jobTimeoutMs: num('JOB_TIMEOUT_MS', 20 * 60 * 1000),
    maxAttempts: num('POTATO_MAX_ATTEMPTS', 3),
    staleMinutes: num('POTATO_STALE_MINUTES', 25),
  };
}
