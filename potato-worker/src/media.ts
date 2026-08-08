// Fetch + download the job's photos from Supabase storage (bucket
// `potato-snaps`, private — the service-role key is what makes this readable).
//
// Trimmed from montree-worker/src/media.ts: Potato Snaps has no
// `parent_visible` flag, so the assertAllParentVisible belt-and-braces gate
// has no analogue here. Curation happens BEFORE the montage: a teacher deletes
// a bad shot in the photo review screen, and it is gone from tp_photos, so it
// can never reach a film.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { WorkerConfig } from './config';
import { getEligiblePhotos, EligiblePhoto, MontageJob } from './db';

export interface DownloadedPhoto {
  id: string;
  storagePath: string;
  capturedAt: string | null;
  buffer: Buffer;
}

let supabase: SupabaseClient | null = null;

export function getSupabase(cfg: WorkerConfig): SupabaseClient {
  if (!supabase) {
    if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) {
      throw new Error(
        'Supabase not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required)'
      );
    }
    supabase = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

/**
 * The one and only photo source: the job's explicit media_ids, re-verified
 * against tp_photos + the job's own class.
 */
export async function fetchEligiblePhotos(
  job: MontageJob
): Promise<EligiblePhoto[]> {
  return getEligiblePhotos(job.media_ids ?? [], job.class_id);
}

export async function downloadPhotos(
  cfg: WorkerConfig,
  rows: EligiblePhoto[]
): Promise<DownloadedPhoto[]> {
  const sb = getSupabase(cfg);
  const out: DownloadedPhoto[] = [];
  for (const row of rows) {
    const { data, error } = await sb.storage
      .from(cfg.mediaBucket)
      .download(row.storage_path);
    if (error || !data) {
      console.warn(
        `[media] skipping ${row.id} — download failed: ${error?.message ?? 'no data'}`
      );
      continue;
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    out.push({
      id: row.id,
      storagePath: row.storage_path,
      capturedAt: row.captured_at,
      buffer,
    });
  }
  return out;
}

/**
 * v1.1: fetch a single object (a school logo or class emblem) from the bucket.
 *
 * Returns null instead of throwing on ANY failure — a missing or unreadable
 * branding image must degrade to the initials fallback, never fail a film that
 * is otherwise perfectly renderable.
 */
export async function downloadObject(
  cfg: WorkerConfig,
  storagePath: string
): Promise<Buffer | null> {
  try {
    const sb = getSupabase(cfg);
    const { data, error } = await sb.storage
      .from(cfg.mediaBucket)
      .download(storagePath);
    if (error || !data) {
      console.warn(
        `[media] branding asset ${storagePath} unavailable: ${error?.message ?? 'no data'}`
      );
      return null;
    }
    return Buffer.from(await data.arrayBuffer());
  } catch (err) {
    console.warn(
      `[media] branding asset ${storagePath} failed: ${(err as Error).message}`
    );
    return null;
  }
}
