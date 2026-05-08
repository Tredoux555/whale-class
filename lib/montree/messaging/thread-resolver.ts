// lib/montree/messaging/thread-resolver.ts
// Session 97 — thread access + scope resolution helpers.
//
// CROSS-POLLINATION CONTRACT (load-bearing):
// Every function here filters by school_id. No exceptions. The principal /
// teacher / parent identity verifying the request comes from the API route's
// verifySchoolRequest() — we just need to make sure each query funnels through
// the same school filter.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ParticipantRole,
  ThreadType,
  BroadcastScope,
  MessageThread,
} from './types';

interface ResolvedRecipient {
  role: ParticipantRole;
  id: string;
  name: string | null;
  classroom_id?: string | null;
  child_ids?: string[];
}

/**
 * Resolve a broadcast scope into a flat recipient list. Always school-scoped.
 *
 * 'all_teachers' / 'classroom_teachers' — montree_teachers where is_active=true.
 * 'all_parents' / 'classroom_parents' — joined via montree_parent_children.
 * 'group' — montree_message_group_members joined back to the right tables.
 *
 * Returns deduped recipients by (role, id).
 */
export async function resolveBroadcastScope(
  supabase: SupabaseClient,
  schoolId: string,
  scope: BroadcastScope
): Promise<ResolvedRecipient[]> {
  switch (scope.kind) {
    case 'all_teachers': {
      const { data: teachers } = await supabase
        .from('montree_teachers')
        .select('id, name, classroom_id')
        .eq('school_id', schoolId)
        .eq('is_active', true);
      return (teachers || []).map((t) => ({
        role: 'teacher' as const,
        id: t.id,
        name: t.name,
        classroom_id: t.classroom_id,
      }));
    }

    case 'classroom_teachers': {
      const { data: teachers } = await supabase
        .from('montree_teachers')
        .select('id, name, classroom_id')
        .eq('school_id', schoolId)
        .eq('classroom_id', scope.classroom_id)
        .eq('is_active', true);
      return (teachers || []).map((t) => ({
        role: 'teacher' as const,
        id: t.id,
        name: t.name,
        classroom_id: t.classroom_id,
      }));
    }

    case 'all_parents': {
      // Get all classrooms in this school first.
      const { data: classrooms } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_active', true);
      const classroomIds = (classrooms || []).map((c) => c.id);
      if (!classroomIds.length) return [];

      // All children in those classrooms.
      const { data: children } = await supabase
        .from('montree_children')
        .select('id, classroom_id')
        .in('classroom_id', classroomIds)
        .eq('is_active', true);
      const childIds = (children || []).map((c) => c.id);
      if (!childIds.length) return [];

      const { data: links } = await supabase
        .from('montree_parent_children')
        .select('parent_id, child_id')
        .in('child_id', childIds);
      if (!links || !links.length) return [];

      const childToClassroom = new Map<string, string>();
      for (const c of children || []) childToClassroom.set(c.id, c.classroom_id);

      const parentIds = Array.from(new Set(links.map((l) => l.parent_id)));
      const { data: parents } = await supabase
        .from('montree_parents')
        .select('id, name, email')
        .in('id', parentIds);

      const parentChildren = new Map<string, string[]>();
      const parentClassrooms = new Map<string, Set<string>>();
      for (const link of links) {
        if (!parentChildren.has(link.parent_id)) parentChildren.set(link.parent_id, []);
        parentChildren.get(link.parent_id)!.push(link.child_id);
        const cid = childToClassroom.get(link.child_id);
        if (cid) {
          if (!parentClassrooms.has(link.parent_id)) parentClassrooms.set(link.parent_id, new Set());
          parentClassrooms.get(link.parent_id)!.add(cid);
        }
      }

      return (parents || []).map((p) => ({
        role: 'parent' as const,
        id: p.id,
        name: p.name || p.email,
        classroom_id: Array.from(parentClassrooms.get(p.id) || [])[0] ?? null,
        child_ids: parentChildren.get(p.id) || [],
      }));
    }

    case 'classroom_parents': {
      const { data: children } = await supabase
        .from('montree_children')
        .select('id, classroom_id')
        .eq('classroom_id', scope.classroom_id)
        .eq('is_active', true);
      const childIds = (children || []).map((c) => c.id);
      if (!childIds.length) return [];

      const { data: links } = await supabase
        .from('montree_parent_children')
        .select('parent_id, child_id')
        .in('child_id', childIds);
      if (!links || !links.length) return [];

      const parentIds = Array.from(new Set(links.map((l) => l.parent_id)));
      const { data: parents } = await supabase
        .from('montree_parents')
        .select('id, name, email')
        .in('id', parentIds);

      const parentChildren = new Map<string, string[]>();
      for (const link of links) {
        if (!parentChildren.has(link.parent_id)) parentChildren.set(link.parent_id, []);
        parentChildren.get(link.parent_id)!.push(link.child_id);
      }

      return (parents || []).map((p) => ({
        role: 'parent' as const,
        id: p.id,
        name: p.name || p.email,
        classroom_id: scope.classroom_id,
        child_ids: parentChildren.get(p.id) || [],
      }));
    }

    case 'group': {
      // Verify the group belongs to this school first.
      const { data: group } = await supabase
        .from('montree_message_groups')
        .select('id, school_id, archived_at')
        .eq('id', scope.group_id)
        .maybeSingle();
      if (!group || group.school_id !== schoolId || group.archived_at) return [];

      const { data: members } = await supabase
        .from('montree_message_group_members')
        .select('member_role, member_id')
        .eq('group_id', scope.group_id);
      if (!members || !members.length) return [];

      // Hydrate names from the appropriate tables.
      const teacherIds = members.filter((m) => m.member_role === 'teacher').map((m) => m.member_id);
      const parentIds = members.filter((m) => m.member_role === 'parent').map((m) => m.member_id);
      const principalIds = members.filter((m) => m.member_role === 'principal').map((m) => m.member_id);

      const teachers = teacherIds.length
        ? (await supabase.from('montree_teachers').select('id, name').in('id', teacherIds)).data || []
        : [];
      const parents = parentIds.length
        ? (await supabase.from('montree_parents').select('id, name, email').in('id', parentIds)).data || []
        : [];
      const principals = principalIds.length
        ? (await supabase.from('montree_school_admins').select('id, name').in('id', principalIds)).data || []
        : [];

      const teacherById = new Map(teachers.map((t) => [t.id, t.name]));
      const parentById = new Map(parents.map((p) => [p.id, p.name || p.email]));
      const principalById = new Map(principals.map((p) => [p.id, p.name]));

      return members.map((m) => {
        const name =
          m.member_role === 'teacher'
            ? teacherById.get(m.member_id) || null
            : m.member_role === 'parent'
              ? parentById.get(m.member_id) || null
              : principalById.get(m.member_id) || null;
        return {
          role: m.member_role as ParticipantRole,
          id: m.member_id,
          name,
        };
      });
    }
  }
}

/**
 * Add the principal as an observer to every parent_teacher thread for
 * full transparency. Idempotent — safe to call repeatedly.
 */
export async function addPrincipalObserver(
  supabase: SupabaseClient,
  schoolId: string,
  threadId: string
): Promise<void> {
  const { data: principal } = await supabase
    .from('montree_school_admins')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!principal) return;

  await supabase
    .from('montree_message_thread_participants')
    .upsert(
      {
        thread_id: threadId,
        participant_role: 'principal',
        participant_id: principal.id,
        is_observer: true,
        can_reply: true, // principal can always insert; observer flag is the UI hint
      },
      { onConflict: 'thread_id,participant_role,participant_id' }
    );
}

/**
 * Verify the caller is a participant in this thread, OR (for principals) that
 * the thread belongs to their school. Returns null if access denied; otherwise
 * the thread row.
 */
export async function verifyThreadAccess(
  supabase: SupabaseClient,
  threadId: string,
  schoolId: string,
  role: ParticipantRole | 'agent' | 'homeschool_parent',
  userId: string
): Promise<MessageThread | null> {
  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('*')
    .eq('id', threadId)
    .eq('school_id', schoolId)
    .maybeSingle();
  if (!thread) return null;

  // Principals see every thread in their school (transparency by design).
  if (role === 'principal') return thread as MessageThread;

  // Other roles must be participants.
  const { data: participant } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('participant_role', role === 'homeschool_parent' ? 'parent' : role)
    .eq('participant_id', userId)
    .maybeSingle();
  if (!participant) return null;

  return thread as MessageThread;
}

/**
 * Build a thread + auto-add participants. Intended for both 1:1 DMs (recipient
 * count = 1) and group/broadcast threads.
 */
export async function createThreadWithParticipants(
  supabase: SupabaseClient,
  args: {
    schoolId: string;
    classroomId?: string | null;
    childId?: string | null;
    threadType: ThreadType;
    subject: string | null;
    groupId?: string | null;
    createdBy: { role: 'teacher' | 'principal' | 'parent'; id: string };
    participants: Array<{
      role: ParticipantRole;
      id: string;
      isPrimary?: boolean;
      isObserver?: boolean;
      canReply?: boolean;
    }>;
  }
): Promise<{ id: string } | null> {
  const { data: thread, error } = await supabase
    .from('montree_message_threads')
    .insert({
      school_id: args.schoolId,
      classroom_id: args.classroomId ?? null,
      child_id: args.childId ?? null,
      thread_type: args.threadType,
      subject: args.subject,
      group_id: args.groupId ?? null,
      created_by_role: args.createdBy.role,
      created_by_id: args.createdBy.id,
    })
    .select('id')
    .single();
  if (error || !thread) {
    console.error('[messaging/createThread] insert failed', error);
    return null;
  }

  // Always include the creator as a participant (unless they're already in
  // the participant list).
  const allParticipants = [...args.participants];
  if (
    !allParticipants.some(
      (p) => p.role === args.createdBy.role && p.id === args.createdBy.id
    )
  ) {
    allParticipants.push({
      role: args.createdBy.role,
      id: args.createdBy.id,
      canReply: true,
    });
  }

  // Dedup
  const dedupedMap = new Map<string, typeof allParticipants[number]>();
  for (const p of allParticipants) {
    dedupedMap.set(`${p.role}:${p.id}`, p);
  }

  const rows = Array.from(dedupedMap.values()).map((p) => ({
    thread_id: thread.id,
    participant_role: p.role,
    participant_id: p.id,
    is_primary: p.isPrimary ?? false,
    is_observer: p.isObserver ?? false,
    can_reply: p.canReply ?? true,
  }));

  if (rows.length) {
    await supabase
      .from('montree_message_thread_participants')
      .upsert(rows, { onConflict: 'thread_id,participant_role,participant_id' });
  }

  // For parent_teacher threads, auto-add the principal as observer for
  // transparency.
  if (args.threadType === 'parent_teacher' || args.threadType === 'parent_principal') {
    await addPrincipalObserver(supabase, args.schoolId, thread.id);
  }

  return { id: thread.id };
}
