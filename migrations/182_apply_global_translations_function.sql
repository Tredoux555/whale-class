-- Migration 182: apply_global_translations() Postgres function
-- Copies translations from the global library into a classroom's curriculum rows.
-- One UPDATE FROM JOIN per locale. COALESCE preserves any existing teacher edits.
--
-- Called after a classroom is seeded with English curriculum. Free — no AI calls.
-- Custom works (work_key starting with 'custom_') don't match anything in the
-- global table and are silently skipped by the inner JOIN.
--
-- Safe to call multiple times. Idempotent.
--
-- DEPENDENCIES:
--   - Migration 180 (montree_curriculum_translations table)
--   - All locale columns must exist on montree_classroom_curriculum_works:
--     name_zh, name_chinese, parent_description_zh, why_it_matters_zh, guide_content_zh
--     name_es, parent_description_es, why_it_matters_es, guide_content_es
--     ... and same pattern for de, fr, pt, nl, it, ja, ko, uk, ru
--
-- ADDING A 13TH LANGUAGE:
--   Add one more UPDATE block following the per-locale pattern below, plus the
--   matching column adds on montree_classroom_curriculum_works.

CREATE OR REPLACE FUNCTION apply_global_translations(p_classroom_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_updated INTEGER := 0;
  rc INTEGER;
BEGIN
  -- Chinese: dual-column legacy (name_zh + name_chinese must stay in sync).
  -- COALESCE ensures we never overwrite a translation a teacher manually edited.
  UPDATE montree_classroom_curriculum_works w
  SET
    name_zh                = COALESCE(w.name_zh, t.name),
    name_chinese           = COALESCE(w.name_chinese, t.name),
    parent_description_zh  = COALESCE(w.parent_description_zh, t.parent_description),
    why_it_matters_zh      = COALESCE(w.why_it_matters_zh, t.why_it_matters),
    guide_content_zh       = COALESCE(w.guide_content_zh, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id
    AND w.work_key = t.work_key
    AND t.locale = 'zh';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- Spanish
  UPDATE montree_classroom_curriculum_works w
  SET
    name_es                = COALESCE(w.name_es, t.name),
    parent_description_es  = COALESCE(w.parent_description_es, t.parent_description),
    why_it_matters_es      = COALESCE(w.why_it_matters_es, t.why_it_matters),
    guide_content_es       = COALESCE(w.guide_content_es, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'es';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- German
  UPDATE montree_classroom_curriculum_works w
  SET
    name_de                = COALESCE(w.name_de, t.name),
    parent_description_de  = COALESCE(w.parent_description_de, t.parent_description),
    why_it_matters_de      = COALESCE(w.why_it_matters_de, t.why_it_matters),
    guide_content_de       = COALESCE(w.guide_content_de, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'de';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- French
  UPDATE montree_classroom_curriculum_works w
  SET
    name_fr                = COALESCE(w.name_fr, t.name),
    parent_description_fr  = COALESCE(w.parent_description_fr, t.parent_description),
    why_it_matters_fr      = COALESCE(w.why_it_matters_fr, t.why_it_matters),
    guide_content_fr       = COALESCE(w.guide_content_fr, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'fr';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- Portuguese
  UPDATE montree_classroom_curriculum_works w
  SET
    name_pt                = COALESCE(w.name_pt, t.name),
    parent_description_pt  = COALESCE(w.parent_description_pt, t.parent_description),
    why_it_matters_pt      = COALESCE(w.why_it_matters_pt, t.why_it_matters),
    guide_content_pt       = COALESCE(w.guide_content_pt, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'pt';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- Dutch
  UPDATE montree_classroom_curriculum_works w
  SET
    name_nl                = COALESCE(w.name_nl, t.name),
    parent_description_nl  = COALESCE(w.parent_description_nl, t.parent_description),
    why_it_matters_nl      = COALESCE(w.why_it_matters_nl, t.why_it_matters),
    guide_content_nl       = COALESCE(w.guide_content_nl, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'nl';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- Italian
  UPDATE montree_classroom_curriculum_works w
  SET
    name_it                = COALESCE(w.name_it, t.name),
    parent_description_it  = COALESCE(w.parent_description_it, t.parent_description),
    why_it_matters_it      = COALESCE(w.why_it_matters_it, t.why_it_matters),
    guide_content_it       = COALESCE(w.guide_content_it, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'it';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- Japanese
  UPDATE montree_classroom_curriculum_works w
  SET
    name_ja                = COALESCE(w.name_ja, t.name),
    parent_description_ja  = COALESCE(w.parent_description_ja, t.parent_description),
    why_it_matters_ja      = COALESCE(w.why_it_matters_ja, t.why_it_matters),
    guide_content_ja       = COALESCE(w.guide_content_ja, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'ja';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- Korean
  UPDATE montree_classroom_curriculum_works w
  SET
    name_ko                = COALESCE(w.name_ko, t.name),
    parent_description_ko  = COALESCE(w.parent_description_ko, t.parent_description),
    why_it_matters_ko      = COALESCE(w.why_it_matters_ko, t.why_it_matters),
    guide_content_ko       = COALESCE(w.guide_content_ko, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'ko';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- Ukrainian
  UPDATE montree_classroom_curriculum_works w
  SET
    name_uk                = COALESCE(w.name_uk, t.name),
    parent_description_uk  = COALESCE(w.parent_description_uk, t.parent_description),
    why_it_matters_uk      = COALESCE(w.why_it_matters_uk, t.why_it_matters),
    guide_content_uk       = COALESCE(w.guide_content_uk, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'uk';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- Russian
  UPDATE montree_classroom_curriculum_works w
  SET
    name_ru                = COALESCE(w.name_ru, t.name),
    parent_description_ru  = COALESCE(w.parent_description_ru, t.parent_description),
    why_it_matters_ru      = COALESCE(w.why_it_matters_ru, t.why_it_matters),
    guide_content_ru       = COALESCE(w.guide_content_ru, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'ru';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  RETURN total_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_global_translations(UUID) IS
  'Populates a classroom''s locale columns from montree_curriculum_translations. Idempotent. COALESCE-safe (preserves teacher edits). Returns total rows updated across all locales.';

-- Grant execute to authenticated users (the seeding paths use service role,
-- but this lets super-admin RPC calls work too).
GRANT EXECUTE ON FUNCTION apply_global_translations(UUID) TO anon, authenticated, service_role;
