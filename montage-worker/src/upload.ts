// Upload the finished MP4 to Supabase storage and stamp the pointer row.
//
// Report jobs stamp montree_weekly_reports.montage_path (unchanged since 301).
// Scoped jobs (migration 304) have no report — the job row's output_path is
// the pointer the Montage Studio UI reads.

import fs from 'node:fs';
import type { WorkerConfig } from './config';
import { getSupabase } from './media';
import { setReportMontagePath, setJobOutputPath } from './db';
import type { MontageScopeType } from './db';

export function montageStoragePath(
  schoolId: string,
  childId: string,
  reportId: string
): string {
  return `${schoolId}/${childId}/montages/${reportId}.mp4`;
}

/** Scoped montages live under the school, keyed by scope + scope entity. */
export function scopedMontageStoragePath(
  schoolId: string,
  scopeType: MontageScopeType,
  scopeId: string,
  jobId: string
): string {
  return `${schoolId}/montages/${scopeType}/${scopeId}/${jobId}.mp4`;
}

async function uploadBytes(
  cfg: WorkerConfig,
  storagePath: string,
  mp4Path: string
): Promise<void> {
  const sb = getSupabase(cfg);
  const bytes = fs.readFileSync(mp4Path);
  const { error } = await sb.storage
    .from(cfg.mediaBucket)
    .upload(storagePath, bytes, {
      contentType: 'video/mp4',
      upsert: true,
    });
  if (error) {
    throw new Error(`Montage upload failed: ${error.message}`);
  }
}

export async function uploadMontage(
  cfg: WorkerConfig,
  opts: {
    schoolId: string;
    childId: string;
    reportId: string;
    mp4Path: string;
  }
): Promise<string> {
  const storagePath = montageStoragePath(
    opts.schoolId,
    opts.childId,
    opts.reportId
  );
  await uploadBytes(cfg, storagePath, opts.mp4Path);
  // Stamp the report so the parent surface can find the video. Never blocks
  // report delivery — this row already exists; we only add the path.
  await setReportMontagePath(opts.reportId, storagePath);
  return storagePath;
}

export async function uploadScopedMontage(
  cfg: WorkerConfig,
  opts: {
    schoolId: string;
    scopeType: MontageScopeType;
    scopeId: string;
    jobId: string;
    mp4Path: string;
  }
): Promise<string> {
  const storagePath = scopedMontageStoragePath(
    opts.schoolId,
    opts.scopeType,
    opts.scopeId,
    opts.jobId
  );
  await uploadBytes(cfg, storagePath, opts.mp4Path);
  // No report row to stamp — the job row is the pointer.
  await setJobOutputPath(opts.jobId, storagePath);
  return storagePath;
}
