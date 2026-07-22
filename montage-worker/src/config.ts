// Environment parsing for the montage render worker. Fail fast on the one
// truly-required var (DATABASE_URL); everything else has a sane default or
// degrades gracefully.

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
  mainAppUrl: string;
  workerSecret: string;
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
    supabaseUrl: opt('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseServiceKey: opt('SUPABASE_SERVICE_ROLE_KEY'),
    mainAppUrl: opt('MAIN_APP_URL', 'https://montree.xyz'),
    workerSecret: opt('MONTAGE_WORKER_SECRET'),
    browserExecutable: opt('REMOTION_BROWSER_EXECUTABLE'),
    pollIntervalMs: num('POLL_INTERVAL_MS', 15000),
    renderConcurrency: num('RENDER_CONCURRENCY', 2),
    mediaBucket: opt('MONTAGE_MEDIA_BUCKET', 'montree-media'),
    jobTimeoutMs: num('JOB_TIMEOUT_MS', 20 * 60 * 1000),
    maxAttempts: num('MONTAGE_MAX_ATTEMPTS', 3),
    staleMinutes: num('MONTAGE_STALE_MINUTES', 25),
  };
}
