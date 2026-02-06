-- Migration: montree_messages table
-- In-app messaging between super admin and users (teachers/principals)

CREATE TABLE IF NOT EXISTS montree_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,       -- lead ID, teacher ID, or principal ID
  sender_type TEXT NOT NULL,           -- 'admin' or 'user'
  sender_name TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookups by conversation
CREATE INDEX IF NOT EXISTS idx_montree_messages_conversation ON montree_messages(conversation_id, created_at);
-- Unread count queries
CREATE INDEX IF NOT EXISTS idx_montree_messages_unread ON montree_messages(conversation_id, is_read) WHERE is_read = false;
