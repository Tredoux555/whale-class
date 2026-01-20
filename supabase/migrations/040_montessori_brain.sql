-- MONTESSORI BRAIN MIGRATION
-- Run this in Supabase SQL Editor
-- Created: January 20, 2025

-- ============================================
-- 1. SENSITIVE PERIODS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sensitive_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  age_start DECIMAL(3,1) NOT NULL,
  age_peak_start DECIMAL(3,1) NOT NULL,
  age_peak_end DECIMAL(3,1) NOT NULL,
  age_end DECIMAL(3,1) NOT NULL,
  
  observable_behaviors TEXT[] NOT NULL DEFAULT '{}',
  primary_areas TEXT[] NOT NULL DEFAULT '{}',
  
  teacher_description TEXT NOT NULL,
  parent_description TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. MONTESSORI WORKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS montessori_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  curriculum_area TEXT NOT NULL CHECK (curriculum_area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'cultural')),
  sub_area TEXT NOT NULL,
  
  age_min DECIMAL(3,1) NOT NULL,
  age_max DECIMAL(3,1) NOT NULL,
  age_typical DECIMAL(3,1),
  
  direct_aims TEXT[] NOT NULL DEFAULT '{}',
  indirect_aims TEXT[] NOT NULL DEFAULT '{}',
  readiness_indicators TEXT[] NOT NULL DEFAULT '{}',
  
  primary_skills TEXT[] NOT NULL DEFAULT '{}',
  secondary_skills TEXT[] NOT NULL DEFAULT '{}',
  
  materials_needed TEXT[] NOT NULL DEFAULT '{}',
  presentation_notes TEXT,
  
  parent_explanation_simple TEXT NOT NULL,
  parent_explanation_detailed TEXT,
  parent_why_it_matters TEXT,
  
  image_url TEXT,
  video_url TEXT,
  
  is_gateway BOOLEAN DEFAULT false,
  difficulty_level TEXT CHECK (difficulty_level IN ('introductory', 'developing', 'advanced', 'mastery')),
  
  sequence_order INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. WORK PREREQUISITES (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS work_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  prerequisite_work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  UNIQUE(work_id, prerequisite_work_id)
);

-- ============================================
-- 4. WORK TO SENSITIVE PERIOD MAPPING
-- ============================================
CREATE TABLE IF NOT EXISTS work_sensitive_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  sensitive_period_id UUID REFERENCES sensitive_periods(id) ON DELETE CASCADE,
  relevance_score INTEGER DEFAULT 5 CHECK (relevance_score BETWEEN 1 AND 10),
  UNIQUE(work_id, sensitive_period_id)
);

-- ============================================
-- 5. CROSS-AREA BENEFITS
-- ============================================
CREATE TABLE IF NOT EXISTS work_cross_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  benefit_area TEXT NOT NULL,
  benefit_description TEXT NOT NULL,
  UNIQUE(work_id, benefit_area)
);

-- ============================================
-- 6. WORK UNLOCKS (what this prepares for)
-- ============================================
CREATE TABLE IF NOT EXISTS work_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  unlocks_work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  UNIQUE(work_id, unlocks_work_id)
);

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_works_curriculum_area ON montessori_works(curriculum_area);
CREATE INDEX IF NOT EXISTS idx_works_sub_area ON montessori_works(sub_area);
CREATE INDEX IF NOT EXISTS idx_works_age_range ON montessori_works(age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_works_gateway ON montessori_works(is_gateway) WHERE is_gateway = true;
CREATE INDEX IF NOT EXISTS idx_prerequisites_work ON work_prerequisites(work_id);
CREATE INDEX IF NOT EXISTS idx_prerequisites_prereq ON work_prerequisites(prerequisite_work_id);
CREATE INDEX IF NOT EXISTS idx_sp_work ON work_sensitive_periods(work_id);
CREATE INDEX IF NOT EXISTS idx_sp_period ON work_sensitive_periods(sensitive_period_id);

-- ============================================
-- 8. ENABLE RLS
-- ============================================
ALTER TABLE sensitive_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE montessori_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sensitive_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_cross_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_unlocks ENABLE ROW LEVEL SECURITY;

-- Public read access (brain is reference data)
CREATE POLICY "Public read sensitive_periods" ON sensitive_periods FOR SELECT USING (true);
CREATE POLICY "Public read montessori_works" ON montessori_works FOR SELECT USING (true);
CREATE POLICY "Public read work_prerequisites" ON work_prerequisites FOR SELECT USING (true);
CREATE POLICY "Public read work_sensitive_periods" ON work_sensitive_periods FOR SELECT USING (true);
CREATE POLICY "Public read work_cross_benefits" ON work_cross_benefits FOR SELECT USING (true);
CREATE POLICY "Public read work_unlocks" ON work_unlocks FOR SELECT USING (true);

-- ============================================
-- 9. GET AVAILABLE WORKS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_available_works(
  p_child_age DECIMAL,
  p_completed_work_ids UUID[]
)
RETURNS TABLE (
  work_id UUID,
  work_name TEXT,
  curriculum_area TEXT,
  sub_area TEXT,
  is_gateway BOOLEAN,
  relevance_score BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  age_appropriate AS (
    SELECT w.id, w.name, w.curriculum_area, w.sub_area, w.is_gateway
    FROM montessori_works w
    WHERE p_child_age BETWEEN w.age_min AND w.age_max
    AND w.id != ALL(COALESCE(p_completed_work_ids, '{}'))
  ),
  prereq_check AS (
    SELECT 
      aa.id,
      aa.name,
      aa.curriculum_area,
      aa.sub_area,
      aa.is_gateway,
      ARRAY_AGG(wp.prerequisite_work_id) FILTER (
        WHERE wp.is_required 
        AND wp.prerequisite_work_id != ALL(COALESCE(p_completed_work_ids, '{}'))
      ) as missing_prereqs
    FROM age_appropriate aa
    LEFT JOIN work_prerequisites wp ON aa.id = wp.work_id
    GROUP BY aa.id, aa.name, aa.curriculum_area, aa.sub_area, aa.is_gateway
  ),
  sp_relevance AS (
    SELECT 
      pc.id,
      pc.name,
      pc.curriculum_area,
      pc.sub_area,
      pc.is_gateway,
      pc.missing_prereqs,
      COALESCE(SUM(
        CASE 
          WHEN p_child_age BETWEEN sp.age_peak_start AND sp.age_peak_end THEN wsp.relevance_score * 2
          WHEN p_child_age BETWEEN sp.age_start AND sp.age_end THEN wsp.relevance_score
          ELSE 0
        END
      ), 0) as sp_score
    FROM prereq_check pc
    LEFT JOIN work_sensitive_periods wsp ON pc.id = wsp.work_id
    LEFT JOIN sensitive_periods sp ON wsp.sensitive_period_id = sp.id
    GROUP BY pc.id, pc.name, pc.curriculum_area, pc.sub_area, pc.is_gateway, pc.missing_prereqs
  )
  SELECT 
    spr.id,
    spr.name,
    spr.curriculum_area,
    spr.sub_area,
    spr.is_gateway,
    spr.sp_score
  FROM sp_relevance spr
  WHERE spr.missing_prereqs IS NULL OR array_length(spr.missing_prereqs, 1) IS NULL
  ORDER BY 
    spr.is_gateway DESC,
    spr.sp_score DESC,
    spr.curriculum_area;
END;
$$;

-- ============================================
-- 10. GET RECOMMENDATIONS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_recommended_works(
  p_child_age DECIMAL,
  p_completed_work_ids UUID[],
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  work_id UUID,
  work_name TEXT,
  curriculum_area TEXT,
  parent_explanation TEXT,
  recommendation_reason TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH available AS (
    SELECT * FROM get_available_works(p_child_age, p_completed_work_ids)
  ),
  area_balance AS (
    SELECT 
      mw.curriculum_area as area,
      COUNT(*) as completed_count
    FROM montessori_works mw
    WHERE mw.id = ANY(COALESCE(p_completed_work_ids, '{}'))
    GROUP BY mw.curriculum_area
  ),
  scored AS (
    SELECT 
      a.work_id,
      a.work_name,
      a.curriculum_area,
      w.parent_explanation_simple,
      a.is_gateway,
      a.relevance_score + 
        CASE WHEN a.is_gateway THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(ab.completed_count, 0) < 3 THEN 5 ELSE 0 END
        as total_score
    FROM available a
    JOIN montessori_works w ON a.work_id = w.id
    LEFT JOIN area_balance ab ON a.curriculum_area = ab.area
  )
  SELECT 
    s.work_id,
    s.work_name,
    s.curriculum_area,
    s.parent_explanation_simple,
    CASE 
      WHEN s.is_gateway THEN 'Gateway work - unlocks many future activities'
      WHEN s.total_score >= 10 THEN 'Perfect match for current developmental stage'
      ELSE 'Good fit for balanced curriculum'
    END
  FROM scored s
  ORDER BY s.total_score DESC
  LIMIT p_limit;
END;
$$;
