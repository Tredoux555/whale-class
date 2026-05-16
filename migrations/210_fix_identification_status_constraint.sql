-- Migration 210: Fix montree_media.identification_status CHECK constraint
--
-- Photo pipeline audit (Session 113) flagged this as the #1 critical finding:
-- The production CHECK constraint on identification_status does NOT include
-- 'haiku_drafted' as a valid value. Pass-2-success Pass-2b-not-triggered writes
-- (the most common photo pipeline outcome by volume) fail with Postgres
-- error 23514, leaving photos stuck at NULL identification_status and
-- vanishing from the audit queue. The bug had been "patched" via a one-off
-- repair script (scripts/fix-check-constraint.mjs) but never via a numbered
-- migration, so any future schema-rebuild forgets the fix.
--
-- This migration drops the old constraint (if present) and recreates it with
-- the complete enum of valid statuses used by the two-pass + Pass 2b pipeline.
--
-- Idempotent. Safe to re-run.
--
-- Confirmed valid statuses (used somewhere in the codebase as of session 113):
--   NULL                  - photo just captured, pipeline hasn't run
--   'pending'             - pipeline has been queued
--   'pending_review'      - super-admin review queue (legacy, may be unused)
--   'skipped'             - pipeline deliberately bypassed (low priority bucket)
--   'haiku_matched'       - Pass 2 found a high-confidence match (>=0.85 AND
--                           visual memory present) → auto-confirm path
--   'haiku_drafted'       - Pass 2 returned a low/mid confidence match,
--                           needs teacher confirm via Photo Audit
--   'sonnet_drafted'      - Pass 2b (Sonnet discriminator) picked a candidate,
--                           needs teacher confirm via Photo Audit
--   'confirmed'           - teacher confirmed the identification
--   'failed'              - pipeline crashed (Haiku error, Sonnet timeout, etc.)

BEGIN;

ALTER TABLE montree_media
  DROP CONSTRAINT IF EXISTS montree_media_identification_status_check;

ALTER TABLE montree_media
  ADD CONSTRAINT montree_media_identification_status_check
  CHECK (
    identification_status IS NULL
    OR identification_status IN (
      'pending',
      'pending_review',
      'skipped',
      'haiku_matched',
      'haiku_drafted',
      'sonnet_drafted',
      'confirmed',
      'failed'
    )
  );

COMMIT;
