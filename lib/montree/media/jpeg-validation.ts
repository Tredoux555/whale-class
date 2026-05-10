// lib/montree/media/jpeg-validation.ts
// Shared JPEG-only validation for any route that writes photos into `montree_media`.
//
// Rule (locked in by Tredoux): only image/jpeg with .jpg/.jpeg filename extensions
// are accepted as PHOTOS. PNG, HEIC, WebP, GIF, AVIF, etc. fail to render reliably
// across our Cloudflare proxy + thumbnail pipeline + parent surfaces, so we reject
// them at upload time instead of silently storing dead bytes.
//
// IMPORTANT: do NOT call this for videos or audio. Videos run through the same
// /api/montree/media/upload endpoint with `media_type='video'`, which is fine.

const ALLOWED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/jpg']);
const ALLOWED_PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg']);

const REJECT_MESSAGE =
  'Only JPEG images are accepted. Please convert your photo to JPEG and try again.';

/**
 * Returns null if the file is an acceptable JPEG photo, or an error string
 * suitable for use in `NextResponse.json({ error }, { status: 400 })`.
 *
 * Validates BOTH MIME type and filename extension to catch:
 *   - Browsers that report `image/png` for a `.png` file (most common)
 *   - Apple's `image/heic` / `image/heif` HEIC photos from iPhones
 *   - WebP, AVIF, GIF, BMP, TIFF, etc.
 *   - Files renamed to `.jpg` but still carrying a non-JPEG MIME (defensive)
 *
 * Files with no MIME (some PWA file pickers) are accepted as long as the
 * extension is `.jpg` / `.jpeg` — Chrome on Android occasionally drops the
 * type when picking from share-sheet, and we don't want to break that path.
 */
export function validateJpegPhoto(file: { name?: string | null; type?: string | null }): string | null {
  const mime = (file.type || '').toLowerCase();
  const name = file.name || '';
  const ext = name.includes('.')
    ? name.split('.').pop()?.toLowerCase() || ''
    : '';

  // 1. If MIME is set, it MUST be image/jpeg. Reject everything else.
  if (mime && !ALLOWED_PHOTO_MIME_TYPES.has(mime)) {
    return REJECT_MESSAGE;
  }

  // 2. If filename has an extension, it MUST be jpg/jpeg.
  //    (Empty extension allowed — some clients send no name at all.)
  if (ext && !ALLOWED_PHOTO_EXTENSIONS.has(ext)) {
    return REJECT_MESSAGE;
  }

  // 3. Fully nameless + typeless uploads — block. Better to fail loud than
  //    silently store an unknown byte stream into the photo bank.
  if (!mime && !ext) {
    return REJECT_MESSAGE;
  }

  return null;
}

/**
 * Convenience constant if a caller wants to short-circuit and short-message.
 */
export const JPEG_REJECT_MESSAGE = REJECT_MESSAGE;
