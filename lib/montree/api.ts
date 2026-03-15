// lib/montree/api.ts
// Shared fetch wrapper for Montree API calls.
// Auth is handled via httpOnly cookie (montree-auth) — automatically sent by browser.
//
// Usage:
//   import { montreeApi } from '@/lib/montree/api';
//
//   const data = await montreeApi('/api/montree/children?classroom_id=123');
//   const data = await montreeApi('/api/montree/children', {
//     method: 'POST',
//     body: JSON.stringify({ name: 'Alice', age: 4 }),
//   });

const TOKEN_KEY = 'montree_token';

// In-flight GET request deduplication — prevents duplicate concurrent fetches
const inflightGets = new Map<string, Promise<Response>>();

/**
 * @deprecated Cookie is now set by the server on login. This is a no-op.
 * Cleans up any leftover localStorage token from before the migration.
 */
export function setToken(_token: string): void {
  if (typeof window === 'undefined') return;
  // Clean up legacy localStorage token if it exists
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * @deprecated Token is now in httpOnly cookie — not accessible from JS.
 * Always returns null. Kept for backward compatibility.
 */
export function getToken(): string | null {
  return null;
}

/**
 * Clear auth state (on logout).
 * Calls the server to clear the httpOnly cookie, and removes any legacy localStorage token.
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  // Remove legacy localStorage token
  localStorage.removeItem(TOKEN_KEY);
  // Clear httpOnly cookie via server (fire-and-forget)
  fetch('/api/montree/auth/logout', { method: 'POST' }).catch(() => {});
}

/**
 * Fetch wrapper for Montree API calls.
 *
 * - Auth cookie (montree-auth) is automatically included by the browser
 * - Adds Content-Type: application/json for non-FormData requests
 * - On 401 response, clears auth state (session expired)
 * - Deduplicates concurrent GET requests to the same URL
 *
 * Returns the fetch Response object (caller handles .json() etc.)
 */
export async function montreeApi(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout: customTimeout, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();

  // Deduplicate concurrent GET requests to the same URL
  if (method === 'GET') {
    const existing = inflightGets.get(url);
    if (existing) {
      // Return a clone so each caller gets their own readable stream
      return existing.then(res => res.clone());
    }
  }

  const headers = new Headers(fetchOptions.headers);

  // Add Content-Type for JSON bodies (skip for FormData — browser sets it with boundary)
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  // Add request timeout (30s default, caller can override for long-running operations)
  const timeoutMs = customTimeout ?? 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If caller provided a signal, listen for their abort too
  if (fetchOptions.signal) {
    fetchOptions.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const fetchPromise = (async () => {
    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // If server returns 401, the token is expired or invalid
    if (response.status === 401) {
      clearToken();
      // Don't redirect here — let the calling component handle it
      // (some pages may want to show a message, others redirect to login)
    }

    return response;
  })();

  // Track GET requests for deduplication
  if (method === 'GET') {
    inflightGets.set(url, fetchPromise);
    fetchPromise.finally(() => inflightGets.delete(url));
  }

  return fetchPromise;
}
