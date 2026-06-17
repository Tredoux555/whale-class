// app/api/story/diary/route.ts
//
// Personal platform — Diary list + create. Story-admin only.
// Bodies are AES-256-GCM encrypted at rest (lib/story/diary-crypto.ts) and
// decrypted server-side here before sending to the (already authenticated)
// admin client. The list returns a short body EXCERPT only; the full body is
// served by GET /api/story/diary/[id].

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
const EXCERPT_CHARS = 180;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const COLS = 'id, entry_date, mood, title_enc, body_enc, cipher_version, created_at, updated_at';
  const listQuery = (cols: string) =>
    supabase
      .from('story_diary_entries')
      .select(cols)
      .eq('space', space)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000);

  // Wide select adds the e2e `ciphertext` column; fall back to the legacy column
  // set if migration 265 hasn't been applied yet (column absent → 42703).
  let { data, error } = await listQuery(COLS + ', ciphertext');
  if (error && isMissingColumnError(error)) ({ data, error } = await listQuery(COLS));

  if (error) {
    console.error('[diary] list error:', error.message);
    return NextResponse.json({ error: 'Could not load entries' }, { status: 500 });
  }

  const entries = (data || []).map((r) => {
    // e2e row → return the opaque blob VERBATIM; never decrypt.
    if (rowIsE2e(r)) {
      return {
        id: r.id as string,
        ciphertext: r.ciphertext as string,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
      };
    }
    const body = readDiaryField(r.body_enc, r.cipher_version);
    return {
      id: r.id as string,
      entry_date: r.entry_date as string,
      mood: (r.mood as string | null) || null,
      title: readDiaryField(r.title_enc, r.cipher_version) || null,
      excerpt: body.length > EXCERPT_CHARS ? body.slice(0, EXCERPT_CHARS).trimEnd() + '…' : body,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
    };
  });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { entry_date?: string; mood?: string; title?: string; body?: string; ciphertext?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabase();

  // ── e2e write: store the client's opaque blob VERBATIM (no server key). ──
  const ct = coerceCiphertext(body.ciphertext);
  if (ct) {
    const { data, error } = await supabase
      .from('story_diary_entries')
      .insert({ space, ciphertext: ct, cipher_version: E2E_CIPHER_VERSION })
      .select('id, created_at, updated_at')
      .single();
    if (error && isMissingColumnError(error)) {
      return NextResponse.json(
        { error: 'End-to-end storage is not enabled on this server yet.' },
        { status: 503 },
      );
    }
    if (error || !data) {
      console.error('[diary] e2e create error:', error?.message);
      return NextResponse.json({ error: 'Could not save entry' }, { status: 500 });
    }
    return NextResponse.json({
      entry: {
        id: data.id as string,
        ciphertext: ct,
        created_at: data.created_at as string,
        updated_at: data.updated_at as string,
      },
    });
  }

  // ── legacy server-key write ──
  if (!isDiaryEncryptionConfigured()) {
    console.error('[diary] STORY_DIARY_KEY missing/invalid — refusing to write');
    return NextResponse.json(
      { error: 'Encryption is not configured (STORY_DIARY_KEY).' },
      { status: 500 },
    );
  }

  const text = typeof body.body === 'string' ? body.body : '';
  if (!text.trim()) {
    return NextResponse.json({ error: 'Entry body is required' }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: 'Entry is too long' }, { status: 400 });
  }
  const entryDate = typeof body.entry_date === 'string' && DATE_RE.test(body.entry_date)
    ? body.entry_date
    : todayISO();
  const mood = typeof body.mood === 'string' ? body.mood.trim().slice(0, MAX_MOOD) || null : null;
  const title = typeof body.title === 'string' ? body.title.slice(0, MAX_TITLE) : null;

  const { data, error } = await supabase
    .from('story_diary_entries')
    .insert({
      space,
      entry_date: entryDate,
      mood,
      title_enc: encryptDiaryFieldOrNull(title),
      body_enc: encryptDiaryField(text),
      cipher_version: 1,
    })
    .select('id, entry_date, mood, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('[diary] create error:', error?.message);
    return NextResponse.json({ error: 'Could not save entry' }, { status: 500 });
  }

  return NextResponse.json({
    entry: {
      id: data.id as string,
      entry_date: data.entry_date as string,
      mood: (data.mood as string | null) || null,
      title,
      body: text,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
    },
  });
}
