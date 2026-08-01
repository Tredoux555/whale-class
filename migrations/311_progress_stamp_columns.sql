-- 311_progress_stamp_columns.sql
-- P0 DATA LOSS FIX — montree_child_progress is missing the stamp columns that
-- two commit routes have been writing since Paper Scan / Voice Observation shipped.
--
-- What breaks without this:
--   app/api/montree/paper-scan/[scanId]/commit/route.ts   → upserts classroom_id + work_key
--   app/api/montree/voice-observation/[sessionId]/commit/route.ts → same
-- The table (see migrations/archive/MONTREE-AUDIT-FIX.sql, then 111/155) only ever
-- had child_id / work_name / work_name_chinese / area / status / timestamps. So in
-- production every one of those upserts fails with Postgres 42703 (undefined column)
-- while the scan/session is STILL marked 'committed' — the teacher's approved
-- observations are silently dropped and the source photo/audio is already deleted.
-- Unrecoverable. This is the schema catching up to what the code has always intended.
--
-- classroom_id / school_id also give the upcoming institutional layer (multi-classroom
-- schools, per-school progress rollups) the tenancy stamps it needs without a backfill
-- of every future write. work_key ties a progress row to the canonical curriculum key
-- rather than the free-text work_name.
--
-- Existing rows keep NULL in the new columns — nothing is rewritten, and the
-- (child_id, work_name) upsert key is untouched, so this is safe on a live table.
--
-- Fully idempotent — safe to paste twice.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Stamp columns (nullable — historical rows have no classroom/school/key)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE montree_child_progress ADD COLUMN IF NOT EXISTS classroom_id UUID;
ALTER TABLE montree_child_progress ADD COLUMN IF NOT EXISTS work_key     TEXT;
ALTER TABLE montree_child_progress ADD COLUMN IF NOT EXISTS school_id    UUID;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Index — the classroom-scoped progress read (dashboard, rollups)
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_montree_child_progress_classroom
  ON montree_child_progress (classroom_id);
