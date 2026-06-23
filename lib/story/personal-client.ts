// lib/story/personal-client.ts
//
// Thin client-side fetch helpers for the personal platform. Attach the
// Story-admin bearer token (sessionStorage 'story_admin_session') to every
// request and bounce to the login on 401. Keeps the page components free of
// auth/fetch boilerplate.

'use client';

import { coachLoginPath } from '@/lib/story/login-path';

const SESSION_KEY = 'story_admin_session';

export function getStoryAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(SESSION_KEY);
}

function bounceToLogin(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = coachLoginPath();
  }
}

async function call<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
): Promise<T> {
  const token = getStoryAdminToken();
  if (!token) {
    bounceToLogin();
    throw new Error('No session');
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    bounceToLogin();
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const pget = <T = unknown>(url: string) => call<T>('GET', url);
export const ppost = <T = unknown>(url: string, body?: unknown) => call<T>('POST', url, body);
export const ppatch = <T = unknown>(url: string, body?: unknown) => call<T>('PATCH', url, body);
export const pdelete = <T = unknown>(url: string) => call<T>('DELETE', url);
