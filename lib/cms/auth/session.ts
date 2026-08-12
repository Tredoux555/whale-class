// lib/cms/auth/session.ts
// ============================================================================
// THE CMS SESSION TOKEN. Edge-safe: `jose` only, no next/headers, no
// supabase-js — middleware.ts imports this file directly.
// ============================================================================
//
// CMS does not invent an auth mechanism. It copies Montree's, which is the
// house pattern on every surface (teacher, principal, parent, org director,
// agent): email + password verified with bcrypt against a product table, then
// a `jose`-signed JWT in an httpOnly cookie. See lib/montree/server-auth.ts and
// lib/montree/password.ts — CMS reuses the password module verbatim and mirrors
// the token module here rather than importing it, because the Montree token
// carries Montree's claim shape (schoolId/classroomId/acting-as claims) and the
// two products must be able to change their session contents independently.
//
// Supabase Auth is deliberately NOT used: Montree does not use it, so
// `auth.users` is empty and magic links would be a second, parallel identity
// system for one surface. See migration 329's DECISION 3.
//
// 🚨 THE CLAIM SHAPE IS LOAD-BEARING. `sub` is cms_users.id, which is exactly
// what the database's cms_current_user_id() resolves out of request.jwt.claims.
// So if this token is ever signed with the Supabase project's JWT secret and
// handed to PostgREST instead of to our own routes, every RLS policy in
// migration 329 already applies to it, unchanged. Do not rename `sub`.
// ============================================================================

import { SignJWT, jwtVerify } from 'jose';

export const CMS_SESSION_COOKIE = 'cms_session';

/** 30 days. Deliberately shorter than Montree's effectively-permanent teacher
 *  token: a CMS session can hold a child's medical record, and the device is
 *  as likely to be a shared office machine as a teacher's own phone. */
export const CMS_SESSION_TTL_DAYS = Math.max(
  1,
  Number(process.env.CMS_JWT_TTL_DAYS) || 30
);

export type CmsRole = 'org_admin' | 'school_admin' | 'teacher' | 'parent';

export const CMS_ROLES: readonly CmsRole[] = [
  'org_admin',
  'school_admin',
  'teacher',
  'parent',
] as const;

export function isCmsRole(value: unknown): value is CmsRole {
  return typeof value === 'string' && (CMS_ROLES as readonly string[]).includes(value);
}

/** One signed-in person, in one role, in one school. */
export interface CmsSession {
  /** cms_users.id — and the `sub` claim, and what auth.uid() would return. */
  userId: string;
  membershipId: string;
  email: string;
  displayName: string;
  role: CmsRole;
  organisationId: string;
  /** Null only for org_admin. */
  schoolId: string | null;
  /** Set for `parent` — their cms_guardians row. Null for staff. */
  guardianId: string | null;
}

function getSecretKey(): Uint8Array {
  const secret =
    process.env.CMS_JWT_SECRET ||
    process.env.MONTREE_JWT_SECRET ||
    process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error(
      '[cms/auth] CMS_JWT_SECRET, MONTREE_JWT_SECRET or ADMIN_SECRET must be set'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function mintCmsSession(session: CmsSession): Promise<string> {
  return new SignJWT({
    // `cms_user_id` duplicates `sub` on purpose: cms_current_user_id() reads
    // `sub` first and falls back to this, so a future token that has to carry a
    // different subject (an impersonation claim, say) still resolves correctly.
    cms_user_id: session.userId,
    membershipId: session.membershipId,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    organisationId: session.organisationId,
    schoolId: session.schoolId,
    guardianId: session.guardianId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${CMS_SESSION_TTL_DAYS}d`)
    .sign(getSecretKey());
}

/** Verify + narrow. Returns null on ANY failure — expired, forged, malformed,
 *  or missing a claim we require. Never throws at a call site. */
export async function verifyCmsSession(
  token: string | undefined | null
): Promise<CmsSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const role = payload.role;
    if (!isCmsRole(role)) return null;
    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    const organisationId =
      typeof payload.organisationId === 'string' ? payload.organisationId : null;
    if (!userId || !organisationId) return null;
    // A school role without a school is a malformed token, not a wide one.
    const schoolId = typeof payload.schoolId === 'string' ? payload.schoolId : null;
    if (role !== 'org_admin' && !schoolId) return null;
    return {
      userId,
      membershipId:
        typeof payload.membershipId === 'string' ? payload.membershipId : '',
      email: typeof payload.email === 'string' ? payload.email : '',
      displayName:
        typeof payload.displayName === 'string' ? payload.displayName : '',
      role,
      organisationId,
      schoolId,
      guardianId:
        typeof payload.guardianId === 'string' ? payload.guardianId : null,
    };
  } catch {
    return null;
  }
}

/** The three gated areas of the surface, and who may stand in each. */
export const CMS_AREA_ROLES: Record<'parent' | 'teacher' | 'org', readonly CmsRole[]> = {
  // A school admin walks the parent side to review an application, and the
  // teacher side to cover a room. An org director does neither — the org layer
  // is read-only aggregate by design (migration 329, cms_org_school_ids).
  parent: ['parent', 'school_admin'],
  teacher: ['teacher', 'school_admin'],
  org: ['org_admin'],
};

/** Which gated area a /cms path belongs to, or null for the public shell. */
export function cmsAreaFor(pathname: string): keyof typeof CMS_AREA_ROLES | null {
  if (pathname === '/cms/parent' || pathname.startsWith('/cms/parent/')) return 'parent';
  if (pathname === '/cms/teacher' || pathname.startsWith('/cms/teacher/')) return 'teacher';
  if (pathname === '/cms/org' || pathname.startsWith('/cms/org/')) return 'org';
  return null;
}

/** Where a freshly-signed-in session belongs. */
export function homePathForRole(role: CmsRole): string {
  switch (role) {
    case 'parent':
      return '/cms/parent/dashboard';
    case 'teacher':
      return '/cms/teacher/today';
    case 'org_admin':
      return '/cms/org/overview';
    case 'school_admin':
      return '/cms/teacher/today';
  }
}
