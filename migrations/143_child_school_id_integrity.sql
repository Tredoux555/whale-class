-- Migration 143: Ensure montree_children.school_id is always populated
-- 1. Backfill any existing nulls from classroom's school_id
-- 2. Add NOT NULL constraint
-- 3. Add trigger to auto-derive school_id from classroom on INSERT/UPDATE

-- Step 1: Backfill null school_id from classroom's school_id
UPDATE montree_children c
SET school_id = cl.school_id
FROM montree_classrooms cl
WHERE c.classroom_id = cl.id
AND c.school_id IS NULL;

-- Step 1b: Safety — delete orphan children with no classroom (can't derive school_id)
-- These are broken records that would block the NOT NULL constraint
DELETE FROM montree_children
WHERE school_id IS NULL AND classroom_id IS NULL;

-- Step 1c: If any children still have null school_id (classroom exists but has no school),
-- log them and skip. This should never happen in practice.
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining FROM montree_children WHERE school_id IS NULL;
  IF remaining > 0 THEN
    RAISE WARNING '% children still have null school_id after backfill — NOT NULL constraint skipped', remaining;
    RETURN;
  END IF;
  -- Step 2: Add NOT NULL constraint (safe now that all nulls are filled)
  ALTER TABLE montree_children ALTER COLUMN school_id SET NOT NULL;
END $$;

-- Step 3: Create trigger function to auto-derive school_id
CREATE OR REPLACE FUNCTION set_child_school_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NULL AND NEW.classroom_id IS NOT NULL THEN
    SELECT school_id INTO NEW.school_id
    FROM montree_classrooms WHERE id = NEW.classroom_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger (BEFORE INSERT OR UPDATE)
DROP TRIGGER IF EXISTS tr_set_child_school_id ON montree_children;
CREATE TRIGGER tr_set_child_school_id
BEFORE INSERT OR UPDATE ON montree_children
FOR EACH ROW EXECUTE FUNCTION set_child_school_id();
