// lib/montree/parent-messaging/access.ts
// Session 98 — entry-point access guard for the parent messaging surface.
//
// Every parent messaging API route MUST funnel through resolveMessagingParent()
// at the top. It does the three things a parent endpoint needs:
//
//   1. Verifies the parent JWT cookie (montree_parent_session).
//   2. Refuses invite-based sessions (no parentId in JWT). Invite-based
//      access is read-only by design — they can't be participants.
//   3. Looks up the parent's school + child list, then checks the
//      parent_messaging feature flag for that school.
//
// Returns a MessagingParent on success, or a NextResponse the caller must
// return verbatim (404 when flag off, 401 when unauth, 403 when invite-only).
//
// CROSS-POLLINATION CONTRACT: every downstream query in the parent messaging
// API routes filters by:
//   - participant_id = parent.parentId  (for thread participation)
//   - child_id IN parent.childIds       (for thread.child_id scoping)
//   - school_id = parent.schoolId       (belt-and-braces)

import { NextResponse } from 'next/server';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { verifyParentSession } from '../verify-parent-request';
import { isFeatureEnabled } from '../features/server';
import type { MessagingParent } from './types';

interface ParentRow {
  id: string;
  name: string | null;
  email: string;
  school_id: string;
  is_active: boolean;
}

interface LinkRow {
  child_id: string;
}

interface ChildRow {
  id: string;
  montree_classrooms: { school_id: string } | null;
}

/**
 * Resolve and authorize a parent for messaging. Returns the parent identity
 * bundle on success, or a NextResponse that the route handler must return.
 *
 * IMPORTANT: when the feature flag is OFF, this returns a 404 (not 403). The
 * feature should not appear to exist for unflagged schools.
 */
export async function resolveMessagingParent(
  supabase: SupabaseClient
): Promise<MessagingParent | NextResponse> {
  // 1. Auth — must have a valid parent JWT cookie.
  const session = await verifyParentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Refuse invite-based sessions. Messaging participants are people,
  //    not children. Invite-based access has no parent identity to attach
  //    to a participant row.
  if (!session.parentId) {
    return NextResponse.json(
      { error: 'Messaging requires a parent account. Invite-based access is view-only.' },
      { status: 403 }
    );
  }

  // 3. Hydrate the parent row + school.
  const { data: parent } = await supabase
    .from('montree_parents')
    .select('id, name, email, school_id, is_active')
    .eq('id', session.parentId)
    .maybeSingle();

  if (!parent) {
    return NextResponse.json({ error: 'Parent not found' }, { status: 401 });
  }

  const parentRow = parent as ParentRow;
  if (!parentRow.is_active) {
    return NextResponse.json({ error: 'Account is disabled' }, { status: 401 });
  }

  // 4. Feature flag check. Fail-closed: 404 if flag off (or on lookup error).
  const flagOn = await isFeatureEnabled(supabase, parentRow.school_id, 'parent_messaging');
  if (!flagOn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 5. Resolve the parent's children. They can ONLY message about these.
  // Multi-school parents: filter the linked-children list to those whose
  // classroom belongs to the parent's school. Cross-school children must
  // never appear in this scope.
  const { data: links } = await supabase
    .from('montree_parent_children')
    .select('child_id')
    .eq('parent_id', parentRow.id);

  const candidateChildIds = ((links as LinkRow[] | null) || []).map((l) => l.child_id);
  if (!candidateChildIds.length) {
    return NextResponse.json({ error: 'No children linked' }, { status: 404 });
  }

  const { data: schoolChildren } = await supabase
    .from('montree_children')
    .select('id, montree_classrooms!inner(school_id)')
    .in('id', candidateChildIds)
    .eq('montree_classrooms.school_id', parentRow.school_id);

  const childIds = ((schoolChildren as ChildRow[] | null) || []).map((c) => c.id);
  if (!childIds.length) {
    // Parent has linked children but none in this school — nothing to message
    // about within this school's scope.
    return NextResponse.json({ error: 'No children linked' }, { status: 404 });
  }

  return {
    parentId: parentRow.id,
    schoolId: parentRow.school_id,
    childIds,
    parentName: parentRow.name || parentRow.email,
  };
}

/**
 * Lightweight feature-flag probe. Used by the parent UI to decide whether
 * to redirect to /dashboard or render the messaging surface.
 *
 * Mirrors resolveMessagingParent() but returns a boolean only — no children
 * lookup, no participant info. Cheap.
 */
export async function isParentMessagingOn(
  supabase: SupabaseClient,
  schoolId: string
): Promise<boolean> {
  return isFeatureEnabled(supabase, schoolId, 'parent_messaging');
}
