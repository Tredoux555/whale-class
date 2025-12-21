// =====================================================
// WHALE PLATFORM - YOUTUBE SEARCH INTEGRATION
// =====================================================
// Location: lib/youtube/search.ts
// Purpose: YouTube Data API v3 integration
// =====================================================

import type {
  YouTubeVideo,
  YouTubeSearchParams,
  SearchResultStatus,
} from './types';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Search YouTube for videos matching query
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 10
): Promise<{ videos: YouTubeVideo[]; status: SearchResultStatus }> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key not configured');
    return { videos: [], status: 'api_error' };
  }

  try {
    // Build search parameters
    const searchParams: YouTubeSearchParams = {
      q: query,
      part: 'snippet',
      type: 'video',
      maxResults: Math.min(maxResults, 50), // API limit is 50
      order: 'relevance',
      videoDuration: 'medium', // 4-20 minutes
      safeSearch: 'strict',
      relevanceLanguage: 'en',
    };

    // Make API request
    const searchUrl = buildSearchUrl(searchParams);
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      if (searchResponse.status === 403 || searchResponse.status === 429) {
        console.error('YouTube API rate limit exceeded');
        return { videos: [], status: 'rate_limit' };
      }
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return { videos: [], status: 'no_results' };
    }

    // Extract video IDs
    const videoIds = searchData.items.map((item: any) => item.id.videoId);

    // Get detailed video information
    const videos = await getVideoDetails(videoIds);

    return { videos, status: 'success' };
  } catch (error) {
    console.error('YouTube search error:', error);
    return {
      videos: [],
      status: error instanceof Error && error.message.includes('rate limit')
        ? 'rate_limit'
        : 'api_error',
    };
  }
}

/**
 * Get detailed information for multiple videos
 */
export async function getVideoDetails(
  videoIds: string[]
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY || videoIds.length === 0) {
    return [];
  }

  try {
    const url = `${YOUTUBE_API_BASE}/videos?` +
      `part=snippet,contentDetails,statistics&` +
      `id=${videoIds.join(',')}&` +
      `key=${YOUTUBE_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items) {
      return [];
    }

    return data.items.map((item: any) => convertToYouTubeVideo(item));
  } catch (error) {
    console.error('Error fetching video details:', error);
    return [];
  }
}

/**
 * Get detailed information for a single video
 */
export async function getVideoDetailsById(
  videoId: string
): Promise<YouTubeVideo | null> {
  const videos = await getVideoDetails([videoId]);
  return videos[0] || null;
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(
  videoId: string
): Promise<number | null> {
  const video = await getVideoDetailsById(videoId);
  return video?.duration || null;
}

/**
 * Get video statistics
 */
export async function getVideoStatistics(
  videoId: string
): Promise<{
  viewCount: number;
  likeCount: number;
  commentCount: number;
} | null> {
  const video = await getVideoDetailsById(videoId);

  if (!video) {
    return null;
  }

  return {
    viewCount: video.viewCount || 0,
    likeCount: video.likeCount || 0,
    commentCount: video.commentCount || 0,
  };
}

/**
 * Validate YouTube video ID
 */
export async function validateVideoId(videoId: string): Promise<boolean> {
  const video = await getVideoDetailsById(videoId);
  return video !== null;
}

/**
 * Build search URL with parameters
 */
function buildSearchUrl(params: YouTubeSearchParams): string {
  const queryParams = new URLSearchParams();

  queryParams.append('part', params.part);
  queryParams.append('q', params.q);
  queryParams.append('type', params.type);
  queryParams.append('maxResults', params.maxResults.toString());
  queryParams.append('key', YOUTUBE_API_KEY!);

  if (params.order) {
    queryParams.append('order', params.order);
  }

  if (params.videoDuration) {
    queryParams.append('videoDuration', params.videoDuration);
  }

  if (params.videoDefinition) {
    queryParams.append('videoDefinition', params.videoDefinition);
  }

  if (params.safeSearch) {
    queryParams.append('safeSearch', params.safeSearch);
  }

  if (params.relevanceLanguage) {
    queryParams.append('relevanceLanguage', params.relevanceLanguage);
  }

  return `${YOUTUBE_API_BASE}/search?${queryParams.toString()}`;
}

/**
 * Convert YouTube API response to YouTubeVideo type
 */
function convertToYouTubeVideo(item: any): YouTubeVideo {
  return {
    videoId: item.id,
    title: item.snippet.title,
    description: item.snippet.description || '',
    channelTitle: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    thumbnails: {
      default: item.snippet.thumbnails.default,
      medium: item.snippet.thumbnails.medium,
      high: item.snippet.thumbnails.high,
      standard: item.snippet.thumbnails.standard,
      maxres: item.snippet.thumbnails.maxres,
    },
    publishedAt: item.snippet.publishedAt,
    duration: item.contentDetails ? parseDuration(item.contentDetails.duration) : undefined,
    viewCount: item.statistics ? parseInt(item.statistics.viewCount || '0') : undefined,
    likeCount: item.statistics ? parseInt(item.statistics.likeCount || '0') : undefined,
    commentCount: item.statistics ? parseInt(item.statistics.commentCount || '0') : undefined,
    tags: item.snippet.tags || [],
  };
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT15M33S = 933 seconds
 */
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) {
    return 0;
  }

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Build search query for Montessori work
 */
export function buildMontessoriSearchQuery(workName: string): string {
  // Base query: "Montessori" + work name
  let query = `Montessori ${workName}`;

  // Add helpful keywords based on work type
  const keywords = getSearchKeywords(workName);
  if (keywords.length > 0) {
    query += ` ${keywords.join(' ')}`;
  }

  return query;
}

/**
 * Get additional search keywords based on work name
 */
function getSearchKeywords(workName: string): string[] {
  const keywords: string[] = [];

  // Common Montessori terms
  if (workName.toLowerCase().includes('tower') ||
      workName.toLowerCase().includes('stair') ||
      workName.toLowerCase().includes('rods')) {
    keywords.push('presentation', 'lesson');
  }

  // Practical life
  if (workName.toLowerCase().includes('pouring') ||
      workName.toLowerCase().includes('transfer') ||
      workName.toLowerCase().includes('care')) {
    keywords.push('practical life', 'demonstration');
  }

  // Sensorial
  if (workName.toLowerCase().includes('cylinder') ||
      workName.toLowerCase().includes('color') ||
      workName.toLowerCase().includes('sound')) {
    keywords.push('sensorial', 'exercise');
  }

  // Math
  if (workName.toLowerCase().includes('bead') ||
      workName.toLowerCase().includes('number') ||
      workName.toLowerCase().includes('spindle')) {
    keywords.push('mathematics', 'tutorial');
  }

  // Language
  if (workName.toLowerCase().includes('sandpaper') ||
      workName.toLowerCase().includes('movable') ||
      workName.toLowerCase().includes('alphabet')) {
    keywords.push('language', 'reading');
  }

  // Default keywords if none matched
  if (keywords.length === 0) {
    keywords.push('tutorial', 'demonstration');
  }

  return keywords;
}

/**
 * Get alternative search queries if first search fails
 */
export function getAlternativeSearchQueries(workName: string): string[] {
  return [
    `Montessori ${workName} presentation`,
    `Montessori ${workName} lesson`,
    `Montessori ${workName} tutorial`,
    `Montessori ${workName} demonstration`,
    `${workName} Montessori activity`,
    `${workName} Montessori material`,
  ];
}

/**
 * Test YouTube API connection
 */
export async function testYouTubeApiConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  if (!YOUTUBE_API_KEY) {
    return {
      connected: false,
      error: 'YouTube API key not configured',
    };
  }

  try {
    const result = await searchYouTubeVideos('Montessori', 1);

    if (result.status === 'success' || result.status === 'no_results') {
      return { connected: true };
    }

    return {
      connected: false,
      error: `API status: ${result.status}`,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}







