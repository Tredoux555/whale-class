// app/api/story/admin/embed-coach-log/route.ts
//
// Diary Recall BACKFILL — embeds historic story_coach_log rows so recall_history
// can find them semantically. Each call handles up to 200 un-embedded rows
// (embedding IS NULL AND question_enc LIKE 'gcm:%'); re-invoke until it reports
// processed=0 (any leftover `remaining` are rows that can't be embedded — empty
// or undecryptable turns).
//
// Runs ON the server so OPENAI_API_KEY never leaves it. Decrypts each row with
// the server diary key, embeds "Q: …\nA: …" (text-embedding-3-small, 1536-dim),
// writes the embedding column. E2e / native rows never wrote a server-readable
// question_enc, so the 'gcm:%' filter structurally skips them.
//
// Auth (two paths):
//   1. Story-admin Bearer token → backfills ONLY that caller's own space.
//   2. Header x-admin-secret == process.env.ADMIN_SECRET → backfills ALL spaces.
//
//   curl -X POST https://montree.xyz/api/story/admin/embed-coach-log \
//     -H "x-admin-secret: $ADMIN_SECRET"
//   (repeat until {"processed":0})
//
// Idempotent. Fails gracefully (400) when migration 295 hasn't run.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getAdminSpace } from '@/lib/story-db';
import { readDiaryField, DIARY_DECRYPT_FAILURE_SENTINEL } from '@/lib/story/diary-crypto';
import { embedText } from '@/lib/story/coach/log-embeddings';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH = 200;
const CONCURRENCY = 5;

type LogRow = {
  id: string;
  space: string;
  question_enc: string | null;
  answer_enc: string | null;
  cipher_version: number | null;
};

function isSchemaMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === '42703' || // column does not exist
    e.code === '42P01' || // table does not exist
    e.code === '42883' || // function does not exist
    (e.message ?? '').includes('does not exist')
  );
}

export async function POST(request: NextRequest) {
  // Auth: all-spaces secret OR a story-admin's own space.
  const adminSecret = request.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_SECRET;
  const allSpaces = !!adminSecret && !!expected && adminSecret === expected;

  let scopedSpace: string | null = null;
  if (!allSpaces) {
    scopedSpace = await getAdminSpace(request.headers.get('authorization'));
    if (!scopedSpace) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured on this server' }, { status: 500 });
  }

  const supabase = getSupabase();

  // Fetch a batch of un-embedded, server-encrypted rows (newest first — the most
  // likely to be recalled). Scoped to the caller's space unless the all-spaces
  // secret was presented.
  let sel = supabase
    .from('story_coach_log')
    .select('id, space, question_enc, answer_enc, cipher_version')
    .is('embedding', null)
    .like('question_enc', 'gcm:%')
    .order('created_at', { ascending: false })
    .limit(BATCH);
  if (scopedSpace) sel = sel.eq('space', scopedSpace);

  const { data: rows, error: selErr } = await sel;
  if (selErr) {
    if (isSchemaMissing(selErr)) {
      return NextResponse.json(
        { error: 'embedding column missing — run migration 295 first', detail: selErr.message, migration: '295_coach_log_embedding.sql' },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  const batch = (rows ?? []) as LogRow[];
  if (batch.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, errors: [] });
  }

  let processed = 0;
  const errors: string[] = [];

  // Decrypt + embed (concurrency-capped), then write each embedding.
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const slice = batch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map(async (r) => {
        try {
          const q0 = r.question_enc ? readDiaryField(r.question_enc, r.cipher_version) : '';
          const a0 = r.answer_enc ? readDiaryField(r.answer_enc, r.cipher_version) : '';
          const q = q0 === DIARY_DECRYPT_FAILURE_SENTINEL ? '' : q0;
          const a = a0 === DIARY_DECRYPT_FAILURE_SENTINEL ? '' : a0;
          if (!q.trim() && !a.trim()) {
            return { id: r.id, space: r.space, vector: null as number[] | null, err: 'empty' };
          }
          const vector = await embedText(`Q: ${q}\nA: ${a}`);
          return { id: r.id, space: r.space, vector, err: vector ? null : 'embed returned null' };
        } catch (e) {
          return { id: r.id, space: r.space, vector: null as number[] | null, err: e instanceof Error ? e.message : 'unknown' };
        }
      }),
    );
    for (const res of results) {
      if (!res.vector) {
        if (res.err && res.err !== 'empty' && errors.length < 5) errors.push(`${res.id}: ${res.err}`);
        continue;
      }
      const { error: updErr } = await supabase
        .from('story_coach_log')
        .update({ embedding: res.vector as unknown as string })
        .eq('id', res.id)
        .eq('space', res.space);
      if (updErr) {
        if (errors.length < 5) errors.push(`${res.id}: ${updErr.message}`);
        continue;
      }
      processed++;
    }
  }

  // Count what still needs embedding (same predicate + scope).
  let cnt = supabase
    .from('story_coach_log')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)
    .like('question_enc', 'gcm:%');
  if (scopedSpace) cnt = cnt.eq('space', scopedSpace);
  const { count: remaining } = await cnt;

  return NextResponse.json({ processed, remaining: remaining ?? null, errors });
}
