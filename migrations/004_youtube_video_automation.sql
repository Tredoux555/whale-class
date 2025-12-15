-- =====================================================
-- WHALE PLATFORM - YOUTUBE VIDEO AUTOMATION MIGRATION
-- =====================================================
-- This migration creates YouTube video discovery and management system
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: CURRICULUM_VIDEOS
-- Stores YouTube videos linked to curriculum works
-- =====================================================

CREATE TABLE IF NOT EXISTS public.curriculum_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.curriculum_roadmap(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  channel_name TEXT,
  channel_id TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(work_id, youtube_video_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_curriculum_videos_work_id ON public.curriculum_videos(work_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_videos_is_approved ON public.curriculum_videos(is_approved);
CREATE INDEX IF NOT EXISTS idx_curriculum_videos_is_active ON public.curriculum_videos(is_active);
CREATE INDEX IF NOT EXISTS idx_curriculum_videos_relevance_score ON public.curriculum_videos(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_curriculum_videos_youtube_id ON public.curriculum_videos(youtube_video_id);

-- Enable Row Level Security
ALTER TABLE public.curriculum_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view approved active videos"
  ON public.curriculum_videos FOR SELECT
  USING (is_approved = true AND is_active = true);

CREATE POLICY "Admins can view all videos"
  ON public.curriculum_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert videos"
  ON public.curriculum_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update videos"
  ON public.curriculum_videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete videos"
  ON public.curriculum_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TABLE 2: VIDEO_SEARCH_CACHE
-- Caches YouTube search results to avoid duplicate API calls
-- =====================================================

CREATE TABLE IF NOT EXISTS public.video_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.curriculum_roadmap(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  search_query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  best_video_id TEXT,
  best_relevance_score INTEGER,
  videos_json JSONB, -- Store top 5 results
  last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  search_successful BOOLEAN DEFAULT true,
  error_message TEXT,
  UNIQUE(work_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_search_cache_work_id ON public.video_search_cache(work_id);
CREATE INDEX IF NOT EXISTS idx_video_search_cache_expires ON public.video_search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_video_search_cache_last_searched ON public.video_search_cache(last_searched_at DESC);

-- Enable Row Level Security
ALTER TABLE public.video_search_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Read-only for everyone, write for admins
CREATE POLICY "Anyone can view search cache"
  ON public.video_search_cache FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage search cache"
  ON public.video_search_cache FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TABLE 3: VIDEO_SEARCH_LOGS
-- Logs all video search operations for debugging and analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS public.video_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.curriculum_roadmap(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  search_query TEXT NOT NULL,
  youtube_query TEXT NOT NULL,
  videos_found INTEGER DEFAULT 0,
  best_video_selected TEXT,
  best_video_title TEXT,
  relevance_score INTEGER,
  search_duration_ms INTEGER,
  api_calls_used INTEGER DEFAULT 1,
  error_occurred BOOLEAN DEFAULT false,
  error_message TEXT,
  search_completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  searched_by UUID REFERENCES auth.users(id),
  user_agent TEXT,
  ip_address INET
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_search_logs_work_id ON public.video_search_logs(work_id);
CREATE INDEX IF NOT EXISTS idx_video_search_logs_completed ON public.video_search_logs(search_completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_search_logs_error ON public.video_search_logs(error_occurred);

-- Enable Row Level Security
ALTER TABLE public.video_search_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admins only
CREATE POLICY "Admins can view search logs"
  ON public.video_search_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get approved video for a work
CREATE OR REPLACE FUNCTION public.get_work_video(p_work_id UUID)
RETURNS TABLE (
  video_id UUID,
  youtube_video_id TEXT,
  youtube_url TEXT,
  title TEXT,
  description TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  view_count INTEGER,
  relevance_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cv.id,
    cv.youtube_video_id,
    cv.youtube_url,
    cv.title,
    cv.description,
    cv.channel_name,
    cv.thumbnail_url,
    cv.duration_seconds,
    cv.view_count,
    cv.relevance_score
  FROM public.curriculum_videos cv
  WHERE cv.work_id = p_work_id
    AND cv.is_approved = true
    AND cv.is_active = true
  ORDER BY cv.relevance_score DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if work needs video search
CREATE OR REPLACE FUNCTION public.work_needs_video_search(p_work_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_approved_video BOOLEAN;
  v_cache_expired BOOLEAN;
BEGIN
  -- Check if work has approved video
  SELECT EXISTS (
    SELECT 1 FROM public.curriculum_videos
    WHERE work_id = p_work_id AND is_approved = true AND is_active = true
  ) INTO v_has_approved_video;

  -- If has approved video, no search needed
  IF v_has_approved_video THEN
    RETURN FALSE;
  END IF;

  -- Check if cache is expired or doesn't exist
  SELECT COALESCE(
    (SELECT expires_at < now() FROM public.video_search_cache WHERE work_id = p_work_id),
    TRUE
  ) INTO v_cache_expired;

  RETURN v_cache_expired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get video discovery statistics
CREATE OR REPLACE FUNCTION public.get_video_discovery_stats()
RETURNS TABLE (
  total_works INTEGER,
  works_with_videos INTEGER,
  works_pending_approval INTEGER,
  works_missing_videos INTEGER,
  average_relevance_score DECIMAL,
  total_searches_performed INTEGER,
  searches_last_30_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cr.id)::INTEGER AS total_works,
    COUNT(DISTINCT CASE WHEN cv.is_approved = true AND cv.is_active = true THEN cr.id END)::INTEGER AS works_with_videos,
    COUNT(DISTINCT CASE WHEN cv.is_approved = false AND cv.is_active = true THEN cr.id END)::INTEGER AS works_pending_approval,
    (COUNT(DISTINCT cr.id) - COUNT(DISTINCT cv.work_id))::INTEGER AS works_missing_videos,
    ROUND(AVG(cv.relevance_score), 2) AS average_relevance_score,
    (SELECT COUNT(*) FROM public.video_search_logs)::INTEGER AS total_searches_performed,
    (SELECT COUNT(*) FROM public.video_search_logs WHERE search_completed_at > now() - interval '30 days')::INTEGER AS searches_last_30_days
  FROM public.curriculum_roadmap cr
  LEFT JOIN public.curriculum_videos cv ON cr.id = cv.work_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log video search
CREATE OR REPLACE FUNCTION public.log_video_search(
  p_work_id UUID,
  p_work_name TEXT,
  p_search_query TEXT,
  p_youtube_query TEXT,
  p_videos_found INTEGER,
  p_best_video_id TEXT DEFAULT NULL,
  p_best_video_title TEXT DEFAULT NULL,
  p_relevance_score INTEGER DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.video_search_logs (
    work_id,
    work_name,
    search_query,
    youtube_query,
    videos_found,
    best_video_selected,
    best_video_title,
    relevance_score,
    search_duration_ms,
    error_occurred,
    error_message,
    searched_by
  ) VALUES (
    p_work_id,
    p_work_name,
    p_search_query,
    p_youtube_query,
    p_videos_found,
    p_best_video_id,
    p_best_video_title,
    p_relevance_score,
    p_duration_ms,
    p_error_message IS NOT NULL,
    p_error_message,
    auth.uid()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_curriculum_videos_updated_at
  BEFORE UPDATE ON public.curriculum_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT SELECT ON public.curriculum_videos TO authenticated;
GRANT SELECT ON public.curriculum_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_videos TO authenticated;

GRANT SELECT ON public.video_search_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_search_cache TO authenticated;

GRANT SELECT ON public.video_search_logs TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_work_video TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_work_video TO anon;
GRANT EXECUTE ON FUNCTION public.work_needs_video_search TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_video_discovery_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_video_search TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('curriculum_videos', 'video_search_cache', 'video_search_logs')
ORDER BY tablename;

-- Show table structure
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('curriculum_videos', 'video_search_cache', 'video_search_logs')
ORDER BY table_name, ordinal_position;
