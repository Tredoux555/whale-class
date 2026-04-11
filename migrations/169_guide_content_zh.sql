-- Add cached Chinese guide translations to classroom curriculum works
-- Stores the full translated guide JSON so we don't call Sonnet on every Quick Guide open
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS guide_content_zh JSONB;
