// lib/montree/media/proxy-url.ts
// Generates Cloudflare-cached proxy URLs instead of Supabase signed URLs
// Proxy route: /api/montree/media/proxy/[...path]
// These URLs are publicly cacheable by Cloudflare CDN → fast in China without VPN

/**
 * Convert a storage path to a proxy URL
 * e.g. "schools/abc/photos/123.jpg" → "/api/montree/media/proxy/schools/abc/photos/123.jpg"
 */
export function getProxyUrl(storagePath: string): string {
  return `/api/montree/media/proxy/${storagePath}`;
}

/**
 * Convert an array of storage paths to a path→proxyUrl map
 * Drop-in replacement for Supabase createSignedUrls
 */
export function getProxyUrls(paths: string[]): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const path of paths) {
    if (path) {
      urls[path] = getProxyUrl(path);
    }
  }
  return urls;
}
