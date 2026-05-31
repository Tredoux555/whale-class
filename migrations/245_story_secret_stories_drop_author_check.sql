-- Migration 245: Drop the legacy secret_stories.message_author CHECK constraint.
--
-- ROOT CAUSE (admin -> story broken direction):
-- secret_stories had a hard-coded CHECK constraint
--   secret_stories_message_author_check  ->  message_author IN ('T','Z')
-- (added manually in the Supabase dashboard, never in a migration).
--
-- The Story admin now logs in as 'J' (and 'P') via the Montree facade. When
-- the admin sends a text note, /api/story/admin/send:
--   1. inserts into story_message_history  (no author constraint there) -> OK
--   2. UPDATEs secret_stories.hidden_message with message_author = 'J'
--      -> VIOLATES the CHECK constraint (Postgres error 23514).
-- The route did not check the UPDATE's error, so it was silently swallowed:
-- hidden_message never updated, and the parent story page's tap-to-reveal
-- ('t') kept showing the LAST PARENT message instead of the admin's note.
-- Parent -> admin worked because parents send as 'T'/'Z', which the
-- constraint allowed.
--
-- The author is always the server-verified JWT username; constraining it to
-- two hard-coded letters serves no purpose (story_message_history.author has
-- no such constraint). Drop it so any verified admin/user can author the
-- weekly hidden_message.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'secret_stories'
      AND constraint_name = 'secret_stories_message_author_check'
  ) THEN
    ALTER TABLE secret_stories DROP CONSTRAINT secret_stories_message_author_check;
  END IF;
END $$;
