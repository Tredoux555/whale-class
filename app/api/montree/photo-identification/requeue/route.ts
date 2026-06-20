// app/api/montree/photo-identification/requeue/route.ts
//
// POST /api/montree/photo-identification/requeue  { media_id }
//
// Resets a photo's identification so it can be re-run through the CURRENT
// (fixed) two-pass pipeline via /process. This is the recovery path for photos
// an older prompt mis-filed as "Other"/untagged. It runs server-side
// (Railway → Supabase), so it works even when a teacher's own network can't
// write to Supabase directly. Only resets untagged photos — a photo already
// linked to a curriculum work must be changed with Wrong/Correct, never blown
// away here.
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const mediaId = typeof body?.media_id === 'string' ? body.media_id : null;
    if (!mediaId) {
      return NextResponse.json({ error: 'media_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Cross-pollination guard: the photo must belong to this school (and, for a
    // teacher/homeschool session, this classroom).
    const { data: media, error: fetchErr } = await supabase
      .from('montree_media')
      .select('id, school_id, classroom_id, work_id')
      .eq('id', mediaId)
      .maybeSingle();
    if (fetchErr || !media) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }
    if (media.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (
      (auth.role === 'teacher' || auth.role === 'homeschool_parent') &&
      auth.classroomId &&
      media.classroom_id !== auth.classroomId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Safety: never wipe a photo that's already tagged to a real work. Those are
    // corrected via the Wrong/Correct flow, not re-identified from scratch.
    if (media.work_id) {
      return NextResponse.json(
        { error: 'This photo is already tagged to a work — use Wrong/Correct instead.' },
        { status: 409 },
      );
    }

    const { error: resetErr } = await supabase
      .from('montree_media')
      .update({
        identification_status: null,
        identification_confidence: null,
        identification_attempted_at: null,
        sonnet_draft: null,
        teacher_confirmed: false,
      })
      .eq('id', mediaId);

    if (resetErr) {
      console.error('[Requeue] reset failed:', resetErr);
      return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
    }

    // The caller (audit UI) follows this with a POST to /process, which re-runs
    // the fixed two-pass pipeline and writes the fresh draft/match.
    return NextResponse.json({ success: true, media_id: mediaId });
  } catch (err) {
    console.error('[Requeue] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
