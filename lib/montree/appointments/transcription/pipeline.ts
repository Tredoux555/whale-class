// lib/montree/appointments/transcription/pipeline.ts
//
// Orchestrates the post-recording pipeline:
//   1. Download the recorded audio from Supabase Storage.
//   2. Run Whisper transcription.
//   3. Fetch prior-meeting summaries for context.
//   4. Run Sonnet summarization with that context.
//   5. Write transcript + summary back to montree_appointment_recordings.
//   6. Flip recording_status to 'ready' (or 'failed' on any stage error).
//
// Called fire-and-forget from /api/montree/appointments/[id]/recording/stop.
// Also re-runnable: if a row is stuck in 'processing' with empty transcript
// or summary, calling this again will re-run only the missing stages.

import { getSupabase } from '@/lib/supabase-client';
import { transcribeAudio } from './whisper';
import { summarizeTranscript, type SummarizeInput } from './summarize';
import { getAgoraConfig } from '@/lib/montree/appointments/agora/config';

interface PipelineInput {
  recordingId: string;
  appointmentId: string;
  schoolId: string;
  /** Storage path relative to the bucket. e.g. "recordings/<apt_id>/<file>.mp3" */
  storagePath: string;
}

interface PipelineResult {
  ok: boolean;
  stage: 'download' | 'transcribe' | 'context' | 'summarize' | 'persist' | 'complete';
  error?: string;
}

export async function runTranscribeAndSummarizePipeline(
  input: PipelineInput
): Promise<PipelineResult> {
  const supabase = getSupabase();
  const { configured, config } = getAgoraConfig();
  if (!configured || !config) {
    await markFailed(input.recordingId, 'agora_not_configured');
    return { ok: false, stage: 'download', error: 'agora_not_configured' };
  }

  if (!input.storagePath) {
    await markFailed(input.recordingId, 'no_storage_path');
    return { ok: false, stage: 'download', error: 'no_storage_path' };
  }

  // ── 1. Download audio from Supabase Storage ────────────────────────
  let audioBlob: Blob;
  let detectedFilename: string;
  try {
    const downloadRes = await supabase.storage
      .from(config.recordingBucket)
      .download(input.storagePath);
    if (downloadRes.error || !downloadRes.data) {
      const errMsg = downloadRes.error?.message || 'unknown';
      await markFailed(input.recordingId, `download_failed: ${errMsg.slice(0, 200)}`);
      return { ok: false, stage: 'download', error: errMsg };
    }
    audioBlob = downloadRes.data;
    detectedFilename = input.storagePath.split('/').pop() || 'recording.m4a';
  } catch (err) {
    const errMsg = (err as Error).message;
    await markFailed(input.recordingId, `download_exception: ${errMsg.slice(0, 200)}`);
    return { ok: false, stage: 'download', error: errMsg };
  }

  // ── 2. Whisper transcription ───────────────────────────────────────
  const whisperRes = await transcribeAudio({
    audio: audioBlob,
    filename: detectedFilename,
  });
  if (!whisperRes.ok || !whisperRes.transcript) {
    await markFailed(input.recordingId, `transcribe_failed: ${whisperRes.error || 'unknown'}`);
    return { ok: false, stage: 'transcribe', error: whisperRes.error };
  }

  // Persist transcript immediately so even if Sonnet fails, the staff
  // has the raw transcript to read.
  await supabase
    .from('montree_appointment_recordings')
    .update({
      transcript: whisperRes.transcript.slice(0, 100_000),
      transcript_locale: whisperRes.locale || null,
      transcribed_at: new Date().toISOString(),
    })
    .eq('id', input.recordingId);

  // ── 3. Build context for the summary ───────────────────────────────
  const ctx = await buildSummaryContext(input.appointmentId, input.schoolId);
  if (!ctx) {
    await markFailed(input.recordingId, 'context_lookup_failed');
    return { ok: false, stage: 'context', error: 'context_lookup_failed' };
  }

  const priorSummaries = await fetchPriorSummaries(ctx.parentId, input.recordingId);

  // ── 4. Sonnet summarization ────────────────────────────────────────
  const summarizeInput: SummarizeInput = {
    transcript: whisperRes.transcript,
    transcriptLocale: whisperRes.locale || 'en',
    context: {
      parentName: ctx.parentName,
      childName: ctx.childName,
      staffName: ctx.staffName,
      staffRole: ctx.staffRole,
      meetingDate: ctx.meetingDate,
      intakeSubject: ctx.intakeSubject,
      intakeBody: ctx.intakeBody,
    },
    priorSummaries,
  };

  const summaryRes = await summarizeTranscript(supabase, input.schoolId, summarizeInput);
  if (!summaryRes.ok || !summaryRes.data) {
    await markFailed(input.recordingId, `summarize_failed: ${summaryRes.error || 'unknown'}`);
    return { ok: false, stage: 'summarize', error: summaryRes.error };
  }

  // ── 5. Persist summary + mark ready ────────────────────────────────
  const { error: persistErr } = await supabase
    .from('montree_appointment_recordings')
    .update({
      summary: summaryRes.data.briefing,
      summary_locale: whisperRes.locale || null,
      summarized_at: new Date().toISOString(),
      recording_status: 'ready',
    })
    .eq('id', input.recordingId);

  if (persistErr) {
    await markFailed(input.recordingId, `persist_failed: ${persistErr.message}`);
    return { ok: false, stage: 'persist', error: persistErr.message };
  }

  return { ok: true, stage: 'complete' };
}

// ── Helpers ────────────────────────────────────────────────────────────

async function markFailed(recordingId: string, reason: string) {
  try {
    await getSupabase()
      .from('montree_appointment_recordings')
      .update({
        recording_status: 'failed',
        failure_reason: reason.slice(0, 500),
      })
      .eq('id', recordingId);
  } catch (err) {
    console.error('[pipeline.markFailed] update failed:', err);
  }
}

interface SummaryContext {
  parentId: string;
  parentName: string | null;
  childName: string | null;
  staffName: string | null;
  staffRole: 'teacher' | 'principal';
  meetingDate: string;
  intakeSubject: string | null;
  intakeBody: string | null;
}

async function buildSummaryContext(
  appointmentId: string,
  schoolId: string
): Promise<SummaryContext | null> {
  const supabase = getSupabase();

  const { data: appt } = await supabase
    .from('montree_appointments')
    .select('parent_id, child_id, scheduled_start, intake_subject, intake_body')
    .eq('id', appointmentId)
    .eq('school_id', schoolId)
    .maybeSingle();

  if (!appt) return null;

  // Parent name.
  let parentName: string | null = null;
  if (appt.parent_id) {
    const { data: p } = await supabase
      .from('montree_parents')
      .select('name, email')
      .eq('id', appt.parent_id)
      .maybeSingle();
    parentName = (p as { name?: string | null; email?: string | null } | null)?.name
      || (p as { name?: string | null; email?: string | null } | null)?.email
      || null;
  }

  // Child name.
  let childName: string | null = null;
  if (appt.child_id) {
    const { data: c } = await supabase
      .from('montree_children')
      .select('name')
      .eq('id', appt.child_id)
      .maybeSingle();
    childName = (c as { name?: string | null } | null)?.name || null;
  }

  // Primary staff host.
  const { data: hostRows } = await supabase
    .from('montree_appointment_hosts')
    .select('host_role, host_id, is_primary')
    .eq('appointment_id', appointmentId);

  type HostRow = { host_role: 'teacher' | 'principal'; host_id: string; is_primary: boolean };
  const rows = (hostRows || []) as HostRow[];
  const primary = rows.find((r) => r.is_primary) || rows[0];

  let staffName: string | null = null;
  let staffRole: 'teacher' | 'principal' = 'teacher';
  if (primary) {
    staffRole = primary.host_role;
    if (primary.host_role === 'teacher') {
      const { data: t } = await supabase
        .from('montree_teachers')
        .select('name')
        .eq('id', primary.host_id)
        .maybeSingle();
      staffName = (t as { name?: string | null } | null)?.name || null;
    } else {
      const { data: pr } = await supabase
        .from('montree_school_admins')
        .select('name')
        .eq('id', primary.host_id)
        .maybeSingle();
      staffName = (pr as { name?: string | null } | null)?.name || null;
    }
  }

  return {
    parentId: appt.parent_id,
    parentName,
    childName,
    staffName,
    staffRole,
    meetingDate: (appt.scheduled_start as string).slice(0, 10),
    intakeSubject: appt.intake_subject as string | null,
    intakeBody: appt.intake_body as string | null,
  };
}

async function fetchPriorSummaries(
  parentId: string,
  excludeRecordingId: string
): Promise<Array<{ date: string; summary: string; staffName: string | null }>> {
  const supabase = getSupabase();

  // Find appointments for this parent ordered by date, with a summary on file.
  const { data: rows } = await supabase
    .from('montree_appointment_recordings')
    .select('id, summary, summarized_at, montree_appointments!inner(scheduled_start, parent_id)')
    .eq('montree_appointments.parent_id', parentId)
    .eq('recording_status', 'ready')
    .not('summary', 'is', null)
    .neq('id', excludeRecordingId)
    .order('summarized_at', { ascending: false })
    .limit(3);

  if (!rows || rows.length === 0) return [];

  return rows
    .map((r) => {
      const appts = (r as { montree_appointments: unknown }).montree_appointments;
      const appt = Array.isArray(appts) ? appts[0] : appts;
      const date = (appt as { scheduled_start?: string } | null)?.scheduled_start || '';
      return {
        date: date.slice(0, 10),
        summary: (r as { summary?: string }).summary || '',
        staffName: null, // We don't enrich here — keeps the helper cheap.
      };
    })
    .filter((p) => p.summary.length > 0);
}
