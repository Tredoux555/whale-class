/**
 * Utility functions for video URL handling
 * Supports proxy mode for China firewall bypass (admin-controlled)
 */

/**
 * Checks if proxy mode is enabled (client-side)
 */
function isProxyEnabled(): boolean {
  if (typeof document === 'undefined') {
    return false; // Server-side: proxy disabled by default
  }
  
  // Check cookie for proxy mode
  const cookies = document.cookie.split(';');
  const proxyCookie = cookies.find(cookie => 
    cookie.trim().startsWith('video-proxy-enabled=')
  );
  
  return proxyCookie?.includes('true') || false;
}

/**
 * Returns the video URL, using proxy if enabled
 * 
 * @param videoUrl - Video URL (Supabase Storage URL or local path)
 * @returns Original URL or proxy URL if proxy mode is enabled
 */
export function getProxyVideoUrl(videoUrl: string): string {
  // For local paths, return as-is
  if (!videoUrl.startsWith('http')) {
    return videoUrl;
  }

  // Check if proxy mode is enabled
  if (isProxyEnabled() && videoUrl.includes('supabase.co')) {
    // Use proxy endpoint for Supabase Storage URLs
    const proxyUrl = `/api/videos/proxy-supabase?url=${encodeURIComponent(videoUrl)}`;
    return proxyUrl;
  }

  // Return original URL
  return videoUrl;
}

