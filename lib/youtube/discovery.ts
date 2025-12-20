// =====================================================
// WHALE PLATFORM - VIDEO DISCOVERY ORCHESTRATION
// =====================================================
// Location: lib/youtube/discovery.ts
// Purpose: Coordinate automated video discovery
// =====================================================

import { createClient } from '@/lib/supabase';
import type {
  CurriculumWork,
  YouTubeVideo,
  VideoSearchResult,
  VideoSearchStatus,
  DiscoveryOptions,
  CurriculumVideo,
} from './types';
import { searchYouTubeVideos, buildMontessoriSearchQuery, getAlternativeSearchQueries } from './search';
import { getBestVideo } from './scoring';
import { SCORE_THRESHOLDS } from './types';

/**
 * Discover video for a single work
 */
export async function discoverVideoForWork(
  work: CurriculumWork,
  options: DiscoveryOptions = {}
): Promise<VideoSearchResult | null> {
  const startTime = Date.now();
  const supabase = createClient();

  try {
    // Check if should skip (has approved video and not forcing refresh)
    if (!options.forceRefresh) {
      const { data: existing } = await supabase
        .from('curriculum_videos')
        .select('*')
        .eq('work_id', work.id)
        .eq('is_approved', true)
        .eq('is_active', true)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Skipping ${work.work_name} - already has approved video`);
        return null;
      }

      // Check cache
      const { data: cache } = await supabase
        .from('video_search_cache')
        .select('*')
        .eq('work_id', work.id)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (cache && cache.length > 0 && cache[0].best_video_id) {
        console.log(`Using cached result for ${work.work_name}`);
        // Return cached result (simplified)
        return null; // Would reconstruct from cache
      }
    }

    // Build search query
    const searchQuery = buildMontessoriSearchQuery(work.work_name);
    console.log(`Searching for: ${searchQuery}`);

    // Search YouTube
    const { videos, status } = await searchYouTubeVideos(
      searchQuery,
      options.maxResults || 10
    );

    const duration = Date.now() - startTime;

    // Log search
    try {
      await supabase.rpc('log_video_search', {
        p_work_id: work.id,
        p_work_name: work.work_name,
        p_search_query: searchQuery,
        p_youtube_query: searchQuery,
        p_videos_found: videos.length,
        p_duration_ms: duration,
      });
    } catch (logError) {
      console.warn('Failed to log search:', logError);
    }

    if (videos.length === 0) {
      console.log(`No videos found for ${work.work_name}`);
      return null;
    }

    // Score and get best video
    const bestResult = getBestVideo(
      videos,
      work,
      options.minRelevanceScore || SCORE_THRESHOLDS.ACCEPTABLE
    );

    if (!bestResult) {
      console.log(`No suitable video found for ${work.work_name}`);
      return null;
    }

    console.log(`Found video for ${work.work_name}: ${bestResult.video.title} (score: ${bestResult.relevanceScore})`);

    // Save to database
    await saveVideoToDatabase(work, bestResult, options);

    // Update cache
    await updateSearchCache(work, searchQuery, videos, bestResult);

    return bestResult;
  } catch (error) {
    console.error(`Error discovering video for ${work.work_name}:`, error);
    
    // Log error
    try {
      await supabase.rpc('log_video_search', {
        p_work_id: work.id,
        p_work_name: work.work_name,
        p_search_query: buildMontessoriSearchQuery(work.work_name),
        p_youtube_query: buildMontessoriSearchQuery(work.work_name),
        p_videos_found: 0,
        p_error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.warn('Failed to log error:', logError);
    }

    return null;
  }
}

/**
 * Discover videos for all works
 */
export async function discoverVideosForAllWorks(
  works: CurriculumWork[],
  options: DiscoveryOptions = {}
): Promise<VideoSearchStatus[]> {
  const statuses: VideoSearchStatus[] = [];

  console.log(`Starting discovery for ${works.length} works...`);

  for (let i = 0; i < works.length; i++) {
    const work = works[i];
    const status: VideoSearchStatus = {
      workId: work.id,
      workName: work.work_name,
      status: 'searching',
      videosFound: 0,
    };

    statuses.push(status);

    console.log(`\nProgress: ${i + 1}/${works.length} - ${work.work_name}`);

    try {
      const startTime = Date.now();
      const result = await discoverVideoForWork(work, options);
      const timeElapsed = Date.now() - startTime;

      if (result) {
        status.status = 'found';
        status.bestVideo = result.video;
        status.bestScore = result.relevanceScore;
        status.videosFound = 1;
        status.timeElapsed = timeElapsed;
        console.log(`✅ Found (score: ${result.relevanceScore})`);
      } else {
        status.status = 'no_video';
        status.timeElapsed = timeElapsed;
        console.log(`❌ No video found`);
      }

      // Rate limiting: wait 1 second between searches
      if (i < works.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      status.status = 'error';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      console.log(`⚠️ Error: ${status.error}`);
    }
  }

  const found = statuses.filter(s => s.status === 'found').length;
  const missing = statuses.filter(s => s.status === 'no_video').length;
  const errors = statuses.filter(s => s.status === 'error').length;

  console.log(`\n\nDiscovery complete!`);
  console.log(`✅ Found: ${found}/${works.length} (${Math.round(found / works.length * 100)}%)`);
  console.log(`❌ Missing: ${missing}`);
  console.log(`⚠️ Errors: ${errors}`);

  return statuses;
}

/**
 * Save video to database
 */
async function saveVideoToDatabase(
  work: CurriculumWork,
  result: VideoSearchResult,
  options: DiscoveryOptions
): Promise<void> {
  const supabase = createClient();
  const video = result.video;

  const videoData = {
    work_id: work.id,
    youtube_video_id: video.videoId,
    youtube_url: `https://www.youtube.com/watch?v=${video.videoId}`,
    title: video.title,
    description: video.description,
    channel_name: video.channelTitle,
    channel_id: video.channelId,
    thumbnail_url: video.thumbnails.high.url,
    duration_seconds: video.duration || null,
    view_count: video.viewCount || 0,
    like_count: video.likeCount || 0,
    comment_count: video.commentCount || 0,
    relevance_score: result.relevanceScore,
    is_approved: options.autoApprove && result.relevanceScore >= (options.autoApproveThreshold || 85),
    is_active: true,
  };

  const { error } = await supabase
    .from('curriculum_videos')
    .upsert(videoData, {
      onConflict: 'work_id,youtube_video_id',
    });

  if (error) {
    console.error('Error saving video:', error);
    throw error;
  }
}

/**
 * Update search cache
 */
async function updateSearchCache(
  work: CurriculumWork,
  searchQuery: string,
  videos: YouTubeVideo[],
  bestResult: VideoSearchResult | null
): Promise<void> {
  const supabase = createClient();

  const cacheData = {
    work_id: work.id,
    work_name: work.work_name,
    search_query: searchQuery,
    results_count: videos.length,
    best_video_id: bestResult?.video.videoId || null,
    best_relevance_score: bestResult?.relevanceScore || null,
    videos_json: videos.slice(0, 5).map(v => ({
      videoId: v.videoId,
      title: v.title,
      channelTitle: v.channelTitle,
      thumbnailUrl: v.thumbnails.high.url,
    })),
    last_searched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    search_successful: bestResult !== null,
  };

  const { error } = await supabase
    .from('video_search_cache')
    .upsert(cacheData, {
      onConflict: 'work_id',
    });

  if (error) {
    console.error('Error updating cache:', error);
  }
}

/**
 * Check if work needs video search
 */
export async function shouldSearchForVideo(workId: string): Promise<boolean> {
  const supabase = createClient();

  // Check if has approved video
  const { data: video } = await supabase
    .from('curriculum_videos')
    .select('id')
    .eq('work_id', workId)
    .eq('is_approved', true)
    .eq('is_active', true)
    .limit(1);

  if (video && video.length > 0) {
    return false; // Already has approved video
  }

  // Check if cache is valid
  const { data: cache } = await supabase
    .from('video_search_cache')
    .select('expires_at')
    .eq('work_id', workId)
    .limit(1);

  if (cache && cache.length > 0) {
    const expiresAt = new Date(cache[0].expires_at);
    if (expiresAt > new Date()) {
      return false; // Cache still valid
    }
  }

  return true; // Needs search
}

/**
 * Get works that need video discovery
 */
export async function getWorksNeedingDiscovery(): Promise<CurriculumWork[]> {
  const supabase = createClient();

  // Get all works
  const { data: works, error } = await supabase
    .from('curriculum_roadmap')
    .select('id, work_name, description, area, sub_category')
    .order('work_name');

  if (error || !works) {
    console.error('Error fetching works:', error);
    return [];
  }

  // Filter to works needing discovery
  const needsDiscovery: CurriculumWork[] = [];

  for (const work of works) {
    if (await shouldSearchForVideo(work.id)) {
      needsDiscovery.push(work);
    }
  }

  return needsDiscovery;
}





