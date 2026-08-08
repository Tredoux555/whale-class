// Upload the finished MP4 to Supabase storage.
//
// There is no report row and no second pointer to keep in sync: the job row's
// `storage_path` IS the pointer both the teacher board and the parent feed
// read, and it is stamped by markDone() in the pipeline right after this.

import fs from 'node:fs';
import type { WorkerConfig } from './config';
import { getSupabase } from './media';

/**
 * Contract §3 (child film):
 *   `class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4`
 * v1.1 addendum §2 (class film):
 *   `class/<classId>/montages/class/<weekStart>-<jobId>.mp4`
 *
 * The two can never collide: the child slot always holds a uuid, so the
 * literal segment `class` is unambiguously the class film.
 *
 * weekStart is the job's DATE column, forced to a raw 'YYYY-MM-DD' string by
 * the pg type parsers in db.ts — never a Date, so this path can't drift a day.
 * Including the jobId keeps re-runs of the same week as distinct objects
 * (the teacher can re-tap; the feed shows the latest done job).
 */
export function montageStoragePath(opts: {
  classId: string;
  /** null for a class film — the path then uses the literal `class` segment. */
  childId: string | null;
  weekStart: string;
  jobId: string;
}): string {
  const slot = opts.childId ?? 'class';
  return `class/${opts.classId}/montages/${slot}/${opts.weekStart}-${opts.jobId}.mp4`;
}

export async function uploadMontage(
  cfg: WorkerConfig,
  opts: {
    classId: string;
    childId: string | null;
    weekStart: string;
    jobId: string;
    mp4Path: string;
  }
): Promise<string> {
  const storagePath = montageStoragePath({
    classId: opts.classId,
    childId: opts.childId,
    weekStart: opts.weekStart,
    jobId: opts.jobId,
  });
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
