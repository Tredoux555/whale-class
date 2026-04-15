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

/**
 * Generate a thumbnail proxy URL with Supabase image transform params.
 * Proxy route forwards ?w and ?q to Supabase render endpoint and falls
 * back to the raw object if the render plan isn't available.
 * Cloudflare caches each (path, w, q) tuple independently at the edge.
 *
 * Usage:
 *   <img
 *     src={getThumbnailUrl(path, 480)}
 *     srcSet={`${getThumbnailUrl(path, 240)} 240w, ${getThumbnailUrl(path, 480)} 480w, ${getThumbnailUrl(path, 960)} 960w`}
 *     sizes="(max-width: 640px) 50vw, 240px"
 *   />
 */
export function getThumbnailUrl(storagePath: string, width: number, quality = 70): string {
  const base = getProxyUrl(storagePath);
  const params = new URLSearchParams();
  params.set('w', String(width));
  params.set('q', String(quality));
  return `${base}?${params.toString()}`;
}

/**
 * Build a responsive srcSet string for a grid thumbnail across 1x/2x/3x DPR.
 */
export function getThumbnailSrcSet(storagePath: string, baseWidth: number, quality = 70): string {
  const w1 = baseWidth;
  const w2 = baseWidth * 2;
  const w3 = baseWidth * 3;
  return [
    `${getThumbnailUrl(storagePath, w1, quality)} ${w1}w`,
    `${getThumbnailUrl(storagePath, w2, quality)} ${w2}w`,
    `${getThumbnailUrl(storagePath, w3, quality)} ${w3}w`,
  ].join(', ');
}
