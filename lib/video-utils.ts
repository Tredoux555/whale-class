/**
 * Utility functions for video URL handling
 * Converts blob storage URLs to proxy URLs for China compatibility
 */

/**
 * Converts a blob storage URL to a proxy URL
 * This allows videos to be served from the same domain, avoiding China firewall issues
 * 
 * @param videoUrl - Original video URL (blob storage URL or local path)
 * @returns Proxy URL if it's a blob storage URL, original URL otherwise
 */
export function getProxyVideoUrl(videoUrl: string): string {
  // If it's a blob storage URL (starts with http and contains blob.vercel-storage)
  if (videoUrl.startsWith('http') && videoUrl.includes('blob.vercel-storage')) {
    try {
      const url = new URL(videoUrl);
      // Extract the path (e.g., /videos/xxx.mp4)
      const path = url.pathname;
      // Remove leading slash
      const blobPath = path.startsWith('/') ? path.slice(1) : path;
      // Return proxy URL
      return `/api/videos/proxy?path=${encodeURIComponent(blobPath)}`;
    } catch (error) {
      console.error('Error parsing blob URL:', error);
      // If parsing fails, return original URL
      return videoUrl;
    }
  }
  
  // For local paths or other URLs, return as-is
  return videoUrl;
}

/**
 * Extracts blob path from a blob storage URL
 * Used for operations like deletion
 * 
 * @param videoUrl - Blob storage URL
 * @returns Blob path (e.g., "videos/xxx.mp4") or null if not a blob URL
 */
export function extractBlobPath(videoUrl: string): string | null {
  if (videoUrl.startsWith('http') && videoUrl.includes('blob.vercel-storage')) {
    try {
      const url = new URL(videoUrl);
      const path = url.pathname;
      return path.startsWith('/') ? path.slice(1) : path;
    } catch (error) {
      console.error('Error extracting blob path:', error);
      return null;
    }
  }
  return null;
}

