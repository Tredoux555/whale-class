// app/api/story/board/route.ts
//
// The shared EMERGENCY BOARD — one common room for the whole inner circle
// (migration 263). Every sanctuary member posts to and reads the SAME room.
//
//   POST { body }        → post a message FROM the caller's space, then alert the
//                          other members by push (fire-and-forget).
//   GET                  → the whole room, oldest→newest, each labelled by sender
//                          and flagged isMine for the caller.
//
// Messages are KEPT — never ephemeral. The caller's space is taken ONLY from the
// verified admin token, never the client. Encryption uses the shared diary key,
// which is correct here: the room is intentionally common to all members.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import {
  encryptDiaryField,
  readDiaryField,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';
import { displayNameForSpace } from '@/lib/story/coach';
import { sendBoardPush } from '@/lib/story/push';

export const dynamic = 'force-dynamic';

const MAX_BODY = 10000;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!(await verifyAdminToken(auth))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const space = await getAdminSpace(auth);
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
    .from('story_board_messages')
    .insert({
      from_space: space,
      body_enc: encryptDiaryField(body.slice(0, MAX_BODY)),
      cipher_version: 1,
    })
    .select('id, created_at')
    .single();
  if (error || !data) {
    console.error('[board] post error:', error?.message);
    return NextResponse.json({ error: 'Could not post' }, { status: 500 });
  }

  // Alert the other members — never block the post on it.
  void sendBoardPush(space, displayNameForSpace(space), body).catch((e) =>
    console.warn('[board] push skipped:', e instanceof Error ? e.message : e)
  );

  return NextResponse.json({
    ok: true,
    message: {
      id: data.id as string,
      from_space: space,
      from_label: displayNameForSpace(space),
      body,
      created_at: data.created_at as string,
      isMine: true,
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!(await verifyAdminToken(auth))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const space = await getAdminSpace(auth);
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_board_messages')
    .select('id, from_space, body_enc, cipher_version, created_at')
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) {
    console.error('[board] load error:', error.message);
    return NextResponse.json({ error: 'Could not load' }, { status: 500 });
  }

  const messages = (data || []).map((r) => ({
    id: r.id as string,
    from_space: r.from_space as string,
    from_label: displayNameForSpace(r.from_space as string),
    body: readDiaryField(r.body_enc as string, r.cipher_version as number),
    created_at: r.created_at as string,
    isMine: (r.from_space as string) === space,
  }));

  return NextResponse.json({ messages });
}
