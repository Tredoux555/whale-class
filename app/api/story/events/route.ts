// app/api/story/events/route.ts
//
// Planner events — list (by date range) + create. Story-admin only.
// title/notes encrypted at rest; date + time plaintext for calendar rendering.

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_TITLE = 300;
const MAX_NOTES = 2000;

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const supabase = getSupabase();
  const COLS = 'id, event_date, start_time, title_enc, notes_enc, cipher_version';
  const buildQuery = (cols: string) => {
    let q = supabase
      .from('story_plan_events')
      .select(cols)
      .eq('space', space)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
      .limit(2000);
    if (from && DATE_RE.test(from)) q = q.gte('event_date', from);
    if (to && DATE_RE.test(to)) q = q.lte('event_date', to);
    return q;
  };

  // Wide select adds the e2e `ciphertext` column; fall back if migration 265
  // hasn't been applied yet (column absent → 42703).
  let { data, error } = await buildQuery(COLS + ', ciphertext');
  if (error && isMissingColumnError(error)) ({ data, error } = await buildQuery(COLS));

  if (error) {
    console.error('[events] list error:', error.message);
    return NextResponse.json({ error: 'Could not load events' }, { status: 500 });
  }

  const events = (data || []).map((r) => {
    // e2e row → return the opaque blob VERBATIM; never decrypt.
    if (rowIsE2e(r)) {
      return { id: r.id as string, ciphertext: r.ciphertext as string };
    }
    return {
      id: r.id as string,
      event_date: r.event_date as string,
      start_time: (r.start_time as string | null) || null,
      title: readDiaryField(r.title_enc, r.cipher_version),
      notes: readDiaryField(r.notes_enc, r.cipher_version) || null,
    };
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: {
    event_date?: string;
    start_time?: string;
    title?: string;
    notes?: string;
    ciphertext?: string;
  };
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
      .from('story_plan_events')
      .insert({ space, ciphertext: ct, cipher_version: E2E_CIPHER_VERSION })
      .select('id')
      .single();
    if (error && isMissingColumnError(error)) {
      return NextResponse.json(
        { error: 'End-to-end storage is not enabled on this server yet.' },
        { status: 503 },
      );
    }
    if (error || !data) {
      console.error('[events] e2e create error:', error?.message);
      return NextResponse.json({ error: 'Could not save event' }, { status: 500 });
    }
    return NextResponse.json({ event: { id: data.id as string, ciphertext: ct } });
  }

  // ── legacy server-key write ──
  if (!isDiaryEncryptionConfigured()) {
    return NextResponse.json({ error: 'Encryption is not configured (STORY_DIARY_KEY).' }, { status: 500 });
  }

  const eventDate = typeof body.event_date === 'string' && DATE_RE.test(body.event_date) ? body.event_date : '';
  if (!eventDate) return NextResponse.json({ error: 'event_date (YYYY-MM-DD) required' }, { status: 400 });
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : '';
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  const startTime = typeof body.start_time === 'string' && TIME_RE.test(body.start_time) ? body.start_time : null;
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, MAX_NOTES) : null;

  const { data, error } = await supabase
    .from('story_plan_events')
    .insert({
      space,
      event_date: eventDate,
      start_time: startTime,
      title_enc: encryptDiaryField(title),
      notes_enc: encryptDiaryFieldOrNull(notes),
      cipher_version: 1,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[events] create error:', error?.message);
    return NextResponse.json({ error: 'Could not save event' }, { status: 500 });
  }
  return NextResponse.json({
    event: { id: data.id as string, event_date: eventDate, start_time: startTime, title, notes },
  });
}
