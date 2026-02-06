-- Migration: montree_dm table
-- Direct messages between super admin and users (leads/teachers/principals)

CREATE TABLE IF NOT EXISTS montree_dm (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,       -- lead ID, teacher ID, or principal ID
  sender_type TEXT NOT NULL,           -- 'admin' or 'user'
  sender_name TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookups by conversation
CREATE INDEX IF NOT EXISTS idx_montree_dm_conversation ON montree_dm(conversation_id, created_at);
-- Unread count queries
CREATE INDEX IF NOT EXISTS idx_montree_dm_unread ON montree_dm(conversation_id, is_read) WHERE is_read = false;
