-- 314_institutional_foundations.sql
-- Aug 2, 2026 — WP1 of the institutional layer (see
-- docs/oversight-pack-aug01/INSTITUTIONAL_LAYER_MASTER_PLAN.md §4).
--
-- Three foundations, one file:
--
--   1. montree_master_works    — THE curriculum spine. One global row per work, keyed by
--      the stable work_key slug that already lives in lib/montree/stem/*.json and is
--      copied verbatim into every classroom curriculum (migration 099). Classroom rows
--      stay authoritative for local naming/activation; this table is what makes
--      "60% of the sequence" mean the SAME thing in every school. 329 rows, generated
--      by scripts/institutions/generate-master-seed.mjs from the static catalog.
--
--   2. montree_progress_events — append-only progress journal. montree_child_progress is
--      a CURRENT-STATE table (one row per child+work, upserted in place), so it can
--      answer "where is this child" but never "what changed this month". Momentum,
--      trailing-30-day deltas and stalled-child flags all need the journal. Written by
--      lib/montree/progress/write-progress.ts and nothing else.
--
--   3. montree_migrations      — the ledger. Until now there has been no way to ask the
--      database which migrations have actually been pasted into the SQL editor, which is
--      exactly how 311 came to be missing in production while the code that needed it was
--      live. Backfilled with 311–314.
--
-- ⚠️ CONVENTION FROM HERE ON: EVERY future migration MUST end with its own
--    INSERT INTO montree_migrations (filename) VALUES ('NNN_name.sql')
--    ON CONFLICT (filename) DO NOTHING;
--    so the ledger stays honest without anyone remembering to update it separately.
--
-- Migrations here are applied by pasting into the Supabase SQL Editor, so this file is
-- fully idempotent and self-contained: every CREATE is IF NOT EXISTS, the seed is
-- ON CONFLICT DO UPDATE (re-running REFRESHES the spine), and the ledger inserts are
-- ON CONFLICT DO NOTHING. Safe to paste twice.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. montree_master_works — the curriculum spine
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_master_works (
  work_key      TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  name_chinese  TEXT,
  area_key      TEXT NOT NULL,
  category_name TEXT,
  sequence      INTEGER NOT NULL,
  age_range     TEXT,
  aliases       JSONB   DEFAULT '[]'::jsonb,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reads are "the whole area in order" and "the whole spine in order".
CREATE INDEX IF NOT EXISTS idx_montree_master_works_area_sequence
  ON montree_master_works (area_key, sequence);
CREATE INDEX IF NOT EXISTS idx_montree_master_works_sequence
  ON montree_master_works (sequence);

-- Case-insensitive name lookup — how a free-text work_name off a paper sheet or a
-- legacy progress row is resolved back onto the spine.
CREATE INDEX IF NOT EXISTS idx_montree_master_works_name_lower
  ON montree_master_works (LOWER(name));

-- ─────────────────────────────────────────────────────────────────────────
-- 2. montree_progress_events — append-only progress journal
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_progress_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID NOT NULL,
  school_id    UUID,
  classroom_id UUID,
  work_key     TEXT,
  work_name    TEXT NOT NULL,
  area         TEXT,
  old_status   TEXT,
  new_status   TEXT NOT NULL,
  source       TEXT NOT NULL,
  actor        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No FKs by design: this is a journal. A child deleted tomorrow must not erase the
-- history that fed last month's institutional rollup, and a write to the journal must
-- never be able to fail the progress write it is describing.
CREATE INDEX IF NOT EXISTS idx_montree_progress_events_child
  ON montree_progress_events (child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_montree_progress_events_school
  ON montree_progress_events (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_montree_progress_events_classroom
  ON montree_progress_events (classroom_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. RLS — service-role-only, same posture as 313_curriculum_rls_lockdown
-- ─────────────────────────────────────────────────────────────────────────
-- 313 established the rule: RLS ENABLED with ZERO policies = deny-all for anon and
-- authenticated (the roles a browser holds via NEXT_PUBLIC_SUPABASE_ANON_KEY), while
-- the service-role key bypasses RLS entirely. Every app read/write to these two tables
-- goes through getSupabase() (service role), so creating no policy is the whole
-- security model — and it is the safe default a policy-less table gets for free.
-- Do NOT add a `FOR ALL USING (true)` policy here: without a `TO service_role` clause
-- that defaults to PUBLIC and re-opens exactly the hole 313 closed.
ALTER TABLE montree_master_works    ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_progress_events ENABLE ROW LEVEL SECURITY;

-- Belt and braces: drop any same-named permissive policy a previous hand-run may have
-- left behind, so re-pasting this file always converges on deny-all.
DROP POLICY IF EXISTS "Service role full access master works"    ON montree_master_works;
DROP POLICY IF EXISTS "Service role full access progress events" ON montree_progress_events;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. montree_migrations — the ledger
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE montree_migrations ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Seed the spine — 329 works from lib/montree/stem/*.json
-- ─────────────────────────────────────────────────────────────────────────
-- ON CONFLICT DO UPDATE: re-pasting this migration REFRESHES names, sequences and
-- aliases from the catalog. is_active is deliberately NOT refreshed — retiring a work
-- is an operational decision that must survive a re-run.
-- 329 works, generated by scripts/institutions/generate-master-seed.mjs
-- DO NOT HAND-EDIT: re-run the generator and re-paste.

INSERT INTO montree_master_works
  (work_key, name, name_chinese, area_key, category_name, sequence, age_range, aliases)
VALUES
  ('pl_carrying_mat', 'Carrying a Mat', '蒙特梭利工作毯', 'practical_life', 'Preliminary Exercises', 10101, 'primary_year1', '[]'::jsonb),
  ('pl_carrying_chair', 'Carrying a Chair', '蒙特梭利椅子', 'practical_life', 'Preliminary Exercises', 10102, 'primary_year1', '[]'::jsonb),
  ('pl_carrying_tray', 'Carrying a Tray', '蒙特梭利托盘', 'practical_life', 'Preliminary Exercises', 10103, 'primary_year1', '[]'::jsonb),
  ('pl_carrying_table', 'Carrying a Table', '蒙特梭利桌子搬运', 'practical_life', 'Preliminary Exercises', 10104, 'primary_year1', '[]'::jsonb),
  ('pl_opening_closing_door', 'Opening and Closing a Door', '蒙特梭利开关门', 'practical_life', 'Preliminary Exercises', 10105, 'primary_year1', '[]'::jsonb),
  ('pl_walking_line', 'Walking on the Line', '蒙特梭利走线', 'practical_life', 'Preliminary Exercises', 10106, 'primary_year1', '["Line Walking","Walking the Line"]'::jsonb),
  ('pl_sitting_standing', 'Sitting and Standing at a Table', '蒙特梭利坐站礼仪', 'practical_life', 'Preliminary Exercises', 10107, 'primary_year1', '[]'::jsonb),
  ('pl_silence_game', 'The Silence Game', '蒙特梭利安静游戏', 'practical_life', 'Preliminary Exercises', 10108, 'primary_year1', '["Silence Activity","Quiet Game"]'::jsonb),
  ('pl_turning_pages', 'Turning Pages of a Book', '蒙特梭利翻书页', 'practical_life', 'Preliminary Exercises', 10109, 'primary_year1', '[]'::jsonb),
  ('pl_folding_cloth', 'Folding Cloths', '蒙特梭利折布', 'practical_life', 'Preliminary Exercises', 10110, 'primary_year1', '["Cloth Folding","Napkin Folding"]'::jsonb),
  ('pl_opening_closing_containers', 'Opening and Closing Containers', '蒙特梭利开关容器', 'practical_life', 'Preliminary Exercises', 10111, 'primary_year1', '[]'::jsonb),
  ('pl_nuts_and_bolts', 'Nuts and Bolts Board', '蒙特梭利螺母螺栓板', 'practical_life', 'Preliminary Exercises', 10112, 'primary_year1', '[]'::jsonb),
  ('pl_dry_transfer_hand', 'Dry Transfer - Hands', '蒙特梭利手抓转移', 'practical_life', 'Transfer Activities', 10201, 'primary_year1', '[]'::jsonb),
  ('pl_spooning', 'Spooning', '蒙特梭利勺子转移', 'practical_life', 'Transfer Activities', 10202, 'primary_year1', '["Transfer with Spoon","Spoon Transfer","Dry Spooning"]'::jsonb),
  ('pl_tonging', 'Tonging', '蒙特梭利夹子转移', 'practical_life', 'Transfer Activities', 10203, 'primary_year1', '["Tong Transfer","Using Tongs"]'::jsonb),
  ('pl_tweezers', 'Tweezers Transfer', '蒙特梭利镊子转移', 'practical_life', 'Transfer Activities', 10204, 'primary_year1', '[]'::jsonb),
  ('pl_chopsticks', 'Chopsticks Transfer', '蒙特梭利筷子转移', 'practical_life', 'Transfer Activities', 10205, 'primary_year2', '[]'::jsonb),
  ('pl_pouring_dry', 'Pouring Dry Materials', '蒙特梭利干倒', 'practical_life', 'Transfer Activities', 10206, 'primary_year1', '["Dry Pouring","Dry Transfer Pouring"]'::jsonb),
  ('pl_pouring_water', 'Pouring Water', '蒙特梭利倒水', 'practical_life', 'Transfer Activities', 10207, 'primary_year1', '["Water Pouring","Wet Pouring","Water Transfer"]'::jsonb),
  ('pl_sponging', 'Sponging', '蒙特梭利海绵转移', 'practical_life', 'Transfer Activities', 10208, 'primary_year1', '[]'::jsonb),
  ('pl_basting', 'Basting (Turkey Baster)', '蒙特梭利滴管大', 'practical_life', 'Transfer Activities', 10209, 'primary_year1', '[]'::jsonb),
  ('pl_dropper', 'Eye Dropper', '蒙特梭利滴管', 'practical_life', 'Transfer Activities', 10210, 'primary_year1', '["Dropper Transfer","Eye Dropper Transfer","Dropper Water Transfer"]'::jsonb),
  ('pl_stirring', 'Stirring', '蒙特梭利搅拌', 'practical_life', 'Transfer Activities', 10211, 'primary_year1', '[]'::jsonb),
  ('pl_hammering', 'Hammering', '蒙特梭利锤击', 'practical_life', 'Transfer Activities', 10212, 'primary_year1', '[]'::jsonb),
  ('pl_frame_velcro', 'Velcro Frame', '蒙特梭利魔术贴框', 'practical_life', 'Dressing Frames', 10301, 'primary_year1', '[]'::jsonb),
  ('pl_frame_snaps', 'Snaps Frame', '蒙特梭利按扣框', 'practical_life', 'Dressing Frames', 10302, 'primary_year1', '[]'::jsonb),
  ('pl_frame_large_buttons', 'Large Buttons Frame', '蒙特梭利大纽扣框', 'practical_life', 'Dressing Frames', 10303, 'primary_year1', '[]'::jsonb),
  ('pl_frame_small_buttons', 'Small Buttons Frame', '蒙特梭利小纽扣框', 'practical_life', 'Dressing Frames', 10304, 'primary_year1', '[]'::jsonb),
  ('pl_frame_zipper', 'Zipper Frame', '蒙特梭利拉链框', 'practical_life', 'Dressing Frames', 10305, 'primary_year1', '[]'::jsonb),
  ('pl_frame_hook_eye', 'Hook and Eye Frame', '蒙特梭利钩眼框', 'practical_life', 'Dressing Frames', 10306, 'primary_year1', '[]'::jsonb),
  ('pl_frame_buckles', 'Buckles Frame', '蒙特梭利皮带扣框', 'practical_life', 'Dressing Frames', 10307, 'primary_year1', '[]'::jsonb),
  ('pl_frame_safety_pins', 'Safety Pins Frame', '蒙特梭利安全别针框', 'practical_life', 'Dressing Frames', 10308, 'primary_year2', '[]'::jsonb),
  ('pl_frame_lacing', 'Lacing Frame', '蒙特梭利穿孔框', 'practical_life', 'Dressing Frames', 10309, 'primary_year1', '[]'::jsonb),
  ('pl_frame_bow_tying', 'Bow Tying Frame', '蒙特梭利蝴蝶结框', 'practical_life', 'Dressing Frames', 10310, 'primary_year2', '["Bow Frame","Tying Bows"]'::jsonb),
  ('pl_shoe_polishing', 'Shoe Polishing', '蒙特梭利擦鞋', 'practical_life', 'Dressing Frames', 10311, 'primary_year1', '["Polishing Shoes","Boot Polishing"]'::jsonb),
  ('pl_braiding', 'Braiding Frame', '蒙特梭利编织框', 'practical_life', 'Dressing Frames', 10312, 'primary_year2', '[]'::jsonb),
  ('pl_hand_washing', 'Hand Washing', '蒙特梭利洗手台', 'practical_life', 'Care of Self', 10401, 'primary_year1', '[]'::jsonb),
  ('pl_face_washing', 'Face Washing', '蒙特梭利洗脸', 'practical_life', 'Care of Self', 10402, 'primary_year1', '[]'::jsonb),
  ('pl_teeth_brushing', 'Teeth Brushing', '蒙特梭利刷牙', 'practical_life', 'Care of Self', 10403, 'primary_year1', '[]'::jsonb),
  ('pl_nose_blowing', 'Nose Blowing', '蒙特梭利擤鼻涕', 'practical_life', 'Care of Self', 10404, 'primary_year1', '[]'::jsonb),
  ('pl_coughing_sneezing', 'Covering Coughs and Sneezes', '蒙特梭利咳嗽喷嚏礼仪', 'practical_life', 'Care of Self', 10405, 'primary_year1', '[]'::jsonb),
  ('pl_hair_brushing', 'Hair Brushing/Combing', '蒙特梭利梳头', 'practical_life', 'Care of Self', 10406, 'primary_year1', '[]'::jsonb),
  ('pl_hair_washing', 'Hair Washing', '蒙特梭利洗头', 'practical_life', 'Care of Self', 10407, 'primary_year2', '[]'::jsonb),
  ('pl_dressing_self', 'Dressing Oneself', '蒙特梭利自己穿衣', 'practical_life', 'Care of Self', 10408, 'primary_year1', '[]'::jsonb),
  ('pl_dusting', 'Dusting', '蒙特梭利掸灰', 'practical_life', 'Care of Environment', 10501, 'primary_year1', '[]'::jsonb),
  ('pl_sweeping', 'Sweeping', '蒙特梭利扫地', 'practical_life', 'Care of Environment', 10502, 'primary_year1', '[]'::jsonb),
  ('pl_mopping', 'Mopping', '蒙特梭利拖地', 'practical_life', 'Care of Environment', 10503, 'primary_year1', '[]'::jsonb),
  ('pl_table_scrubbing', 'Table Scrubbing', '蒙特梭利擦桌子', 'practical_life', 'Care of Environment', 10504, 'primary_year1', '[]'::jsonb),
  ('pl_window_washing', 'Window Washing', '蒙特梭利擦窗户', 'practical_life', 'Care of Environment', 10505, 'primary_year1', '[]'::jsonb),
  ('pl_polishing_wood', 'Wood Polishing', '蒙特梭利木器抛光', 'practical_life', 'Care of Environment', 10506, 'primary_year1', '[]'::jsonb)
ON CONFLICT (work_key) DO UPDATE SET
  name          = EXCLUDED.name,
  name_chinese  = EXCLUDED.name_chinese,
  area_key      = EXCLUDED.area_key,
  category_name = EXCLUDED.category_name,
  sequence      = EXCLUDED.sequence,
  age_range     = EXCLUDED.age_range,
  aliases       = EXCLUDED.aliases,
  updated_at    = NOW();

INSERT INTO montree_master_works
  (work_key, name, name_chinese, area_key, category_name, sequence, age_range, aliases)
VALUES
  ('pl_polishing_metal', 'Metal Polishing', '蒙特梭利金属抛光', 'practical_life', 'Care of Environment', 10507, 'primary_year1', '[]'::jsonb),
  ('pl_polishing_glass', 'Glass Polishing', '蒙特梭利玻璃抛光', 'practical_life', 'Care of Environment', 10508, 'primary_year1', '[]'::jsonb),
  ('pl_plant_care', 'Plant Care', '蒙特梭利植物护理', 'practical_life', 'Care of Environment', 10509, 'primary_year1', '[]'::jsonb),
  ('pl_flower_arranging', 'Flower Arranging', '蒙特梭利插花', 'practical_life', 'Care of Environment', 10510, 'primary_year1', '[]'::jsonb),
  ('pl_animal_care', 'Animal Care', '蒙特梭利动物护理', 'practical_life', 'Care of Environment', 10511, 'primary_year1', '[]'::jsonb),
  ('pl_dish_washing', 'Dish Washing', '蒙特梭利洗碗', 'practical_life', 'Care of Environment', 10512, 'primary_year1', '[]'::jsonb),
  ('pl_laundry', 'Laundry - Hand Washing', '蒙特梭利手洗衣物', 'practical_life', 'Care of Environment', 10513, 'primary_year1', '[]'::jsonb),
  ('pl_folding_laundry', 'Folding Laundry', '蒙特梭利折叠衣物', 'practical_life', 'Care of Environment', 10514, 'primary_year1', '[]'::jsonb),
  ('pl_ironing', 'Ironing', '蒙特梭利熨烫', 'practical_life', 'Care of Environment', 10515, 'primary_year2', '[]'::jsonb),
  ('pl_greetings', 'Greetings', '蒙特梭利问候礼仪', 'practical_life', 'Grace and Courtesy', 10601, 'primary_year1', '[]'::jsonb),
  ('pl_introductions', 'Introductions', '蒙特梭利自我介绍', 'practical_life', 'Grace and Courtesy', 10602, 'primary_year1', '[]'::jsonb),
  ('pl_please_thank_you', 'Please and Thank You', '蒙特梭利请谢谢', 'practical_life', 'Grace and Courtesy', 10603, 'primary_year1', '[]'::jsonb),
  ('pl_excuse_me', 'Saying Excuse Me', '蒙特梭利借过打扰', 'practical_life', 'Grace and Courtesy', 10604, 'primary_year1', '[]'::jsonb),
  ('pl_interrupting', 'How to Interrupt', '蒙特梭利礼貌打断', 'practical_life', 'Grace and Courtesy', 10605, 'primary_year1', '[]'::jsonb),
  ('pl_offering_help', 'Offering and Accepting Help', '蒙特梭利提供帮助', 'practical_life', 'Grace and Courtesy', 10606, 'primary_year1', '[]'::jsonb),
  ('pl_apologizing', 'Apologizing', '蒙特梭利道歉', 'practical_life', 'Grace and Courtesy', 10607, 'primary_year1', '[]'::jsonb),
  ('pl_table_manners', 'Table Manners', '蒙特梭利餐桌礼仪', 'practical_life', 'Grace and Courtesy', 10608, 'primary_year1', '[]'::jsonb),
  ('pl_table_setting', 'Setting the Table', '蒙特梭利摆餐具', 'practical_life', 'Grace and Courtesy', 10609, 'primary_year1', '[]'::jsonb),
  ('pl_observing_work', 'Observing Another''s Work', '蒙特梭利观察他人工作', 'practical_life', 'Grace and Courtesy', 10610, 'primary_year1', '[]'::jsonb),
  ('pl_walking_around_work', 'Walking Around Someone''s Work', '蒙特梭利绕开工作区', 'practical_life', 'Grace and Courtesy', 10611, 'primary_year1', '[]'::jsonb),
  ('pl_sharing', 'Sharing and Taking Turns', '蒙特梭利分享轮流', 'practical_life', 'Grace and Courtesy', 10612, 'primary_year1', '[]'::jsonb),
  ('pl_washing_produce', 'Washing Fruits and Vegetables', '蒙特梭利洗水果蔬菜', 'practical_life', 'Food Preparation', 10701, 'primary_year1', '[]'::jsonb),
  ('pl_spreading', 'Spreading', '蒙特梭利涂抹', 'practical_life', 'Food Preparation', 10702, 'primary_year1', '[]'::jsonb),
  ('pl_peeling_easy', 'Peeling - Easy Items', '蒙特梭利剥皮简单', 'practical_life', 'Food Preparation', 10703, 'primary_year1', '[]'::jsonb),
  ('pl_peeling_tool', 'Peeling - With Peeler', '蒙特梭利削皮器', 'practical_life', 'Food Preparation', 10704, 'primary_year2', '[]'::jsonb),
  ('pl_cutting_soft', 'Cutting Soft Foods', '蒙特梭利切软食物', 'practical_life', 'Food Preparation', 10705, 'primary_year1', '[]'::jsonb),
  ('pl_cutting_hard', 'Cutting Harder Foods', '蒙特梭利切硬食物', 'practical_life', 'Food Preparation', 10706, 'primary_year2', '[]'::jsonb),
  ('pl_grating', 'Grating', '蒙特梭利擦丝器', 'practical_life', 'Food Preparation', 10707, 'primary_year2', '[]'::jsonb),
  ('pl_juicing', 'Juicing', '蒙特梭利榨汁', 'practical_life', 'Food Preparation', 10708, 'primary_year1', '[]'::jsonb),
  ('pl_cracking_eggs', 'Cracking Eggs', '蒙特梭利打鸡蛋', 'practical_life', 'Food Preparation', 10709, 'primary_year2', '[]'::jsonb),
  ('pl_making_snack', 'Making a Snack', '蒙特梭利制作点心', 'practical_life', 'Food Preparation', 10710, 'primary_year1', '[]'::jsonb),
  ('pl_mixing_stirring_food', 'Mixing and Stirring Food', '蒙特梭利食物搅拌', 'practical_life', 'Food Preparation', 10711, 'primary_year1', '[]'::jsonb),
  ('pl_threading_beads', 'Threading Beads', '蒙特梭利串珠', 'practical_life', 'Sewing and Needlework', 10801, 'primary_year1', '[]'::jsonb),
  ('pl_sewing_cards', 'Sewing Cards', '蒙特梭利缝纫卡', 'practical_life', 'Sewing and Needlework', 10802, 'primary_year1', '[]'::jsonb),
  ('pl_punching', 'Paper Punching', '蒙特梭利打孔器', 'practical_life', 'Sewing and Needlework', 10803, 'primary_year1', '[]'::jsonb),
  ('pl_running_stitch', 'Running Stitch', '蒙特梭利平针', 'practical_life', 'Sewing and Needlework', 10804, 'primary_year2', '[]'::jsonb),
  ('pl_cross_stitch', 'Cross Stitch', '蒙特梭利十字绣', 'practical_life', 'Sewing and Needlework', 10805, 'primary_year3', '[]'::jsonb),
  ('pl_button_sewing', 'Sewing a Button', '蒙特梭利缝纽扣', 'practical_life', 'Sewing and Needlework', 10806, 'primary_year3', '[]'::jsonb),
  ('pl_weaving', 'Weaving', '蒙特梭利编织', 'practical_life', 'Sewing and Needlework', 10807, 'primary_year2', '[]'::jsonb),
  ('se_cylinder_block_1', 'Cylinder Block 1', '蒙特梭利圆柱体插座1', 'sensorial', 'Visual Sense - Dimension', 20101, 'primary_year1', '[]'::jsonb),
  ('se_cylinder_block_2', 'Cylinder Block 2', '蒙特梭利圆柱体插座2', 'sensorial', 'Visual Sense - Dimension', 20102, 'primary_year1', '[]'::jsonb),
  ('se_cylinder_block_3', 'Cylinder Block 3', '蒙特梭利圆柱体插座3', 'sensorial', 'Visual Sense - Dimension', 20103, 'primary_year1', '[]'::jsonb),
  ('se_cylinder_block_4', 'Cylinder Block 4', '蒙特梭利圆柱体插座4', 'sensorial', 'Visual Sense - Dimension', 20104, 'primary_year1', '[]'::jsonb),
  ('se_cylinder_blocks_combined', 'Cylinder Blocks Combined', '蒙特梭利圆柱体插座组合', 'sensorial', 'Visual Sense - Dimension', 20105, 'primary_year1', '[]'::jsonb),
  ('se_pink_tower', 'Pink Tower', '蒙特梭利粉红塔', 'sensorial', 'Visual Sense - Dimension', 20106, 'primary_year1', '["Tower of Cubes","Pink Cubes","Tower"]'::jsonb),
  ('se_brown_stair', 'Brown Stair (Broad Stair)', '蒙特梭利棕色梯', 'sensorial', 'Visual Sense - Dimension', 20107, 'primary_year1', '["Broad Stair","Brown Stairs","Wide Stair"]'::jsonb),
  ('se_red_rods', 'Red Rods (Long Rods)', '蒙特梭利红棒', 'sensorial', 'Visual Sense - Dimension', 20108, 'primary_year1', '["Long Rods","Red Sticks"]'::jsonb),
  ('se_knobless_cylinders', 'Knobless Cylinders', '蒙特梭利无柄圆柱体', 'sensorial', 'Visual Sense - Dimension', 20109, 'primary_year1', '["Colored Cylinders","Knobless Cylinder Set"]'::jsonb),
  ('se_pink_tower_brown_stair', 'Pink Tower and Brown Stair Combination', '蒙特梭利粉红塔与棕色梯组合', 'sensorial', 'Visual Sense - Dimension', 20110, 'primary_year1', '[]'::jsonb),
  ('se_dimension_distance', 'Distance Exercises', '蒙特梭利远距离练习', 'sensorial', 'Visual Sense - Dimension', 20111, 'primary_year2', '[]'::jsonb)
ON CONFLICT (work_key) DO UPDATE SET
  name          = EXCLUDED.name,
  name_chinese  = EXCLUDED.name_chinese,
  area_key      = EXCLUDED.area_key,
  category_name = EXCLUDED.category_name,
  sequence      = EXCLUDED.sequence,
  age_range     = EXCLUDED.age_range,
  aliases       = EXCLUDED.aliases,
  updated_at    = NOW();

INSERT INTO montree_master_works
  (work_key, name, name_chinese, area_key, category_name, sequence, age_range, aliases)
VALUES
  ('se_color_box_1', 'Color Box 1 (Primary Colors)', '蒙特梭利颜色盒1', 'sensorial', 'Visual Sense - Color', 20201, 'primary_year1', '["Color Tablets Box 1","Primary Color Box","Colour Box 1"]'::jsonb),
  ('se_color_box_2', 'Color Box 2 (Secondary Colors)', '蒙特梭利颜色盒2', 'sensorial', 'Visual Sense - Color', 20202, 'primary_year1', '["Color Tablets Box 2","Secondary Color Box","Colour Box 2"]'::jsonb),
  ('se_color_box_3', 'Color Box 3 (Color Gradations)', '蒙特梭利颜色盒3', 'sensorial', 'Visual Sense - Color', 20203, 'primary_year1', '["Color Tablets Box 3","Color Gradation Box","Colour Box 3"]'::jsonb),
  ('se_geometric_cabinet', 'Geometric Cabinet', '蒙特梭利几何图形柜', 'sensorial', 'Visual Sense - Form', 20301, 'primary_year1', '["Geometry Cabinet","Geometric Cabinet and Cards"]'::jsonb),
  ('se_geometric_solids', 'Geometric Solids', '蒙特梭利几何立体组', 'sensorial', 'Visual Sense - Form', 20302, 'primary_year1', '["3D Shapes","Geometric Forms","Solid Shapes"]'::jsonb),
  ('se_constructive_triangles_rect', 'Constructive Triangles - Rectangular Box', '蒙特梭利构成三角形-长方形盒', 'sensorial', 'Visual Sense - Form', 20303, 'primary_year1', '["Rectangular Triangle Box","First Triangle Box"]'::jsonb),
  ('se_constructive_triangles_tri', 'Constructive Triangles - Triangular Box', '蒙特梭利构成三角形-三角形盒', 'sensorial', 'Visual Sense - Form', 20304, 'primary_year1', '[]'::jsonb),
  ('se_constructive_triangles_large_hex', 'Constructive Triangles - Large Hexagonal Box', '蒙特梭利构成三角形-大六边形盒', 'sensorial', 'Visual Sense - Form', 20305, 'primary_year1', '[]'::jsonb),
  ('se_constructive_triangles_small_hex', 'Constructive Triangles - Small Hexagonal Box', '蒙特梭利构成三角形-小六边形盒', 'sensorial', 'Visual Sense - Form', 20306, 'primary_year2', '[]'::jsonb),
  ('se_constructive_triangles_blue', 'Constructive Triangles - Blue Triangles', '蒙特梭利蓝色构成三角形', 'sensorial', 'Visual Sense - Form', 20307, 'primary_year2', '[]'::jsonb),
  ('se_binomial_cube', 'Binomial Cube', '蒙特梭利二项式立方体', 'sensorial', 'Visual Sense - Form', 20308, 'primary_year1', '["Binomial Box"]'::jsonb),
  ('se_trinomial_cube', 'Trinomial Cube', '蒙特梭利三项式立方体', 'sensorial', 'Visual Sense - Form', 20309, 'primary_year2', '["Trinomial Box"]'::jsonb),
  ('se_superimposed_geometric_figures', 'Superimposed Geometric Figures', '蒙特梭利叠加几何图形', 'sensorial', 'Visual Sense - Form', 20310, 'primary_year2', '[]'::jsonb),
  ('se_geometric_form_cards', 'Geometric Form Cards', '蒙特梭利几何形状卡片', 'sensorial', 'Visual Sense - Form', 20311, 'primary_year1', '[]'::jsonb),
  ('se_botany_cabinet', 'Botany Cabinet', '蒙特梭利植物学柜', 'sensorial', 'Visual Sense - Form', 20312, 'primary_year1', '[]'::jsonb),
  ('se_touch_boards', 'Touch Boards', '蒙特梭利触觉板', 'sensorial', 'Tactile Sense', 20401, 'primary_year1', '["Rough and Smooth Boards","Tactile Boards"]'::jsonb),
  ('se_touch_tablets', 'Touch Tablets (Rough and Smooth)', '蒙特梭利触觉片', 'sensorial', 'Tactile Sense', 20402, 'primary_year1', '["Rough and Smooth Tablets","Tactile Tablets"]'::jsonb),
  ('se_fabric_matching', 'Fabric Matching', '蒙特梭利布料配对盒', 'sensorial', 'Tactile Sense', 20403, 'primary_year1', '["Fabric Box","Textile Matching"]'::jsonb),
  ('se_sorting_grains', 'Sorting Grains', '蒙特梭利谷物分类', 'sensorial', 'Tactile Sense', 20404, 'primary_year1', '[]'::jsonb),
  ('se_baric_tablets', 'Baric Tablets', '蒙特梭利重量板', 'sensorial', 'Baric Sense', 20501, 'primary_year1', '[]'::jsonb),
  ('se_thermic_tablets', 'Thermic Tablets', '蒙特梭利温觉板', 'sensorial', 'Thermic Sense', 20601, 'primary_year1', '[]'::jsonb),
  ('se_thermic_bottles', 'Thermic Bottles', '蒙特梭利温度瓶', 'sensorial', 'Thermic Sense', 20602, 'primary_year1', '[]'::jsonb),
  ('se_sound_boxes', 'Sound Boxes (Sound Cylinders)', '蒙特梭利听觉筒', 'sensorial', 'Auditory Sense', 20701, 'primary_year1', '[]'::jsonb),
  ('se_bells', 'Montessori Bells', '蒙特梭利音乐铃', 'sensorial', 'Auditory Sense', 20702, 'primary_year2', '[]'::jsonb),
  ('se_smelling_bottles', 'Smelling Bottles', '蒙特梭利嗅觉瓶', 'sensorial', 'Olfactory Sense', 20801, 'primary_year1', '[]'::jsonb),
  ('se_tasting_bottles', 'Tasting Bottles/Cups', '蒙特梭利味觉瓶', 'sensorial', 'Gustatory Sense', 20901, 'primary_year1', '[]'::jsonb),
  ('se_mystery_bag', 'Mystery Bag', '蒙特梭利神秘袋', 'sensorial', 'Stereognostic Sense', 21001, 'primary_year1', '[]'::jsonb),
  ('se_sorting_objects', 'Sorting Objects Stereognostically', '蒙特梭利盲摸分类', 'sensorial', 'Stereognostic Sense', 21002, 'primary_year1', '[]'::jsonb),
  ('ma_number_rods', 'Number Rods', '蒙特梭利数棒', 'mathematics', 'Introduction to Numbers (1-10)', 30101, 'primary_year1', '["Red and Blue Rods","Number Sticks"]'::jsonb),
  ('ma_sandpaper_numerals', 'Sandpaper Numerals', '蒙特梭利砂纸数字', 'mathematics', 'Introduction to Numbers (1-10)', 30102, 'primary_year1', '["Sandpaper Numbers","Tactile Numbers"]'::jsonb),
  ('ma_number_rods_numerals', 'Number Rods with Numerals', '蒙特梭利数棒与数字卡', 'mathematics', 'Introduction to Numbers (1-10)', 30103, 'primary_year1', '[]'::jsonb),
  ('ma_spindle_box', 'Spindle Boxes', '蒙特梭利纺锤棒箱', 'mathematics', 'Introduction to Numbers (1-10)', 30104, 'primary_year1', '["Spindle Box","Spindles"]'::jsonb),
  ('ma_cards_counters', 'Cards and Counters', '蒙特梭利数字与筹码', 'mathematics', 'Introduction to Numbers (1-10)', 30105, 'primary_year1', '["Cards and Counters","Odd and Even"]'::jsonb),
  ('ma_memory_game', 'Memory Game of Numbers', '蒙特梭利数字记忆游戏', 'mathematics', 'Introduction to Numbers (1-10)', 30106, 'primary_year1', '[]'::jsonb),
  ('ma_number_puzzles', 'Number Puzzles and Games', '蒙特梭利数字拼图', 'mathematics', 'Introduction to Numbers (1-10)', 30107, 'primary_year1', '[]'::jsonb),
  ('ma_short_bead_stair', 'Short Bead Stair', '蒙特梭利彩色串珠梯', 'mathematics', 'Introduction to Numbers (1-10)', 30108, 'primary_year1', '[]'::jsonb),
  ('ma_golden_beads_intro', 'Introduction to Golden Beads', '蒙特梭利金色串珠', 'mathematics', 'Decimal System', 30201, 'primary_year1', '["Golden Bead Material","Decimal System","Golden Beads"]'::jsonb),
  ('ma_golden_beads_tray', 'Golden Bead Tray Exercises', '蒙特梭利金珠托盘', 'mathematics', 'Decimal System', 30202, 'primary_year1', '[]'::jsonb),
  ('ma_large_numeral_cards', 'Large Numeral Cards', '蒙特梭利大数字卡', 'mathematics', 'Decimal System', 30203, 'primary_year1', '[]'::jsonb),
  ('ma_formation_quantity', 'Formation of Quantity', '蒙特梭利金珠数量形成', 'mathematics', 'Decimal System', 30204, 'primary_year1', '[]'::jsonb),
  ('ma_formation_symbol', 'Formation of Symbol', '蒙特梭利金珠符号形成', 'mathematics', 'Decimal System', 30205, 'primary_year1', '[]'::jsonb),
  ('ma_association_quantity_symbol', 'Association of Quantity and Symbol', '蒙特梭利金珠数量符号对应', 'mathematics', 'Decimal System', 30206, 'primary_year1', '[]'::jsonb),
  ('ma_exchange_game', 'Exchange Game (Change Game)', '蒙特梭利金珠换算游戏', 'mathematics', 'Decimal System', 30207, 'primary_year1', '["Change Game","Trading Game"]'::jsonb),
  ('ma_golden_beads_addition', 'Golden Bead Addition', '蒙特梭利金珠加法', 'mathematics', 'Decimal System', 30208, 'primary_year2', '[]'::jsonb),
  ('ma_golden_beads_subtraction', 'Golden Bead Subtraction', '蒙特梭利金珠减法', 'mathematics', 'Decimal System', 30209, 'primary_year2', '[]'::jsonb),
  ('ma_golden_beads_multiplication', 'Golden Bead Multiplication', '蒙特梭利金珠乘法', 'mathematics', 'Decimal System', 30210, 'primary_year2', '[]'::jsonb),
  ('ma_golden_beads_division', 'Golden Bead Division', '蒙特梭利金珠除法', 'mathematics', 'Decimal System', 30211, 'primary_year2', '[]'::jsonb),
  ('ma_teen_board_1', 'Teen Board 1 (Seguin Board A)', '蒙特梭利十位板1', 'mathematics', 'Teens and Tens', 30301, 'primary_year1', '["Seguin Board A","Teens Board"]'::jsonb),
  ('ma_teen_board_2', 'Teen Board 2 (Seguin Board B)', '蒙特梭利十位板2', 'mathematics', 'Teens and Tens', 30302, 'primary_year1', '[]'::jsonb),
  ('ma_ten_board_1', 'Ten Board 1 (Seguin Board C)', '蒙特梭利十位板3', 'mathematics', 'Teens and Tens', 30303, 'primary_year1', '["Seguin Board C","Tens Board"]'::jsonb)
ON CONFLICT (work_key) DO UPDATE SET
  name          = EXCLUDED.name,
  name_chinese  = EXCLUDED.name_chinese,
  area_key      = EXCLUDED.area_key,
  category_name = EXCLUDED.category_name,
  sequence      = EXCLUDED.sequence,
  age_range     = EXCLUDED.age_range,
  aliases       = EXCLUDED.aliases,
  updated_at    = NOW();

INSERT INTO montree_master_works
  (work_key, name, name_chinese, area_key, category_name, sequence, age_range, aliases)
VALUES
  ('ma_ten_board_2', 'Ten Board 2 (Seguin Board D)', '蒙特梭利十位板4', 'mathematics', 'Teens and Tens', 30304, 'primary_year1', '[]'::jsonb),
  ('ma_hundred_board', 'Hundred Board', '蒙特梭利百数板', 'mathematics', 'Teens and Tens', 30305, 'primary_year1', '["100 Board","Hundred Chart"]'::jsonb),
  ('ma_hundred_chain', 'Hundred Chain', '蒙特梭利百珠链', 'mathematics', 'Teens and Tens', 30306, 'primary_year1', '[]'::jsonb),
  ('ma_thousand_chain', 'Thousand Chain', '蒙特梭利千珠链', 'mathematics', 'Teens and Tens', 30307, 'primary_year2', '[]'::jsonb),
  ('ma_short_chains', 'Short Bead Chains (Squares)', '蒙特梭利短串珠链', 'mathematics', 'Linear Counting (Bead Chains)', 30401, 'primary_year2', '["Bead Chains Squares","Square Chains","Short Chains"]'::jsonb),
  ('ma_long_chains', 'Long Bead Chains (Cubes)', '蒙特梭利长串珠链', 'mathematics', 'Linear Counting (Bead Chains)', 30402, 'primary_year2', '["Bead Chains Cubes","Cube Chains","Long Chains"]'::jsonb),
  ('ma_bead_cabinet', 'Bead Cabinet', '蒙特梭利串珠柜', 'mathematics', 'Linear Counting (Bead Chains)', 30403, 'primary_year2', '[]'::jsonb),
  ('ma_addition_snake_game', 'Addition Snake Game', '蒙特梭利加法蛇游戏', 'mathematics', 'Memorization of Math Facts', 30501, 'primary_year2', '["Snake Game Addition","Positive Snake"]'::jsonb),
  ('ma_subtraction_snake_game', 'Subtraction Snake Game', '蒙特梭利减法蛇游戏', 'mathematics', 'Memorization of Math Facts', 30502, 'primary_year2', '["Snake Game Subtraction","Negative Snake"]'::jsonb),
  ('ma_addition_strip_board', 'Addition Strip Board', '蒙特梭利加法条板', 'mathematics', 'Memorization of Math Facts', 30503, 'primary_year2', '[]'::jsonb),
  ('ma_addition_charts', 'Addition Charts (Finger Charts)', '蒙特梭利加法表', 'mathematics', 'Memorization of Math Facts', 30504, 'primary_year2', '[]'::jsonb),
  ('ma_subtraction_strip_board', 'Subtraction Strip Board', '蒙特梭利减法条板', 'mathematics', 'Memorization of Math Facts', 30505, 'primary_year2', '[]'::jsonb),
  ('ma_subtraction_charts', 'Subtraction Charts', '蒙特梭利减法表', 'mathematics', 'Memorization of Math Facts', 30506, 'primary_year2', '[]'::jsonb),
  ('ma_multiplication_bead_board', 'Multiplication Bead Board', '蒙特梭利乘法珠板', 'mathematics', 'Memorization of Math Facts', 30507, 'primary_year2', '["Multiplication Bead Board","Bead Board"]'::jsonb),
  ('ma_multiplication_charts', 'Multiplication Charts', '蒙特梭利乘法表', 'mathematics', 'Memorization of Math Facts', 30508, 'primary_year2', '[]'::jsonb),
  ('ma_unit_division_board', 'Unit Division Board', '蒙特梭利除法板', 'mathematics', 'Memorization of Math Facts', 30509, 'primary_year2', '[]'::jsonb),
  ('ma_division_charts', 'Division Charts', '蒙特梭利除法表', 'mathematics', 'Memorization of Math Facts', 30510, 'primary_year2', '[]'::jsonb),
  ('ma_stamp_game', 'Stamp Game', '蒙特梭利邮票游戏', 'mathematics', 'Passage to Abstraction', 30601, 'primary_year2', '["Stamp Game Exercise","Stamps"]'::jsonb),
  ('ma_dot_game', 'Dot Game', '蒙特梭利点游戏', 'mathematics', 'Passage to Abstraction', 30602, 'primary_year2', '[]'::jsonb),
  ('ma_small_bead_frame', 'Small Bead Frame', '蒙特梭利小算盘', 'mathematics', 'Passage to Abstraction', 30603, 'primary_year3', '[]'::jsonb),
  ('ma_large_bead_frame', 'Large Bead Frame', '蒙特梭利大算盘', 'mathematics', 'Passage to Abstraction', 30604, 'primary_year3', '[]'::jsonb),
  ('ma_checkerboard', 'Checkerboard (Multiplication)', '蒙特梭利棋盘乘法', 'mathematics', 'Passage to Abstraction', 30605, 'primary_year3', '[]'::jsonb),
  ('ma_racks_tubes', 'Racks and Tubes (Long Division)', '蒙特梭利试管除法', 'mathematics', 'Passage to Abstraction', 30606, 'primary_year3', '[]'::jsonb),
  ('ma_decanomial_layout', 'Decanomial Layout', '蒙特梭利十项式排列', 'mathematics', 'Passage to Abstraction', 30607, 'primary_year2', '[]'::jsonb),
  ('ma_fraction_circles', 'Fraction Insets (Metal or Plastic)', '蒙特梭利分数嵌板', 'mathematics', 'Fractions', 30701, 'primary_year2', '[]'::jsonb),
  ('ma_fraction_addition', 'Fraction Addition', '蒙特梭利分数加法', 'mathematics', 'Fractions', 30702, 'primary_year3', '[]'::jsonb),
  ('ma_fraction_subtraction', 'Fraction Subtraction', '蒙特梭利分数减法', 'mathematics', 'Fractions', 30703, 'primary_year3', '[]'::jsonb),
  ('ma_fraction_multiplication', 'Fraction Multiplication', '蒙特梭利分数乘法', 'mathematics', 'Fractions', 30704, 'primary_year3', '[]'::jsonb),
  ('ma_fraction_division', 'Fraction Division', '蒙特梭利分数除法', 'mathematics', 'Fractions', 30705, 'primary_year3', '[]'::jsonb),
  ('ma_fraction_skittles', 'Fraction Skittles', '蒙特梭利分数保龄球', 'mathematics', 'Fractions', 30706, 'primary_year3', '[]'::jsonb),
  ('ma_geometry_sticks', 'Geometry Sticks', '蒙特梭利几何棒', 'mathematics', 'Introduction to Geometry', 30801, 'primary_year2', '[]'::jsonb),
  ('ma_classified_nomenclature', 'Geometry Nomenclature', '蒙特梭利几何命名卡', 'mathematics', 'Introduction to Geometry', 30802, 'primary_year2', '[]'::jsonb),
  ('ma_area_introduction', 'Introduction to Area', '蒙特梭利面积介绍', 'mathematics', 'Introduction to Geometry', 30803, 'primary_year3', '[]'::jsonb),
  ('ma_clock', 'Clock Work', '蒙特梭利时钟', 'mathematics', 'Time and Money', 30901, 'primary_year2', '[]'::jsonb),
  ('ma_money', 'Money Work', '蒙特梭利货币', 'mathematics', 'Time and Money', 30902, 'primary_year2', '[]'::jsonb),
  ('ma_calendar', 'Calendar Work', '蒙特梭利日历', 'mathematics', 'Time and Money', 30903, 'primary_year1', '[]'::jsonb),
  ('ma_length_measurement', 'Length Measurement', '蒙特梭利长度测量', 'mathematics', 'Measurement', 31001, 'primary_year2', '[]'::jsonb),
  ('ma_weight_measurement', 'Weight Measurement', '蒙特梭利重量测量', 'mathematics', 'Measurement', 31002, 'primary_year2', '[]'::jsonb),
  ('la_enrichment_vocabulary', 'Vocabulary Enrichment', '蒙特梭利词汇丰富', 'language', 'Oral Language Development', 40101, 'primary_year1', '[]'::jsonb),
  ('la_classified_cards', 'Classified Cards (Nomenclature Cards)', '蒙特梭利分类卡片', 'language', 'Oral Language Development', 40102, 'primary_year1', '["Nomenclature Cards","3-Part Cards","Three Part Cards"]'::jsonb),
  ('la_object_picture_matching', 'Object to Picture Matching', '蒙特梭利实物图片配对', 'language', 'Oral Language Development', 40103, 'primary_year1', '[]'::jsonb),
  ('la_sound_games', 'Sound Games (I Spy)', '蒙特梭利声音游戏', 'language', 'Oral Language Development', 40104, 'primary_year1', '["I Spy Game","I Spy","Sound Game"]'::jsonb),
  ('la_rhyming', 'Rhyming Activities', '蒙特梭利押韵活动', 'language', 'Oral Language Development', 40105, 'primary_year1', '[]'::jsonb),
  ('la_storytelling', 'Storytelling and Sequencing', '蒙特梭利讲故事', 'language', 'Oral Language Development', 40106, 'primary_year1', '[]'::jsonb),
  ('la_poems_songs', 'Poems, Songs, and Fingerplays', '蒙特梭利诗歌歌曲', 'language', 'Oral Language Development', 40107, 'primary_year1', '[]'::jsonb),
  ('la_conversation', 'Conversation and Discussion', '蒙特梭利对话练习', 'language', 'Oral Language Development', 40108, 'primary_year1', '[]'::jsonb),
  ('la_syllable_work', 'Syllable Work', '蒙特梭利音节练习', 'language', 'Oral Language Development', 40109, 'primary_year1', '[]'::jsonb),
  ('la_metal_insets', 'Metal Insets', '蒙特梭利金属嵌板', 'language', 'Writing Preparation', 40201, 'primary_year1', '["Metal Inset Frames","Insets for Design"]'::jsonb),
  ('la_sandpaper_letters', 'Sandpaper Letters', '蒙特梭利砂纸字母', 'language', 'Writing Preparation', 40202, 'primary_year1', '["Sand Letters","Tactile Letters","Sandpaper Alphabet"]'::jsonb),
  ('la_sand_tray', 'Sand Tray Writing', '蒙特梭利沙盘书写', 'language', 'Writing Preparation', 40203, 'primary_year1', '["Sand Tray","Letter Tracing Tray"]'::jsonb)
ON CONFLICT (work_key) DO UPDATE SET
  name          = EXCLUDED.name,
  name_chinese  = EXCLUDED.name_chinese,
  area_key      = EXCLUDED.area_key,
  category_name = EXCLUDED.category_name,
  sequence      = EXCLUDED.sequence,
  age_range     = EXCLUDED.age_range,
  aliases       = EXCLUDED.aliases,
  updated_at    = NOW();

INSERT INTO montree_master_works
  (work_key, name, name_chinese, area_key, category_name, sequence, age_range, aliases)
VALUES
  ('la_chalkboard_writing', 'Chalkboard Writing', '蒙特梭利黑板书写', 'language', 'Writing Preparation', 40204, 'primary_year1', '[]'::jsonb),
  ('la_moveable_alphabet', 'Moveable Alphabet', '蒙特梭利活动字母', 'language', 'Writing Preparation', 40205, 'primary_year1', '["Movable Alphabet","Large Movable Alphabet","LMA"]'::jsonb),
  ('la_handwriting_paper', 'Handwriting on Paper', '蒙特梭利书写练习', 'language', 'Writing Preparation', 40206, 'primary_year2', '[]'::jsonb),
  ('la_creative_writing', 'Creative Writing', '蒙特梭利创意写作', 'language', 'Writing Preparation', 40207, 'primary_year2', '[]'::jsonb),
  ('la_dictation', 'Dictation', '蒙特梭利听写', 'language', 'Writing Preparation', 40208, 'primary_year2', '[]'::jsonb),
  ('la_copywork', 'Copywork', '蒙特梭利抄写', 'language', 'Writing Preparation', 40209, 'primary_year2', '[]'::jsonb),
  ('la_punctuation', 'Punctuation', '蒙特梭利标点符号', 'language', 'Writing Preparation', 40210, 'primary_year2', '[]'::jsonb),
  ('la_object_boxes', 'Object Boxes (Pink/Blue/Green)', '蒙特梭利物品盒', 'language', 'Reading', 40301, 'primary_year1', '["Sound Boxes","Phonetic Object Box"]'::jsonb),
  ('la_pink_series', 'Pink Series (CVC Words)', '蒙特梭利粉色系列', 'language', 'Reading', 40302, 'primary_year1', '["CVC Words","Pink Reading Series"]'::jsonb),
  ('la_blue_series', 'Blue Series (Blends)', '蒙特梭利蓝色系列', 'language', 'Reading', 40303, 'primary_year1', '["Consonant Blends","Blue Reading Series"]'::jsonb),
  ('la_phonogram_intro', 'Phonogram Introduction', '蒙特梭利音素介绍', 'language', 'Reading', 40304, 'primary_year2', '[]'::jsonb),
  ('la_green_series', 'Green Series (Phonograms)', '蒙特梭利绿色系列', 'language', 'Reading', 40305, 'primary_year2', '["Phonograms","Green Reading Series"]'::jsonb),
  ('la_puzzle_words', 'Puzzle Words (Sight Words)', '蒙特梭利高频词', 'language', 'Reading', 40306, 'primary_year1', '["Sight Words","High Frequency Words"]'::jsonb),
  ('la_reading_analysis', 'Reading Analysis', '蒙特梭利阅读分析', 'language', 'Reading', 40307, 'primary_year2', '[]'::jsonb),
  ('la_reading_classification', 'Reading Classification', '蒙特梭利阅读分类', 'language', 'Reading', 40308, 'primary_year2', '[]'::jsonb),
  ('la_command_cards', 'Command Cards (Action Reading)', '蒙特梭利命令卡', 'language', 'Reading', 40309, 'primary_year1', '["Action Reading Cards","Reading Commands"]'::jsonb),
  ('la_interpretive_reading', 'Interpretive Reading', '蒙特梭利表达性阅读', 'language', 'Reading', 40310, 'primary_year2', '[]'::jsonb),
  ('la_silent_reading', 'Silent Reading', '蒙特梭利默读', 'language', 'Reading', 40311, 'primary_year2', '[]'::jsonb),
  ('la_labelling', 'Labelling the Environment', '蒙特梭利环境标签', 'language', 'Reading', 40312, 'primary_year1', '[]'::jsonb),
  ('la_phonetic_object_box', 'Phonetic Object Box', '蒙特梭利语音物品盒', 'language', 'Reading', 40313, 'primary_year1', '[]'::jsonb),
  ('la_secret_messages', 'Secret Messages', '蒙特梭利秘密信息', 'language', 'Reading', 40315, 'primary_year2', '[]'::jsonb),
  ('la_phonogram_box', 'Phonogram Box', '蒙特梭利语音盒', 'language', 'Reading', 40316, 'primary_year2', '[]'::jsonb),
  ('la_digraph_practice', 'Digraph Practice', '蒙特梭利双字母组合练习', 'language', 'Reading', 40317, 'primary_year1', '[]'::jsonb),
  ('la_story_sequencing_cards', 'Story Sequencing Cards', '蒙特梭利故事排序卡', 'language', 'Reading', 40318, 'primary_year2', '[]'::jsonb),
  ('la_noun_intro', 'Introduction to the Noun', '蒙特梭利名词介绍', 'language', 'Grammar', 40401, 'primary_year2', '[]'::jsonb),
  ('la_article_intro', 'Introduction to the Article', '蒙特梭利冠词介绍', 'language', 'Grammar', 40402, 'primary_year2', '[]'::jsonb),
  ('la_adjective_intro', 'Introduction to the Adjective', '蒙特梭利形容词介绍', 'language', 'Grammar', 40403, 'primary_year2', '[]'::jsonb),
  ('la_verb_intro', 'Introduction to the Verb', '蒙特梭利动词介绍', 'language', 'Grammar', 40404, 'primary_year2', '[]'::jsonb),
  ('la_adverb_intro', 'Introduction to the Adverb', '蒙特梭利副词介绍', 'language', 'Grammar', 40405, 'primary_year2', '[]'::jsonb),
  ('la_pronoun_intro', 'Introduction to the Pronoun', '蒙特梭利代词介绍', 'language', 'Grammar', 40406, 'primary_year2', '[]'::jsonb),
  ('la_preposition_intro', 'Introduction to the Preposition', '蒙特梭利介词介绍', 'language', 'Grammar', 40407, 'primary_year2', '[]'::jsonb),
  ('la_conjunction_intro', 'Introduction to the Conjunction', '蒙特梭利连词介绍', 'language', 'Grammar', 40408, 'primary_year3', '[]'::jsonb),
  ('la_interjection_intro', 'Introduction to the Interjection', '蒙特梭利感叹词介绍', 'language', 'Grammar', 40409, 'primary_year3', '[]'::jsonb),
  ('la_grammar_boxes', 'Grammar Boxes', '蒙特梭利语法盒', 'language', 'Grammar', 40410, 'primary_year3', '[]'::jsonb),
  ('la_sentence_analysis', 'Sentence Analysis', '蒙特梭利句子分析', 'language', 'Grammar', 40411, 'primary_year3', '[]'::jsonb),
  ('la_logical_adjective', 'Logical Adjective Game', '蒙特梭利逻辑形容词游戏', 'language', 'Grammar', 40412, 'primary_year2', '[]'::jsonb),
  ('la_detective_adjective', 'Detective Adjective Game', '蒙特梭利侦探形容词游戏', 'language', 'Grammar', 40413, 'primary_year2', '[]'::jsonb),
  ('la_logical_adverb', 'Logical Adverb Game', '蒙特梭利逻辑副词游戏', 'language', 'Grammar', 40414, 'primary_year2', '[]'::jsonb),
  ('la_verb_command', 'Verb Command Game', '蒙特梭利动词命令游戏', 'language', 'Grammar', 40415, 'primary_year1', '[]'::jsonb),
  ('la_conjunction_exercise', 'Conjunction Exercise', '蒙特梭利连词练习', 'language', 'Grammar', 40416, 'primary_year2', '[]'::jsonb),
  ('la_preposition_exercise', 'Preposition Exercise', '蒙特梭利介词练习', 'language', 'Grammar', 40417, 'primary_year2', '[]'::jsonb),
  ('la_singular_plural', 'Singular and Plural', '蒙特梭利单数复数', 'language', 'Grammar', 40418, 'primary_year1', '[]'::jsonb),
  ('la_function_of_words', 'Function of Words', '蒙特梭利词语功能', 'language', 'Grammar', 40419, 'primary_year1', '[]'::jsonb),
  ('la_sentence_building', 'Sentence Building', '蒙特梭利造句练习', 'language', 'Grammar', 40420, 'primary_year2', '[]'::jsonb),
  ('la_sentence_diagramming', 'Sentence Diagramming', '蒙特梭利句子图解', 'language', 'Grammar', 40421, 'primary_year3', '[]'::jsonb),
  ('la_verb_tense', 'Verb Tense Work', '蒙特梭利动词时态', 'language', 'Grammar', 40422, 'primary_year2', '[]'::jsonb),
  ('la_word_families', 'Word Families', '蒙特梭利词族', 'language', 'Word Study', 40501, 'primary_year1', '[]'::jsonb),
  ('la_spelling_rules', 'Spelling Rules', '蒙特梭利拼写规则', 'language', 'Word Study', 40502, 'primary_year2', '[]'::jsonb),
  ('la_compound_words', 'Compound Words', '蒙特梭利复合词', 'language', 'Word Study', 40503, 'primary_year2', '[]'::jsonb),
  ('la_prefixes_suffixes', 'Prefixes and Suffixes', '蒙特梭利前缀后缀', 'language', 'Word Study', 40504, 'primary_year3', '[]'::jsonb)
ON CONFLICT (work_key) DO UPDATE SET
  name          = EXCLUDED.name,
  name_chinese  = EXCLUDED.name_chinese,
  area_key      = EXCLUDED.area_key,
  category_name = EXCLUDED.category_name,
  sequence      = EXCLUDED.sequence,
  age_range     = EXCLUDED.age_range,
  aliases       = EXCLUDED.aliases,
  updated_at    = NOW();

INSERT INTO montree_master_works
  (work_key, name, name_chinese, area_key, category_name, sequence, age_range, aliases)
VALUES
  ('la_synonyms_antonyms', 'Synonyms and Antonyms', '蒙特梭利近义词反义词', 'language', 'Word Study', 40505, 'primary_year2', '[]'::jsonb),
  ('la_homonyms', 'Homonyms', '蒙特梭利同音词', 'language', 'Word Study', 40506, 'primary_year2', '[]'::jsonb),
  ('la_definition_stages', 'Definition Stages', '蒙特梭利定义阶段', 'language', 'Word Study', 40507, 'primary_year3', '[]'::jsonb),
  ('la_root_words', 'Root Words and Word Origins', '蒙特梭利词根学习', 'language', 'Word Study', 40508, 'primary_year3', '[]'::jsonb),
  ('la_poetry_analysis', 'Poetry Analysis', '蒙特梭利诗歌分析', 'language', 'Word Study', 40509, 'primary_year3', '[]'::jsonb),
  ('cu_globe_land_water', 'Globe - Land and Water', '蒙特梭利砂纸地球仪', 'cultural', 'Geography', 50101, 'primary_year1', '["Sandpaper Globe","Land Water Globe"]'::jsonb),
  ('cu_globe_continents', 'Globe - Continents', '蒙特梭利彩色地球仪', 'cultural', 'Geography', 50102, 'primary_year1', '["Colored Globe","Continent Globe"]'::jsonb),
  ('cu_puzzle_map_world', 'Puzzle Map - World', '蒙特梭利世界地图拼图', 'cultural', 'Geography', 50103, 'primary_year1', '["World Map Puzzle","Map Puzzle World"]'::jsonb),
  ('cu_puzzle_maps_continents', 'Puzzle Maps - Individual Continents', '蒙特梭利大洲地图拼图', 'cultural', 'Geography', 50104, 'primary_year1', '["Continent Map Puzzles","Map Puzzles"]'::jsonb),
  ('cu_flags', 'Flags of the World', '蒙特梭利世界国旗', 'cultural', 'Geography', 50105, 'primary_year1', '[]'::jsonb),
  ('cu_land_water_forms', 'Land and Water Forms', '蒙特梭利陆地水体模型', 'cultural', 'Geography', 50106, 'primary_year1', '["Landforms","Land Water Forms","Land and Water"]'::jsonb),
  ('cu_solar_system', 'Solar System', '蒙特梭利太阳系', 'cultural', 'Geography', 50107, 'primary_year2', '[]'::jsonb),
  ('cu_land_water_trays', 'Land and Water Form Trays', '蒙特梭利陆水形式托盘', 'cultural', 'Geography', 50110, 'primary_year1', '[]'::jsonb),
  ('cu_continent_folders', 'Continent Study Folders', '蒙特梭利大陆研究文件夹', 'cultural', 'Geography', 50111, 'primary_year2', '[]'::jsonb),
  ('cu_physical_features', 'Physical Features and Landforms', '蒙特梭利地形地貌', 'cultural', 'Geography', 50112, 'primary_year2', '[]'::jsonb),
  ('cu_calendar', 'Calendar Work', '蒙特梭利日历', 'cultural', 'History and Time', 50201, 'primary_year1', '[]'::jsonb),
  ('cu_birthday_celebration', 'Birthday Celebration', '蒙特梭利生日庆祝', 'cultural', 'History and Time', 50202, 'primary_year1', '[]'::jsonb),
  ('cu_personal_timeline', 'Personal Timeline', '蒙特梭利个人时间线', 'cultural', 'History and Time', 50203, 'primary_year1', '[]'::jsonb),
  ('cu_clock', 'Clock Work', '蒙特梭利时钟', 'cultural', 'History and Time', 50204, 'primary_year2', '[]'::jsonb),
  ('cu_timeline_life', 'Timeline of Life', '蒙特梭利生命时间线', 'cultural', 'History and Time', 50205, 'primary_year2', '[]'::jsonb),
  ('cu_fundamental_needs', 'Fundamental Needs of Humans', '蒙特梭利人类基本需求', 'cultural', 'History and Time', 50206, 'primary_year2', '[]'::jsonb),
  ('cu_timeline_civilisations', 'Timeline of Civilisations', '蒙特梭利文明时间线', 'cultural', 'History and Time', 50207, 'primary_year3', '[]'::jsonb),
  ('cu_living_nonliving', 'Living vs Non-Living', '蒙特梭利生物非生物', 'cultural', 'Botany', 50301, 'primary_year1', '["Living Non-Living Sort","Living Things Sort"]'::jsonb),
  ('cu_plant_animal', 'Plant vs Animal', '蒙特梭利植物动物', 'cultural', 'Botany', 50302, 'primary_year1', '[]'::jsonb),
  ('cu_parts_plant', 'Parts of a Plant', '蒙特梭利植物部位', 'cultural', 'Botany', 50303, 'primary_year1', '["Puzzle of the Plant","Plant Puzzle"]'::jsonb),
  ('cu_parts_flower', 'Parts of a Flower', '蒙特梭利花的部位', 'cultural', 'Botany', 50304, 'primary_year1', '["Puzzle of the Flower","Flower Puzzle"]'::jsonb),
  ('cu_parts_leaf', 'Parts of a Leaf', '蒙特梭利叶的部位', 'cultural', 'Botany', 50305, 'primary_year1', '["Puzzle of the Leaf","Leaf Puzzle"]'::jsonb),
  ('cu_parts_root', 'Parts of a Root', '蒙特梭利根的部位', 'cultural', 'Botany', 50306, 'primary_year1', '[]'::jsonb),
  ('cu_parts_seed', 'Parts of a Seed', '蒙特梭利种子部位', 'cultural', 'Botany', 50307, 'primary_year1', '[]'::jsonb),
  ('cu_plant_life_cycle', 'Plant Life Cycle', '蒙特梭利植物生命周期', 'cultural', 'Botany', 50308, 'primary_year1', '[]'::jsonb),
  ('cu_botany_experiments', 'Botany Experiments', '蒙特梭利植物实验', 'cultural', 'Botany', 50309, 'primary_year2', '[]'::jsonb),
  ('cu_leaf_collection', 'Leaf Collection and Pressing', '蒙特梭利树叶收集与压制', 'cultural', 'Botany', 50310, 'primary_year1', '[]'::jsonb),
  ('cu_tree_study', 'Tree Study', '蒙特梭利树木研究', 'cultural', 'Botany', 50311, 'primary_year2', '[]'::jsonb),
  ('cu_seed_germination', 'Seed Germination Experiment', '蒙特梭利种子发芽实验', 'cultural', 'Botany', 50312, 'primary_year1', '[]'::jsonb),
  ('cu_food_chain', 'Food Chain', '蒙特梭利食物链', 'cultural', 'Botany', 50313, 'primary_year2', '[]'::jsonb),
  ('cu_vertebrate_invertebrate', 'Vertebrate vs Invertebrate', '蒙特梭利脊椎无脊椎', 'cultural', 'Zoology', 50401, 'primary_year1', '[]'::jsonb),
  ('cu_five_classes', 'Five Classes of Vertebrates', '蒙特梭利五类脊椎动物', 'cultural', 'Zoology', 50402, 'primary_year1', '[]'::jsonb),
  ('cu_parts_fish', 'Parts of a Fish', '蒙特梭利鱼的部位', 'cultural', 'Zoology', 50403, 'primary_year1', '["Puzzle of the Fish","Fish Puzzle"]'::jsonb),
  ('cu_parts_frog', 'Parts of a Frog', '蒙特梭利青蛙部位', 'cultural', 'Zoology', 50404, 'primary_year1', '[]'::jsonb),
  ('cu_parts_turtle', 'Parts of a Turtle', '蒙特梭利乌龟部位', 'cultural', 'Zoology', 50405, 'primary_year1', '[]'::jsonb),
  ('cu_parts_bird', 'Parts of a Bird', '蒙特梭利鸟的部位', 'cultural', 'Zoology', 50406, 'primary_year1', '["Puzzle of the Bird","Bird Puzzle"]'::jsonb),
  ('cu_parts_horse', 'Parts of a Horse', '蒙特梭利马的部位', 'cultural', 'Zoology', 50407, 'primary_year1', '[]'::jsonb),
  ('cu_animal_habitats', 'Animal Habitats', '蒙特梭利动物栖息地', 'cultural', 'Zoology', 50408, 'primary_year1', '[]'::jsonb),
  ('cu_animals_continents', 'Animals of the Continents', '蒙特梭利各大洲动物', 'cultural', 'Zoology', 50409, 'primary_year2', '[]'::jsonb),
  ('cu_life_cycles', 'Animal Life Cycles', '蒙特梭利动物生命周期', 'cultural', 'Zoology', 50410, 'primary_year1', '[]'::jsonb),
  ('cu_parts_of_insect', 'Parts of an Insect', '蒙特梭利昆虫部位', 'cultural', 'Zoology', 50411, 'primary_year1', '[]'::jsonb),
  ('cu_invertebrate_classification', 'Invertebrate Classification', '蒙特梭利无脊椎动物分类', 'cultural', 'Zoology', 50412, 'primary_year2', '[]'::jsonb),
  ('cu_external_parts_human', 'External Parts of a Human', '蒙特梭利人体外部部位', 'cultural', 'Zoology', 50413, 'primary_year1', '[]'::jsonb),
  ('cu_sink_float', 'Sink and Float', '蒙特梭利沉浮', 'cultural', 'Physical Science', 50501, 'primary_year1', '[]'::jsonb),
  ('cu_magnetic', 'Magnetic/Non-Magnetic', '蒙特梭利磁力', 'cultural', 'Physical Science', 50502, 'primary_year1', '[]'::jsonb)
ON CONFLICT (work_key) DO UPDATE SET
  name          = EXCLUDED.name,
  name_chinese  = EXCLUDED.name_chinese,
  area_key      = EXCLUDED.area_key,
  category_name = EXCLUDED.category_name,
  sequence      = EXCLUDED.sequence,
  age_range     = EXCLUDED.age_range,
  aliases       = EXCLUDED.aliases,
  updated_at    = NOW();

INSERT INTO montree_master_works
  (work_key, name, name_chinese, area_key, category_name, sequence, age_range, aliases)
VALUES
  ('cu_states_matter', 'States of Matter', '蒙特梭利物质三态', 'cultural', 'Physical Science', 50503, 'primary_year1', '[]'::jsonb),
  ('cu_color_mixing', 'Color Mixing', '蒙特梭利颜色混合', 'cultural', 'Physical Science', 50504, 'primary_year1', '[]'::jsonb),
  ('cu_simple_machines', 'Simple Machines', '蒙特梭利简单机械', 'cultural', 'Physical Science', 50505, 'primary_year2', '[]'::jsonb),
  ('cu_nature_study', 'Nature Study', '蒙特梭利自然观察', 'cultural', 'Physical Science', 50506, 'primary_year1', '[]'::jsonb),
  ('cu_weather', 'Weather Study', '蒙特梭利天气', 'cultural', 'Physical Science', 50507, 'primary_year1', '[]'::jsonb),
  ('cu_air_experiments', 'Air Experiments', '蒙特梭利空气实验', 'cultural', 'Physical Science', 50508, 'primary_year1', '[]'::jsonb),
  ('cu_water_experiments', 'Water Experiments', '蒙特梭利水实验', 'cultural', 'Physical Science', 50509, 'primary_year1', '[]'::jsonb),
  ('cu_sound_experiments', 'Sound Experiments', '蒙特梭利声音实验', 'cultural', 'Physical Science', 50510, 'primary_year1', '[]'::jsonb),
  ('cu_light_shadow', 'Light and Shadow', '蒙特梭利光与影', 'cultural', 'Physical Science', 50511, 'primary_year1', '[]'::jsonb),
  ('cu_gravity_experiments', 'Gravity Experiments', '蒙特梭利重力实验', 'cultural', 'Physical Science', 50512, 'primary_year2', '[]'::jsonb),
  ('cu_heat_experiments', 'Heat Experiments', '蒙特梭利热量实验', 'cultural', 'Physical Science', 50513, 'primary_year2', '[]'::jsonb),
  ('cu_drawing', 'Drawing', '蒙特梭利绘画', 'cultural', 'Art', 50601, 'primary_year1', '[]'::jsonb),
  ('cu_painting', 'Painting', '蒙特梭利绘画', 'cultural', 'Art', 50602, 'primary_year1', '[]'::jsonb),
  ('cu_collage', 'Collage', '蒙特梭利拼贴', 'cultural', 'Art', 50603, 'primary_year1', '[]'::jsonb),
  ('cu_clay', 'Clay and Playdough', '蒙特梭利粘土', 'cultural', 'Art', 50604, 'primary_year1', '[]'::jsonb),
  ('cu_printmaking', 'Printmaking', '蒙特梭利版画', 'cultural', 'Art', 50605, 'primary_year1', '[]'::jsonb),
  ('cu_art_appreciation', 'Art Appreciation', '蒙特梭利艺术欣赏', 'cultural', 'Art', 50606, 'primary_year2', '[]'::jsonb),
  ('cu_artist_study', 'Artist Study', '蒙特梭利艺术家研究', 'cultural', 'Art', 50607, 'primary_year2', '[]'::jsonb),
  ('cu_weaving', 'Weaving and Textile Art', '蒙特梭利编织与纺织艺术', 'cultural', 'Art', 50608, 'primary_year1', '[]'::jsonb),
  ('cu_colour_theory', 'Colour Theory', '蒙特梭利色彩理论', 'cultural', 'Art', 50609, 'primary_year1', '[]'::jsonb),
  ('cu_singing', 'Singing', '蒙特梭利歌唱', 'cultural', 'Music', 50701, 'primary_year1', '[]'::jsonb),
  ('cu_rhythm', 'Rhythm Instruments', '蒙特梭利节奏', 'cultural', 'Music', 50702, 'primary_year1', '[]'::jsonb),
  ('cu_movement', 'Movement to Music', '蒙特梭利律动', 'cultural', 'Music', 50703, 'primary_year1', '[]'::jsonb),
  ('cu_bells', 'Montessori Bells', '蒙特梭利音乐铃', 'cultural', 'Music', 50704, 'primary_year2', '[]'::jsonb),
  ('cu_music_appreciation', 'Music Appreciation', '蒙特梭利音乐欣赏', 'cultural', 'Music', 50705, 'primary_year2', '[]'::jsonb),
  ('cu_staff_notation', 'Staff Notation Introduction', '蒙特梭利五线谱入门', 'cultural', 'Music', 50706, 'primary_year2', '[]'::jsonb),
  ('cu_rhythm_exercises', 'Rhythm Exercises', '蒙特梭利节奏练习', 'cultural', 'Music', 50707, 'primary_year1', '[]'::jsonb),
  ('cu_cultural_music', 'Cultural Music Study', '蒙特梭利世界音乐研究', 'cultural', 'Music', 50708, 'primary_year2', '[]'::jsonb),
  ('cu_composing', 'Composing Simple Music', '蒙特梭利简单作曲', 'cultural', 'Music', 50709, 'primary_year3', '[]'::jsonb)
ON CONFLICT (work_key) DO UPDATE SET
  name          = EXCLUDED.name,
  name_chinese  = EXCLUDED.name_chinese,
  area_key      = EXCLUDED.area_key,
  category_name = EXCLUDED.category_name,
  sequence      = EXCLUDED.sequence,
  age_range     = EXCLUDED.age_range,
  aliases       = EXCLUDED.aliases,
  updated_at    = NOW();

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Ledger backfill — the migrations this database is expected to have
-- ─────────────────────────────────────────────────────────────────────────
-- 311/312/313 predate the ledger; they are recorded here on the assumption the founder
-- has already pasted them (if not, paste them first — this row is a claim, not a proof).
-- 314 records itself, which is the convention every migration follows from now on.
INSERT INTO montree_migrations (filename) VALUES
  ('311_progress_stamp_columns.sql'),
  ('312_minimal_signup_defaults.sql'),
  ('313_curriculum_rls_lockdown.sql'),
  ('314_institutional_foundations.sql')
ON CONFLICT (filename) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. montree_child_progress — index the stamp added by migration 311
-- ─────────────────────────────────────────────────────────────────────────
-- Spine-joined reads ("every child's position on work X across the institution")
-- filter on work_key; without this they seq-scan the whole progress table.
--
-- DELIBERATELY LAST. montree_child_progress is the hottest write table in the app and
-- this is the only statement in the file that touches it. CREATE INDEX takes a SHARE
-- lock that blocks writes for its duration, so it sits at the very end of the
-- transaction to keep that window as short as possible — teachers marking progress
-- while the founder pastes this stall for the index build, not for the whole migration.
CREATE INDEX IF NOT EXISTS idx_montree_child_progress_work_key
  ON montree_child_progress (work_key);

COMMIT;

-- VERIFY (expect: master_works = 329, ledger = 4, both new tables rls_enabled = t / policies = 0)
-- SELECT (SELECT COUNT(*) FROM montree_master_works)    AS master_works,
--        (SELECT COUNT(*) FROM montree_progress_events) AS progress_events,
--        (SELECT COUNT(*) FROM montree_migrations)      AS ledger_rows;
--
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, COUNT(p.polname) AS policy_count
-- FROM pg_class c
-- LEFT JOIN pg_policy p ON p.polrelid = c.oid
-- WHERE c.relname IN ('montree_master_works','montree_progress_events','montree_migrations')
-- GROUP BY c.relname, c.relrowsecurity;
