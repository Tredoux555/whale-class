-- Migration 112: Teacher-Parent Messaging System
-- Date: 2026-02-02
-- Professional, academic-focused messaging between teachers and parents

BEGIN;

-- ==============================================================================
-- Messages Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS montree_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,

  -- Sender information
  sender_type TEXT NOT NULL CHECK (sender_type IN ('teacher', 'parent')),
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,

  -- Message content
  subject TEXT,
  message_text TEXT NOT NULL,

  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Indexes for performance
-- ==============================================================================
CREATE INDEX idx_messages_child ON montree_messages(child_id, created_at DESC);
CREATE INDEX idx_messages_read ON montree_messages(is_read) WHERE NOT is_read;
CREATE INDEX idx_messages_sender ON montree_messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_created ON montree_messages(created_at DESC);

-- ==============================================================================
-- Update trigger for updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_message ON montree_messages;
CREATE TRIGGER trigger_update_message
  BEFORE UPDATE ON montree_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_timestamp();

COMMIT;
