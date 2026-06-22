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

import { recordDebugError } from '@/lib/montree/debug/error-log';

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
  fetch('/api/montree/auth/logout', { method: 'POST' }).catch((err) => console.error('[Auth] Logout failed:', err));
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

  // 🚨 Perf Tier 4.1 (PERF_HEALTH_CHECK.md) — auto-retry on transient network
  // errors for IDEMPOTENT methods only. POST/PATCH/PUT/DELETE NEVER retry —
  // they could create duplicate writes (double-charge, double-message, etc.).
  // GET and HEAD are safe to retry because they have no side effects.
  //
  // Retry schedule (only fires on network errors, not on HTTP error statuses):
  //   attempt 1 → immediate
  //   attempt 2 → +1s   (first VPN flap recovery window)
  //   attempt 3 → +3s   (second flap, slow handshake)
  //
  // We only retry on the fetch() throwing (TypeError 'Failed to fetch',
  // network reset, etc.) — NOT on response.status >= 500. Servers returning
  // errors should be handled by the caller, not silently retried.
  //
  // The caller's own AbortController signal short-circuits the retry loop.
  const isRetryable = method === 'GET' || method === 'HEAD';
  const NETWORK_RETRY_DELAYS = isRetryable ? [0, 1000, 3000] : [0];

  const fetchPromise = (async () => {
    let response: Response | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < NETWORK_RETRY_DELAYS.length; attempt++) {
      // Bail early if the caller already aborted (signal short-circuit).
      if (controller.signal.aborted) break;

      const delay = NETWORK_RETRY_DELAYS[attempt];
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (controller.signal.aborted) break;
      }

      try {
        response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });
        // Got a response (even 5xx). Don't retry — caller decides.
        lastError = null;
        break;
      } catch (err) {
        // Network-level failure: fetch() throws TypeError ('Failed to fetch'),
        // AbortError on signal, etc. Only retry the TypeError case.
        lastError = err;
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) break; // Don't retry an explicit abort
        // Otherwise loop continues to next retry attempt
      }
    }

    clearTimeout(timeoutId);

    if (!response) {
      // All attempts failed with network error — record for the on-screen
      // monitor, then rethrow the last one so the caller's catch() handles it.
      recordDebugError({
        kind: 'api',
        origin: `${method} ${url}`,
        message: lastError instanceof Error ? lastError.message : 'Network request failed',
      });
      throw lastError || new Error('Network request failed');
    }

    // If server returns 401, the token is expired or invalid
    if (response.status === 401) {
      clearToken();
      // Don't redirect here — let the calling component handle it
      // (some pages may want to show a message, others redirect to login)
    }

    // Surface any error status to the on-screen monitor (cheap, capped,
    // no-ops visually unless the user has debug mode on).
    if (response.status >= 400) {
      recordDebugError({
        kind: 'api',
        origin: `${method} ${url}`,
        status: response.status,
        message: response.statusText || `HTTP ${response.status}`,
      });
    }

    return response;
  })();

  // Track GET requests for deduplication (with safety cleanup to prevent memory leaks)
  if (method === 'GET') {
    inflightGets.set(url, fetchPromise);
    // Safety: clean up after 30s even if promise never resolves (network hang)
    const safetyTimeout = setTimeout(() => {
      if (inflightGets.get(url) === fetchPromise) {
        inflightGets.delete(url);
      }
    }, 30000);
    fetchPromise.finally(() => {
      clearTimeout(safetyTimeout);
      inflightGets.delete(url);
    });
  }

  return fetchPromise;
}
