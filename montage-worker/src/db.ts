// All SQL lives here. Column names for the eligible-photo query are kept in
// ONE place so the Mac-side E2E can re-verify them against production once.

import pg from 'pg';
import type { WorkerConfig } from './config';

const { Pool } = pg;

// 🚨 node-postgres decodes date/timestamp columns into native JS Date objects
// by default. Every date column in this worker is typed + used as a string
// (padEnd, Date.parse, new Date(...)). Force ONE consistent representation —
// the raw ISO-ish text — at the driver boundary so no column is ever a Date.
//   1082 = date, 1114 = timestamp (no tz), 1184 = timestamptz
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1114, (v) => v);
pg.types.setTypeParser(1184, (v) => v);

export interface MontageJob {
  id: string;
  report_id: string;
  child_id: string;
  school_id: string;
  classroom_id: string | null;
  status: string;
  attempts: number;
  error: string | null;
  output_path: string | null;
  duration_seconds: number | null;
  is_staging: boolean;
  next_attempt_at: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface EligiblePhoto {
  id: string;
  storage_path: string;
  captured_at: string | null;
  parent_visible: boolean;
}

let pool: pg.Pool | null = null;

export function initPool(cfg: WorkerConfig): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: cfg.databaseUrl,
      max: 4,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
    pool.on('error', (err) => {
      console.error('[db] idle client error', err.message);
    });
  }
  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) throw new Error('DB pool not initialised — call initPool first');
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// --- claim: one queued job, skip-locked, atomically flipped to rendering ---
export async function claimNextJob(): Promise<MontageJob | null> {
  const { rows } = await getPool().query<MontageJob>(
    `UPDATE montree_montage_jobs
        SET status='rendering', started_at=now(), attempts=attempts+1
      WHERE id = (
        SELECT id FROM montree_montage_jobs
         WHERE status='queued'
           AND (next_attempt_at IS NULL OR next_attempt_at <= now())
         ORDER BY created_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING *`
  );
  return rows[0] ?? null;
}

// --- stale recovery: rendering rows whose worker died ---
// < maxAttempts -> back to queued; else -> failed.
export async function recoverStaleJobs(
  staleMinutes: number,
  maxAttempts: number
): Promise<number> {
  const requeue = await getPool().query(
    `UPDATE montree_montage_jobs
        SET status='queued', started_at=NULL,
            next_attempt_at=now()
      WHERE status='rendering'
        AND started_at < now() - ($1 || ' minutes')::interval
        AND attempts < $2`,
    [String(staleMinutes), maxAttempts]
  );
  const fail = await getPool().query(
    `UPDATE montree_montage_jobs
        SET status='failed', finished_at=now(),
            error=COALESCE(error,'') || ' | timed out / worker died'
      WHERE status='rendering'
        AND started_at < now() - ($1 || ' minutes')::interval
        AND attempts >= $2`,
    [String(staleMinutes), maxAttempts]
  );
  return (requeue.rowCount ?? 0) + (fail.rowCount ?? 0);
}

export async function markDone(
  jobId: string,
  outputPath: string,
  durationSeconds: number
): Promise<void> {
  await getPool().query(
    `UPDATE montree_montage_jobs
        SET status='done', output_path=$2, duration_seconds=$3,
            error=NULL, finished_at=now()
      WHERE id=$1`,
    [jobId, outputPath, durationSeconds]
  );
}

export async function markSkipped(jobId: string): Promise<void> {
  await getPool().query(
    `UPDATE montree_montage_jobs
        SET status='skipped_insufficient_photos', finished_at=now(),
            error=NULL
      WHERE id=$1`,
    [jobId]
  );
}

// Failure with exponential backoff: attempts < max -> requeue with a delay;
// else -> permanent failure.
export async function markFailure(
  jobId: string,
  attempts: number,
  maxAttempts: number,
  message: string
): Promise<'retry' | 'failed'> {
  const err = message.slice(0, 4000);
  if (attempts < maxAttempts) {
    const delayMin = Math.pow(2, attempts); // 2, 4, 8 ...
    await getPool().query(
      `UPDATE montree_montage_jobs
          SET status='queued', started_at=NULL, error=$2,
              next_attempt_at = now() + ($3 || ' minutes')::interval
        WHERE id=$1`,
      [jobId, err, String(delayMin)]
    );
    return 'retry';
  }
  await getPool().query(
    `UPDATE montree_montage_jobs
        SET status='failed', finished_at=now(), error=$2
      WHERE id=$1`,
    [jobId, err]
  );
  return 'failed';
}

export async function getJobById(jobId: string): Promise<MontageJob | null> {
  const { rows } = await getPool().query<MontageJob>(
    `SELECT * FROM montree_montage_jobs WHERE id=$1`,
    [jobId]
  );
  return rows[0] ?? null;
}

export interface ReportMeta {
  report_id: string;
  week_start: string | null;
  child_name: string | null;
}

// Report + child name for title/subtitle + music rotation by ISO week.
export async function getReportMeta(
  reportId: string,
  childId: string
): Promise<ReportMeta> {
  const { rows } = await getPool().query(
    `SELECT r.id AS report_id,
            r.week_start AS week_start,
            c.name AS child_name
       FROM montree_weekly_reports r
       LEFT JOIN montree_children c ON c.id = $2
      WHERE r.id = $1`,
    [reportId, childId]
  );
  const row = rows[0] ?? {};
  return {
    report_id: reportId,
    week_start: row.week_start ?? null,
    child_name: row.child_name ?? null,
  };
}

// --- eligible photos: the teacher's curated parent-report photo set ---
// Source of truth is the report's `content->'photos'` jsonb array (each entry
// { id, url, caption, work_name, captured_at }); the montree_report_media
// junction is effectively dead for parent reports (prod recon 2026-07-22).
// We use the ORIGINAL storage_path (never cropped) so Ken Burns has the full
// frame. Malformed entries are filtered (bad/missing uuid) before the cast, and
// duplicates (a media id appearing twice in the array) are collapsed in JS.
//
// 🚨 parent_visible is SELECTED and re-asserted downstream (media.ts) — a
// parent_visible=false photo in a montage is the one unforgivable bug.
export async function getEligiblePhotos(
  reportId: string
): Promise<EligiblePhoto[]> {
  const { rows } = await getPool().query<EligiblePhoto>(
    `SELECT m.id,
            m.storage_path,
            m.captured_at,
            m.parent_visible
       FROM montree_weekly_reports r
       CROSS JOIN LATERAL (
         SELECT (elem->>'id') AS media_id
           FROM jsonb_array_elements(COALESCE(r.content->'photos', '[]'::jsonb)) elem
          WHERE elem->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       ) p
       JOIN montree_media m ON m.id = p.media_id::uuid
      WHERE r.id = $1
        AND m.media_type = 'photo'
        AND m.teacher_confirmed = true
        AND m.parent_visible = true
        AND m.child_id = r.child_id
      ORDER BY m.captured_at ASC NULLS LAST`,
    [reportId]
  );
  // Collapse duplicates (same photo listed twice in the array), keep first.
  const seen = new Set<string>();
  const deduped: EligiblePhoto[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    deduped.push(r);
  }
  return deduped;
}

// Set the finished montage path on the report (never blocks report delivery).
export async function setReportMontagePath(
  reportId: string,
  montagePath: string
): Promise<void> {
  await getPool().query(
    `UPDATE montree_weekly_reports SET montage_path=$2 WHERE id=$1`,
    [reportId, montagePath]
  );
}
