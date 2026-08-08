// All SQL lives here, in ONE place, so the schema contract can be re-verified
// against production in a single read.
//
// Potato Snaps talks to `tp_*` tables ONLY. There is exactly one photo source:
// the job's teacher-curated `media_ids` -> `tp_photos`. No report branch, no
// scope query, no parent-visibility concept (deleting a photo before the
// montage IS the curation), no completion callback — the worker stamps the
// job row itself.
//
// 🚨 v1.1 PRE-MIGRATION SAFETY. This build ships before (or alongside) the
// v1.1 migration, and Railway may restart the worker against a database that
// does not have `kind` / `excused_child_ids` / the tp_classes branding columns
// yet. EVERY read of a v1.1 column therefore goes through a `SELECT *` /
// `RETURNING *` and is treated as `undefined` when absent — never an explicit
// column list, which would 42703 and crash-loop the service. A worker on an
// un-migrated database behaves exactly like v1.0.

import pg from 'pg';
import type { WorkerConfig } from './config';

const { Pool } = pg;

// 🚨 node-postgres decodes date/timestamp columns into native JS Date objects
// by default. Every date column in this worker is typed + used as a string
// (padEnd, Date.parse, new Date(...)). Force ONE consistent representation —
// the raw ISO-ish text — at the driver boundary so no column is ever a Date.
// This matters doubly here: `week_start` is a DATE and is used verbatim in the
// montage storage path, so it must stay 'YYYY-MM-DD' and never drift a day
// through a timezone-aware Date round-trip.
//   1082 = date, 1114 = timestamp (no tz), 1184 = timestamptz
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1114, (v) => v);
pg.types.setTypeParser(1184, (v) => v);

export type MontageJobStatus = 'queued' | 'processing' | 'done' | 'failed';

/** v1.1 addendum §1: `kind text NOT NULL DEFAULT 'child'`. */
export type MontageJobKind = 'child' | 'class';

export interface MontageJob {
  id: string;
  class_id: string;
  /** NULL on a v1.1 class job (addendum §1 drops the NOT NULL). */
  child_id: string | null;
  /** Local Monday of the week this film covers, 'YYYY-MM-DD'. */
  week_start: string;
  status: string;
  /** Teacher-curated photo set, derived SERVER-side at enqueue. */
  media_ids: string[] | null;
  storage_path: string | null;
  error: string | null;
  attempt: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  // --- v1.1 (may be absent on a pre-migration database) ---
  /** undefined on a pre-migration row → treated as 'child'. */
  kind?: string | null;
  /** Coverage receipt only; the worker does not read it for rendering. */
  excused_child_ids?: string[] | null;
}

/**
 * The job's kind, defaulting to v1.0 semantics. A pre-migration database has
 * no `kind` column at all, so `RETURNING *` yields undefined here — which must
 * mean 'child', exactly as v1.0 behaved.
 */
export function jobKind(job: MontageJob): MontageJobKind {
  return job.kind === 'class' ? 'class' : 'child';
}

export interface EligiblePhoto {
  id: string;
  storage_path: string;
  captured_at: string | null;
}

/**
 * A tp_classes row, read with `SELECT *` so the v1.1 branding columns are
 * simply `undefined` on a pre-migration database instead of a 42703.
 */
export interface ClassRow {
  id: string;
  name: string;
  // --- v1.1 branding (addendum §1) ---
  school_name?: string | null;
  school_logo_path?: string | null;
  emblem_path?: string | null;
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

// --- claim: one queued job, skip-locked, atomically flipped to processing ---
// 🚨 RETURNING * (not an explicit column list) is load-bearing for forward-
// compatibility: a worker running against a database that has gained a column
// this build doesn't know about — or is missing one it doesn't strictly need
// (v1.1's `kind`, `excused_child_ids`) — simply gets `undefined` instead of a
// 42703. Don't enumerate.
export async function claimNextJob(): Promise<MontageJob | null> {
  const { rows } = await getPool().query<MontageJob>(
    `UPDATE tp_montage_jobs
        SET status='processing', started_at=now(), attempt=COALESCE(attempt,0)+1
      WHERE id = (
        SELECT id FROM tp_montage_jobs
         WHERE status='queued'
         ORDER BY created_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING *`
  );
  return rows[0] ?? null;
}

// --- stale recovery: processing rows whose worker died ---
// < maxAttempts -> back to queued; else -> failed.
//
// 🚨 The threshold must exceed the largest job timeout or this sweep will
// re-queue a class film that is merely slow. See config.assertTimeoutSanity().
export async function recoverStaleJobs(
  staleMinutes: number,
  maxAttempts: number
): Promise<number> {
  const requeue = await getPool().query(
    `UPDATE tp_montage_jobs
        SET status='queued', started_at=NULL
      WHERE status='processing'
        AND started_at < now() - ($1 || ' minutes')::interval
        AND COALESCE(attempt,0) < $2`,
    [String(staleMinutes), maxAttempts]
  );
  const fail = await getPool().query(
    `UPDATE tp_montage_jobs
        SET status='failed', completed_at=now(),
            error=COALESCE(error,'') || ' | timed out / worker died'
      WHERE status='processing'
        AND started_at < now() - ($1 || ' minutes')::interval
        AND COALESCE(attempt,0) >= $2`,
    [String(staleMinutes), maxAttempts]
  );
  return (requeue.rowCount ?? 0) + (fail.rowCount ?? 0);
}

/** Success: the job row IS the pointer the teacher + parent surfaces read. */
export async function markDone(
  jobId: string,
  storagePath: string
): Promise<void> {
  await getPool().query(
    `UPDATE tp_montage_jobs
        SET status='done', storage_path=$2, error=NULL, completed_at=now()
      WHERE id=$1`,
    [jobId, storagePath]
  );
}

/**
 * Terminal failure with a message the teacher UI can show as-is. Used for
 * both real errors that ran out of attempts and for the graceful
 * not-enough-photos-left case (there is no 'skipped' status in this schema —
 * `failed` + a clear `error` is the whole story).
 */
export async function markFailed(
  jobId: string,
  message: string
): Promise<void> {
  await getPool().query(
    `UPDATE tp_montage_jobs
        SET status='failed', completed_at=now(), error=$2
      WHERE id=$1`,
    [jobId, message.slice(0, 4000)]
  );
}

/** Put a job back in the queue after a retryable failure. */
export async function requeueJob(
  jobId: string,
  message: string
): Promise<void> {
  await getPool().query(
    `UPDATE tp_montage_jobs
        SET status='queued', started_at=NULL, error=$2
      WHERE id=$1`,
    [jobId, message.slice(0, 4000)]
  );
}

/**
 * Failure disposition. There is no `next_attempt_at` column in this schema, so
 * the spacing between attempts is provided by the caller (index.ts sleeps one
 * poll interval after a 'retry') rather than by a scheduled timestamp — a
 * deliberately simpler design than montage-worker's exponential backoff.
 */
export async function markFailure(
  jobId: string,
  attempt: number,
  maxAttempts: number,
  message: string
): Promise<'retry' | 'failed'> {
  // A missing/NULL attempt reads as 0 so a job can still retry rather than
  // silently failing on its first stumble.
  if ((attempt ?? 0) < maxAttempts) {
    await requeueJob(jobId, message);
    return 'retry';
  }
  await markFailed(jobId, message);
  return 'failed';
}

export async function getJobById(jobId: string): Promise<MontageJob | null> {
  const { rows } = await getPool().query<MontageJob>(
    `SELECT * FROM tp_montage_jobs WHERE id=$1`,
    [jobId]
  );
  return rows[0] ?? null;
}

/** Child name for a child film's title card. Null when the row is gone. */
export async function getChildName(
  childId: string,
  classId: string
): Promise<string | null> {
  try {
    const { rows } = await getPool().query<{ name: string }>(
      `SELECT name FROM tp_children WHERE id=$1 AND class_id=$2`,
      [childId, classId]
    );
    return rows[0]?.name ?? null;
  } catch (err) {
    console.warn('[db] child name lookup failed:', (err as Error).message);
    return null;
  }
}

/**
 * The class row, for the film's title card and the branded end card.
 *
 * 🚨 `SELECT *` is deliberate and load-bearing, exactly like the claim's
 * `RETURNING *`: `school_name`, `school_logo_path` and `emblem_path` arrive
 * only once the v1.1 migration has run. Naming them would 42703 the whole job
 * on a pre-migration database; with the star they are simply undefined and the
 * end card falls back to the class name + an initials mark.
 *
 * Never throws — a branding lookup must not be able to fail a render.
 */
export async function getClassRow(classId: string): Promise<ClassRow | null> {
  try {
    const { rows } = await getPool().query<ClassRow>(
      `SELECT * FROM tp_classes WHERE id=$1`,
      [classId]
    );
    return rows[0] ?? null;
  } catch (err) {
    console.warn('[db] class lookup failed:', (err as Error).message);
    return null;
  }
}

// --- eligible photos: the job's explicit, server-derived selection ----------
//
// child films: the API derived `media_ids` itself at enqueue time.
// class films: the teacher hand-picked them in the class-film picker (v1.1
//   addendum §3 — "the ONE place client-chosen media is allowed"), and the API
//   validated class ownership, the week window, the 8..40 count and per-child
//   coverage before writing the row.
//
// Either way this is the worker's re-check: an id that has since been DELETED
// by the teacher, or that belongs to another class, simply drops out. The
// caller then decides whether what's left is still a film.
//
// class_id is re-applied here as the tenant boundary — the worker never
// trusts a stored id list to be in-class.
export async function getEligiblePhotos(
  mediaIds: string[],
  classId: string
): Promise<EligiblePhoto[]> {
  if (!mediaIds || mediaIds.length === 0) return [];

  const { rows } = await getPool().query<EligiblePhoto>(
    `SELECT p.id, p.storage_path, p.captured_at
       FROM tp_photos p
      WHERE p.id = ANY($1::uuid[])
        AND p.class_id = $2::uuid
      ORDER BY p.captured_at ASC NULLS LAST`,
    [mediaIds, classId]
  );

  // Collapse duplicates (same photo listed twice), keep first.
  const seen = new Set<string>();
  const deduped: EligiblePhoto[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    deduped.push(r);
  }
  return deduped;
}
