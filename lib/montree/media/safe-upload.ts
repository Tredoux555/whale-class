// lib/montree/media/safe-upload.ts
// Shared upload hardening for every route that writes client bytes into a
// Supabase storage bucket that /api/montree/media/proxy re-serves same-origin.
//
// 🚨 WHY: the proxy hands the browser whatever Content-Type the object was
// stored with. A teacher who uploads `poc.html` declared as `text/html` gets a
// montree.xyz URL that EXECUTES its inline script under the victim's session
// (the app CSP is `script-src 'self' 'unsafe-inline'`, and `nosniff` does not
// help because the type is stored, not sniffed). So the stored Content-Type
// must never be client-chosen free text — it is either an allow-listed media
// type or `application/octet-stream`.
//
// This module is pure (no I/O, no Next imports) so it is unit-testable and
// importable from any route.
//
// NOTE: there is no magic-byte sniffer in the repo — `validateJpegPhoto`
// (./jpeg-validation) checks MIME + extension only. This module follows the
// same declared-type + extension-consistency approach; byte sniffing can be
// layered on later without changing any call site.

export type UploadKind = 'image' | 'video' | 'audio' | 'pdf';

/** Canonical allow-list: stored Content-Type → media class. */
const MIME_KIND: Record<string, UploadKind> = {
  // images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/heic': 'image',
  // video
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
  // audio
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/aac': 'audio',
  'audio/wav': 'audio',
  'audio/webm': 'audio',
  'audio/ogg': 'audio',
  // documents
  'application/pdf': 'pdf',
};

/** Every Content-Type this platform will ever store verbatim. */
export const ALLOWED_UPLOAD_MIME: ReadonlySet<string> = new Set(Object.keys(MIME_KIND));

/**
 * Common browser/OS aliases folded onto their canonical allow-listed value.
 * Safari reports `image/jpg`, Windows reports `audio/x-wav`, iOS reports
 * `audio/x-m4a` — all of them mean an allow-listed type, and rejecting them
 * would break real uploads for no security gain.
 */
const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/heif': 'image/heic',
  'image/x-heic': 'image/heic',
  'audio/mp3': 'audio/mpeg',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'video/mov': 'video/quicktime',
  'video/x-quicktime': 'video/quicktime',
};

/** Extension → the canonical types that extension may legitimately carry. */
const EXT_MIME: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  heic: ['image/heic'],
  heif: ['image/heic'],
  mp4: ['video/mp4', 'audio/mp4'],
  m4v: ['video/mp4'],
  m4a: ['audio/mp4', 'audio/aac'],
  mov: ['video/quicktime'],
  qt: ['video/quicktime'],
  webm: ['video/webm', 'audio/webm'],
  mp3: ['audio/mpeg'],
  aac: ['audio/aac'],
  wav: ['audio/wav'],
  ogg: ['audio/ogg'],
  oga: ['audio/ogg'],
  pdf: ['application/pdf'],
};

/** Byte caps per media class. `image` matches photo-onboarding's 15MB. */
export const MAX_UPLOAD_BYTES: Record<UploadKind, number> = {
  image: 15 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  pdf: 20 * 1024 * 1024,
};

/** Cap for non-media files (the general-purpose /api/montree/uploads drop-zone). */
export const MAX_OTHER_UPLOAD_BYTES = 25 * 1024 * 1024;

export const SAFE_FALLBACK_CONTENT_TYPE = 'application/octet-stream';

/** `text/html; charset=utf-8` → `text/html`, lower-cased and alias-folded. */
function normalizeMime(declared: string | null | undefined): string {
  const bare = (declared || '').split(';')[0].trim().toLowerCase();
  return MIME_ALIASES[bare] || bare;
}

function extensionOf(fileName?: string | null): string {
  const name = (fileName || '').trim();
  if (!name.includes('.')) return '';
  return (name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The Content-Type it is safe to STORE for this file.
 *
 * Returns the declared type when it is allow-listed AND consistent with the
 * filename extension; otherwise `application/octet-stream`. An unknown or
 * absent extension is not by itself a rejection (some PWA file pickers drop
 * the name), but a KNOWN extension that disagrees with the declared type is —
 * that is the `payload.html` renamed to `photo.jpg` case, and vice versa.
 */
export function safeContentType(declared: string, fileName?: string): string {
  const mime = normalizeMime(declared);
  const ext = extensionOf(fileName);

  // No declared type at all (some PWA/share-sheet pickers drop it): fall back
  // to the extension's canonical type. Still allow-listed, never free text.
  if (!mime) return EXT_MIME[ext]?.[0] || SAFE_FALLBACK_CONTENT_TYPE;

  if (!ALLOWED_UPLOAD_MIME.has(mime)) return SAFE_FALLBACK_CONTENT_TYPE;

  if (ext) {
    const allowedForExt = EXT_MIME[ext];
    // Extension we don't know, or one that maps to a different type → unsafe.
    if (!allowedForExt || !allowedForExt.includes(mime)) return SAFE_FALLBACK_CONTENT_TYPE;
  }

  return mime;
}

/** Media class of a file, or null when it is not an allow-listed media type. */
export function uploadKind(declared: string, fileName?: string): UploadKind | null {
  const safe = safeContentType(declared, fileName);
  return MIME_KIND[safe] || null;
}

/**
 * Byte-cap check. Returns null when the file is within its class cap, or an
 * error string suitable for `NextResponse.json({ error }, { status: 400 })`.
 * `kind` may be omitted — it is then derived from the file's declared type.
 */
export function assertUploadSize(
  file: { size: number; type?: string | null; name?: string | null },
  kind?: UploadKind | null
): string | null {
  const resolved = kind ?? uploadKind(file.type || '', file.name || undefined);
  const max = resolved ? MAX_UPLOAD_BYTES[resolved] : MAX_OTHER_UPLOAD_BYTES;
  if (file.size > max) {
    return `File is too large (max ${Math.round(max / (1024 * 1024))}MB)`;
  }
  return null;
}
