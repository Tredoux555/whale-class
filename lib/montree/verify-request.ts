// lib/montree/verify-request.ts
// API route helper to verify incoming requests have a valid Montree JWT token.
// Usage in any API route:
//
//   import { verifySchoolRequest } from '@/lib/montree/verify-request';
//
//   export async function GET(request: NextRequest) {
//     const auth = await verifySchoolRequest(request);
//     if (auth instanceof NextResponse) return auth; // 401 response
//     const { userId, schoolId, classroomId, role } = auth;
//     // ... handle request
//   }

import { NextRequest, NextResponse } from 'next/server';
import { verifyMontreeToken, MONTREE_AUTH_COOKIE } from './server-auth';
import type { MontreeTokenPayload } from './server-auth';
import { isSchoolLocked } from './school-lock';

export interface VerifiedRequest {
  userId: string;
  schoolId: string;
  classroomId?: string;
  // 'agent' (Phase 7b) — Sarah / multiplier-partner sessions. schoolId on
  // these is INERT (the agent's montree_teachers row's school_id, placeholder
  // for shell agents). Agent routes MUST self-scope via founding_teacher_id =
  // userId, NOT via schoolId.
  role: 'teacher' | 'principal' | 'homeschool_parent' | 'agent';
}

/**
 * Turn a verified token payload into a VerifiedRequest, enforcing the abuse
 * lock (migration 286) once — factored so BOTH the cookie and Bearer paths run
 * the identical check.
 *
 * Agent sessions (Phase 7b) are exempt: their schoolId is INERT (a placeholder
 * on the agent's montree_teachers row), so a lock check against it is
 * meaningless. Agent routes self-scope via founding_teacher_id.
 *
 * Lock enforcement fails OPEN (see school-lock.ts) — an outage never locks out
 * the world.
 */
async function toVerifiedOrLocked(
  payload: MontreeTokenPayload,
): Promise<VerifiedRequest | NextResponse> {
  if (payload.role !== 'agent' && (await isSchoolLocked(payload.schoolId))) {
    return NextResponse.json(
      { error: 'This account has been locked.', code: 'school_locked' },
      { status: 403 },
    );
  }
  return {
    userId: payload.sub,
    schoolId: payload.schoolId,
    classroomId: payload.classroomId,
    role: payload.role,
  };
}

/**
 * Verify that the request has a valid Montree JWT token.
 *
 * Checks (in order):
 *   1. httpOnly cookie `montree-auth` (primary — set by server on login)
 *   2. Authorization: Bearer header (backward compat for any remaining clients)
 *
 * Returns a VerifiedRequest on success, or a 401 NextResponse on failure.
 */
export async function verifySchoolRequest(
  request: NextRequest
): Promise<VerifiedRequest | NextResponse> {
  // [503-DIAGNOSTIC] One-line request log so Railway logs show whether
  // requests reach the app at all. If we see "[req]" lines for a request
  // that the client reported as 503, the 503 came from the app (real bug).
  // If we DON'T see "[req]", the 503 was Railway's edge during container
  // churn / cold start / healthcheck failure. Cheap insurance, remove
  // once root cause is confirmed.
  try {
    const url = new URL(request.url);
    console.log(`[req] ${request.method} ${url.pathname}`);
  } catch { /* URL parse should never fail; ignore */ }

  // 1. Check httpOnly cookie (primary — automatically sent by browser)
  const cookieToken = request.cookies.get(MONTREE_AUTH_COOKIE)?.value;
  if (cookieToken) {
    const payload = await verifyMontreeToken(cookieToken);
    if (payload) {
      return toVerifiedOrLocked(payload);
    }
    // Cookie exists but token invalid/expired — fall through to check Bearer header
  }

  // 2. Check Authorization header (backward compat)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyMontreeToken(token);

    if (payload) {
      return toVerifiedOrLocked(payload);
    }

    // Token was provided but invalid
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // No auth provided
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}

/**
 * Lightweight check — just extracts the school ID from cookie or Bearer token.
 * Use for routes that currently pass school_id/classroom_id via params.
 *
 * Returns null if no valid auth is found.
 */
export async function getSchoolIdFromRequest(
  request: NextRequest
): Promise<{ schoolId: string; userId?: string; role?: string } | null> {
  // Try cookie first
  const cookieToken = request.cookies.get(MONTREE_AUTH_COOKIE)?.value;
  if (cookieToken) {
    const payload = await verifyMontreeToken(cookieToken);
    if (payload) {
      return {
        schoolId: payload.schoolId,
        userId: payload.sub,
        role: payload.role,
      };
    }
  }

  // Try Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyMontreeToken(token);
    if (payload) {
      return {
        schoolId: payload.schoolId,
        userId: payload.sub,
        role: payload.role,
      };
    }
  }

  return null;
}
