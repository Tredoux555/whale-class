// Download eligible photos from Supabase storage.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { WorkerConfig } from './config';
import { getEligiblePhotos, EligiblePhoto } from './db';

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

export async function fetchEligiblePhotos(
  reportId: string
): Promise<EligiblePhoto[]> {
  const rows = await getEligiblePhotos(reportId);
  // Belt and braces: the query filters parent_visible=true, but re-assert here
  // so no downstream refactor can ever leak a non-parent-visible photo.
  for (const r of rows) {
    if (r.parent_visible !== true) {
      throw new Error(
        `SAFETY: photo ${r.id} is not parent_visible but reached the montage query`
      );
    }
  }
  return rows;
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
