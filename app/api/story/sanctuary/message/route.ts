// app/api/story/sanctuary/message/route.ts
//
// The private father <-> son channel (migration 262). Story-admin only.
//
//   POST { body }        → send a message FROM the caller's space.
//   GET  [?since=ISO]    → the caller's inbox: messages NOT from their own space
//                          (i.e. the other person's), newest first, and marks
//                          them read.
//
// This is the ONE deliberate bridge between sanctuaries — everything else is
// walled off per space (migration 261). The caller's space is taken ONLY from
// the verified admin token, never the client.
//
// Concealed by design: no UI surfaces this yet. It's the plumbing for "a line
// Riddick can always reach his dad on."

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import {
  encryptDiaryField,
  readDiaryField,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';

export const dynamic = 'force-dynamic';

const MAX_BODY = 20000;

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isDiaryEncryptionConfigured()) {
    return NextResponse.json({ error: 'Encryption is not configured (STORY_DIARY_KEY).' }, { status: 500 });
  }

  let payload: { body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!body) return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
  if (body.length > MAX_BODY) return NextResponse.json({ error: 'Message is too long' }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_sanctuary_messages')
    .insert({
      from_space: space,
      body_enc: encryptDiaryField(body.slice(0, MAX_BODY)),
      cipher_version: 1,
    })
    .select('id, created_at')
    .single();
  if (error || !data) {
    console.error('[sanctuary-message] send error:', error?.message);
    return NextResponse.json({ error: 'Could not send' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id, created_at: data.created_at });
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  // Inbox = everything NOT sent by my own space (the other person's messages).
  const { data, error } = await supabase
    .from('story_sanctuary_messages')
    .select('id, from_space, body_enc, cipher_version, created_at, read_at')
    .neq('from_space', space)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    console.error('[sanctuary-message] inbox error:', error.message);
    return NextResponse.json({ error: 'Could not load' }, { status: 500 });
  }

  const messages = (data || []).map((r) => ({
    id: r.id as string,
    from_space: r.from_space as string,
    body: readDiaryField(r.body_enc, r.cipher_version),
    created_at: r.created_at as string,
    read_at: (r.read_at as string | null) || null,
  }));

  // Best-effort: mark the just-read, previously-unread ones as read.
  const unreadIds = (data || []).filter((r) => !r.read_at).map((r) => r.id as string);
  if (unreadIds.length) {
    void supabase
      .from('story_sanctuary_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .then(({ error: e }) => { if (e) console.warn('[sanctuary-message] mark-read skipped:', e.message); });
  }

  return NextResponse.json({ messages });
}
