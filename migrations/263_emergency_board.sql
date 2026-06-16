-- =============================================================================
-- 263  EMERGENCY BOARD — one shared room for the whole inner circle.
-- Run in the MONTREE project (dmfncjjtsoxrnvcdnvjq). Idempotent + additive.
-- =============================================================================
--
-- Every personal table is walled off per space (migration 261). The pairwise
-- father<->son channel (262) is a private line. THIS is different: a single
-- COMMON room that every sanctuary member can post to and read — the "when all
-- else fails" emergency board. Messages are KEPT (no ephemeral roll-off): an
-- emergency note must never auto-delete.
--
-- A message records WHICH space sent it (from_space). Every member sees ALL
-- messages (it's a shared room); the app labels each by sender and marks the
-- caller's own. Encryption uses the same shared diary key — correct here because
-- the room is intentionally common to all members.
-- =============================================================================

CREATE TABLE IF NOT EXISTS story_board_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_space      text NOT NULL,                 -- which member posted it
  body_enc        text NOT NULL,                 -- AES-256-GCM (diary-crypto)
  cipher_version  int  NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_messages_created
  ON story_board_messages (created_at DESC);

-- Same posture as the rest of the personal platform: RLS on, no policies →
-- only the service role (server) reads/writes; the room is mediated entirely by
-- the authenticated, space-aware API route.
ALTER TABLE story_board_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_board_messages FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Member push subscriptions — so a board post can alert the other members even
-- when the app is closed. Distinct from story_push_subscriptions (which is keyed
-- by story_users username, for the kid-facing call notifications). Here we key by
-- SPACE, because board membership is per sanctuary.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_member_push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space        text NOT NULL,                    -- the member (sanctuary) this device belongs to
  endpoint     text NOT NULL UNIQUE,             -- push-service endpoint URL
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_member_push_subs_space
  ON story_member_push_subscriptions (space);

ALTER TABLE story_member_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_member_push_subscriptions FORCE ROW LEVEL SECURITY;
