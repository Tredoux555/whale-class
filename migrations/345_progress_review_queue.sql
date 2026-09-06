-- migrations/345_progress_review_queue.sql
--
-- RULE 5 of the Tracking Constitution (docs/tracking/TRACKING_CONSTITUTION.md):
-- UNKNOWN NAMES NEVER WRITE.
--
-- Until now, a work name that no resolver could key still produced a
-- montree_child_progress row with work_key NULL. That row is worse than nothing:
-- it is invisible to every rollup (which keys on work_key), it ranks nowhere in
-- the curriculum sequence, and because the table is keyed on (child_id,
-- work_name) it can never be merged with the real work later without a manual
-- rename. "Blue Series blends", typed once, became a permanent orphan.
--
-- From now on lib/montree/progress/write-progress.ts REFUSES that write and
-- leaves a row here instead: the observation is kept, the progress table stays
-- clean, and a human decides what the name meant. Nothing is lost, nothing is
-- guessed (rule 11).
--
-- Shape notes:
--   * child_id is the ONE foreign key (ON DELETE CASCADE): a queued observation
--     for a deleted child is meaningless, unlike a journal row.
--   * classroom_id / school_id are stamped but NOT FK'd, matching
--     montree_progress_events — a queue entry must never fail to land because a
--     stamp lookup came back empty.
--   * resolved_at / resolved_work_key stay NULL until a human resolves the
--     entry; the open queue is "WHERE resolved_at IS NULL".
--   * requested_status is what the caller WANTED to write, replayed through
--     writeProgress once resolved_work_key is filled in.
--
-- RLS posture: enabled, ZERO policies — the convention migration 344 follows
-- (see migrations/275_enable_rls_security_lockdown.sql Section A). The app only
-- ever touches this table server-side with the service-role key, which bypasses
-- RLS; this default-denies anon + authenticated from day one.
--
-- IDEMPOTENT — every statement is IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- Safe to paste twice.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS montree_progress_review_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  classroom_id      UUID,
  school_id         UUID,

  -- Exactly what the caller passed, untouched. This is the evidence a human reads.
  raw_work_name     TEXT NOT NULL,
  area              TEXT,

  -- The status the refused write was asking for ('presented', 'practicing', …).
  requested_status  TEXT,

  -- Provenance, same vocabulary as montree_progress_events.source (rule 3):
  -- tap | photo | ai | digital | live | import | backfill | correction.
  source            TEXT NOT NULL DEFAULT 'unknown',
  actor             TEXT,

  -- The photo the observation came off, when there was one. Not FK'd: media can be
  -- deleted independently and that must not erase the queued observation.
  evidence_media_id UUID,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  resolved_work_key TEXT
);

-- Columns are added defensively so a half-applied earlier paste self-heals.
ALTER TABLE montree_progress_review_queue ADD COLUMN IF NOT EXISTS classroom_id      UUID;
ALTER TABLE montree_progress_review_queue ADD COLUMN IF NOT EXISTS school_id         UUID;
ALTER TABLE montree_progress_review_queue ADD COLUMN IF NOT EXISTS area              TEXT;
ALTER TABLE montree_progress_review_queue ADD COLUMN IF NOT EXISTS requested_status  TEXT;
ALTER TABLE montree_progress_review_queue ADD COLUMN IF NOT EXISTS actor             TEXT;
ALTER TABLE montree_progress_review_queue ADD COLUMN IF NOT EXISTS evidence_media_id UUID;
ALTER TABLE montree_progress_review_queue ADD COLUMN IF NOT EXISTS resolved_at       TIMESTAMPTZ;
ALTER TABLE montree_progress_review_queue ADD COLUMN IF NOT EXISTS resolved_work_key TEXT;

-- The queue screen: "what is still open, newest first", per classroom / per child.
CREATE INDEX IF NOT EXISTS idx_montree_progress_review_queue_open
  ON montree_progress_review_queue (classroom_id, created_at DESC)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_montree_progress_review_queue_child
  ON montree_progress_review_queue (child_id, created_at DESC);

-- Same name, same child, same day, twice (a duplicate photo in one morning) is ONE
-- thing for a teacher to resolve, not two. Partial + expression index, so only OPEN
-- entries collapse; resolved history is kept in full.
CREATE UNIQUE INDEX IF NOT EXISTS idx_montree_progress_review_queue_dedup
  ON montree_progress_review_queue (child_id, LOWER(raw_work_name), ((created_at AT TIME ZONE 'UTC')::date))
  WHERE resolved_at IS NULL;

COMMENT ON TABLE montree_progress_review_queue IS
  'RULE 5 (Tracking Constitution): progress writes whose work name could not be resolved to a work_key. writeProgress refuses the montree_child_progress write and lands the observation here instead. Open queue = WHERE resolved_at IS NULL; resolving one means setting resolved_work_key + resolved_at and replaying requested_status through writeProgress.';

ALTER TABLE montree_progress_review_queue ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- montree_progress_events.reason -- RULE 4's missing half
-- ---------------------------------------------------------------------------
-- Rule 4: "Downgrade = explicit teacher correction WITH A REASON, journalled as
-- source 'correction'." Migration 314 gave the journal a source and an actor but
-- nowhere to put the reason, so every correction so far has been unexplained.
-- Nullable and additive: existing rows and existing writes are unaffected.
ALTER TABLE montree_progress_events ADD COLUMN IF NOT EXISTS reason TEXT;

COMMENT ON COLUMN montree_progress_events.reason IS
  'Why this change was made, when the change needs one: the teacher''s reason on a downgrade (rule 4), or the mechanical explanation on a curriculum-driven rewrite (e.g. "duplicate-merge: X renamed to Y").';

INSERT INTO montree_migrations (filename) VALUES ('345_progress_review_queue.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
