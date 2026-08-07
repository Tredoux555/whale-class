// Upload the finished MP4 to Supabase storage.
//
// There is no report row and no second pointer to keep in sync: the job row's
// `storage_path` IS the pointer both the teacher board and the parent feed
// read, and it is stamped by markDone() in the pipeline right after this.

import fs from 'node:fs';
import type { WorkerConfig } from './config';
import { getSupabase } from './media';

/**
 * Contract §3: `class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4`
 *
 * weekStart is the job's DATE column, forced to a raw 'YYYY-MM-DD' string by
 * the pg type parsers in db.ts — never a Date, so this path can't drift a day.
 * Including the jobId keeps re-runs of the same week as distinct objects
 * (the teacher can re-tap; the parent feed shows the latest done job).
 */
export function montageStoragePath(
  classId: string,
  childId: string,
  weekStart: string,
  jobId: string
): string {
  return `class/${classId}/montages/${childId}/${weekStart}-${jobId}.mp4`;
}

export async function uploadMontage(
  cfg: WorkerConfig,
  opts: {
    classId: string;
    childId: string;
    weekStart: string;
    jobId: string;
    mp4Path: string;
  }
): Promise<string> {
  const storagePath = montageStoragePath(
    opts.classId,
    opts.childId,
    opts.weekStart,
    opts.jobId
  );
  const sb = getSupabase(cfg);
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
  return storagePath;
}
