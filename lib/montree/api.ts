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
 *
 * Returns the fetch Response object (caller handles .json() etc.)
 */
export async function montreeApi(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  // Add Content-Type for JSON bodies (skip for FormData — browser sets it with boundary)
  if (options.body && !(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If server returns 401, the token is expired or invalid
  if (response.status === 401) {
    clearToken();
    // Don't redirect here — let the calling component handle it
    // (some pages may want to show a message, others redirect to login)
  }

  return response;
}
