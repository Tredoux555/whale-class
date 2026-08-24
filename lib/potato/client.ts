// lib/potato/client.ts
// Browser-side fetch helpers for Potato Snaps.
//
// Pure browser code — nothing here imports a server module, so a page component
// can pull it in freely.
//
// 🚨 Every helper checks `response.ok` BEFORE parsing. A Next.js error page is
// HTML, and calling .json() on it throws a SyntaxError that reads like a bug in
// the caller instead of the 500 it actually is.

export class PotatoApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'PotatoApiError';
    this.status = status;
    this.code = code;
  }
}

const SETUP_PENDING_MESSAGE =
  'PSS isn’t switched on yet. The database setup still has to be run.';

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function handle<T>(response: Response): Promise<T> {
  const body = (await readBody(response)) as { error?: string } | null;

  if (!response.ok) {
    const raw = typeof body?.error === 'string' ? body.error : '';
    if (raw === 'setup_pending' || response.status === 503) {
      throw new PotatoApiError(SETUP_PENDING_MESSAGE, response.status, 'setup_pending');
    }
    throw new PotatoApiError(raw || `Something went wrong (${response.status}).`, response.status);
  }

  return (body ?? {}) as T;
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', signal });
  return handle<T>(response);
}

export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body ?? {}),
    signal,
  });
  return handle<T>(response);
}

export async function patchJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body ?? {}),
    signal,
  });
  return handle<T>(response);
}

export async function deleteJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: 'DELETE', credentials: 'same-origin', signal });
  return handle<T>(response);
}

export async function postForm<T>(url: string, form: FormData, signal?: AbortSignal): Promise<T> {
  // No Content-Type header — the browser must set the multipart boundary itself.
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    body: form,
    signal,
  });
  return handle<T>(response);
}

export function messageFrom(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof PotatoApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Extensions a Potato Snaps object may legitimately carry. Anything else in a
 * proxy URL is not something we will name a file after — see mediaExtFromUrl.
 */
const KNOWN_MEDIA_EXTS = new Set([
  'mp4', 'mov', 'webm', '3gp',
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif',
]);

/**
 * The extension a proxy URL's object actually has, or null.
 *
 * 🚨 The URL is app-built (`proxyUrl` in lib/potato/db.ts) but it is still not
 * something to interpolate into a filename unchecked: a `download` attribute
 * is a filesystem instruction, and an extension is the one part of it the OS
 * acts on. So the tail is matched against a closed list rather than trusted.
 */
export function mediaExtFromUrl(url: string): string | null {
  const path = url.split(/[?#]/)[0];
  const tail = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return KNOWN_MEDIA_EXTS.has(tail) ? tail : null;
}

/**
 * Build a human filename for a downloaded film, video or photo, e.g.
 * "potato-snaps-emma-2026-08-17.mp4". `name` is a display string (a child's
 * name, or "<class name> · class film") — slugified so spaces/punctuation
 * never end up in the saved filename. `dateKey` is a YYYY-MM-DD (the film's
 * week, or the day a video was captured) and is dropped if it is not one.
 * Falls back to a generic name if both inputs are unusable.
 *
 * 🚨 v1.6 renamed this from `filmFilename` and gave it an extension argument.
 * A rendered montage is always .mp4, but an uploaded video is whatever came off
 * the teacher's phone (.mov is the common case on iOS), and saving a QuickTime
 * file as "…mp4" hands her a file her computer opens wrong. One function, three
 * kinds of media, because the naming rule genuinely is the same for all three.
 */
export function mediaFilename(name: string, dateKey: string, ext = 'mp4'): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : '';
  const safeExt = KNOWN_MEDIA_EXTS.has(ext.toLowerCase()) ? ext.toLowerCase() : 'mp4';
  const parts = [slug, day].filter(Boolean);
  return parts.length
    ? `potato-snaps-${parts.join('-')}.${safeExt}`
    : `potato-snaps-film.${safeExt}`;
}

/**
 * Fetch a film, a video or a photo through the media proxy and hand it to the
 * browser as a download — fetch→blob→objectURL→`<a download>` click, rather
 * than a bare `download` attribute on the URL. That bare-attribute approach is
 * unreliable inside the installed PWA / Android webview, which is exactly where
 * a teacher is most likely to be tapping this.
 *
 * 🚨 v1.6 renamed this from `downloadFilm`. Nothing about the mechanism was
 * film-specific — it is "authenticate, buffer, save" — and a second copy of it
 * for uploaded video would have been the same twenty lines with the same
 * revoke-on-the-next-tick footgun to get wrong twice.
 */
export async function downloadMedia(url: string, filename: string): Promise<void> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new PotatoApiError(`Could not download that (${response.status}).`, response.status);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick — some browsers need the click's navigation to
  // actually start before the object URL disappears out from under it.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
