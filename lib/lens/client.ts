// lib/lens/client.ts
// The one fetch wrapper every Lens screen uses.
//
// 🚨 CHECK response.ok BEFORE response.json(). A house rule in this repo, and
// the reason for it is exactly this product: when a route 500s, Next serves an
// HTML error page, and `await response.json()` on that throws a SyntaxError
// which surfaces to the observer as "Unexpected token <" instead of the real
// problem. So the status is read first and the server's own sentence is what
// she is shown.
//
// 🚨 `credentials: 'same-origin'` on every call. The lens_observer cookie is
// httpOnly, so there is nothing to attach by hand — but a fetch that forgets
// this silently sends no cookie and 401s, which is a confusing bug to chase.

'use client';

export class LensApiError extends Error {
  status: number;
  /** True when migration 339 has not been run on this database yet. */
  setupPending: boolean;
  constructor(message: string, status: number, setupPending = false) {
    super(message);
    this.name = 'LensApiError';
    this.status = status;
    this.setupPending = setupPending;
  }
}

export async function lensApi<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  let body = rest.body;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const response = await fetch(path, {
    ...rest,
    body,
    headers,
    credentials: 'same-origin',
    // Lens data changes under her thumb; a stale list is worse than a slow one.
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `Something went wrong (${response.status}).`;
    let setupPending = false;
    try {
      const payload = (await response.json()) as { error?: string } | null;
      if (typeof payload?.error === 'string') {
        setupPending = payload.error === 'setup_pending';
        message = setupPending
          ? 'Lens isn’t set up on this database yet — migration 339 hasn’t been run.'
          : payload.error;
      }
    } catch {
      /* not JSON — keep the status message */
    }
    throw new LensApiError(message, response.status, setupPending);
  }

  // 204 and friends.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Multipart, for a photo moment. Same error handling, no JSON body. */
export async function lensUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  });
  if (!response.ok) {
    let message = `Upload failed (${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: string } | null;
      if (typeof payload?.error === 'string') message = payload.error;
    } catch {
      /* not JSON */
    }
    throw new LensApiError(message, response.status);
  }
  return (await response.json()) as T;
}
