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

// Token payload shape (teacher/principal/homeschool_parent — stored in httpOnly cookie)
export interface MontreeTokenPayload {
  sub: string;        // teacher ID, principal ID, or homeschool parent ID
  schoolId: string;
  classroomId?: string;
  role: 'teacher' | 'principal' | 'homeschool_parent';
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
 * 365 days for all roles — paid subscriptions should not require frequent re-login.
 */
export async function createMontreeToken(payload: MontreeTokenPayload): Promise<string> {
  const ttl = '365d';
  const token = await new SignJWT({
    schoolId: payload.schoolId,
    classroomId: payload.classroomId || null,
    role: payload.role,
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

    if (role !== 'teacher' && role !== 'principal' && role !== 'homeschool_parent') {
      return null;
    }

    return {
      sub,
      schoolId,
      classroomId: (payload.classroomId as string) || undefined,
      role: role as 'teacher' | 'principal' | 'homeschool_parent',
    };
  } catch {
    // Token is invalid, expired, or tampered with
    return null;
  }
}

/**
 * Create a signed JWT for a parent session.
 * Token is valid for 30 days (matches the previous cookie maxAge).
 * Stored inside an HTTP-only cookie — not sent as a Bearer header.
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
    .setExpirationTime('30d')
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
 * 365-day maxAge for all roles — paid subscription, effectively non-expiring.
 */
export function setMontreeAuthCookie(
  response: NextResponse,
  token: string,
  role?: 'teacher' | 'principal' | 'homeschool_parent'
): void {
  const maxAge = 365 * 24 * 60 * 60;  // 365 days — paid subscription, cookie should effectively not expire
  response.cookies.set(MONTREE_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
}
