// Download eligible montage media from Supabase storage.
//
// Migration 353: a montage is a MIXED timeline. Photos come back as buffers
// (sharp hygiene reads them in-memory, unchanged); video clips are written to
// disk as files, because ffmpeg is what trims and normalises them.

import fs from 'node:fs';
import path from 'node:path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { WorkerConfig } from './config';
import {
  getEligiblePhotos,
  getScopedEligiblePhotos,
  getExplicitEligiblePhotos,
  isVideoRow,
  jobIncludesVideos,
  EligiblePhoto,
  MontageJob,
} from './db';

export interface DownloadedPhoto {
  id: string;
  storagePath: string;
  capturedAt: string | null;
  /** Discriminator carried through the whole pipeline. */
  kind: 'photo';
  buffer: Buffer;
}

export interface DownloadedClip {
  id: string;
  storagePath: string;
  capturedAt: string | null;
  kind: 'clip';
  /** Local path of the downloaded H.264/AAC MP4 (playback_path copy). */
  file: string;
  /** Source duration as recorded on the row, when known. */
  durationSeconds: number | null;
}

export type DownloadedItem = DownloadedPhoto | DownloadedClip;

export interface SkippedItem {
  id: string;
  reason: string;
}

export interface DownloadResult {
  photos: DownloadedPhoto[];
  clips: DownloadedClip[];
  skipped: SkippedItem[];
}

let supabase: SupabaseClient | null = null;

export function getSupabase(cfg: WorkerConfig): SupabaseClient {
  if (!supabase) {
    if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) {
      throw new Error(
        'Supabase not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required)'
      );
    }
    supabase = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

// Belt and braces: every query already filters parent_visible=true, but this
// re-assert means no downstream refactor can ever leak a non-parent-visible
// photo into a rendered film.
function assertAllParentVisible(rows: EligiblePhoto[]): EligiblePhoto[] {
  for (const r of rows) {
    if (r.parent_visible !== true) {
      throw new Error(
        `SAFETY: photo ${r.id} is not parent_visible but reached the montage query`
      );
    }
  }
  return rows;
}

export async function fetchEligiblePhotos(
  reportId: string,
  includeVideos = true
): Promise<EligiblePhoto[]> {
  return assertAllParentVisible(await getEligiblePhotos(reportId, includeVideos));
}

// Scoped (classroom / child / event) montages — migration 304.
//
// Migration 305: a Montage Tracker job (job.require_confirmed === false) skips
// the teacher_confirmed filter inside getScopedEligiblePhotos — it is built
// from every tagged photo. assertAllParentVisible stays UNCONDITIONAL: the
// parent-visibility gate applies to every job, always.
export async function fetchScopedEligiblePhotos(
  job: MontageJob
): Promise<EligiblePhoto[]> {
  return assertAllParentVisible(await getScopedEligiblePhotos(job));
}

// Explicit teacher-curated selection — migration 306 (Montage Manager).
//
// The photo set came from the picker grid, but the safety gate is re-applied
// in getExplicitEligiblePhotos (school + photo + parent_visible) and then
// asserted here for the third and final time. assertAllParentVisible is
// UNCONDITIONAL on every path, this one included.
export async function fetchExplicitEligiblePhotos(
  job: MontageJob
): Promise<EligiblePhoto[]> {
  return assertAllParentVisible(
    await getExplicitEligiblePhotos(
      job.media_ids ?? [],
      job.school_id,
      jobIncludesVideos(job)
    )
  );
}

// --- download: photos into memory, clips onto disk -----------------------
//
// 🚨 A video row is only usable when it has a transcoded playback_path (an
// H.264/AAC MP4 — migrations/354). An untranscoded row (still webm,
// transcode pending/failed) is SKIPPED with a logged reason rather than being
// handed to ffmpeg, so a montage never stalls on a VP9/Opus source.
export async function downloadMontageMedia(
  cfg: WorkerConfig,
  rows: EligiblePhoto[],
  clipDir: string
): Promise<DownloadResult> {
  const sb = getSupabase(cfg);
  const photos: DownloadedPhoto[] = [];
  const clips: DownloadedClip[] = [];
  const skipped: SkippedItem[] = [];

  fs.mkdirSync(clipDir, { recursive: true });

  for (const row of rows) {
    if (row.parent_visible !== true) {
      throw new Error(`SAFETY: refusing to download non-parent-visible ${row.id}`);
    }

    const video = isVideoRow(row);
    if (video && !row.playback_path) {
      skipped.push({
        id: row.id,
        reason: `video has no playback_path — not yet transcoded`,
      });
      continue;
    }

    const objectPath = video ? (row.playback_path as string) : row.storage_path;
    const { data, error } = await sb.storage
      .from(cfg.mediaBucket)
      .download(objectPath);
    if (error || !data) {
      const reason = `download failed: ${error?.message ?? 'no data'}`;
      console.warn(`[media] skipping ${row.id} — ${reason}`);
      skipped.push({ id: row.id, reason });
      continue;
    }
    const buffer = Buffer.from(await data.arrayBuffer());

    if (video) {
      const file = path.join(clipDir, `${row.id}.mp4`);
      fs.writeFileSync(file, buffer);
      clips.push({
        id: row.id,
        storagePath: objectPath,
        capturedAt: row.captured_at,
        kind: 'clip',
        file,
        durationSeconds:
          row.duration_seconds == null ? null : Number(row.duration_seconds),
      });
    } else {
      photos.push({
        id: row.id,
        storagePath: objectPath,
        capturedAt: row.captured_at,
        kind: 'photo',
        buffer,
      });
    }
  }

  for (const s of skipped) {
    console.log(`[media] skip ${s.id}: ${s.reason}`);
  }
  return { photos, clips, skipped };
}

