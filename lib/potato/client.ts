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
 * Build a human filename for a downloaded film, e.g.
 * "potato-snaps-emma-2026-08-17.mp4". `name` is a display string (a child's
 * name, or "<class name> · class film") — slugified so spaces/punctuation
 * never end up in the saved filename. Falls back to a generic name if both
 * inputs are unusable.
 */
export function filmFilename(name: string, weekStart: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const week = /^\d{4}-\d{2}-\d{2}$/.test(weekStart) ? weekStart : '';
  const parts = [slug, week].filter(Boolean);
  return parts.length ? `potato-snaps-${parts.join('-')}.mp4` : 'potato-snaps-film.mp4';
}

/**
 * Fetch a film through the media proxy and hand it to the browser as a
 * download — fetch→blob→objectURL→`<a download>` click, rather than a bare
 * `download` attribute on the URL. That bare-attribute approach is unreliable
 * inside the installed PWA / Android webview, which is exactly where a
 * teacher is most likely to be tapping this.
 */
export async function downloadFilm(url: string, filename: string): Promise<void> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new PotatoApiError(`Could not download that film (${response.status}).`, response.status);
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
