-- migrations/226_montree_encryption_v1.sql
--
-- 🚨 Session 121 — application-layer encryption for parent-school
-- messaging, meeting notes, and call transcripts.
--
-- DESIGN
--   - Encryption is server-side AES-256-GCM with MONTREE_ENCRYPTION_KEY.
--   - Each encrypted table gains an `encryption_version` INTEGER column:
--       NULL = legacy plaintext (pre-encryption rows, served as-is)
--       1    = AES-256-GCM with the current key
--   - The `encryption_v1` feature flag controls write-path encryption.
--     Default OFF — production keeps writing plaintext until the operator
--     verifies the key + flips the flag.
--   - Reads branch on `encryption_version` regardless of flag state. Mixed
--     plaintext + ciphertext rows coexist safely forever.
--
-- ROLLBACK
--   1. Flip `encryption_v1` flag OFF in montree_feature_definitions.
--   2. New writes go to plaintext.
--   3. (Optional) run scripts/decrypt-existing-rows.mjs to backfill
--      plaintext for already-encrypted rows. Code reads stay correct
--      whether or not this is done — version column gates the decrypt.
--
-- Idempotent — safe to re-run.

BEGIN;

-- ── montree_thread_messages.body ─────────────────────────────────────
-- The largest surface — every parent ↔ teacher / parent ↔ principal /
-- principal-observer message body.
ALTER TABLE montree_thread_messages
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER;

-- ── montree_meeting_notes (summary, transcript, notes) ───────────────
-- Sonnet 3-paragraph summary + optional Whisper transcript + free-form
-- teacher / principal notes. Same encryption_version applies to all
-- three columns on the row.
ALTER TABLE montree_meeting_notes
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER;

-- ── montree_appointment_recordings (transcript, summary) ─────────────
-- Cloud Recording Whisper transcript + Sonnet summary. Stage B isn't
-- active yet (migration 223 is unrun), but the column is added here so
-- the encryption hooks land at the same time as the rest of the rollout.
-- The IF EXISTS guard handles the case where migration 223 hasn't run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'montree_appointment_recordings'
  ) THEN
    ALTER TABLE montree_appointment_recordings
      ADD COLUMN IF NOT EXISTS encryption_version INTEGER;
  END IF;
END $$;

-- ── Feature flag ─────────────────────────────────────────────────────
-- Default OFF until the operator (1) sets MONTREE_ENCRYPTION_KEY in
-- Railway env, (2) verifies a test write decrypts cleanly, (3) flips
-- the flag globally OR per-school.
INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'encryption_v1',
  'Application-layer encryption (v1)',
  'When ON, parent-school message bodies + meeting note summaries/transcripts/notes + call transcripts are encrypted with AES-256-GCM before hitting the database. Reads branch on encryption_version, so legacy plaintext rows continue to render unchanged. Requires MONTREE_ENCRYPTION_KEY env var (exactly 32 chars).',
  FALSE,
  'security'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;

-- ── Verification queries (run manually after migration) ─────────────
-- 1. Confirm the columns exist:
--    SELECT table_name, column_name
--    FROM information_schema.columns
--    WHERE column_name = 'encryption_version'
--      AND table_name IN ('montree_thread_messages', 'montree_meeting_notes', 'montree_appointment_recordings');
--    Expected: 2-3 rows (3 if migration 223 has been run, else 2).
--
-- 2. Confirm the flag is registered:
--    SELECT feature_key, default_enabled FROM montree_feature_definitions
--    WHERE feature_key = 'encryption_v1';
--    Expected: 1 row, default_enabled = false.
--
-- 3. To enable globally once tested:
--    UPDATE montree_feature_definitions
--    SET default_enabled = true
--    WHERE feature_key = 'encryption_v1';
--    (OR per-school via montree_school_features INSERT.)
