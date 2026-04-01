// app/api/montree/voice-observation/[sessionId]/status/route.ts
// Poll processing status (client polls every 3s)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { cleanupExpiredSessions } from '@/lib/montree/voice';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    // Check-on-access cleanup
    cleanupExpiredSessions(auth.schoolId).catch((err) => console.warn('[VoiceObs] Cleanup failed:', err));

    // Fetch session
    const { data: session } = await supabase
      .from('voice_observation_sessions')
      .select('id, status, language, duration_seconds, audio_chunks_count, extractions_count, error_message, transcript_word_count')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Verify belongs to school (not necessarily teacher — principal could check too)
    // We check school via a join-less approach: session was created with school_id
    const { data: sessionSchool } = await supabase
      .from('voice_observation_sessions')
      .select('school_id')
      .eq('id', sessionId)
      .eq('school_id', auth.schoolId)
      .single();

    if (!sessionSchool) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get chunk transcription progress
    let chunksTranscribed = 0;
    if (session.audio_chunks_count > 0) {
      const { count } = await supabase
        .from('voice_observation_audio_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('transcription_status', 'done');
      chunksTranscribed = count || 0;
    }

    return NextResponse.json({
      success: true,
      status: session.status,
      chunksTranscribed,
      totalChunks: session.audio_chunks_count || 0,
      extractionsCount: session.extractions_count || 0,
      errorMessage: session.error_message || null,
      durationSeconds: session.duration_seconds || 0,
      language: session.language || 'auto',
      wordCount: session.transcript_word_count || 0,
    });
  } catch (error) {
    console.error('[VoiceObs] Status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
