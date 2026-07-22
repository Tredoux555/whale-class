// Upload the finished MP4 to Supabase storage and stamp the report row.

import fs from 'node:fs';
import type { WorkerConfig } from './config';
import { getSupabase } from './media';
import { setReportMontagePath } from './db';

export function montageStoragePath(
  schoolId: string,
  childId: string,
  reportId: string
): string {
  return `${schoolId}/${childId}/montages/${reportId}.mp4`;
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
  const sb = getSupabase(cfg);
  const storagePath = montageStoragePath(
    opts.schoolId,
    opts.childId,
    opts.reportId
  );
  const bytes = fs.readFileSync(opts.mp4Path);
  const { error } = await sb.storage
    .from(cfg.mediaBucket)
    .upload(storagePath, bytes, {
      contentType: 'video/mp4',
      upsert: true,
    });
  if (error) {
    throw new Error(`Montage upload failed: ${error.message}`);
  }
  // Stamp the report so the parent surface can find the video. Never blocks
  // report delivery — this row already exists; we only add the path.
  await setReportMontagePath(opts.reportId, storagePath);
  return storagePath;
}
