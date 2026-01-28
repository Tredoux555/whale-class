-- Montree child progress tracking
CREATE TABLE IF NOT EXISTS montree_child_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  work_name_chinese TEXT,
  area TEXT, -- practical_life, sensorial, mathematics, language, culture
  status TEXT DEFAULT 'presented', -- presented, practicing, mastered
  presented_at TIMESTAMPTZ DEFAULT now(),
  mastered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_montree_progress_child ON montree_child_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_montree_progress_area ON montree_child_progress(area);
