// lib/lens/route-helpers.ts
// The three lines every /api/lens/* handler starts and ends with.
//
// 🚨 MIDDLEWARE PROTECTS NOTHING HERE. `/api/lens/*` is deliberately outside
// the middleware matcher (which excludes `api` and names only specific /api
// groups — see middleware.ts's `export const config`), exactly like
// `/api/potato/*`. That is the right call for a self-contained product with its
// own cookie, and it means auth is this file's job and every handler must
// actually call it. There is no ambient auth to fall back on.

import { NextResponse, type NextRequest } from 'next/server';
import { verifyLensObserver, type LensObserverSession } from './auth';
import { isSetupPending } from './db';

/**
 * Verify the session, or return the response to send.
 *
 * Used as:  const session = await requireObserver(request);
 *           if (session instanceof NextResponse) return session;
 * which is the same shape verifySchoolRequest uses across this repo.
 */
export async function requireObserver(
  request: NextRequest,
): Promise<LensObserverSession | NextResponse> {
  const session = await verifyLensObserver(request);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  return session;
}

/**
 * One error funnel, so a missing migration reads as "not set up yet" and a real
 * fault reads as a real fault — and neither one ever reaches the client as a
 * stack trace.
 */
export function lensError(scope: string, error: unknown): NextResponse {
  if (isSetupPending(error)) {
    return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
  }
  console.error(`[lens/${scope}]`, error);
  return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = 'Not found'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Parse a JSON body, or return the 400 to send. */
export async function readJson(request: NextRequest): Promise<Record<string, unknown> | NextResponse> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('Invalid request');
    }
    return body as Record<string, unknown>;
  } catch {
    return badRequest('Invalid request');
  }
}

/** Trim, cap, drop control characters. Returns null for "she left it blank". */
export function text(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, max);
  return clean.length > 0 ? clean : null;
}

/** Same, but a required field: returns '' when absent so the caller can 400. */
export function requiredText(value: unknown, max = 500): string {
  return text(value, max) ?? '';
}

export function intOrNull(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  return i >= min && i <= max ? i : null;
}

/** YYYY-MM-DD or null. Rejects 2026-02-31 via a round-trip check. */
export function dateOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === s ? s : null;
}

export function stringArray(value: unknown, maxItems = 20, maxLen = 100): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value.slice(0, maxItems)) {
    const s = text(raw, maxLen);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}
