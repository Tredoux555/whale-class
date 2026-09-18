// lib/montree/feedback/identity.ts
//
// Who is asking. Cookies and headers only — NEVER the request body, so no
// caller can name themselves.
//
// Three ways in, checked in this order:
//   1. a Montree app session (montree-auth) — posts as a real person with a
//      role badge (Teacher / Principal / Guide). Never a legal name: the
//      display name comes from the account, and child names never appear.
//   2. a Teachers' Room community session (montree_community) — tenant-less
//      public account, same treatment, role 'community'.
//   3. an `fb_guest` httpOnly cookie — a random secret we minted. NOT
//      localStorage: the WeChat WKWebView wipes storage, and a guest who lost
//      their token would lose the ability to edit their own post.
// Nothing at all → anon: may read, may not vote, subscribe, post or comment.
//
// ── The admin model, in one place ───────────────────────────────────────────
// PUBLIC board: admin = a super-admin token on the request, OR a signed-in
//   Montree user whose id is in FEEDBACK_ADMIN_USER_IDS (comma-separated).
//   That is the whole rule. No new table, no new role column.
// SCHOOL board (school:<id>): admin = a principal of THAT school. A teacher of
//   the same school is an ordinary member; a principal of another school is
//   not even a reader — see requireBoardAccess() in board.ts.

import { verifyMontreeToken, MONTREE_AUTH_COOKIE } from '@/lib/montree/server-auth';
import { COMMUNITY_COOKIE, verifyCommunityToken } from '@/lib/montree/community/auth';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { getSupabase } from '@/lib/supabase-client';
import type { Board, Viewer } from './types';
import { ANON_VIEWER } from './types';
import { GUEST_COOKIE, communityKey, guestKey, hashGuestToken, userKey } from './keys';

/** A request we can read cookies and headers off — NextRequest or a plain Request. */
export interface ReadableRequest {
  headers: Headers;
  cookies?: { get(name: string): { value: string } | undefined };
}

/** Cookie value by name, from NextRequest.cookies or the raw Cookie header. */
export function readCookie(request: ReadableRequest, name: string): string | null {
  const viaNext = request.cookies?.get?.(name)?.value;
  if (viaNext) return viaNext;
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return part.slice(eq + 1).trim();
      }
    }
  }
  return null;
}

/** Ids allowed to administer the PUBLIC board. Parsed on every call so a
 *  Railway variable change takes effect without a redeploy of the module. */
export function publicBoardAdminIds(): Set<string> {
  const raw = process.env.FEEDBACK_ADMIN_USER_IDS || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Display name for a Montree user. Falls back to a role word rather than
 * leaking an email local-part, and never returns a child's name.
 */
async function montreeDisplayName(userId: string, role: string): Promise<string> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('montree_teachers')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle();
    const name = (data?.name as string | undefined)?.trim();
    if (name) return name;
  } catch {
    // A missing table or an unreachable DB must not stop someone reading the
    // board. Degrade to the role word.
  }
  return role === 'principal' ? 'Principal' : 'Guide';
}

/**
 * Resolve the viewer. Never throws: every failure path lands on anon, which is
 * the state the public board renders anyway.
 *
 * `board` is optional — pass it to get the school-board admin answer right.
 * Without it, isAdmin is the public-board answer only.
 */
export async function resolveViewer(
  request: ReadableRequest,
  board?: Board | null,
): Promise<Viewer> {
  // 1 — Montree app session.
  const appToken = readCookie(request, MONTREE_AUTH_COOKIE);
  if (appToken) {
    try {
      const payload = await verifyMontreeToken(appToken);
      // `sub` is the montree_teachers.id for every app role (teacher,
      // principal, homeschool parent, agent, org admin).
      const userId = payload?.sub;
      if (userId) {
        const role = payload.role || 'teacher';
        const isAdmin = await computeIsAdmin(request, userId, payload.schoolId, role, board);
        return {
          kind: 'user',
          key: userKey(userId),
          displayName: await montreeDisplayName(userId, role),
          role,
          isAdmin,
          userId,
        };
      }
    } catch {
      // fall through
    }
  }

  // 2 — Teachers' Room community session.
  const communityToken = readCookie(request, COMMUNITY_COOKIE);
  if (communityToken) {
    try {
      const accountId = await verifyCommunityToken(communityToken);
      if (accountId) {
        // getCommunityUser() takes a NextRequest; we already hold the verified
        // account id, so read the one column we need directly.
        let name: string | null = null;
        try {
          const { data } = await getSupabase()
            .from('montree_community_users')
            .select('display_name')
            .eq('id', accountId)
            .maybeSingle();
          name = (data?.display_name as string | null) ?? null;
        } catch {
          /* name stays null; 'Teacher' is an honest fallback */
        }
        return {
          kind: 'user',
          key: communityKey(accountId),
          displayName: name || 'Teacher',
          role: 'community',
          // A community account is never an admin of anything, by construction.
          isAdmin: false,
          userId: accountId,
        };
      }
    } catch {
      // fall through
    }
  }

  // 3 — Guest cookie.
  const guestToken = readCookie(request, GUEST_COOKIE);
  if (guestToken && /^[0-9a-f]{64}$/.test(guestToken)) {
    const tokenHash = hashGuestToken(guestToken);
    const profile = await loadGuestProfile(tokenHash);
    return {
      kind: 'guest',
      key: guestKey(tokenHash),
      displayName: profile?.name ?? null,
      role: 'guest',
      isAdmin: false,
      guestTokenHash: tokenHash,
      email: profile?.email ?? null,
    };
  }

  return { ...ANON_VIEWER };
}

/**
 * Is this viewer an admin of `board`?
 *
 * Public AND product boards: super-admin header OR the FEEDBACK_ADMIN_USER_IDS
 * allow-list. A product board is deliberately NOT its own admin surface — the
 * team that answers the Montree board answers the Dark Phonics one.
 * School board: principal of that exact school id. A principal of school B is
 * not an admin of school A's board, and `schoolId` here comes off the SIGNED
 * token, never a query string.
 */
async function computeIsAdmin(
  request: ReadableRequest,
  userId: string,
  tokenSchoolId: string | undefined,
  role: string,
  board?: Board | null,
): Promise<boolean> {
  if (board && board.scope === 'school') {
    return role === 'principal' && !!tokenSchoolId && tokenSchoolId === board.schoolId;
  }
  if (publicBoardAdminIds().has(userId)) return true;
  return isSuperAdminRequest(request);
}

/** Super-admin via the x-super-admin-token / -password headers. Never throws. */
export async function isSuperAdminRequest(request: ReadableRequest): Promise<boolean> {
  try {
    if (!request.headers.get('x-super-admin-token') && !request.headers.get('x-super-admin-password')) {
      return false;
    }
    const res = await verifySuperAdminAuth(request.headers);
    return res.valid === true;
  } catch {
    return false;
  }
}

interface GuestProfile {
  name: string | null;
  email: string | null;
}

/** The remembered name/email behind a guest token hash. */
async function loadGuestProfile(tokenHash: string): Promise<GuestProfile | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('montree_fb_guest_tokens')
      .select('name, email')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (!data) return null;
    return {
      name: (data.name as string | null) ?? null,
      email: (data.email as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Attributes to write on a new post/comment for this viewer.
 * Returns null for anon — callers turn that into a 401 rather than inventing
 * an author.
 */
export function authorFields(viewer: Viewer): {
  author_kind: 'user' | 'guest';
  author_id: string | null;
  author_name: string;
  author_role: string | null;
} | null {
  if (viewer.kind === 'anon' || !viewer.key) return null;
  if (viewer.kind === 'user') {
    return {
      author_kind: 'user',
      author_id: viewer.userId ?? null,
      author_name: viewer.displayName || 'Guide',
      author_role: viewer.role,
    };
  }
  return {
    author_kind: 'guest',
    author_id: null,
    author_name: viewer.displayName || 'Guest',
    author_role: 'guest',
  };
}

/** Cookie options for `fb_guest`. httpOnly is the whole point. */
export const GUEST_COOKIE_OPTIONS = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};
