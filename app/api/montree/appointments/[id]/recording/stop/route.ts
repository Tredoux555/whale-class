// app/api/montree/appointments/[id]/recording/stop/route.ts
//
// Stop a Cloud Recording. Fires the full post-pipeline:
//   1. Tell Agora to stop the recording → Agora finalises + uploads to
//      Supabase Storage and returns the file list.
//   2. Update the recording row → status='processing', store file path.
//   3. Fire-and-forget the transcribe + summarize pipeline.
//   4. Return the recording row to the caller.
//
// The transcribe + summarize pipeline is fire-and-forget because:
//   - Whisper on a 30-min recording can take ~30s
//   - Sonnet summary takes another ~5-10s
//   - Total wall time would otherwise blow past serverless timeouts
//   - The client doesn't need the summary right now — the user has just
//     finished the meeting. The next staff member will see the summary
//     before the NEXT meeting.
//
// Pipeline writes back to the recording row when each stage completes.
// Client can poll GET /recording for status updates.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { stopRecording } from '@/lib/montree/appointments/agora/recording';
import { runTranscribeAndSummarizePipeline } from '@/lib/montree/appointments/transcription/pipeline';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();

  // Find the active recording for this appointment. Could be multiple
  // historically; we want the most recent in 'recording' state.
  const { data: rec } = await supabase
    .from('montree_appointment_recordings')
    .select('id, appointment_id, school_id, agora_channel_name, agora_resource_id, agora_sid, agora_uid, recording_status')
    .eq('appointment_id', id)
    .eq('school_id', auth.schoolId)
    .eq('recording_status', 'recording')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rec) {
    return NextResponse.json({ error: 'No active recording found.' }, { status: 404 });
  }

  if (
    !rec.agora_channel_name ||
    !rec.agora_resource_id ||
    !rec.agora_sid ||
    !rec.agora_uid
  ) {
    return NextResponse.json(
      { error: 'Recording row is missing Agora identifiers.' },
      { status: 500 }
    );
  }

  // Stop on Agora's side.
  const stopped = await stopRecording({
    channel: rec.agora_channel_name,
    recordingBotUid: parseInt(rec.agora_uid, 10),
    resourceId: rec.agora_resource_id,
    sid: rec.agora_sid,
  });

  if (!stopped.ok) {
    // Mark failed but keep the row so ops can debug.
    await supabase
      .from('montree_appointment_recordings')
      .update({
        recording_status: 'failed',
        failure_reason: stopped.error?.slice(0, 500) || 'agora_stop_failed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', rec.id);
    return NextResponse.json(
      { error: `Agora stop failed: ${stopped.error || 'unknown'}` },
      { status: 502 }
    );
  }

  // Move to processing. Pipeline IIFE will flip to ready/failed.
  const firstFile = stopped.data?.files?.[0];
  const storagePath = firstFile ? firstFile.fileName : null;

  const { data: updated, error: updateErr } = await supabase
    .from('montree_appointment_recordings')
    .update({
      recording_status: 'processing',
      recording_storage_path: storagePath,
      ended_at: new Date().toISOString(),
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', rec.id)
    .select('id, appointment_id, school_id, recording_storage_path, recording_status, ended_at')
    .single();

  if (updateErr) {
    console.error('[recording/stop] update failed:', updateErr);
    return NextResponse.json(
      { error: 'DB update failed but Agora stopped.' },
      { status: 500 }
    );
  }

  // Fire-and-forget the rest of the pipeline. The response returns
  // immediately so the user sees "Recording saved" without waiting for
  // ~40s of Whisper + Sonnet.
  void (async () => {
    try {
      await runTranscribeAndSummarizePipeline({
        recordingId: rec.id,
        appointmentId: rec.appointment_id,
        schoolId: rec.school_id,
        storagePath: storagePath || '',
      });
    } catch (err) {
      console.error('[recording/stop] pipeline IIFE failed:', err);
      await supabase
        .from('montree_appointment_recordings')
        .update({
          recording_status: 'failed',
          failure_reason: `pipeline: ${(err as Error).message.slice(0, 480)}`,
        })
        .eq('id', rec.id);
    }
  })();

  return NextResponse.json({ recording: updated });
}
