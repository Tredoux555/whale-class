// GET  /api/lens/visits/[id]/moments — the timeline, oldest first.
// POST /api/lens/visits/[id]/moments — save one moment.
//
// 🚨 ONE DOOR FOR ALL FOUR KINDS, AND WHY.
// A photo arrives as multipart/form-data (the image plus its fields); a voice
// note, a typed line and a chip arrive as JSON. Everything BELOW the payload is
// identical for all four — the same visit ownership, the same classroom
// re-check, the same clientId idempotency, the same chip vocabulary validation.
// A second endpoint would be a second copy of all of it, drifting apart one
// audit fix at a time, and the offline queue would have to decide which door to
// knock on, which is a decision it has no business making. So the Content-Type
// picks the parser and nothing else changes shape.
//
// 🚨 clientId IS THE OFFLINE CONTRACT. The device queue mints it before the
// moment leaves the phone and re-sends it on every retry. If the server commits
// and the response is lost, the retry hits uq_lens_moments_client_id, we catch
// the 23505, and hand back the row we already have. Without that, a bad-wifi
// classroom produces a timeline with every observation in it twice.
//
// 🚨 A CAPTURE IS NEVER REFUSED FOR A COSMETIC REASON. An unknown area, an
// unknown subject, a staff id from another school: those fields are DROPPED and
// the moment still saves, with `dropped` in the response naming what went. A
// tag is a label; the observation is the thing, and a silent classroom is not
// the place to argue with a validator. The one exception is the photo body
// itself — a photo whose bytes we cannot store is a failure and says so.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  LENS_BUCKET,
  lensDb,
  lensProxyUrl,
  listMoments,
  loadOwnedVisit,
  MOMENT_COLUMNS,
  isUniqueViolation,
  visitClassroomIds,
} from '@/lib/lens/db';
import {
  badRequest,
  lensError,
  notFound,
  requireObserver,
  text,
} from '@/lib/lens/route-helpers';
import {
  isMomentArea,
  isMomentKind,
  isMomentSubject,
  type LensMoment,
} from '@/lib/lens/types';

export const dynamic = 'force-dynamic';
// A photo on classroom wifi, not an AI call — but the same headroom the potato
// upload route settled on, for the same reason.
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};
/** Whatever the client sends becomes part of a storage path — keep it boring. */
const CLIENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/;

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  try {
    const supabase = lensDb();
    const visit = await loadOwnedVisit(supabase, session.observerId, id);
    if (!visit) return notFound('That visit isn’t yours.');
    const classroomId = request.nextUrl.searchParams.get('classroomId');
    const moments = await listMoments(supabase, visit.id, classroomId);
    return NextResponse.json({ moments: moments.map(withUrl) });
  } catch (error) {
    return lensError('moments:get', error);
  }
}

function withUrl(moment: LensMoment) {
  return { ...moment, media_url: lensProxyUrl(moment.media_path) };
}

/** The shared shape both parsers produce. */
interface MomentFields {
  kind: string;
  classroomId: string | null;
  ts: string | null;
  transcript: string | null;
  body: string | null;
  caption: string | null;
  area: string | null;
  subject: string | null;
  staffId: string | null;
  childAlias: string | null;
  rating: number | null;
  clientId: string | null;
}

function fieldsFrom(get: (key: string) => unknown): MomentFields {
  const ratingRaw = Number(get('rating'));
  return {
    kind: String(get('kind') ?? '').trim(),
    classroomId: text(get('classroomId'), 64),
    ts: text(get('ts'), 40),
    transcript: text(get('transcript'), 20000),
    body: text(get('body'), 20000),
    caption: text(get('caption'), 500),
    area: text(get('area'), 40),
    subject: text(get('subject'), 40),
    staffId: text(get('staffId'), 64),
    childAlias: text(get('childAlias'), 60),
    rating: Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 4 ? ratingRaw : null,
    clientId: text(get('clientId'), 80),
  };
}

/**
 * The device's clock, trusted within limits it cannot abuse. A moment captured
 * in a dead spot on Friday and synced on Monday must land on FRIDAY's timeline,
 * or the report's chronology — which IS the evidence — is wrong. A value that
 * is unparseable, in the future beyond a small skew allowance, or older than 30
 * days falls back to now and says so in `dropped`.
 */
function resolveTs(raw: string | null): { ts: string; note?: string } {
  const now = Date.now();
  if (!raw) return { ts: new Date(now).toISOString() };
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return { ts: new Date(now).toISOString(), note: 'unreadable timestamp' };
  if (parsed > now + 5 * 60 * 1000) {
    return { ts: new Date(now).toISOString(), note: 'timestamp was in the future' };
  }
  if (parsed < now - 30 * 24 * 60 * 60 * 1000) {
    return { ts: new Date(now).toISOString(), note: 'timestamp was over 30 days old' };
  }
  return { ts: new Date(parsed).toISOString() };
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const contentType = request.headers.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');

  let fields: MomentFields;
  let file: File | null = null;
  try {
    if (isMultipart) {
      const form = await request.formData();
      fields = fieldsFrom((key) => form.get(key));
      const maybe = form.get('file');
      file = maybe instanceof File && maybe.size > 0 ? maybe : null;
    } else {
      const json = (await request.json()) as Record<string, unknown>;
      if (!json || typeof json !== 'object') return badRequest('Invalid request');
      fields = fieldsFrom((key) => json[key]);
    }
  } catch {
    return badRequest('Invalid request');
  }

  if (!isMomentKind(fields.kind)) return badRequest('That isn’t a kind of moment I know.');
  if (fields.kind === 'photo' && !file) return badRequest('No photo was attached.');
  if (fields.kind !== 'photo' && !fields.transcript && !fields.body && fields.kind !== 'chip') {
    return badRequest('That moment has nothing in it.');
  }

  const dropped: string[] = [];

  try {
    const supabase = lensDb();
    const visit = await loadOwnedVisit(supabase, session.observerId, id);
    if (!visit) return notFound('That visit isn’t yours.');

    // ---- idempotency: has this exact capture already landed?
    const clientId =
      fields.clientId && CLIENT_ID_RE.test(fields.clientId) ? fields.clientId : null;
    if (fields.clientId && !clientId) dropped.push('unusable clientId');
    if (clientId) {
      const { data, error } = await supabase
        .from('lens_moments')
        .select(MOMENT_COLUMNS)
        .eq('visit_id', visit.id)
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return NextResponse.json({ ok: true, duplicate: true, moment: withUrl(data as unknown as LensMoment) });
      }
    }

    // ---- classroom: must be one of THIS visit's rooms, or nothing.
    let classroomId: string | null = null;
    if (fields.classroomId) {
      const roomIds = await visitClassroomIds(supabase, visit.id);
      if (roomIds.includes(fields.classroomId)) classroomId = fields.classroomId;
      else dropped.push('classroom (not part of this visit)');
    }

    // ---- staff: must be a person in one of this visit's rooms.
    let staffId: string | null = null;
    if (fields.staffId) {
      const roomIds = await visitClassroomIds(supabase, visit.id);
      if (roomIds.length > 0) {
        const { data, error } = await supabase
          .from('lens_staff')
          .select('id, classroom_id')
          .eq('id', fields.staffId)
          .maybeSingle();
        if (error) throw error;
        const row = data as { id: string; classroom_id: string } | null;
        if (row && roomIds.includes(row.classroom_id)) staffId = row.id;
      }
      if (!staffId) dropped.push('staff member (not in this visit)');
    }

    const area = isMomentArea(fields.area) ? fields.area : null;
    if (fields.area && !area) dropped.push('area');
    const subject = isMomentSubject(fields.subject) ? fields.subject : null;
    if (fields.subject && !subject) dropped.push('subject');

    const { ts, note } = resolveTs(fields.ts);
    if (note) dropped.push(note);

    // ---- the photo body, if there is one.
    let mediaPath: string | null = null;
    if (file) {
      if (file.size > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          { error: 'That photo is too big (12MB max).' },
          { status: 413 },
        );
      }
      const ext = EXT_BY_MIME[(file.type || '').toLowerCase()];
      if (!ext) {
        return NextResponse.json(
          { error: 'That file type isn’t a photo I can store.' },
          { status: 415 },
        );
      }
      // Path derived from the clientId when there is one, so a retry writes to
      // the SAME object rather than littering the bucket with orphans.
      const objectName = clientId ?? randomUUID();
      const day = ts.slice(0, 10);
      mediaPath = `${session.observerId}/${visit.id}/${day}/${objectName}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(LENS_BUCKET)
        .upload(mediaPath, file, { contentType: file.type, upsert: true });
      if (uploadError) {
        console.error('[lens/moments] storage upload failed:', uploadError);
        return NextResponse.json(
          { error: 'The photo couldn’t be saved. Try again.' },
          { status: 502 },
        );
      }
    }

    const insert = {
      visit_id: visit.id,
      classroom_id: classroomId,
      ts,
      kind: fields.kind,
      media_path: mediaPath,
      transcript: fields.transcript,
      body: fields.body,
      caption: fields.caption,
      area,
      subject,
      staff_id: staffId,
      child_alias: fields.childAlias,
      rating: fields.rating,
      client_id: clientId,
    };

    const { data, error } = await supabase
      .from('lens_moments')
      .insert(insert)
      .select(MOMENT_COLUMNS)
      .single();

    if (error) {
      // The race the clientId check above cannot close: two requests both pass
      // their lookup before either has written. The index decides; the loser
      // reads back the winner's row rather than reporting a failure for a
      // moment that is safely stored.
      if (isUniqueViolation(error) && clientId) {
        const { data: winner } = await supabase
          .from('lens_moments')
          .select(MOMENT_COLUMNS)
          .eq('visit_id', visit.id)
          .eq('client_id', clientId)
          .maybeSingle();
        if (winner) {
          return NextResponse.json({
            ok: true,
            duplicate: true,
            moment: withUrl(winner as unknown as LensMoment),
          });
        }
      }
      // The row failed but the object landed. Leaving it would be a silent
      // orphan in a private bucket nobody audits.
      if (mediaPath) {
        await supabase.storage.from(LENS_BUCKET).remove([mediaPath]).catch(() => {});
      }
      throw error;
    }

    return NextResponse.json(
      { ok: true, moment: withUrl(data as unknown as LensMoment), dropped },
      { status: 201 },
    );
  } catch (error) {
    return lensError('moments:post', error);
  }
}
