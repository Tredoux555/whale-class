-- Messages Table for Teacher-Parent Communication
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS parent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('teacher', 'parent')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parent_messages_child ON parent_messages(child_id, created_at DESC);

ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for messages" ON parent_messages FOR ALL USING (true);
