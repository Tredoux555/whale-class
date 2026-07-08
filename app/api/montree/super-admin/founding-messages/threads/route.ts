// /api/montree/super-admin/founding-messages/threads
//
// Migration 292 — Tredoux's side. Lists ALL principal_super_admin threads
// across all founding schools. Hydrates with the school name + principal
// identity so the inbox UI can show "Sunshine Montessori — Sarah" without
// per-thread fetches.
//
// CROSS-POLLINATION: super-admin sees globally — by design.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingSuperAdmin } from '@/lib/montree/agent-super-admin-messaging/access';
import { SUPER_ADMIN_SENTINEL_UUID } from '@/lib/montree/agent-super-admin-messaging/types';
import { readEncryptedField } from '@/lib/montree/messaging-crypto';

export const dynamic = 'force-dynamic';

interface ThreadRow {
  id: string;
  school_id: string | null;
  subject: string | null;
  created_at: string;
  last_message_at: string;
  created_by_role: string;
  created_by_id: string;
  archived_at: string | null;
}

interface MessageRow {
  id: string;
  thread_id: string;
  body: string;
  encryption_version: number | null;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  sent_at: string;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const sa = await resolveMessagingSuperAdmin(request);
  if (sa instanceof NextResponse) return sa;

  // 1. ALL principal_super_admin threads, newest first.
  const { data: threads } = await supabase
    .from('montree_message_threads')
    .select('*')
    .eq('thread_type', 'principal_super_admin')
    .is('archived_at', null)
    .order('last_message_at', { ascending: false })
    .limit(200);

  const threadRows = ((threads as ThreadRow[] | null) || []);
  if (!threadRows.length) {
    return NextResponse.json({ threads: [], total: 0, unread: 0 });
  }

  const ids = threadRows.map((t) => t.id);

  // 2. Principal participant per thread + last messages + super-admin last_read.
  const [principalPartsRes, lastMessagesRes, saReadRes] = await Promise.all([
    supabase
      .from('montree_message_thread_participants')
      .select('thread_id, participant_id')
      .eq('participant_role', 'principal')
      .in('thread_id', ids),
    supabase
      // 🚨 Session 121 — pull encryption_version for snippet decrypt.
      .from('montree_thread_messages')
      .select('id, thread_id, body, encryption_version, sender_role, sender_id, sender_name, sent_at')
      .in('thread_id', ids)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(500),
    supabase
      .from('montree_message_thread_participants')
      .select('thread_id, last_read_at')
      .in('thread_id', ids)
      .eq('participant_role', 'super_admin')
      .eq('participant_id', SUPER_ADMIN_SENTINEL_UUID),
  ]);

  // Principal id per thread → fetch principal identity names.
  const principalIdByThread = new Map<string, string>();
  const allPrincipalIds = new Set<string>();
  for (const p of (principalPartsRes.data as { thread_id: string; participant_id: string }[] | null) || []) {
    principalIdByThread.set(p.thread_id, p.participant_id);
    allPrincipalIds.add(p.participant_id);
  }

  const { data: principalsData } = allPrincipalIds.size
    ? await supabase
        .from('montree_school_admins')
        .select('id, name, email')
        .in('id', Array.from(allPrincipalIds))
    : { data: [] };

  const principalInfo = new Map<string, { name: string; email: string | null }>();
  for (const a of (principalsData as { id: string; name: string | null; email: string | null }[] | null) || []) {
    principalInfo.set(a.id, { name: a.name || a.email || 'Principal', email: a.email });
  }

  // School names per thread.
  const schoolIds = Array.from(new Set(threadRows.map((t) => t.school_id).filter((s): s is string => !!s)));
  const { data: schoolsData } = schoolIds.length
    ? await supabase.from('montree_schools').select('id, name').in('id', schoolIds)
    : { data: [] };
  const schoolNameById = new Map<string, string>();
  for (const s of (schoolsData as { id: string; name: string | null }[] | null) || []) {
    schoolNameById.set(s.id, s.name || 'School');
  }

  const latestByThread = new Map<string, MessageRow>();
  for (const m of (lastMessagesRes.data as MessageRow[] | null) || []) {
    // 🚨 Decrypt body for snippet.
    if (!latestByThread.has(m.thread_id)) latestByThread.set(m.thread_id, {
      ...m,
      body: readEncryptedField(m.body, m.encryption_version),
    });
  }

  const saReadByThread = new Map<string, string | null>();
  for (const r of (saReadRes.data as { thread_id: string; last_read_at: string | null }[] | null) || []) {
    saReadByThread.set(r.thread_id, r.last_read_at);
  }

  // Unread = messages from someone other than super-admin AFTER last_read_at.
  const unreadByThread = new Map<string, number>();
  for (const m of (lastMessagesRes.data as MessageRow[] | null) || []) {
    if (m.sender_role === 'super_admin') continue;
    const lr = saReadByThread.get(m.thread_id);
    if (!lr || m.sent_at > lr) {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) || 0) + 1);
    }
  }

  const enriched = threadRows.map((t) => {
    const last = latestByThread.get(t.id);
    const principalId = principalIdByThread.get(t.id);
    const pi = principalId ? principalInfo.get(principalId) : null;
    return {
      id: t.id,
      subject: t.subject,
      created_at: t.created_at,
      last_message_at: t.last_message_at,
      school_id: t.school_id,
      school_name: t.school_id ? (schoolNameById.get(t.school_id) || 'School') : 'School',
      principal_id: principalId || null,
      principal_name: pi?.name || 'Principal',
      principal_email: pi?.email || null,
      last_snippet: last ? last.body.slice(0, 240) : null,
      last_sender_role: last ? last.sender_role : null,
      last_sender_name: last ? last.sender_name : null,
      last_sender_is_me: last ? last.sender_role === 'super_admin' : false,
      unread_for_me: unreadByThread.get(t.id) || 0,
    };
  });

  const totalUnread = enriched.reduce((acc, t) => acc + (t.unread_for_me > 0 ? 1 : 0), 0);

  return NextResponse.json({ threads: enriched, total: enriched.length, unread: totalUnread });
}
