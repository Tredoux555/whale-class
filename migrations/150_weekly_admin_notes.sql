-- Migration 148: Weekly Admin Notes for docx report generation
-- Stores per-child, per-week English + Chinese teacher notes for Summary and Plan documents

CREATE TABLE IF NOT EXISTS montree_weekly_admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id),
  child_id UUID NOT NULL REFERENCES montree_children(id),
  week_start DATE NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('summary', 'plan')),
  area TEXT CHECK (area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'cultural') OR area IS NULL),
  english_text TEXT,
  chinese_text TEXT,
  updated_by UUID REFERENCES montree_teachers(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one row per child+week+docType+area (COALESCE handles NULL area for summary-level notes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_notes_unique
  ON montree_weekly_admin_notes(child_id, week_start, doc_type, COALESCE(area, '__summary__'));

-- Fast lookup by classroom + week
CREATE INDEX IF NOT EXISTS idx_weekly_notes_classroom_week
  ON montree_weekly_admin_notes(classroom_id, week_start);

-- Ensure week_start is always a Monday (ISODOW: Monday=1)
ALTER TABLE montree_weekly_admin_notes
  ADD CONSTRAINT chk_week_start_monday CHECK (EXTRACT(ISODOW FROM week_start) = 1);
