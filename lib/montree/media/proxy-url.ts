// lib/montree/media/proxy-url.ts
// Generates Cloudflare-cached proxy URLs instead of Supabase signed URLs
// Proxy route: /api/montree/media/proxy/[...path]?bucket=<name>
// These URLs are publicly cacheable by Cloudflare CDN → fast in China without VPN
//
// The proxy supports multiple public buckets via ?bucket= (allowlisted server-side:
// montree-media, story-uploads, photo-bank). When omitted, the proxy defaults to
// montree-media, so existing callers keep working unchanged.

export type ProxyBucket = 'montree-media' | 'story-uploads' | 'photo-bank';

const DEFAULT_BUCKET: ProxyBucket = 'montree-media';

function buildBase(storagePath: string, bucket?: ProxyBucket): string {
  const base = `/api/montree/media/proxy/${storagePath}`;
  if (!bucket || bucket === DEFAULT_BUCKET) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}bucket=${encodeURIComponent(bucket)}`;
}

/**
 * Defensive: legacy DB rows (notably `montree_children.photo_url` written
 * by `/api/montree/children/[childId]/photo` before Session 33) may contain
 * a FULL Supabase public URL like
 *   https://<proj>.supabase.co/storage/v1/object/public/montree-media/<path>?v=...
 * If that's blindly passed into getProxyUrl(), the result is
 *   /api/montree/media/proxy/https://<proj>.supabase.co/...
 * — which the proxy route can't resolve and Cloudflare 502s.
 *
 * Strip any /storage/v1/(object|render/image)/public/<bucket>/ prefix and
 * return only the storage path tail (with query string preserved, so the
 * cache-bust ?v=... still does its job).
 */
function normalizeToStoragePath(input: string): string {
  if (!input) return input;
  // /storage/v1/object/public/<bucket>/<path>?v=...
  const objMatch = input.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  if (objMatch) return objMatch[1];
  // /storage/v1/render/image/public/<bucket>/<path>?w=...
  const renderMatch = input.match(/\/storage\/v1\/render\/image\/public\/[^/]+\/(.+)$/);
  if (renderMatch) return renderMatch[1];
  return input;
}

/**
 * Convert a storage path to a proxy URL
 * e.g. "schools/abc/photos/123.jpg" → "/api/montree/media/proxy/schools/abc/photos/123.jpg"
 *
 * For non-default buckets (story-uploads, photo-bank), pass the bucket name.
 *
 * Tolerant of legacy DB rows that store full Supabase public URLs — those are
 * normalized back to a storage path before the proxy prefix is applied.
 */
export function getProxyUrl(storagePath: string, bucket?: ProxyBucket): string {
  if (!storagePath) return '';
  return buildBase(normalizeToStoragePath(storagePath), bucket);
}

/**
 * Convert an array of storage paths to a path→proxyUrl map
 * Drop-in replacement for Supabase createSignedUrls
 */
export function getProxyUrls(paths: string[], bucket?: ProxyBucket): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const path of paths) {
    if (path) {
      urls[path] = getProxyUrl(path, bucket);
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
 * IMAGES ONLY. Do NOT use this for video paths — Supabase's render endpoint
 * returns 400 on videos, causing a wasted round-trip before the raw fallback.
 * Use getVideoProxyUrl() for videos instead.
 *
 * Usage:
 *   <img
 *     src={getThumbnailUrl(path, 480)}
 *     srcSet={`${getThumbnailUrl(path, 240)} 240w, ${getThumbnailUrl(path, 480)} 480w, ${getThumbnailUrl(path, 960)} 960w`}
 *     sizes="(max-width: 640px) 50vw, 240px"
 *   />
 */
export function getThumbnailUrl(
  storagePath: string,
  width: number,
  quality = 70,
  bucket?: ProxyBucket
): string {
  const base = buildBase(storagePath, bucket);
  const sep = base.includes('?') ? '&' : '?';
  const params = new URLSearchParams();
  params.set('w', String(width));
  params.set('q', String(quality));
  return `${base}${sep}${params.toString()}`;
}

/**
 * Build a responsive srcSet string for a grid thumbnail across 1x/2x/3x DPR.
 * IMAGES ONLY.
 */
export function getThumbnailSrcSet(
  storagePath: string,
  baseWidth: number,
  quality = 70,
  bucket?: ProxyBucket
): string {
  const w1 = baseWidth;
  const w2 = baseWidth * 2;
  const w3 = baseWidth * 3;
  return [
    `${getThumbnailUrl(storagePath, w1, quality, bucket)} ${w1}w`,
    `${getThumbnailUrl(storagePath, w2, quality, bucket)} ${w2}w`,
    `${getThumbnailUrl(storagePath, w3, quality, bucket)} ${w3}w`,
  ].join(', ');
}

/**
 * Video proxy URL — plain proxy URL with NO image transform params.
 * Browsers seek and resume via HTTP Range requests; the proxy route
 * forwards the Range header and emits 206 Partial Content.
 *
 * Usage:
 *   <video
 *     src={getVideoProxyUrl(storagePath, 'story-uploads')}
 *     playsInline
 *     muted
 *     preload="metadata"
 *     controls
 *   />
 */
export function getVideoProxyUrl(storagePath: string, bucket?: ProxyBucket): string {
  return buildBase(normalizeToStoragePath(storagePath), bucket);
}
