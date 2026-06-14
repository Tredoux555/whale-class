// app/api/story/events/route.ts
//
// Planner events — list (by date range) + create. Story-admin only.
// title/notes encrypted at rest; date + time plaintext for calendar rendering.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';
import {
  encryptDiaryField,
  encryptDiaryFieldOrNull,
  readDiaryField,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_TITLE = 300;
const MAX_NOTES = 2000;

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const supabase = getSupabase();
  let q = supabase
    .from('story_plan_events')
    .select('id, event_date, start_time, title_enc, notes_enc, cipher_version')
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true })
    .limit(2000);
  if (from && DATE_RE.test(from)) q = q.gte('event_date', from);
  if (to && DATE_RE.test(to)) q = q.lte('event_date', to);

  const { data, error } = await q;
  if (error) {
    console.error('[events] list error:', error.message);
    return NextResponse.json({ error: 'Could not load events' }, { status: 500 });
  }

  const events = (data || []).map((r) => ({
    id: r.id as string,
    event_date: r.event_date as string,
    start_time: (r.start_time as string | null) || null,
    title: readDiaryField(r.title_enc, r.cipher_version),
    notes: readDiaryField(r.notes_enc, r.cipher_version) || null,
  }));
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isDiaryEncryptionConfigured()) {
    return NextResponse.json({ error: 'Encryption is not configured (STORY_DIARY_KEY).' }, { status: 500 });
  }

  let body: { event_date?: string; start_time?: string; title?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventDate = typeof body.event_date === 'string' && DATE_RE.test(body.event_date) ? body.event_date : '';
  if (!eventDate) return NextResponse.json({ error: 'event_date (YYYY-MM-DD) required' }, { status: 400 });
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : '';
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  const startTime = typeof body.start_time === 'string' && TIME_RE.test(body.start_time) ? body.start_time : null;
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, MAX_NOTES) : null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_plan_events')
    .insert({
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
