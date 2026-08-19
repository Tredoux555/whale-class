// lib/potato/app-auth.ts
//
// STANDALONE-APP auth seam for Potato Snaps.
//
// The website authenticates a teacher with the httpOnly `potato_teacher`
// cookie. The packaged app (separate repo — Capacitor / Tauri / Electron
// shell) runs on a non-browser origin (`capacitor://localhost` &c.) where that
// cookie is never sent, so it presents the SAME signed, aud-scoped teacher JWT
// as an `Authorization: Bearer <jwt>` header instead.
//
// ADDITIVE ONLY, on both axes:
//   • Session — resolvePotatoTeacher() reads the cookie FIRST and only falls
//     back to a bearer header. A browser never sends `Authorization`, so every
//     existing website caller takes byte-identical the same path it always did.
//   • CORS — a request with no `Origin` header, or with an Origin that is not
//     on the exact-match allowlist, gets NO CORS headers back at all. The
//     website (same-origin, or its own web origin) is therefore untouched.
//
// 🚨 NO Access-Control-Allow-Credentials, deliberately. The bearer header is
// the only credential this seam accepts cross-origin; cookies stay same-origin
// only, so nothing here widens the website's CSRF surface by a single byte.
//
// 🚨 There is deliberately NO bearer path for the PARENT audience. v1 of the
// app is the teacher capture app; a parent still signs in on the website and
// still rides the `potato_parent` cookie, so the publish gate (a parent sees
// only films the teacher has SENT) keeps working exactly as written, on the
// exact code paths it was audited on. When the parent film-viewer ships, add a
// resolvePotatoParent() here that mirrors this file — do not widen this one.

import { NextResponse, type NextRequest } from 'next/server';

import {
  verifyPotatoTeacher,
  verifyPotatoTeacherToken,
  type PotatoTeacherSession,
} from '@/lib/potato/auth';

/* -------------------------------------------------------------------------- */
/* CORS                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Origins a packaged app shell presents. These are NOT reachable web origins —
 * no ordinary page can forge one — which is why an exact-match allowlist (not
 * a regex, not a suffix test) is the whole control here.
 */
const BUILT_IN_APP_ORIGINS = [
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  'tauri://localhost',
  'app://.',
] as const;

const ALLOW_HEADERS = 'Authorization, Content-Type';
/** Every method the retrofitted v1 routes actually expose, and nothing more. */
const ALLOW_METHODS = 'GET, HEAD, POST, PATCH, DELETE, OPTIONS';

/** Built-ins plus anything in the comma-separated `POTATO_APP_ORIGINS` env var. */
export function potatoAllowedOrigins(): string[] {
  const extra = (process.env.POTATO_APP_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return [...BUILT_IN_APP_ORIGINS, ...extra];
}

/** The request's Origin if it is allow-listed, else null (→ no CORS headers). */
export function potatoCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  return potatoAllowedOrigins().includes(origin) ? origin : null;
}

/**
 * The CORS header set for this request, or `{}` when the caller is not an
 * allow-listed app origin.
 *
 * Exported as a plain record because media/proxy streams through a bare
 * `Response` (never a NextResponse — buffering a film into memory is not an
 * option), so it merges these into its own header map instead of calling
 * withPotatoCors.
 */
export function potatoCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = potatoCorsOrigin(request);
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
    'Access-Control-Allow-Methods': ALLOW_METHODS,
    // The response varies by Origin — keep intermediate caches honest.
    Vary: 'Origin',
  };
}

/**
 * Stamp CORS headers onto a response when (and only when) the caller is an
 * allow-listed app origin. A browser on the website sends either no Origin
 * (same-origin fetch) or its own web origin, neither of which is on the
 * allowlist — so website responses come back completely untouched.
 */
export function withPotatoCors(response: NextResponse, request: NextRequest): NextResponse {
  for (const [name, value] of Object.entries(potatoCorsHeaders(request))) {
    response.headers.set(name, value);
  }
  return response;
}

/**
 * Preflight responder. Export straight from a route:
 *   export const OPTIONS = potatoOptionsHandler;
 * Always 204; the CORS headers appear only for allow-listed origins, so a
 * stray browser preflight is refused by the browser rather than by a 4xx here.
 */
export function potatoOptionsHandler(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  const headers = potatoCorsHeaders(request);
  if (Object.keys(headers).length === 0) return response;

  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

/* -------------------------------------------------------------------------- */
/* Bearer teacher resolution                                                  */
/* -------------------------------------------------------------------------- */

/** `Authorization: Bearer <jwt>` → raw token, or null. Scheme case-insensitive. */
export function potatoBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}

/**
 * Teacher identity for a v1 route, from EITHER the `potato_teacher` cookie
 * (website) or an `Authorization: Bearer` header (app). Identical return shape
 * and identical null-means-401 contract either way, so a retrofitted route's
 * `if (!session) return 401` line never changes.
 *
 * COOKIE FIRST, deliberately: a browser cannot attach an Authorization header
 * to a plain navigation, so this ordering means the website's behaviour is not
 * merely equivalent to before — it is the exact same code path, reached first,
 * every time.
 *
 * Both branches end in verifyPotatoTeacherToken() (lib/potato/auth.ts), so
 * there is one verifier, one secret (ADMIN_SECRET), one `aud`
 * ('potato-teacher') and one roster re-validation for both envelopes.
 */
export async function resolvePotatoTeacher(
  request: NextRequest,
): Promise<PotatoTeacherSession | null> {
  const fromCookie = await verifyPotatoTeacher(request);
  if (fromCookie) return fromCookie;

  const token = potatoBearerToken(request);
  if (!token) return null;
  return verifyPotatoTeacherToken(token);
}

/* -------------------------------------------------------------------------- */
/* media/proxy only: the ?token= escape hatch                                 */
/* -------------------------------------------------------------------------- */

/**
 * 🚨 QUERY-PARAM TOKENS ARE ACCEPTED ON media/proxy AND NOWHERE ELSE.
 *
 * WHY IT EXISTS
 * `<img src>` and `<video src>` cannot carry an Authorization header. The app
 * renders a whole capture board of faces and plays films straight out of the
 * private bucket; the alternative — fetch every object as a blob with a bearer
 * header and hand the element an object URL — means buffering entire videos
 * into memory on a classroom phone and losing Range/seek support outright. So
 * the proxy accepts the SAME teacher JWT as `?token=`.
 *
 * THE TRADEOFF, STATED PLAINLY
 * A token in a query string is more loggable than one in a header: it can land
 * in an access log, a proxy log, or a Referer. It is acceptable here because:
 *   • The bytes it guards are already private-cached (`Cache-Control: private,
 *     max-age=600, must-revalidate`), so no shared cache or CDN ever stores
 *     the response and no intermediary is asked to keep the URL around.
 *   • montree.xyz is HTTPS-only, so the query string is never on the wire in
 *     clear text; the exposure is server-side logs, which are ours.
 *   • The credential is not elevated — it is the same class-scoped teacher
 *     token the app already replays on every other call, so leaking it via a
 *     log is no worse than leaking the Authorization header from the same log.
 *   • It is accepted ONLY on this route and ONLY for the teacher audience: a
 *     parent's film access is untouched and stays cookie-gated behind the send
 *     gate.
 * Short-lived signed media URLs are the right answer if this ever leaves the
 * four-teacher in-house deployment; they are not worth their complexity today,
 * and this comment is the marker for when they become so.
 */
export async function resolvePotatoTeacherForMedia(
  request: NextRequest,
): Promise<PotatoTeacherSession | null> {
  const fromCookieOrBearer = await resolvePotatoTeacher(request);
  if (fromCookieOrBearer) return fromCookieOrBearer;

  const queryToken = new URL(request.url).searchParams.get('token');
  if (!queryToken) return null;
  return verifyPotatoTeacherToken(queryToken);
}
