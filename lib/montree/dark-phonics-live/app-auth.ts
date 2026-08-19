// lib/montree/dark-phonics-live/app-auth.ts
//
// STANDALONE-APP auth seam for the Dark Phonics Live / Online Classes module.
//
// The live website authenticates parents with the `montree_parent_session`
// HTTP-only cookie. The native app (separate repo — Capacitor / Tauri shell)
// runs on a non-browser origin (`capacitor://localhost` &c.) where that cookie
// is never sent, so it presents the SAME signed parent JWT as an
// `Authorization: Bearer <jwt>` header instead.
//
// ADDITIVE ONLY. When no bearer header is present, resolveDplParent delegates
// to the untouched cookie resolver (resolveAppointmentsParent). A request with
// no `Origin` header gets no CORS headers back, so every existing browser
// caller is byte-identical to before.

import { NextResponse, type NextRequest } from 'next/server';

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { verifyParentToken } from '@/lib/montree/server-auth';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import {
  resolveAppointmentsParent,
  type AppointmentsParent,
} from '@/lib/montree/appointments/parent-access';

export type { AppointmentsParent };

/* -------------------------------------------------------------------------- */
/* CORS                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Origins a packaged app shell presents. These are NOT reachable web origins —
 * no ordinary page can forge one — and we deliberately do NOT send
 * Access-Control-Allow-Credentials, so the bearer header is the only
 * credential this seam accepts cross-origin. Cookies stay same-origin only.
 */
const BUILT_IN_APP_ORIGINS = [
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  'tauri://localhost',
  'app://.',
] as const;

const ALLOW_HEADERS = 'Authorization, Content-Type';
const ALLOW_METHODS = 'GET, POST, PATCH, OPTIONS';

/** Built-ins plus anything in the comma-separated `DPL_APP_ORIGINS` env var. */
export function dplAllowedOrigins(): string[] {
  const extra = (process.env.DPL_APP_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return [...BUILT_IN_APP_ORIGINS, ...extra];
}

/** The request's Origin if it is allow-listed, else null (→ no CORS headers). */
export function dplCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  return dplAllowedOrigins().includes(origin) ? origin : null;
}

/**
 * Stamp CORS headers onto a response when (and only when) the caller is an
 * allow-listed app origin. A browser on the live website sends either no
 * Origin (same-origin GET) or its own web origin, neither of which is in the
 * allowlist — so website responses come back completely untouched.
 */
export function withDplCors(response: NextResponse, request: NextRequest): NextResponse {
  const origin = dplCorsOrigin(request);
  if (!origin) return response;

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS);
  response.headers.set('Access-Control-Allow-Methods', ALLOW_METHODS);
  // The response varies by Origin — keep intermediate caches honest.
  response.headers.set('Vary', 'Origin');
  return response;
}

/**
 * Preflight responder. Export straight from a route:
 *   export const OPTIONS = dplOptionsHandler;
 * Always 204; the CORS headers appear only for allow-listed origins, so a
 * stray browser preflight is refused by the browser rather than by a 4xx here.
 */
export function dplOptionsHandler(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  const origin = dplCorsOrigin(request);
  if (!origin) return response;

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS);
  response.headers.set('Access-Control-Allow-Methods', ALLOW_METHODS);
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Vary', 'Origin');
  return response;
}

/* -------------------------------------------------------------------------- */
/* Bearer parent resolution                                                   */
/* -------------------------------------------------------------------------- */

/** `Authorization: Bearer <jwt>` → raw token, or null. Scheme case-insensitive. */
export function dplBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}

/**
 * Parent identity for DPL routes, from EITHER the bearer header (app) or the
 * session cookie (website). Identical return shape either way:
 * `AppointmentsParent` on success, or an already-built NextResponse to return.
 *
 * Error responses produced by the bearer path are CORS-stamped here, so a
 * route keeps its existing `if (x instanceof NextResponse) return x;` line
 * unchanged and the app still gets a readable 401/403/404.
 */
export async function resolveDplParent(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<AppointmentsParent | NextResponse> {
  const token = dplBearerToken(request);

  // No bearer header → the website's cookie path, completely unchanged.
  if (!token) {
    return resolveAppointmentsParent(supabase);
  }

  // ── Bearer path ────────────────────────────────────────────────────────────
  // Everything below MIRRORS lib/montree/appointments/parent-access.ts
  // (resolveAppointmentsParent) — same checks, same order, same statuses, same
  // messages. The ONLY difference is where the verified session comes from:
  // the JWT in the Authorization header instead of verifyParentSession()'s
  // cookie read. The token is verified with the SAME helper and SAME secret
  // the cookie flow uses (verifyParentToken → MONTREE_JWT_SECRET, falling back
  // to ADMIN_SECRET), so an app token and a website cookie are literally the
  // same credential in two envelopes.
  //
  // Duplicated deliberately: this module is extraction-friendly, and copying
  // ~30 lines here beats widening the shared resolver's signature. If
  // parent-access.ts changes, mirror the change here.
  const fail = (body: Record<string, unknown>, status: number): NextResponse =>
    withDplCors(NextResponse.json(body, { status }), request);

  const session = await verifyParentToken(token);
  if (!session) {
    return fail({ error: 'Unauthorized' }, 401);
  }

  // Invite-only sessions can't book — booking creates a record tied to a
  // parent identity, which invite-only doesn't have.
  if (!session.parentId) {
    return fail({ error: 'Booking requires a full parent account.' }, 403);
  }

  const { data: parent } = await supabase
    .from('montree_parents')
    .select('id, name, email, school_id, is_active')
    .eq('id', session.parentId)
    .maybeSingle();

  if (!parent || !parent.is_active) {
    return fail({ error: 'Parent not found' }, 401);
  }

  // Same `appointments` flag gate the cookie resolver applies — NOT
  // `dark_phonics_live`; each DPL route still applies that one itself.
  const flagOn = await isFeatureEnabled(supabase, parent.school_id, 'appointments');
  if (!flagOn) {
    return fail({ error: 'Not found' }, 404);
  }

  // Server is the source of truth for which children this parent is linked to.
  const { data: links } = await supabase
    .from('montree_parent_children')
    .select('child_id')
    .eq('parent_id', parent.id);
  const childIds = (links || []).map((l: { child_id: string }) => l.child_id);

  return {
    parentId: parent.id,
    parentName: parent.name || parent.email,
    schoolId: parent.school_id,
    childIds,
  };
}
