// =====================================================
// WHALE PLATFORM - YOUTUBE VIDEO TYPES
// =====================================================
// Location: lib/youtube/types.ts
// Purpose: TypeScript types for YouTube video system
// =====================================================

/**
 * YouTube video data from API
 */
export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
    standard?: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
  publishedAt: string;
  duration?: number; // in seconds
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  tags?: string[];
}

/**
 * Curriculum video stored in database
 */
export interface CurriculumVideo {
  id: string;
  work_id: string;
  youtube_video_id: string;
  youtube_url: string;
  title: string;
  description: string | null;
  channel_name: string;
  channel_id: string | null;
  thumbnail_url: string;
  duration_seconds: number | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  rating: number | null;
  relevance_score: number;
  is_approved: boolean;
  is_active: boolean;
  added_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  added_at: string;
  last_updated: string;
}

/**
 * Video search result with relevance scoring
 */
export interface VideoSearchResult {
  video: YouTubeVideo;
  relevanceScore: number;
  reasoning: string[];
  scoreBreakdown: {
    titleMatch: number;
    descriptionMatch: number;
    channelAuthority: number;
    viewCount: number;
    recency: number;
    duration: number;
    engagement: number;
  };
}

/**
 * Curriculum work (simplified from main schema)
 */
export interface CurriculumWork {
  id: string;
  work_name: string;
  description?: string;
  area?: string;
  sub_category?: string;
  difficulty_level?: string;
  video_id?: string;
}

/**
 * Status of video discovery for a work
 */
export interface VideoSearchStatus {
  workId: string;
  workName: string;
  status: 'pending' | 'searching' | 'found' | 'no_video' | 'error';
  videosFound: number;
  bestVideo?: YouTubeVideo;
  bestScore?: number;
  error?: string;
  timeElapsed?: number;
}

/**
 * Video search cache entry
 */
export interface VideoSearchCache {
  id: string;
  work_id: string;
  work_name: string;
  search_query: string;
  results_count: number;
  best_video_id: string | null;
  best_relevance_score: number | null;
  videos_json: YouTubeVideo[] | null;
  last_searched_at: string;
  expires_at: string;
  search_successful: boolean;
  error_message: string | null;
}

/**
 * Video search log entry
 */
export interface VideoSearchLog {
  id: string;
  work_id: string;
  work_name: string;
  search_query: string;
  youtube_query: string;
  videos_found: number;
  best_video_selected: string | null;
  best_video_title: string | null;
  relevance_score: number | null;
  search_duration_ms: number | null;
  api_calls_used: number;
  error_occurred: boolean;
  error_message: string | null;
  search_completed_at: string;
  searched_by: string | null;
}

/**
 * Options for video discovery
 */
export interface DiscoveryOptions {
  maxResults?: number; // Max results per search (default: 10)
  minRelevanceScore?: number; // Minimum score to save (default: 60)
  forceRefresh?: boolean; // Ignore cache (default: false)
  autoApprove?: boolean; // Auto-approve high scores (default: false)
  autoApproveThreshold?: number; // Score threshold for auto-approve (default: 85)
}

/**
 * Options for relevance scoring
 */
export interface ScoringOptions {
  titleWeight?: number; // Weight for title match (default: 1.0)
  descriptionWeight?: number; // Weight for description (default: 1.0)
  channelWeight?: number; // Weight for channel authority (default: 1.0)
  viewCountWeight?: number; // Weight for views (default: 0.8)
  recencyWeight?: number; // Weight for recency (default: 1.0)
  durationWeight?: number; // Weight for duration (default: 1.0)
  engagementWeight?: number; // Weight for engagement (default: 0.5)
}

/**
 * Detailed relevance score breakdown
 */
export interface RelevanceScore {
  totalScore: number; // 0-100
  scoreBreakdown: {
    titleMatch: number; // 0-20
    descriptionMatch: number; // 0-20
    channelAuthority: number; // 0-15
    viewCount: number; // 0-10
    recency: number; // 0-15
    duration: number; // 0-15
    engagement: number; // 0-5
  };
  reasoning: string[]; // Human-readable explanations
  isPassing: boolean; // Score >= threshold
}

/**
 * Video discovery statistics
 */
export interface DiscoveryStatistics {
  total_works: number;
  works_with_videos: number;
  works_pending_approval: number;
  works_missing_videos: number;
  average_relevance_score: number;
  total_searches_performed: number;
  searches_last_30_days: number;
  coverage_percentage: number;
}

/**
 * Batch discovery progress
 */
export interface BatchDiscoveryProgress {
  totalWorks: number;
  completed: number;
  inProgress: number;
  pending: number;
  failed: number;
  videosFound: number;
  averageScore: number;
  estimatedTimeRemaining: number; // seconds
  currentWork?: string;
}

/**
 * API response for video search
 */
export interface VideoSearchResponse {
  success: boolean;
  workId: string;
  workName: string;
  videoFound: boolean;
  video?: CurriculumVideo;
  score?: number;
  alternatives?: CurriculumVideo[];
  fromCache?: boolean;
  error?: string;
}

/**
 * API response for batch discovery
 */
export interface BatchDiscoveryResponse {
  success: boolean;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  progress: BatchDiscoveryProgress;
  message?: string;
  error?: string;
}

/**
 * Admin video management filters
 */
export interface VideoManagementFilters {
  status?: 'all' | 'approved' | 'pending' | 'rejected' | 'missing';
  area?: string;
  minScore?: number;
  searchQuery?: string;
  sortBy?: 'work_name' | 'relevance_score' | 'added_at' | 'view_count';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Video update request
 */
export interface VideoUpdateRequest {
  videoId: string;
  isApproved?: boolean;
  isActive?: boolean;
  notes?: string;
}

/**
 * Manual video addition request
 */
export interface ManualVideoRequest {
  workId: string;
  youtubeUrl: string;
  notes?: string;
}

/**
 * YouTube API search parameters
 */
export interface YouTubeSearchParams {
  q: string; // Search query
  part: string; // Parts to include (snippet, contentDetails, statistics)
  type: 'video';
  maxResults: number;
  order?: 'relevance' | 'date' | 'rating' | 'viewCount';
  videoDuration?: 'short' | 'medium' | 'long' | 'any';
  videoDefinition?: 'high' | 'standard' | 'any';
  safeSearch?: 'none' | 'moderate' | 'strict';
  relevanceLanguage?: string;
}

/**
 * Known Montessori channel identifiers
 */
export const MONTESSORI_CHANNELS = [
  'Montessori Guide',
  'Montessori For Everyone',
  'The Montessori Room',
  'Montessori Education',
  'Age of Montessori',
  'Montessori Academy',
  'Montessori Training',
  'Montessori Services',
] as const;

/**
 * Video duration categories
 */
export const VIDEO_DURATION_CATEGORIES = {
  SHORT: { min: 60, max: 300 }, // 1-5 minutes
  IDEAL: { min: 300, max: 900 }, // 5-15 minutes (perfect for learning)
  MEDIUM: { min: 180, max: 1200 }, // 3-20 minutes (acceptable)
  LONG: { min: 120, max: 1800 }, // 2-30 minutes (workable)
} as const;

/**
 * Relevance score thresholds
 */
export const SCORE_THRESHOLDS = {
  EXCELLENT: 85, // Auto-approve candidate
  GOOD: 75, // Strong candidate
  ACCEPTABLE: 60, // Acceptable minimum
  POOR: 40, // Below acceptable
} as const;

/**
 * Cache expiration settings
 */
export const CACHE_SETTINGS = {
  DEFAULT_EXPIRY_DAYS: 30,
  FAILED_SEARCH_RETRY_DAYS: 7,
  HIGH_SCORE_EXTEND_DAYS: 60,
} as const;

/**
 * Search result status
 */
export type SearchResultStatus = 
  | 'success' 
  | 'no_results' 
  | 'api_error' 
  | 'rate_limit' 
  | 'invalid_query' 
  | 'cache_hit';

/**
 * Type guard to check if object is YouTubeVideo
 */
export function isYouTubeVideo(obj: any): obj is YouTubeVideo {
  return (
    obj &&
    typeof obj.videoId === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.channelTitle === 'string' &&
    obj.thumbnails &&
    obj.thumbnails.high &&
    typeof obj.thumbnails.high.url === 'string'
  );
}

/**
 * Type guard to check if object is CurriculumVideo
 */
export function isCurriculumVideo(obj: any): obj is CurriculumVideo {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.work_id === 'string' &&
    typeof obj.youtube_video_id === 'string' &&
    typeof obj.relevance_score === 'number'
  );
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format view count with K/M suffixes
 */
export function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Get score level description
 */
export function getScoreLevel(score: number): {
  level: 'excellent' | 'good' | 'acceptable' | 'poor';
  color: string;
  description: string;
} {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) {
    return {
      level: 'excellent',
      color: 'green',
      description: 'Excellent match - highly relevant',
    };
  }
  if (score >= SCORE_THRESHOLDS.GOOD) {
    return {
      level: 'good',
      color: 'blue',
      description: 'Good match - relevant content',
    };
  }
  if (score >= SCORE_THRESHOLDS.ACCEPTABLE) {
    return {
      level: 'acceptable',
      color: 'yellow',
      description: 'Acceptable - may be useful',
    };
  }
  return {
    level: 'poor',
    color: 'red',
    description: 'Poor match - low relevance',
  };
}

/**
 * Build YouTube embed URL from video ID
 */
export function buildYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Build YouTube watch URL from video ID
 */
export function buildYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}









