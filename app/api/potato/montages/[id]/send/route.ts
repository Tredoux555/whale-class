// POST /api/potato/montages/[id]/send — the teacher publishes a film.
//
// 🚨 THIS IS THE ONLY DOOR BETWEEN A RENDERED FILM AND A PARENT.
// v1.3's product law, after a film reached families unseen: making a film and
// sending it are two separate decisions. The render is private; this endpoint
// is the deliberate second tap, and it happens only after the teacher has
// watched the thing in the preview sheet.
//
// Rules:
//   • teacher only, and only for a film belonging to HER class
//   • only a film that has actually rendered (status='done' with a file)
//   • idempotent — sending twice is a no-op that reports the original time,
//     because a double tap on a slow connection must not look like an error
//   • never un-sends; there is no retract in v1.3 (deliberate — see notes)

import { NextRequest, NextResponse } from 'next/server';
import { UUID_RE } from '@/lib/potato/auth';
import {
  resolvePotatoTeacher,
  withPotatoCors,
  potatoOptionsHandler,
} from '@/lib/potato/app-auth';
import { potatoDb, loadClass, potatoCapabilities, isSetupPending } from '@/lib/potato/db';

export const dynamic = 'force-dynamic';

/** Standalone-app preflight. A no-op for the website, which never preflights. */
export const OPTIONS = potatoOptionsHandler;

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // withPotatoCors is a no-op unless the caller is an allow-listed app origin,
  // so the website's response is byte-identical to before.
  return withPotatoCors(await handlePOST(request, ctx), request);
}

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolvePotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid film id' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
    if (!caps.send) {
      // No `sent_at` column yet: under the v1.2 fallback every rendered film is
      // already visible, so there is nothing to publish. Say so plainly rather
      // than pretending to have sent something.
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }

    // Deactivating a class is the only revocation lever for a 10-year teacher
    // cookie — re-check it here, as every other mutating route does.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // 🚨 Ownership: the class comes from the cookie, never the request.
    const { data: job, error: findError } = await supabase
      .from('tp_montage_jobs')
      .select('id, status, storage_path, sent_at, kind, child_id, week_start')
      .eq('id', id)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (findError) throw findError;
    if (!job) return NextResponse.json({ error: 'Film not found' }, { status: 404 });

    if (job.sent_at) {
      // Idempotent: already published. Report the original moment.
      return NextResponse.json({
        ok: true,
        alreadySent: true,
        film: { id: job.id, sentAt: job.sent_at },
      });
    }

    if (job.status !== 'done' || !job.storage_path) {
      return NextResponse.json(
        { error: 'That film isn’t finished yet.', status: job.status },
        { status: 409 },
      );
    }

    const sentAt = new Date().toISOString();
    // The `is null` guard makes the write itself the race-winner: two taps
    // arriving together cannot produce two different sent times.
    const { data: updated, error: updateError } = await supabase
      .from('tp_montage_jobs')
      .update({ sent_at: sentAt })
      .eq('id', job.id)
      .eq('class_id', session.classId)
      .is('sent_at', null)
      .select('id, sent_at')
      .maybeSingle();
    if (updateError) throw updateError;

    if (!updated) {
      // The other tap won. Read back what it wrote — still a success.
      const { data: winner } = await supabase
        .from('tp_montage_jobs')
        .select('id, sent_at')
        .eq('id', job.id)
        .eq('class_id', session.classId)
        .maybeSingle();
      return NextResponse.json({
        ok: true,
        alreadySent: true,
        film: { id: job.id, sentAt: winner?.sent_at ?? sentAt },
      });
    }

    return NextResponse.json({
      ok: true,
      alreadySent: false,
      film: {
        id: updated.id,
        sentAt: updated.sent_at,
        kind: job.kind ?? 'child',
        childId: job.child_id,
        weekStart: job.week_start,
      },
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/montages/send] error:', error);
    return NextResponse.json({ error: 'Could not send that film.' }, { status: 500 });
  }
}
