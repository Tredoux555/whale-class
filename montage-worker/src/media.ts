// Download eligible photos from Supabase storage.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { WorkerConfig } from './config';
import {
  getEligiblePhotos,
  getScopedEligiblePhotos,
  EligiblePhoto,
  MontageJob,
} from './db';

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
  reportId: string
): Promise<EligiblePhoto[]> {
  return assertAllParentVisible(await getEligiblePhotos(reportId));
}

// Scoped (classroom / child / event) montages — migration 304.
export async function fetchScopedEligiblePhotos(
  job: MontageJob
): Promise<EligiblePhoto[]> {
  return assertAllParentVisible(await getScopedEligiblePhotos(job));
}

export async function downloadPhotos(
  cfg: WorkerConfig,
  rows: EligiblePhoto[]
): Promise<DownloadedPhoto[]> {
  const sb = getSupabase(cfg);
  const out: DownloadedPhoto[] = [];
  for (const row of rows) {
    if (row.parent_visible !== true) {
      throw new Error(`SAFETY: refusing to download non-parent-visible ${row.id}`);
    }
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
