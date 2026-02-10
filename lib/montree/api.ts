// lib/montree/api.ts
// Shared fetch wrapper for Montree API calls.
// Automatically attaches the Bearer token from the session.
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
 * Store the JWT token after login.
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get the stored JWT token.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Clear the JWT token (on logout).
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Fetch wrapper that automatically includes the Montree Bearer token.
 *
 * - Adds Authorization header with JWT token
 * - Adds Content-Type: application/json for non-FormData requests
 * - On 401 response, clears the token (session expired)
 *
 * Returns the fetch Response object (caller handles .json() etc.)
 */
export async function montreeApi(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);

  // Add Bearer token if available
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

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
