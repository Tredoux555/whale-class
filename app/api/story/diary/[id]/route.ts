// app/api/story/diary/[id]/route.ts
//
// Personal platform — single diary entry: read / update / delete.
// Story-admin only. Encrypted at rest; decrypted server-side on read.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import {
  encryptDiaryField,
  encryptDiaryFieldOrNull,
  readDiaryField,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';
import {
  coerceCiphertext,
  rowIsE2e,
  isMissingColumnError,
  E2E_CIPHER_VERSION,
} from '@/lib/sanctuary-e2e/content-store';

export const dynamic = 'force-dynamic';

const MAX_BODY = 100_000;
const MAX_TITLE = 300;
const MAX_MOOD = 40;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  const supabase = getSupabase();
  const COLS = 'id, entry_date, mood, title_enc, body_enc, cipher_version, created_at, updated_at';
  const getQuery = (cols: string) =>
    supabase.from('story_diary_entries').select(cols).eq('id', id).eq('space', space).maybeSingle();
  let { data, error } = await getQuery(COLS + ', ciphertext');
  if (error && isMissingColumnError(error)) ({ data, error } = await getQuery(COLS));

  if (error) {
    console.error('[diary] get error:', error.message);
    return NextResponse.json({ error: 'Could not load entry' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // e2e row → return the opaque blob VERBATIM; never decrypt.
  if (rowIsE2e(data)) {
    return NextResponse.json({
      entry: {
        id: data.id as string,
        ciphertext: data.ciphertext as string,
        created_at: data.created_at as string,
        updated_at: data.updated_at as string,
      },
    });
  }

  return NextResponse.json({
    entry: {
      id: data.id as string,
      entry_date: data.entry_date as string,
      mood: (data.mood as string | null) || null,
      title: readDiaryField(data.title_enc, data.cipher_version) || null,
      body: readDiaryField(data.body_enc, data.cipher_version),
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  let body: {
    entry_date?: string;
    mood?: string | null;
    title?: string | null;
    body?: string;
    ciphertext?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabase();

  // ── e2e update: replace the opaque blob VERBATIM (no server key). ──
  const ct = coerceCiphertext(body.ciphertext);
  if (ct) {
    const { data, error } = await supabase
      .from('story_diary_entries')
      .update({ ciphertext: ct, cipher_version: E2E_CIPHER_VERSION })
      .eq('id', id)
      .eq('space', space)
      .select('id, updated_at')
      .maybeSingle();
    if (error && isMissingColumnError(error)) {
      return NextResponse.json(
        { error: 'End-to-end storage is not enabled on this server yet.' },
        { status: 503 },
      );
    }
    if (error) {
      console.error('[diary] e2e update error:', error.message);
      return NextResponse.json({ error: 'Could not save entry' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      entry: { id: data.id as string, ciphertext: ct, updated_at: data.updated_at as string },
    });
  }

  // ── legacy server-key update ──
  if (!isDiaryEncryptionConfigured()) {
    return NextResponse.json(
      { error: 'Encryption is not configured (STORY_DIARY_KEY).' },
      { status: 500 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.body === 'string') {
    if (!body.body.trim()) {
      return NextResponse.json({ error: 'Entry body cannot be empty' }, { status: 400 });
    }
    if (body.body.length > MAX_BODY) {
      return NextResponse.json({ error: 'Entry is too long' }, { status: 400 });
    }
    patch.body_enc = encryptDiaryField(body.body);
    patch.cipher_version = 1;
  }
  // Title: explicit null OR string both update it (null/'' → cleared).
  if ('title' in body) {
    const t = typeof body.title === 'string' ? body.title.slice(0, MAX_TITLE) : null;
    patch.title_enc = encryptDiaryFieldOrNull(t);
    patch.cipher_version = 1;
  }
  // Mood: explicit null clears it; string sets it; omission leaves unchanged.
  if ('mood' in body) {
    patch.mood = typeof body.mood === 'string' ? (body.mood.trim().slice(0, MAX_MOOD) || null) : null;
  }
  if (typeof body.entry_date === 'string' && DATE_RE.test(body.entry_date)) {
    patch.entry_date = body.entry_date;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('story_diary_entries')
    .update(patch)
    .eq('id', id)
    .eq('space', space)
    .select('id, entry_date, mood, updated_at')
    .maybeSingle();

  if (error) {
    console.error('[diary] update error:', error.message);
    return NextResponse.json({ error: 'Could not save entry' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    entry: {
      id: data.id as string,
      entry_date: data.entry_date as string,
      mood: (data.mood as string | null) || null,
      updated_at: data.updated_at as string,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase.from('story_diary_entries').delete().eq('id', id).eq('space', space);
  if (error) {
    console.error('[diary] delete error:', error.message);
    return NextResponse.json({ error: 'Could not delete entry' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
