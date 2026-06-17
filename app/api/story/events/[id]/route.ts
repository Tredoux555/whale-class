// app/api/story/events/[id]/route.ts
//
// Planner event — update / delete. Story-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import {
  encryptDiaryField,
  encryptDiaryFieldOrNull,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';
import {
  coerceCiphertext,
  isMissingColumnError,
  E2E_CIPHER_VERSION,
} from '@/lib/sanctuary-e2e/content-store';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_TITLE = 300;
const MAX_NOTES = 2000;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  let body: {
    event_date?: string;
    start_time?: string | null;
    title?: string;
    notes?: string | null;
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
      .from('story_plan_events')
      .update({ ciphertext: ct, cipher_version: E2E_CIPHER_VERSION })
      .eq('id', id)
      .eq('space', space)
      .select('id')
      .maybeSingle();
    if (error && isMissingColumnError(error)) {
      return NextResponse.json(
        { error: 'End-to-end storage is not enabled on this server yet.' },
        { status: 503 },
      );
    }
    if (error) {
      console.error('[events] e2e update error:', error.message);
      return NextResponse.json({ error: 'Could not save event' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // ── legacy server-key update ──
  if (!isDiaryEncryptionConfigured()) {
    return NextResponse.json({ error: 'Encryption is not configured (STORY_DIARY_KEY).' }, { status: 500 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.event_date === 'string' && DATE_RE.test(body.event_date)) patch.event_date = body.event_date;
  if ('start_time' in body) {
    patch.start_time = typeof body.start_time === 'string' && TIME_RE.test(body.start_time) ? body.start_time : null;
  }
  if (typeof body.title === 'string') {
    const t = body.title.trim().slice(0, MAX_TITLE);
    if (!t) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    patch.title_enc = encryptDiaryField(t);
    patch.cipher_version = 1;
  }
  if ('notes' in body) {
    const n = typeof body.notes === 'string' ? body.notes.slice(0, MAX_NOTES) : null;
    patch.notes_enc = encryptDiaryFieldOrNull(n);
    patch.cipher_version = 1;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('story_plan_events')
    .update(patch)
    .eq('id', id)
    .eq('space', space)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[events] update error:', error.message);
    return NextResponse.json({ error: 'Could not save event' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase.from('story_plan_events').delete().eq('id', id).eq('space', space);
  if (error) {
    console.error('[events] delete error:', error.message);
    return NextResponse.json({ error: 'Could not delete event' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
