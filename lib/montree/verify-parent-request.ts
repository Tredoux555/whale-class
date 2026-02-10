// lib/montree/verify-parent-request.ts
// Shared helper to verify parent session from HTTP-only cookie.
// Replaces the duplicated getAuthenticatedSession() function in every parent route.
//
// Usage:
//   import { verifyParentSession } from '@/lib/montree/verify-parent-request';
//
//   const session = await verifyParentSession();
//   if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//   const { childId, inviteId, parentId } = session;

import { cookies } from 'next/headers';
import { verifyParentToken, type ParentTokenPayload } from './server-auth';

export interface VerifiedParentSession {
  childId: string;
  childName?: string;
  classroomId?: string;
  inviteId?: string;
  parentId?: string;
}

/**
 * Extract and verify the parent session from the montree_parent_session cookie.
 *
 * Returns the verified session payload, or null if:
 * - No cookie present
 * - Token is invalid, expired, or tampered with
 *
 * Migration: Also accepts legacy base64-encoded JSON tokens during transition.
 * Once all existing sessions expire (30 days), the legacy fallback can be removed.
 */
export async function verifyParentSession(): Promise<VerifiedParentSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('montree_parent_session');

    if (!sessionCookie?.value) {
      return null;
    }

    const token = sessionCookie.value;

    // Primary: Try JWT verification
    const payload = await verifyParentToken(token);
    if (payload) {
      return {
        childId: payload.sub,
        childName: payload.childName,
        classroomId: payload.classroomId,
        inviteId: payload.inviteId,
        parentId: payload.parentId,
      };
    }

    // Migration fallback: Try base64-decoded JSON (old tokens)
    // This supports parents who logged in before the JWT upgrade.
    // Remove this fallback after 30 days (old cookies expire).
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const session = JSON.parse(decoded);

      if (!session.child_id) {
        return null;
      }

      console.warn('[PARENT-AUTH] Legacy base64 session detected. Will expire naturally in ≤30 days.');

      return {
        childId: session.child_id,
        childName: session.child_name,
        classroomId: session.classroom_id,
        inviteId: session.invite_id,
        parentId: session.parent_id,
      };
    } catch {
      // Neither JWT nor base64 — invalid token
      return null;
    }
  } catch {
    return null;
  }
}
