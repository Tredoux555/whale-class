-- Migration 212: bump_memory_references RPC for Tracy memory recall
--
-- Session 113 V2 — Tracy + Mira audit finding HIGH-1.
--
-- bumpMemoryReference in lib/montree/tracy/memory.ts previously did:
--   1 SELECT (fetch reference_count for each id) + N UPDATEs (one per
-- memory) per recall. For a 20-memory return that's 21 round-trips,
-- which on Railway → Supabase pooler latency adds 600-1500ms of pure
-- waste to a non-critical pruning signal.
--
-- This RPC does it in ONE round-trip with a single UPDATE statement
-- that increments reference_count and stamps last_referenced_at.
-- principal_id filter is defense-in-depth — the caller already filters,
-- but the RPC enforces it so a malicious id list can't bump another
-- principal's memories.
--
-- Idempotent. Safe to re-run.

BEGIN;

CREATE OR REPLACE FUNCTION bump_memory_references(
  p_principal_id UUID,
  p_memory_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  IF p_memory_ids IS NULL OR array_length(p_memory_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Cap input array length defensively
  IF array_length(p_memory_ids, 1) > 100 THEN
    RAISE EXCEPTION 'bump_memory_references: too many ids (got %, max 100)',
      array_length(p_memory_ids, 1);
  END IF;

  IF p_principal_id IS NULL THEN
    RAISE EXCEPTION 'bump_memory_references: principal_id is required';
  END IF;

  -- One UPDATE statement, scoped by principal_id for safety. Only touches
  -- active (non-superseded) memories.
  UPDATE montree_principal_memory
  SET
    reference_count = COALESCE(reference_count, 0) + 1,
    last_referenced_at = NOW()
  WHERE id = ANY(p_memory_ids)
    AND principal_id = p_principal_id
    AND superseded_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- Grant execute to the roles that actually call from the app
GRANT EXECUTE ON FUNCTION bump_memory_references(UUID, UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION bump_memory_references(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bump_memory_references(UUID, UUID[]) TO service_role;

COMMIT;
