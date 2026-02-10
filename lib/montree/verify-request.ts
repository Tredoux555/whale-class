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
import { verifyMontreeToken, type MontreeTokenPayload } from './server-auth';

export interface VerifiedRequest {
  userId: string;
  schoolId: string;
  classroomId?: string;
  role: 'teacher' | 'principal';
}

/**
 * Verify that the request has a valid Montree JWT token.
 *
 * Checks the Authorization header for a Bearer token.
 * Returns a VerifiedRequest on success, or a 401 NextResponse on failure.
 *
 * During migration: also accepts x-school-id header as fallback
 * (will be removed once all clients send Bearer tokens).
 */
export async function verifySchoolRequest(
  request: NextRequest
): Promise<VerifiedRequest | NextResponse> {
  // Primary: Check Authorization header for Bearer token
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

  // SECURITY DEBT (Phase 7): This fallback accepts x-school-id header without JWT verification.
  // It returns userId: 'legacy' and role: 'teacher' — effectively bypassing auth.
  // CANNOT remove until these 7 frontend pages migrate to Bearer token auth:
  //   - app/montree/admin/page.tsx, settings/page.tsx, students/page.tsx, activity/page.tsx, import/page.tsx
  //   - app/montree/dashboard/students/page.tsx, [childId]/layout.tsx
  // The token is stored in React state (not localStorage) and lost on page refresh,
  // which is why these pages fall back to x-school-id.
  // TODO: Store Montree JWT in localStorage or HttpOnly cookie, then remove this fallback.
  const schoolId = request.headers.get('x-school-id');
  if (schoolId) {
    console.warn(
      `[AUTH] Route ${request.nextUrl.pathname} using deprecated x-school-id header. Migrate to Bearer token.`
    );
    return {
      userId: 'legacy',
      schoolId,
      role: 'teacher',
    };
  }

  // No auth provided
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}

/**
 * Lightweight check — just extracts the school ID from either Bearer token or
 * query params / body. Use for routes that currently pass school_id/classroom_id
 * via params rather than headers.
 *
 * Once token auth is fully adopted, this can enforce token-only access.
 */
export async function getSchoolIdFromRequest(
  request: NextRequest
): Promise<{ schoolId: string; userId?: string; role?: string } | null> {
  // Try Bearer token first
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

  // SECURITY DEBT (Phase 7): Same x-school-id fallback — see verifySchoolRequest above.
  const schoolId = request.headers.get('x-school-id');
  if (schoolId) {
    return { schoolId };
  }

  return null;
}
