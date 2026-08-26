// PATCH  /api/lens/moments/[id] — fix a transcript, add a caption, retag.
// DELETE /api/lens/moments/[id] — HARD delete, and the photo with it.
//
// 🚨 WHY THIS DELETE IS HARD WHERE SCHOOLS AND STAFF ARE SOFT.
// A school row that vanishes takes a year of reports' context with it. A moment
// that vanishes takes one observation she has decided is wrong or does not
// belong in a client's file — and a soft-deleted moment would still sit in the
// bucket and still be reachable by any code path that forgot the filter. When
// an observer deletes an observation of somebody's classroom, it should be gone.
//
// A moment cited by a finalised report is the one exception: deleting it would
// leave a citation pointing at nothing, so it is refused with the report named.

import { NextRequest, NextResponse } from 'next/server';
import {
  LENS_BUCKET,
  lensDb,
  lensProxyUrl,
  listReportsForVisit,
  loadOwnedMoment,
  MOMENT_COLUMNS,
} from '@/lib/lens/db';
import {
  badRequest,
  lensError,
  notFound,
  readJson,
  requireObserver,
  text,
} from '@/lib/lens/route-helpers';
import { readStoredContent } from '@/lib/lens/reports/schema';
import { isMomentArea, isMomentSubject, type LensMoment } from '@/lib/lens/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  try {
    const supabase = lensDb();
    const owned = await loadOwnedMoment(supabase, session.observerId, id);
    if (!owned) return notFound('I can’t find that moment.');

    const updates: Record<string, unknown> = {};
    if ('transcript' in body) updates.transcript = text(body.transcript, 20000);
    if ('body' in body) updates.body = text(body.body, 20000);
    if ('caption' in body) updates.caption = text(body.caption, 500);
    if ('child_alias' in body) updates.child_alias = text(body.child_alias, 60);
    if ('area' in body) {
      updates.area = isMomentArea(body.area) ? body.area : null;
    }
    if ('subject' in body) {
      updates.subject = isMomentSubject(body.subject) ? body.subject : null;
    }
    if ('rating' in body) {
      const r = Number(body.rating);
      updates.rating = Number.isInteger(r) && r >= 1 && r <= 4 ? r : null;
    }
    if ('classroom_id' in body) {
      // Re-proved against this visit's rooms, same rule as on create.
      const wanted = text(body.classroom_id, 64);
      if (!wanted) updates.classroom_id = null;
      else {
        const { data, error } = await supabase
          .from('lens_visit_classrooms')
          .select('classroom_id')
          .eq('visit_id', owned.visit.id)
          .eq('classroom_id', wanted)
          .maybeSingle();
        if (error) throw error;
        if (!data) return badRequest('That classroom isn’t part of this visit.');
        updates.classroom_id = wanted;
      }
    }
    if ('staff_id' in body) {
      const wanted = text(body.staff_id, 64);
      if (!wanted) updates.staff_id = null;
      else {
        const { data, error } = await supabase
          .from('lens_staff')
          .select('id, classroom_id')
          .eq('id', wanted)
          .maybeSingle();
        if (error) throw error;
        const row = data as { id: string; classroom_id: string } | null;
        if (!row) return badRequest('I can’t find that person.');
        const { data: junction } = await supabase
          .from('lens_visit_classrooms')
          .select('classroom_id')
          .eq('visit_id', owned.visit.id)
          .eq('classroom_id', row.classroom_id)
          .maybeSingle();
        if (!junction) return badRequest('That person isn’t in a room on this visit.');
        updates.staff_id = wanted;
      }
    }

    if (Object.keys(updates).length === 0) return badRequest('Nothing to update.');

    const { data, error } = await supabase
      .from('lens_moments')
      .update(updates)
      .eq('id', owned.moment.id)
      .select(MOMENT_COLUMNS)
      .single();
    if (error) throw error;
    const moment = data as unknown as LensMoment;
    return NextResponse.json({
      ok: true,
      moment: { ...moment, media_url: lensProxyUrl(moment.media_path) },
    });
  } catch (error) {
    return lensError('moment:patch', error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    const supabase = lensDb();
    const owned = await loadOwnedMoment(supabase, session.observerId, id);
    if (!owned) return notFound('I can’t find that moment.');

    // Is anything final citing it?
    const reports = await listReportsForVisit(supabase, owned.visit.id);
    for (const report of reports) {
      if (report.status !== 'final') continue;
      const content = readStoredContent(report);
      const cited =
        content.sections.some((s) => s.evidence.includes(owned.moment.id)) ||
        (['commendations', 'recommendations', 'required_actions', 'next_steps'] as const).some(
          (k) => content[k].some((i) => i.evidence.includes(owned.moment.id)),
        );
      if (cited) {
        return NextResponse.json(
          {
            error:
              'A finalised report cites this moment. Reopen that report and remove the citation first.',
            report_id: report.id,
          },
          { status: 409 },
        );
      }
    }

    // Row first, then bytes. A crash between the two costs an orphaned object in
    // a private bucket, which is recoverable; the other order would leave a row
    // whose photo 404s, which reads to her as data loss.
    const { error } = await supabase.from('lens_moments').delete().eq('id', owned.moment.id);
    if (error) throw error;
    if (owned.moment.media_path) {
      const { error: removeError } = await supabase.storage
        .from(LENS_BUCKET)
        .remove([owned.moment.media_path]);
      if (removeError) console.error('[lens/moment:delete] orphaned object:', removeError);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return lensError('moment:delete', error);
  }
}
