-- migrations/246_principal_conversations.sql
--
-- Server-side persistence for the principal's Astra chat thread.
--
-- Until now, the Astra conversation lived ONLY in the browser (localStorage,
-- keyed per school in lib/montree/tracy/storage-keys.ts). That made the chat
-- per-DEVICE: a conversation started on one browser never appeared on another
-- login/device, and "preloading" a question for a principal on a different
-- machine was impossible. This table makes the thread UNIFORM across all of a
-- principal's logins/devices.
--
-- This is EPISODIC storage (the literal turn-by-turn thread, for reload/record)
-- and is intentionally separate from montree_principal_memory (which is
-- SEMANTIC — distilled facts Astra recalls). Both can coexist.
--
-- ARCHITECTURE:
--   - Scoped by principal_id (multi-principal schools keep separate threads),
--     mirroring montree_principal_memory.
--   - conversation_key = the client-generated conversation id (so client and
--     server agree on which thread is which). UNIQUE per (principal, key).
--   - is_active marks the single OPEN thread; "New conversation" flips the old
--     one to is_active=false (kept as a record) and opens a fresh one.
--   - turns is the JSONB array of ConvTurn objects (role/text/tools/...), capped
--     application-side to the last 30 turns to bound row size.
--
-- Idempotent — safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_principal_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  principal_id UUID NOT NULL,
  conversation_key TEXT NOT NULL,
  turns JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per (principal, client conversation id).
CREATE UNIQUE INDEX IF NOT EXISTS uq_principal_conv_key
  ON montree_principal_conversations(principal_id, conversation_key);

-- Fast "active thread for this principal" + history ordering.
CREATE INDEX IF NOT EXISTS idx_principal_conv_active
  ON montree_principal_conversations(principal_id, is_active, updated_at DESC);

COMMIT;
