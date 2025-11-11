/**
 * Utility functions for video URL handling
 * Supabase Storage URLs work directly, no proxy needed
 */

/**
 * Returns the video URL as-is (Supabase URLs work directly)
 * 
 * @param videoUrl - Video URL (Supabase Storage URL or local path)
 * @returns Original URL
 */
export function getProxyVideoUrl(videoUrl: string): string {
  // Supabase Storage URLs work directly, no proxy needed
  // For local paths, return as-is
  return videoUrl;
}

