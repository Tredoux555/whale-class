/**
 * Utility functions for video URL handling
 * Supabase Storage URLs work directly, no proxy needed
 * But we keep this function for compatibility and future use
 */

/**
 * Returns the video URL as-is (Supabase URLs work directly)
 * This function is kept for compatibility and future proxy needs
 * 
 * @param videoUrl - Original video URL (Supabase Storage URL or local path)
 * @returns Original URL (Supabase URLs work directly, no proxy needed)
 */
export function getProxyVideoUrl(videoUrl: string): string {
  // Supabase Storage URLs work directly, no proxy needed
  // They're served from Supabase's CDN which works globally
  return videoUrl;
}

/**
 * Extracts file path from a Supabase Storage URL
 * Used for operations like deletion
 * 
 * @param videoUrl - Supabase Storage URL
 * @returns File path (e.g., "videos/xxx.mp4") or null if not a Supabase URL
 */
export function extractSupabasePath(videoUrl: string): string | null {
  if (videoUrl.startsWith('http') && videoUrl.includes('supabase.co')) {
    try {
      const url = new URL(videoUrl);
      // Supabase URLs look like: /storage/v1/object/public/videos/path/to/file.mp4
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/videos\/(.+)/);
      if (pathMatch && pathMatch[1]) {
        return decodeURIComponent(pathMatch[1]);
      }
    } catch (error) {
      console.error('Error extracting Supabase path:', error);
      return null;
    }
  }
  return null;
}

