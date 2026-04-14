-- Migration 176 — Link behavioral observations to source photo
-- Enables "voice observation linked to the photo I just took" flow.
-- A voice observation saved through Child Guru (or the new BigMicPanel)
-- can now carry the media_id of the photo the teacher just captured,
-- so the observation shows up next to the photo in the gallery / reports.

ALTER TABLE montree_behavioral_observations
  ADD COLUMN IF NOT EXISTS source_media_id UUID REFERENCES montree_media(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_behavioral_observations_source_media
  ON montree_behavioral_observations(source_media_id)
  WHERE source_media_id IS NOT NULL;

COMMENT ON COLUMN montree_behavioral_observations.source_media_id IS
  'Optional FK to the photo/video this observation is about. Set when the teacher '
  'made the observation via voice within ~90s of taking the photo, so the '
  'observation can be shown inline with the photo in gallery and parent reports.';
