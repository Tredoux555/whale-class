-- migrations/179_daily_focus_table.sql
-- Daily teacher focus list — children the teacher pre-selects each morning.
-- Confirmation comes from a photo being captured tagged with the focused child
-- (direct child_id on montree_media, or via montree_media_children junction).
--
-- One row per (classroom, date, child). focus_date is a DATE so a classroom has
-- exactly one focus list per calendar day, keyed by the classroom's local day.

CREATE TABLE IF NOT EXISTS montree_daily_focus (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  child_id     UUID NOT NULL REFERENCES montree_children(id)   ON DELETE CASCADE,
  focus_date   DATE NOT NULL,
  selected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  confirmed_via TEXT,              -- 'photo' | 'group_photo' | 'manual' | NULL
  confirmed_media_id UUID,         -- FK-less reference to montree_media.id for audit
  UNIQUE (classroom_id, focus_date, child_id)
);

CREATE INDEX IF NOT EXISTS idx_montree_daily_focus_classroom_date
  ON montree_daily_focus (classroom_id, focus_date);

CREATE INDEX IF NOT EXISTS idx_montree_daily_focus_unconfirmed
  ON montree_daily_focus (classroom_id, focus_date)
  WHERE confirmed_at IS NULL;
