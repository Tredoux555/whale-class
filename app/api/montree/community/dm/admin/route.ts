// /api/montree/community/dm/admin
// The Creator inbox list: every Teachers'-Room conversation with Tredoux,
// with the sender card montree_dm cannot hold (email, account link).
//
// Read-only and super-admin only. Replying and marking read both go through
// the EXISTING /api/montree/dm, so there is exactly one write path for admin
// messages and one definition of "read".
//
// The counts are aggregated in memory rather than in SQL: this is a handful
// of conversations on a personal inbox, PostgREST has no GROUP BY, and a
// per-conversation count query would be one round trip each.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { isMissingTable, migrationPending, serverError } from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

const META_TABLE = 'montree_community_dm_meta';
/** Conversations returned. A personal inbox; this is a ceiling, not a page. */
const MAX_CONVERSATIONS = 100;
/** Messages scanned for the counts. Well past anything this inbox will hold. */
const MAX_MESSAGES = 5000;
const PREVIEW_CHARS = 120;

interface MetaRow {
  conversation_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  created_at: string;
  last_message_at: string;
}

interface DmRow {
  conversation_id: string;
  sender_type: string;
  is_read: boolean;
  message: string;
  created_at: string;
}

interface Aggregate {
  unreadCount: number;
  messageCount: number;
  lastMessagePreview: string;
  lastMessageAt: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Ordered by activity so the ceiling drops the coldest threads first.
    const { data: metaData, error: metaError } = await supabase
      .from(META_TABLE)
      .select('conversation_id, user_id, name, email, created_at, last_message_at')
      .order('last_message_at', { ascending: false })
      .limit(MAX_CONVERSATIONS);

    if (metaError) {
      if (isMissingTable(metaError)) return migrationPending();
      return serverError('dm.admin.GET', metaError);
    }

    const metas = (metaData || []) as MetaRow[];
    if (metas.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // NEWEST first, so if the message cap ever bites it truncates the old tail
    // and the preview still shows the latest line rather than the oldest one.
    const { data: dmData, error: dmError } = await supabase
      .from('montree_dm')
      .select('conversation_id, sender_type, is_read, message, created_at')
      .in('conversation_id', metas.map((m) => m.conversation_id))
      .order('created_at', { ascending: false })
      .limit(MAX_MESSAGES);

    if (dmError) {
      if (isMissingTable(dmError)) return migrationPending();
      return serverError('dm.admin.GET', dmError);
    }

    const agg: Record<string, Aggregate> = {};
    for (const row of (dmData || []) as DmRow[]) {
      let entry = agg[row.conversation_id];
      if (!entry) {
        entry = { unreadCount: 0, messageCount: 0, lastMessagePreview: '', lastMessageAt: null };
        agg[row.conversation_id] = entry;
      }
      entry.messageCount += 1;
      // Unread means "waiting on Tredoux" — the same definition the global DM
      // badge uses, so the two counts can never disagree.
      if (row.sender_type === 'user' && !row.is_read) entry.unreadCount += 1;
      // First row seen for a conversation is its newest (see order above).
      if (!entry.lastMessageAt) {
        entry.lastMessageAt = row.created_at;
        entry.lastMessagePreview = (row.message || '').slice(0, PREVIEW_CHARS);
      }
    }

    const conversations = metas.map((m) => {
      const a = agg[m.conversation_id];
      return {
        conversationId: m.conversation_id,
        name: m.name,
        email: m.email,
        isAccount: !!m.user_id,
        // meta.last_message_at is authoritative; the message timestamp is the
        // fallback for a row written before the column existed.
        lastMessageAt: m.last_message_at || a?.lastMessageAt || m.created_at,
        createdAt: m.created_at,
        unreadCount: a?.unreadCount || 0,
        lastMessagePreview: a?.lastMessagePreview || '',
        messageCount: a?.messageCount || 0,
      };
    });

    // Unread first, then most recent. Anything Tredoux hasn't answered rises
    // to the top no matter how old it is.
    conversations.sort((x, y) => {
      if ((x.unreadCount > 0) !== (y.unreadCount > 0)) return x.unreadCount > 0 ? -1 : 1;
      return new Date(y.lastMessageAt).getTime() - new Date(x.lastMessageAt).getTime();
    });

    return NextResponse.json({ conversations });
  } catch (err) {
    return serverError('dm.admin.GET', err);
  }
}
