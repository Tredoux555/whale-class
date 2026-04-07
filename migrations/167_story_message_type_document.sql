-- Migration 167: Allow 'document' message_type in story_message_history
-- The original CHECK constraint only allowed text/image/video. Audio was added later.
-- Now adding 'document' so admins can send PDF/Word/Excel/etc. files in the message stream.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'story_message_history'
      AND constraint_name = 'story_message_history_message_type_check'
  ) THEN
    ALTER TABLE story_message_history DROP CONSTRAINT story_message_history_message_type_check;
  END IF;

  ALTER TABLE story_message_history
    ADD CONSTRAINT story_message_history_message_type_check
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document'));
END $$;
