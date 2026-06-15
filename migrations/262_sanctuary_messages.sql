-- =============================================================================
-- 262  SANCTUARY MESSAGES — the private father <-> son channel.
-- Run in the MONTREE project (dmfncjjtsoxrnvcdnvjq). Idempotent + additive.
-- =============================================================================
--
-- Every other personal table is walled off per space (migration 261). THIS table
-- is the ONE deliberate bridge: a tiny, encrypted message channel so Riddick can
-- always reach his dad, and his dad can reach back — across their two sanctuaries.
--
-- A message records WHICH space sent it (from_space). The reader sees messages
-- NOT sent by their own space (i.e. the other person's). With two spaces that's
-- exactly a two-way line between them; it generalises cleanly if more are added.
--
-- Concealed by design: there is no UI surfacing this yet (Riddick "doesn't need
-- to know it exists"). The plumbing is here; surfacing it is a later, separate step.
-- =============================================================================

CREATE TABLE IF NOT EXISTS story_sanctuary_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_space      text NOT NULL,                  -- which sanctuary sent it
  body_enc        text NOT NULL,                  -- AES-256-GCM (diary-crypto)
  cipher_version  int  NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz                     -- set when the recipient reads it
);

CREATE INDEX IF NOT EXISTS idx_sanctuary_messages_from
  ON story_sanctuary_messages (from_space, created_at DESC);

-- Same posture as the rest of the personal platform: RLS on, no policies →
-- only the service role (server) can read/write; the channel is mediated
-- entirely by the authenticated, space-scoped API route.
ALTER TABLE story_sanctuary_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_sanctuary_messages FORCE ROW LEVEL SECURITY;
