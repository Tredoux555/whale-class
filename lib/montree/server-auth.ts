// lib/montree/server-auth.ts
// Server-side JWT authentication for Montree API routes
// Uses jose (same library as lib/auth.ts for admin tokens)

import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

// Lazy secret — evaluated on first use, not at module import time
// This prevents build failures when env vars aren't available (e.g. Railway build step)
let _secretKey: Uint8Array | null = null;
function getSecretKey(): Uint8Array {
  if (!_secretKey) {
    // Use MONTREE_JWT_SECRET if set, otherwise fall back to ADMIN_SECRET
    const secret = process.env.MONTREE_JWT_SECRET || process.env.ADMIN_SECRET;
    if (!secret) {
      throw new Error('MONTREE_JWT_SECRET or ADMIN_SECRET environment variable is required');
    }
    _secretKey = new TextEncoder().encode(secret);
  }
  return _secretKey;
}

// Cookie name for teacher/principal httpOnly auth cookie
export const MONTREE_AUTH_COOKIE = 'montree-auth';

// Session lifetime (days) for teacher/principal/parent-homeschool JWTs + cookie.
// 🚨 Deliberately effectively-permanent (Tredoux, Jul 5 2026). A teacher on their
// OWN classroom device must never get silently logged out — most won't have saved
// their login code, and a lockout mid-class is devastating. 10 years ≈ permanent.
// It's the teacher's own device (low theft risk); never-locked-out beats the
// marginal token-theft window. recoverSession() rebuilds the client session from
// this cookie whenever iOS wipes localStorage on a PWA relaunch, so the login
// survives relaunches too. Override via MONTREE_JWT_TTL_DAYS env if ever needed.
export const MONTREE_JWT_TTL_DAYS = Math.max(
  1,
  Number(process.env.MONTREE_JWT_TTL_DAYS) || 3650
);

// Token payload shape — stored in httpOnly cookie.
// 'agent' (Phase 7b) is the Sarah / multiplier-partner role. They span schools
// via referrals; schoolId on their JWT is their montree_teachers row's
// (placeholder for shell agents, real for teacher-agents) and is INERT for
// agent routes — those self-scope via founding_teacher_id = sub.
// 'org_admin' (Phase 6) is the ORGANIZATION-tier leader — a school group / chain /
// programme office sitting above one or more schools and below the platform. Like
// 'agent', schoolId on their JWT is INERT: an org admin belongs to no single school, so
// the minting route sets schoolId to the organisation id purely to satisfy the non-empty
// check below, and every /api/montree/org/* route self-scopes via organizationId.
//
// ── ACTING CLAIMS (Phase 6b — "God's Eye") ────────────────────────────────────────────────
// Three optional claims record that a session is somebody LOOKING THROUGH another role rather
// than being that role. They are additive and never widen access on their own — every route
// still scopes on sub/schoolId/organizationId exactly as before. What they buy is (a) an
// honest banner on the surface being viewed, and (b) the one piece of state the way back
// needs, carried in the token instead of in a server-side session table.
//
//   actingAsSuperAdmin   — a super-admin minted this org_admin token from the platform console
//                          (POST /api/montree/super-admin/organizations/[id]/view-as). The org
//                          dashboard renders "Super-admin view · {org}" while it is set.
//   actingOrgAdminId     — an organisation director minted this PRINCIPAL token by entering one
//                          of their own schools (POST /api/montree/org/enter-school). It is the
//                          montree_organization_admins.id to return to, and it is the ONLY
//                          thing POST /api/montree/org/return-to-org will act on.
//   actingOrganizationId — the organisation to re-mint for on the way back. Kept alongside
//                          actingOrgAdminId rather than re-derived, so the return path is a
//                          verification (does this admin still belong to this org?) rather
//                          than a fresh trust decision.
//
// 🚨 These claims are only ever WRITTEN by a route that has already verified the minting
// identity (verifySuperAdminAuth / verifyOrgRequest). A forged token is not a concern — the
// whole payload is signed — but do not let a client-supplied value reach them.
export interface MontreeTokenPayload {
  sub: string;        // teacher ID, principal ID, agent ID (= montree_teachers.id), homeschool parent ID, or org admin ID
  schoolId: string;
  classroomId?: string;
  role: 'teacher' | 'principal' | 'homeschool_parent' | 'agent' | 'org_admin';
  organizationId?: string;  // set on org_admin tokens only (montree_organizations.id)
  /** Super-admin is viewing this organisation. Set only by the super-admin view-as route. */
  actingAsSuperAdmin?: boolean;
  /** montree_organization_admins.id to return to. Set only by /api/montree/org/enter-school. */
  actingOrgAdminId?: string;
  /** montree_organizations.id to return to. Set alongside actingOrgAdminId. */
  actingOrganizationId?: string;
}

// Parent token payload (stored in HTTP-only cookie)
export interface ParentTokenPayload {
  sub: string;         // child_id (primary identifier for parent sessions)
  childName?: string;
  classroomId?: string;
  inviteId?: string;
  parentId?: string;   // set when parent logs in with email+password
}

/**
 * Create a signed JWT for a Montree teacher, principal, or homeschool parent session.
 * TTL is MONTREE_JWT_TTL_DAYS (default 3650 ≈ 10y) — see constant above.
 *
 * `opts.ttlSeconds` overrides that for SERVER-INTERNAL tokens only (the photo
 * recovery cron mints a 60-second one so it can invoke the identification route
 * in-process without a teacher session). Never hand a short-TTL token to a
 * browser — the long default exists precisely so teachers are never logged out.
 */
export async function createMontreeToken(
  payload: MontreeTokenPayload,
  opts?: { ttlSeconds?: number },
): Promise<string> {
  const ttl =
    opts?.ttlSeconds && opts.ttlSeconds > 0
      ? `${Math.floor(opts.ttlSeconds)}s`
      : `${MONTREE_JWT_TTL_DAYS}d`;
  const token = await new SignJWT({
    schoolId: payload.schoolId,
    classroomId: payload.classroomId || null,
    role: payload.role,
    organizationId: payload.organizationId || null,
    // Acting claims — see the note on MontreeTokenPayload. Omitted entirely (rather than
    // written as null) when absent, so an ordinary token is byte-identical to what this
    // function produced before Phase 6b.
    ...(payload.actingAsSuperAdmin ? { actingAsSuperAdmin: true } : {}),
    ...(payload.actingOrgAdminId ? { actingOrgAdminId: payload.actingOrgAdminId } : {}),
    ...(payload.actingOrganizationId ? { actingOrganizationId: payload.actingOrganizationId } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(getSecretKey());

  return token;
}

/**
 * Verify a Montree JWT token and return the payload.
 * Returns null if the token is invalid or expired.
 */
export async function verifyMontreeToken(token: string): Promise<MontreeTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    const sub = payload.sub;
    const schoolId = payload.schoolId as string | undefined;
    const role = payload.role as string | undefined;

    if (!sub || !schoolId || !role) {
      return null;
    }

    if (
      role !== 'teacher' && role !== 'principal' && role !== 'homeschool_parent' &&
      role !== 'agent' && role !== 'org_admin'
    ) {
      return null;
    }

    return {
      sub,
      schoolId,
      classroomId: (payload.classroomId as string) || undefined,
      role: role as 'teacher' | 'principal' | 'homeschool_parent' | 'agent' | 'org_admin',
      organizationId: (payload.organizationId as string) || undefined,
      actingAsSuperAdmin: payload.actingAsSuperAdmin === true ? true : undefined,
      actingOrgAdminId: (payload.actingOrgAdminId as string) || undefined,
      actingOrganizationId: (payload.actingOrganizationId as string) || undefined,
    };
  } catch {
    // Token is invalid, expired, or tampered with
    return null;
  }
}

/**
 * Create a signed JWT for a parent session.
 * TTL is MONTREE_JWT_TTL_DAYS (default 3650 ≈ 10y) — parity with teacher/
 * principal tokens so a parent on their own device is never silently logged
 * out. Stored inside an HTTP-only cookie — not sent as a Bearer header.
 */
export async function createParentToken(payload: ParentTokenPayload): Promise<string> {
  const token = await new SignJWT({
    childName: payload.childName || null,
    classroomId: payload.classroomId || null,
    inviteId: payload.inviteId || null,
    parentId: payload.parentId || null,
    role: 'parent',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub) // child_id
    .setIssuedAt()
    .setExpirationTime(`${MONTREE_JWT_TTL_DAYS}d`)
    .sign(getSecretKey());

  return token;
}

/**
 * Verify a parent JWT token and return the payload.
 * Returns null if the token is invalid or expired.
 */
export async function verifyParentToken(token: string): Promise<ParentTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    const sub = payload.sub;
    const role = payload.role as string | undefined;

    if (!sub) return null;
    // Must be a parent token
    if (role !== 'parent') return null;

    return {
      sub, // child_id
      childName: (payload.childName as string) || undefined,
      classroomId: (payload.classroomId as string) || undefined,
      inviteId: (payload.inviteId as string) || undefined,
      parentId: (payload.parentId as string) || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Set the montree-auth httpOnly cookie on a NextResponse.
 * Call this in login routes after creating the JWT token.
 * maxAge matches the JWT TTL (MONTREE_JWT_TTL_DAYS, default 3650 ≈ 10y).
 */
export function setMontreeAuthCookie(
  response: NextResponse,
  token: string,
  role?: 'teacher' | 'principal' | 'homeschool_parent' | 'agent' | 'org_admin'
): void {
  const maxAge = MONTREE_JWT_TTL_DAYS * 24 * 60 * 60;  // matches JWT TTL
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(MONTREE_AUTH_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  // 🚨 Readable launch hint for the PWA no-flash gate. iOS wipes localStorage
  // between standalone launches, so the pre-paint redirect on /montree can't
  // rely on it — but COOKIES survive. This NON-httpOnly cookie lets that inline
  // script read the user's home surface synchronously (before any paint) and
  // jump straight into the app, so a home-screen launch never flashes the
  // marketing splash. It's only a UX hint — the real auth is the httpOnly
  // cookie above; a stale value just lands on a surface that bounces to login.
  const surface =
    role === 'principal' ? '/montree/admin'
    : role === 'agent' ? '/montree/agent/dashboard'
    : role === 'org_admin' ? '/montree/org'
    : '/montree/dashboard';
  response.cookies.set('montree_surface', surface, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

/**
 * Clear the montree-auth httpOnly cookie (logout).
 */
export function clearMontreeAuthCookie(response: NextResponse): void {
  response.cookies.set(MONTREE_AUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  // Also clear the readable launch hint so a logged-out home-screen launch
  // doesn't bounce off a stale surface into login every time.
  response.cookies.set('montree_surface', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
