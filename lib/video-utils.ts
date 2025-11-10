/**
 * Utility functions for video URL handling
 * Vercel Blob Storage URLs work directly, no proxy needed
 */

/**
 * Returns the video URL as-is (Vercel Blob Storage URLs work directly)
 * This function is kept for compatibility and future proxy needs
 * 
 * @param videoUrl - Original video URL (Vercel Blob Storage URL or local path)
 * @returns Original URL (Vercel Blob URLs work directly)
 */
export function getProxyVideoUrl(videoUrl: string): string {
  // Vercel Blob Storage URLs work directly
  // They're served from Vercel's CDN which works globally
  return videoUrl;
}

