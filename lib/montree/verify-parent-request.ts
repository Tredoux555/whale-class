// lib/montree/verify-parent-request.ts
// Shared helpers to verify a parent session from the HTTP-only cookie.
//
// TWO helpers live here:
//
//   1. verifyParentSession() — JWT signature + claim check ONLY. Fast.
//      Use for routes that need the bare session shape (e.g. logout) and
//      don't need to re-verify that the parent ↔ child link still exists.
//
//   2. resolveAuthorizedParent(supabase) — JWT + DB re-check. Canonical.
//      Use for EVERY route that returns child data or accepts a parent
//      mutation. Confirms at request time:
//        - child still exists
//        - parent invite (if invite-based session) still active + not expired
//        - parent account (if full-account session) still is_active
//        - parent ↔ child link still exists in montree_parent_children (full
//          accounts only — invite-based sessions are scoped to one child)
//
// Why both: F-1.1 from Session 113 V2 parent portal audit. The JWT carries
// childId for 30 days. Without a DB re-check, suspending a parent / revoking
// an invite / unlinking a parent from a child has NO effect until the cookie
// expires. resolveAuthorizedParent() closes that hole.
//
// Migration note: the old base64-encoded JSON session fallback (Feb 10
// commit 898cd7bd) was removed Session 113 V2 — every session minted >30
// days before that point has long since expired. The fallback was forgeable
// (anyone could craft base64 JSON with any child_id) and shouldn't have
// outlived its migration window. Removed per audit F-1.2.

import { cookies } from 'next/headers';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { verifyParentToken } from './server-auth';

export interface VerifiedParentSession {
  childId: string;
  childName?: string;
  classroomId?: string;
  inviteId?: string;
  parentId?: string;
}

export interface AuthorizedParent extends VerifiedParentSession {
  /**
   * For full-account sessions: every child the parent has access to via
   * montree_parent_children. The session's childId is guaranteed to be in
   * this set.
   *
   * For invite-based sessions: a single-element array `[childId]` from the
   * invite. Invite sessions are scoped to ONE child by design.
   */
  authorizedChildIds: string[];
}

/**
 * Extract and verify the parent session from the montree_parent_session
 * cookie. JWT signature + claims only — no DB re-check.
 *
 * Returns the verified session payload, or null if no/invalid cookie.
 *
 * Use this ONLY for routes that don't need to know whether the parent ↔
 * child link still exists at this instant (e.g. /api/montree/parent/logout).
 * For everything else, use resolveAuthorizedParent().
 */
export async function verifyParentSession(): Promise<VerifiedParentSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('montree_parent_session');

    if (!sessionCookie?.value) {
      return null;
    }

    const payload = await verifyParentToken(sessionCookie.value);
    if (!payload) return null;

    return {
      childId: payload.sub,
      childName: payload.childName,
      classroomId: payload.classroomId,
      inviteId: payload.inviteId,
      parentId: payload.parentId,
    };
  } catch {
    return null;
  }
}

/**
 * Canonical parent identity resolver. Verifies the JWT cookie AND re-queries
 * the DB to confirm the parent ↔ child link is still valid right now.
 *
 * Returns:
 *   - AuthorizedParent on success
 *   - null when:
 *       * no cookie / invalid JWT
 *       * invite-based session and the invite is no longer is_active or has expired
 *       * full-account session and montree_parents.is_active is false
 *       * full-account session and parent ↔ child link no longer exists
 *       * for either: the child no longer exists
 *
 * Routes should treat null as 401 Unauthorized and route the user back to
 * /montree/parent/login. The frontend should clear localStorage on 401.
 *
 * Note: this fires a few small DB queries on every authenticated request.
 * Acceptable — parent routes are read-mostly and the queries are indexed.
 * Migration 095 has:
 *   - idx_parent_child_unique on (parent_id, child_id)
 *   - idx_invite_code on (invite_code) WHERE is_active = true
 *   - idx_children index on montree_children.id (PK)
 */
export async function resolveAuthorizedParent(
  supabase: SupabaseClient
): Promise<AuthorizedParent | null> {
  const session = await verifyParentSession();
  if (!session) return null;

  // Confirm the child the session is scoped to still exists.
  const { data: childRow } = await supabase
    .from('montree_children')
    .select('id')
    .eq('id', session.childId)
    .maybeSingle();
  if (!childRow) {
    console.warn('[parent-auth] session childId no longer exists', { childId: session.childId });
    return null;
  }

  if (session.parentId) {
    // Full account session — verify parent.is_active + parent↔child link.
    const { data: parentRow } = await supabase
      .from('montree_parents')
      .select('id, is_active')
      .eq('id', session.parentId)
      .maybeSingle();
    if (!parentRow || (parentRow as { is_active: boolean }).is_active === false) {
      console.warn('[parent-auth] full-account session: parent inactive or missing', {
        parentId: session.parentId,
      });
      return null;
    }

    // Authorized child set comes from montree_parent_children — covers
    // multi-child families. The session's childId MUST be in this set.
    const { data: linkRows } = await supabase
      .from('montree_parent_children')
      .select('child_id')
      .eq('parent_id', session.parentId);
    const linked = (linkRows || []).map((r) => (r as { child_id: string }).child_id);
    if (!linked.includes(session.childId)) {
      console.warn('[parent-auth] full-account session: child no longer linked', {
        parentId: session.parentId,
        childId: session.childId,
      });
      return null;
    }
    return {
      ...session,
      authorizedChildIds: linked,
    };
  }

  if (session.inviteId) {
    // Invite-based session — verify the invite is still active + not expired.
    const { data: inviteRow } = await supabase
      .from('montree_parent_invites')
      .select('id, child_id, is_active, expires_at')
      .eq('id', session.inviteId)
      .maybeSingle();
    if (!inviteRow) {
      console.warn('[parent-auth] invite session: invite no longer exists', {
        inviteId: session.inviteId,
      });
      return null;
    }
    const invite = inviteRow as { is_active: boolean; expires_at: string | null; child_id: string };
    if (!invite.is_active) {
      console.warn('[parent-auth] invite session: invite is_active=false', {
        inviteId: session.inviteId,
      });
      return null;
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      console.warn('[parent-auth] invite session: invite expired', {
        inviteId: session.inviteId,
        expires_at: invite.expires_at,
      });
      return null;
    }
    // Invite child_id must match the session's childId. Anti-tamper guard.
    if (invite.child_id !== session.childId) {
      console.error('[parent-auth] invite child_id ≠ session childId — possible tamper', {
        inviteId: session.inviteId,
        inviteChildId: invite.child_id,
        sessionChildId: session.childId,
      });
      return null;
    }
    return {
      ...session,
      authorizedChildIds: [session.childId],
    };
  }

  // Neither inviteId nor parentId present on the session. Reject — sessions
  // must be one of the two modes.
  console.warn('[parent-auth] session missing both inviteId and parentId', { session });
  return null;
}
