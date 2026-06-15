// Shared Supabase client for story routes
import { createClient } from '@supabase/supabase-js';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import type { NextRequest, NextResponse } from 'next/server';

// 🚨 Session 113 V2 Story audit F-1.2 — httpOnly cookie name.
// Mirrors the MONTREE_AUTH_COOKIE pattern from lib/montree/server-auth.ts.
// Once Phase B lands, this is the SOLE path that carries the user JWT —
// the URL no longer contains it.
export const STORY_AUTH_COOKIE = 'story-auth';
export const STORY_AUTH_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60; // 24h — matches JWT TTL

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

export function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

export function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export async function verifyAdminToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const { jwtVerify } = await import('jose');
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, getJWTSecret());
    if (payload.role !== 'admin') return null;
    return payload.username as string;
  } catch {
    return null;
  }
}

// Resolve the caller's SANCTUARY SPACE from a verified admin token. Personal
// routes use this to scope every read/write so one person's sanctuary can never
// see another's. Non-breaking: separate from verifyAdminToken (which still just
// returns the username). Defaults to 'tredoux' for legacy tokens minted before
// the `space` claim existed (they expire within 24h anyway).
//
// Returns null when the token is missing/invalid/not-admin — callers MUST treat
// null as "deny" (same as a failed verifyAdminToken).
export async function getAdminSpace(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const { jwtVerify } = await import('jose');
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, getJWTSecret());
    if (payload.role !== 'admin') return null;
    const space = payload.space;
    return typeof space === 'string' && space ? space : 'tredoux';
  } catch {
    return null;
  }
}

export async function verifyUserToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const { jwtVerify } = await import('jose');
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, getJWTSecret());
    // 🚨 Session 113 V2 Story audit F-1.4 — role gate. Without this,
    // an admin JWT (role='admin') was happily accepted as a user token.
    // The result: admins showed up in /api/story/visits, /online,
    // /api/story/message under their admin username, and admin tokens
    // could be used anywhere a user token was expected.
    //
    // Negative-check pattern (REJECT admins) rather than positive-require
    // (role='user') because legacy user JWTs (commit 8b26c5b0 and earlier)
    // were minted with no role claim at all. We can tighten to positive
    // require once we add role: 'user' to the mint AND old tokens expire
    // (max 24h TTL).
    if (payload.role === 'admin') return null;
    return payload.username as string;
  } catch {
    return null;
  }
}

// Extract session token from auth header (first 50 chars, matches login_logs format)
export function getSessionToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  return token.substring(0, 50);
}

// 🚨 Session 113 V2 Story audit F-1.2 — cookie-aware user token verifier.
//
// The original `verifyUserToken(authHeader)` only reads from the
// `Authorization: Bearer …` header, which currently comes from the JWT
// in the URL path (`/story/<full-JWT>`). Phase A: introduce a request-
// scoped verifier that ALSO accepts the token from the new httpOnly
// `story-auth` cookie. This unblocks Phase B (URL becomes static,
// JWT only lives in the cookie).
//
// Header takes precedence so existing legacy URL-bookmark sessions keep
// working unchanged. Cookie is the fallback. Both pathways apply the
// same role gate (REJECT admins) as verifyUserToken.
export async function verifyUserTokenFromRequest(
  req: NextRequest
): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const fromHeader = await verifyUserToken(authHeader);
    if (fromHeader) return fromHeader;
  }
  const cookieToken = req.cookies.get(STORY_AUTH_COOKIE)?.value;
  if (!cookieToken) return null;
  // Wrap as a Bearer-formatted string so we can reuse verifyUserToken
  // verbatim (role gate, jose verify, exp enforcement).
  return verifyUserToken(`Bearer ${cookieToken}`);
}

// Get the underlying token string from request (header first, cookie fallback).
// Used by login_logs writers that need the first 50 chars for tracking.
export function getSessionTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const fromHeader = getSessionToken(authHeader);
    if (fromHeader) return fromHeader;
  }
  const cookieToken = req.cookies.get(STORY_AUTH_COOKIE)?.value;
  if (!cookieToken) return null;
  return cookieToken.substring(0, 50);
}

// Set the story-auth httpOnly cookie on a NextResponse. Mirrors the
// setMontreeAuthCookie pattern from lib/montree/server-auth.ts.
//
// Posture: httpOnly (blocks XSS), secure in prod, sameSite=lax (allows
// the normal cross-page navigation flow but blocks cross-site CSRF on
// state-changing POSTs unless explicitly opted in).
export function setStoryAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: STORY_AUTH_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STORY_AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearStoryAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: STORY_AUTH_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// 🚨 Session 113 V2 Story audit F-2.1 — vault token verifier.
//
// The unlock route issues a 1h-TTL JWT with { vaultAccess: true } when the
// vault password is correct. Until this fix every vault route ignored that
// token and gated only on the admin session — so stealing an admin JWT was
// equivalent to knowing the vault password.
//
// All sensitive vault routes (list, download, upload, save-from-message,
// delete) now require BOTH the admin token AND a fresh vault token. The
// vault token is sent in the `x-vault-token` header. It auto-expires after
// 1 hour; the operator must re-enter the password to refresh.
export async function verifyVaultToken(headerValue: string | null): Promise<boolean> {
  if (!headerValue) return false;
  try {
    const { jwtVerify } = await import('jose');
    const token = headerValue.trim();
    const { payload } = await jwtVerify(token, getJWTSecret());
    if (payload.vaultAccess !== true) return false;
    // jwtVerify already enforces `exp` (we set 1h on the unlock route), so a
    // successful verify here means the token is still in its TTL window.
    return true;
  } catch {
    return false;
  }
}

// Get login_log_id for a session token
export async function getLoginLogId(sessionToken: string | null): Promise<number | null> {
  if (!sessionToken) return null;
  
  try {
    const supabase = getSupabase();
    const { data: loginLog } = await supabase
      .from('story_login_logs')
      .select('id')
      .eq('session_token', sessionToken)
      .order('login_at', { ascending: false })
      .limit(1)
      .single();
    
    return loginLog?.id || null;
  } catch {
    return null;
  }
}

// Helper to get session info for message history inserts
export async function getSessionInfo(authHeader: string | null): Promise<{
  sessionToken: string | null;
  loginLogId: number | null;
}> {
  const sessionToken = getSessionToken(authHeader);
  const loginLogId = await getLoginLogId(sessionToken);
  return { sessionToken, loginLogId };
}
