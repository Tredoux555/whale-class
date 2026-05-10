-- migrations/195_principal_memory.sql
--
-- Tracy's persistent relational memory.
--
-- Until this migration, Tracy had ONLY episodic memory (last ~10 turns of the
-- active conversation, sent client-side from localStorage). Across
-- conversations / devices / "New conversation" clicks, she remembered nothing.
-- The principal had to re-explain her preferences, concerns, voice, and
-- context every time. This table fixes that.
--
-- Tracy reads this table on every turn (top-30 most recent active memories,
-- formatted into the system prompt). She writes to it via the new
-- `remember_this` tool when she learns something durable. She queries deeper
-- via the `recall_memory` tool when the system prompt header isn't enough.
--
-- 🚨 ARCHITECTURAL RULES (do not break):
--   1. Memories are SEMANTIC, not EPISODIC. "Principal prefers short messages"
--      is a memory. "Principal asked about Austin on 2026-05-10" is NOT — that
--      already lives in montree_principal_agent_log.
--   2. Memories are scoped by principal_id (multi-principal schools have
--      separate memories per principal).
--   3. The superseded_by chain handles updates atomically via the
--      supersede_and_insert_memory() Postgres function below — never a
--      multi-statement client-side update.
--   4. Memory injection is on every turn (system prompt rebuilt per request)
--      capped at 30 most recent for cost control.
--   5. The recall_memory tool is for DEEPER recall beyond the 30 in the
--      system prompt.
--   6. reference_count + last_referenced_at exist for future memory pruning
--      (low-reference, old memories can be archived). Don't surface to user.
--   7. Do NOT save sensitive personal facts unless the principal explicitly
--      asked Tracy to remember them. Do NOT save private parent/teacher info
--      that wasn't shared in the principal's chat.
--
-- Idempotent — safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_principal_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  principal_id UUID NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'preference', 'concern', 'voice_sample', 'parent_priority',
    'teacher_note', 'context', 'fact'
  )),
  related_child_id UUID,
  related_teacher_id UUID,
  related_parent_id UUID,
  content TEXT NOT NULL CHECK (length(content) <= 1000),
  source TEXT,
  confidence NUMERIC(3, 2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_referenced_at TIMESTAMPTZ DEFAULT NOW(),
  reference_count INT DEFAULT 0,
  superseded_by UUID REFERENCES montree_principal_memory(id) ON DELETE SET NULL,
  superseded_at TIMESTAMPTZ
);

-- Active memories per principal — drives the system-prompt header load
CREATE INDEX IF NOT EXISTS idx_principal_memory_active
  ON montree_principal_memory (principal_id, created_at DESC)
  WHERE superseded_at IS NULL;

-- Type-filtered lookups for recall_memory
CREATE INDEX IF NOT EXISTS idx_principal_memory_type
  ON montree_principal_memory (principal_id, memory_type, created_at DESC)
  WHERE superseded_at IS NULL;

-- Child-related memories
CREATE INDEX IF NOT EXISTS idx_principal_memory_child
  ON montree_principal_memory (related_child_id)
  WHERE related_child_id IS NOT NULL AND superseded_at IS NULL;

-- Teacher-related memories
CREATE INDEX IF NOT EXISTS idx_principal_memory_teacher
  ON montree_principal_memory (related_teacher_id)
  WHERE related_teacher_id IS NOT NULL AND superseded_at IS NULL;

COMMENT ON TABLE montree_principal_memory IS
  'Tracy''s relational memory — semantic facts about the principal that persist across conversations. Loaded into system prompt every turn, written by remember_this tool, read by recall_memory tool.';

-- ── Atomic supersede + insert ────────────────────────────────────────
--
-- When Tracy learns that an existing memory is outdated (e.g. principal's
-- preference has changed), the new memory must be inserted AND the old
-- memory marked superseded in a single atomic step. Doing this in the
-- application layer with two separate Supabase calls leaves a window where
-- a concurrent read sees both as active. This function avoids that race.
--
-- Defense in depth: also filters the supersede UPDATE by principal_id, so
-- even if a malicious caller passed someone else's memory id as
-- p_supersedes_id, the UPDATE would no-op rather than mark it superseded.

CREATE OR REPLACE FUNCTION supersede_and_insert_memory(
  p_school_id UUID,
  p_principal_id UUID,
  p_memory_type TEXT,
  p_content TEXT,
  p_source TEXT,
  p_supersedes_id UUID,
  p_related_child_id UUID DEFAULT NULL,
  p_related_teacher_id UUID DEFAULT NULL,
  p_related_parent_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF p_supersedes_id IS NOT NULL THEN
    UPDATE montree_principal_memory
      SET superseded_at = NOW()
      WHERE id = p_supersedes_id
        AND principal_id = p_principal_id  -- defense in depth
        AND superseded_at IS NULL;
  END IF;

  INSERT INTO montree_principal_memory
    (school_id, principal_id, memory_type, content, source,
     related_child_id, related_teacher_id, related_parent_id)
  VALUES
    (p_school_id, p_principal_id, p_memory_type, p_content, p_source,
     p_related_child_id, p_related_teacher_id, p_related_parent_id)
  RETURNING id INTO new_id;

  -- Wire superseded_by on the old row so the chain is bidirectional
  IF p_supersedes_id IS NOT NULL THEN
    UPDATE montree_principal_memory
      SET superseded_by = new_id
      WHERE id = p_supersedes_id
        AND principal_id = p_principal_id;
  END IF;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION supersede_and_insert_memory TO anon, authenticated, service_role;

COMMIT;

-- Verify (run separately):
-- SELECT count(*) FROM montree_principal_memory;
-- SELECT proname FROM pg_proc WHERE proname = 'supersede_and_insert_memory';
