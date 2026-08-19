-- =============================================================================
-- 335_potato_scenes.sql — Potato Snaps "Scenes" (v1.0.1)
-- =============================================================================
-- A SCENE is an editable, per-class label for what the class was DOING when a
-- photo was taken: "Outdoor time", "Music class", "Water play". The teacher
-- writes them herself in the app; nothing is seeded here, because a canned list
-- would be somebody else's classroom.
--
-- 🚨 THE DESIGN DECISION THIS MIGRATION ENCODES: THE PHOTO RIDES ALONG.
-- The obvious schema for "who was at Music class" is an attendance table —
-- tp_scene_children, one row per child per scene per day. We deliberately do
-- NOT build that. A photo already carries its children (tp_photo_children) and
-- its instant (captured_at), so tagging the PHOTO with a scene tags everybody
-- in it, for free, at the only moment a teacher is already holding the phone.
-- Children are therefore associated with scenes IMPLICITLY, through photos:
--
--     child --tp_photo_children--> photo --scene_id--> scene
--
-- What that buys: no second data-entry chore, no attendance register that goes
-- stale the first busy morning, and no way for the register to disagree with
-- the photos (the WYSIWYG rule this product is built on — what the teacher
-- sees on the board is exactly what the film contains). What it costs: we
-- cannot record that a child attended a scene NO ONE PHOTOGRAPHED. That is an
-- accepted, deliberate limit of v1. If real attendance is ever needed, it is a
-- NEW table added beside this one — do not grow tp_scenes into a register.
--
-- ONE scene per photo, not many. A photo is a moment, and a moment happened
-- during one activity; a photo/scene junction would invite "Outdoor time AND
-- Music class", which is not a thing that happened. Hence a plain nullable FK
-- column on tp_photos rather than a junction table.
--
-- ON DELETE SET NULL, never CASCADE: deleting a scene must never delete a
-- child's photograph. (The app does not even offer delete — it offers "Hide",
-- which is is_active = false; a hidden scene keeps its photos and its history,
-- it just stops appearing in the capture chip row.)
--
-- SECURITY POSTURE: same as every other tp_ table since 318 — RLS ENABLED with
-- ZERO policies, i.e. deny-all. anon and authenticated can do nothing; all
-- access is service-role, from /api/potato routes that have already verified a
-- potato_teacher cookie or bearer token and scoped every query to that class.
-- Do NOT "fix" the missing policies by adding permissive ones.
--
-- FEATURE-DETECTED IN CODE: the routes ship before this file is pasted into
-- Supabase. lib/potato/db.ts probes tp_photos.scene_id (the `scenes`
-- capability, exactly as `attribution` probes uploaded_by in 333) so an upload
-- that arrives in the gap still saves the photo — it simply saves it without a
-- scene — instead of 503ing a teacher's morning over a column.
--
-- IDEMPOTENT throughout: safe to paste twice. Seeds nothing.
--
-- Next free number verified against the Mac on Aug 19, 2026: the repo's
-- highest migration is 334_dark_phonics_live.sql, so this is 335.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------- tp_scenes
CREATE TABLE IF NOT EXISTS tp_scenes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES tp_classes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The capture screen's chip row: "the live scenes for my class", newest last.
-- Partial, because hidden scenes are read only on the Scenes admin screen
-- (?all=1) and never on the hot path.
CREATE INDEX IF NOT EXISTS idx_tp_scenes_class_active
  ON tp_scenes (class_id) WHERE is_active;

-- "Outdoor time" and "outdoor time" are the same scene to a human, so they are
-- the same scene here. The API returns 409 on the duplicate; this index is what
-- makes that a database fact rather than an application hope, so two teachers
-- tapping "+ New" on the same name at the same moment cannot both win (the
-- loser gets 23505, which the route turns back into the same 409).
--
-- Scoped to WHERE is_active on purpose: hiding a scene releases its name, so a
-- teacher who hid "Music class" in March can create it fresh in September.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tp_scenes_class_name_active
  ON tp_scenes (class_id, lower(name)) WHERE is_active;

COMMENT ON TABLE tp_scenes IS
  'Per-class activity labels for Potato Snaps photos ("Outdoor time"). '
  'Children are associated with scenes implicitly, via tp_photos.scene_id and '
  'tp_photo_children — there is deliberately no attendance table in v1.';

-- ------------------------------------------------- tp_photos.scene_id (FK) --
ALTER TABLE tp_photos
  ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES tp_scenes(id) ON DELETE SET NULL;

-- Only tagged photos are ever looked up by scene ("show me Music class"), and
-- most photos in a young class have no scene at all, so the index skips NULLs.
CREATE INDEX IF NOT EXISTS idx_tp_photos_scene
  ON tp_photos (scene_id) WHERE scene_id IS NOT NULL;

COMMENT ON COLUMN tp_photos.scene_id IS
  'Optional tp_scenes row: what the class was doing when this was taken. NULL '
  'for every photo taken before v1.0.1 and for any shot the teacher chose not '
  'to label. ON DELETE SET NULL — losing a scene never loses a photograph.';

-- ------------------------------------------------------------------ lockdown
-- RLS on, zero policies = nobody but the service role gets in (see 318).
ALTER TABLE tp_scenes ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =============================================================================
-- Verify (paste separately after the migration):
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'tp_scenes' ORDER BY ordinal_position;
--   -- expect: id | class_id | name | is_active | created_at
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'tp_photos' AND column_name = 'scene_id';
--   -- expect: scene_id | uuid | YES
--
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'tp_scenes';
--   -- expect: tp_scenes | t
--
--   SELECT indexname FROM pg_indexes WHERE tablename IN ('tp_scenes','tp_photos')
--    ORDER BY indexname;
--   -- expect to include: idx_tp_photos_scene, idx_tp_scenes_class_active,
--   --                    uq_tp_scenes_class_name_active
-- =============================================================================
