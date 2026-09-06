// lib/montree/media/safe-content-type.ts
//
// One allow-list, shared by every media proxy, that decides whether a stored
// file may be handed to a browser with its own Content-Type — or must be
// defanged first.
//
// ── The attack this closes ───────────────────────────────────────────────────
// /api/montree/media/proxy/... streams objects out of public Supabase buckets
// and used to reflect the upstream Content-Type verbatim. The upstream
// Content-Type is whatever was recorded at upload, and the upload routes take
// it from the client (`contentType: file.type`). The photo path is JPEG-gated,
// but the `video`/`audio` path is not — so a caller could store a file with
// `Content-Type: text/html` (or `image/svg+xml`) and then fetch it back from
//
//     https://montree.xyz/api/montree/media/proxy/<path>
//
// The browser executes it as a document ON THE montree.xyz ORIGIN. That is
// stored XSS with the whole product inside the same origin: the script can call
// every authenticated API the viewer can reach (the auth cookie is httpOnly, so
// it cannot be read, but it IS sent automatically on those calls), read a
// principal's whole school, and change settings. SVG is the same class of
// problem — an <svg> document runs <script> — which is why it is not on the
// allow-list even though it is nominally an image.
//
// ── The posture ──────────────────────────────────────────────────────────────
// Anything on the list is served as itself. Anything else is served as
// `application/octet-stream` with `Content-Disposition: attachment`, so it
// downloads instead of rendering. Nothing 404s: a legitimate-but-odd file that
// somebody stored still comes back, it just cannot execute. Every response also
// carries `X-Content-Type-Options: nosniff` so a browser cannot content-sniff
// its way back to HTML.

/**
 * Content types the proxies may serve inline, as themselves.
 *
 * Deliberately EXCLUDED, and why:
 *   image/svg+xml            — an SVG document executes <script> on our origin.
 *   text/html, application/xhtml+xml, text/xml, application/xml
 *                            — documents; the core of the attack.
 *   text/*                   — text/plain is harmless but pointless here, and
 *                              allowing the family invites text/html back in.
 *   application/javascript   — obvious.
 *
 * application/pdf IS allowed: 17 in-app references serve PDFs (shelf packs,
 * books, materials) and browsers render them in a sandboxed viewer that does
 * not get our origin's DOM.
 */
export const PROXY_INLINE_CONTENT_TYPES: ReadonlySet<string> = new Set([
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  // Video
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/mpeg',
  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/webm',
  'audio/x-m4a',
  // Documents
  'application/pdf',
  // Opaque bytes — already inert, and what we downgrade TO.
  'application/octet-stream',
]);

/**
 * Content types that must never be stored from an upload, whatever the caller
 * claims. Used by the upload gate; the proxy's allow-list is the real backstop
 * (it also covers files stored before this existed).
 */
export const UPLOAD_FORBIDDEN_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'image/svg+xml',
  'text/html',
  'text/xml',
  'application/xhtml+xml',
  'application/xml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'text/css',
]);

/** Strip `; charset=utf-8` etc. and normalise case/whitespace. */
export function normaliseContentType(raw: string | null | undefined): string {
  return (raw || '').split(';')[0].trim().toLowerCase();
}

export interface SafeContentTypeDecision {
  /** The Content-Type header to actually send. */
  contentType: string;
  /** True when the value was downgraded because it was not allow-listed. */
  downgraded: boolean;
  /**
   * True when the response MUST also carry
   * `Content-Disposition: attachment` (i.e. it was downgraded and the caller
   * did not already ask for a download).
   */
  forceAttachment: boolean;
}

/**
 * Decide how to serve an object whose upstream Content-Type is `raw`.
 *
 * Allow-listed  -> served as itself.
 * Anything else -> application/octet-stream + attachment.
 */
export function decideProxyContentType(
  raw: string | null | undefined
): SafeContentTypeDecision {
  const type = normaliseContentType(raw);

  if (type && PROXY_INLINE_CONTENT_TYPES.has(type)) {
    return { contentType: type, downgraded: false, forceAttachment: false };
  }

  return {
    contentType: 'application/octet-stream',
    downgraded: true,
    forceAttachment: true,
  };
}

/**
 * Upload-side gate. Returns an error string when the declared content type is
 * one we refuse to store, or null when it is acceptable.
 *
 * Note this is intentionally narrower than the proxy allow-list: uploads of an
 * unusual-but-inert type (say a .zip export) are still allowed through, because
 * the proxy will serve them as a download rather than a document. What is
 * blocked here is only the actively dangerous set.
 */
export function validateUploadContentType(
  raw: string | null | undefined
): string | null {
  const type = normaliseContentType(raw);
  if (type && UPLOAD_FORBIDDEN_CONTENT_TYPES.has(type)) {
    return 'That file type cannot be uploaded.';
  }
  return null;
}
