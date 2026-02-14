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

export interface VerifiedRequest {
  userId: string;
  schoolId: string;
  classroomId?: string;
  role: 'teacher' | 'principal' | 'homeschool_parent';
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
  // 1. Check httpOnly cookie (primary — automatically sent by browser)
  const cookieToken = request.cookies.get(MONTREE_AUTH_COOKIE)?.value;
  if (cookieToken) {
    const payload = await verifyMontreeToken(cookieToken);
    if (payload) {
      return {
        userId: payload.sub,
        schoolId: payload.schoolId,
        classroomId: payload.classroomId,
        role: payload.role,
      };
    }
    // Cookie exists but token invalid/expired — fall through to check Bearer header
  }

  // 2. Check Authorization header (backward compat)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyMontreeToken(token);

    if (payload) {
      return {
        userId: payload.sub,
        schoolId: payload.schoolId,
        classroomId: payload.classroomId,
        role: payload.role,
      };
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
