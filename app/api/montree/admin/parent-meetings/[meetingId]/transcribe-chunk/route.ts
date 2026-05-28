// app/api/montree/admin/parent-meetings/[meetingId]/transcribe-chunk/route.ts
//
// Ultimate Tracy Phase B — receive one audio chunk, run Whisper, hold
// the transcript text in the per-meeting cache. On final=true, stitch
// the chunks, encrypt, persist to montree_parent_meeting_transcripts,
// and return the transcript_id.
//
// PRIVACY (load-bearing)
//   - Audio is NEVER written to disk or storage. The Blob is read into
//     memory once, sent to Whisper, and dropped.
//   - The transcript_text_encrypted column ALWAYS starts 'gcm:'.
//     Without MONTREE_ENCRYPTION_KEY configured, the route refuses
//     to persist (returns 503).
//   - audio_destroyed_at is the audit-trail timestamp.
//
// CONSENT GATE
//   On the FIRST chunk of a meeting we check the parent's
//   recording_consent_on_file flag. Phase E adds the column +
//   migration 243; until then, callers must pass consent_acknowledged
//   in the body and we trust the UI to enforce.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import {
  encryptField,
  isEncryptionConfigured,
} from '@/lib/montree/messaging-crypto';
import {
  recordChunk,
  finalizeAndDrain,
  transcribeAudioBlob,
} from '@/lib/montree/parent-meeting/transcribe';

export const maxDuration = 120;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Whisper's hard cap

interface MeetingRow {
  id: string;
  school_id: string;
  parent_id: string;
  transcript_id: string | null;
  locale: string | null;
}

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only principals or teachers can record meetings.' },
      { status: 403 }
    );
  }

  const { meetingId } = await params;
  if (!meetingId) {
    return NextResponse.json({ error: 'meeting id missing' }, { status: 400 });
  }

  const form = await request.formData();
  const audio = form.get('audio');
  const chunkIndexRaw = form.get('chunk_index');
  const finalRaw = form.get('final');
  const consentAcknowledged = form.get('consent_acknowledged');

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'audio Blob required' }, { status: 400 });
  }
  if (audio.size < 100) {
    return NextResponse.json({ error: 'audio too small' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: `audio exceeds ${MAX_AUDIO_BYTES} bytes` },
      { status: 413 }
    );
  }

  const chunkIndex = Number(chunkIndexRaw ?? 0);
  const isFinal = String(finalRaw ?? '') === 'true' || String(finalRaw ?? '') === '1';

  const supabase = getSupabase();

  // 1. Verify meeting exists + belongs to school.
  let meeting: MeetingRow | null;
  try {
    const { data, error } = await supabase
      .from('montree_parent_meetings')
      .select('id, school_id, parent_id, transcript_id, locale')
      .eq('id', meetingId)
      .maybeSingle();
    if (error) {
      if (isMigrationMissing(error)) {
        return NextResponse.json(
          { error: 'meeting schema not yet migrated', migration_pending: true },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    meeting = (data as MeetingRow | null) ?? null;
  } catch (err) {
    if (isMigrationMissing(err)) {
      return NextResponse.json(
        { error: 'meeting schema not yet migrated', migration_pending: true },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }

  if (!meeting) {
    return NextResponse.json({ error: 'meeting not found' }, { status: 404 });
  }
  if (meeting.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'meeting not in this school' }, { status: 403 });
  }
  if (meeting.transcript_id) {
    return NextResponse.json(
      { error: 'transcript already exists for this meeting' },
      { status: 409 }
    );
  }

  // 2. Encryption gate — refuse to capture audio if we can't persist
  // the result encrypted.
  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      {
        error:
          'Encryption not configured (MONTREE_ENCRYPTION_KEY missing). Refusing to record without at-rest encryption.',
      },
      { status: 503 }
    );
  }

  // 3. Consent check (defense in depth — the UI also gates).
  // Phase E adds recording_consent_on_file. Until then, we accept
  // consent_acknowledged in the body OR look for the column if it exists.
  const consentOk =
    String(consentAcknowledged ?? '') === 'true' ||
    String(consentAcknowledged ?? '') === '1';
  if (!consentOk) {
    // Check the column gracefully — Phase E migration 243.
    try {
      const { data: parentRow } = await supabase
        .from('montree_parents')
        .select('recording_consent_on_file')
        .eq('id', meeting.parent_id)
        .maybeSingle();
      if (!parentRow || parentRow.recording_consent_on_file !== true) {
        return NextResponse.json(
          {
            error:
              'Recording consent is not on file for this parent. The principal must confirm consent before recording.',
            requires_consent: true,
          },
          { status: 403 }
        );
      }
    } catch {
      // Column doesn't exist yet (Phase E migration pending) AND no
      // consent_acknowledged in body → refuse.
      return NextResponse.json(
        {
          error:
            'Recording consent must be acknowledged. Send consent_acknowledged=true in the request body once the parent has been informed.',
          requires_consent: true,
        },
        { status: 403 }
      );
    }
  }

  // 4. Whisper transcribe this chunk (audio destroyed after the call).
  let chunkTranscript: string;
  let language: string | null = null;
  let chunkCost = 0;
  const whisperStart = Date.now();
  try {
    const result = await transcribeAudioBlob(audio);
    chunkTranscript = result.transcript;
    language = result.language;
    chunkCost = result.costUsd;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Whisper transcription failed',
      },
      { status: 502 }
    );
  }
  const whisperMs = Date.now() - whisperStart;

  // 5. Stash in the per-meeting buffer.
  const { totalChunks } = recordChunk(
    meetingId,
    auth.schoolId,
    Number.isFinite(chunkIndex) ? chunkIndex : 0,
    chunkTranscript
  );

  if (!isFinal) {
    return NextResponse.json({
      chunk_index: chunkIndex,
      chunk_transcript_length: chunkTranscript.length,
      total_chunks_received: totalChunks,
      language_detected: language,
      chunk_cost_usd: chunkCost,
      whisper_ms: whisperMs,
    });
  }

  // 6. Finalize — stitch chunks, encrypt, persist.
  const finalized = finalizeAndDrain(meetingId, auth.schoolId);
  if (!finalized || !finalized.transcript || finalized.transcript.length < 30) {
    return NextResponse.json(
      { error: 'Final transcript empty or too short' },
      { status: 400 }
    );
  }

  let cipher: string;
  try {
    cipher = encryptField(finalized.transcript);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Encryption failed',
      },
      { status: 500 }
    );
  }

  const { data: transcriptRow, error: insErr } = await supabase
    .from('montree_parent_meeting_transcripts')
    .insert({
      meeting_id: meetingId,
      school_id: auth.schoolId,
      transcript_text_encrypted: cipher,
      encryption_version: 1,
      locale_detected: language,
      whisper_model_used: 'whisper-1',
      chunk_count: finalized.chunkCount,
      cost_usd: chunkCost, // last-chunk cost; total accrues client-side
      generation_ms: whisperMs,
    })
    .select('id, created_at')
    .single();

  if (insErr) {
    if (isMigrationMissing(insErr)) {
      return NextResponse.json(
        {
          error: 'transcript schema not yet migrated',
          migration_pending: true,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // 7. Link the transcript onto the meeting row.
  await supabase
    .from('montree_parent_meetings')
    .update({
      transcript_id: transcriptRow.id,
      status: 'held',
      held_at: new Date().toISOString(),
    })
    .eq('id', meetingId)
    .eq('school_id', auth.schoolId);

  return NextResponse.json({
    final: true,
    transcript_id: transcriptRow.id,
    transcript_length: finalized.transcript.length,
    chunk_count: finalized.chunkCount,
    language_detected: language,
  });
}
