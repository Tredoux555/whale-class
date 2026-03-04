// app/api/montree/voice-observation/[sessionId]/upload/route.ts
// Upload an audio chunk during recording (60s intervals)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { checkRateLimit } from '@/lib/rate-limiter';

const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_SESSION_AUDIO = 200 * 1024 * 1024; // 200MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    // Check feature toggle
    const { data: featureCheck } = await supabase
      .from('montree_school_features')
      .select('enabled')
      .eq('school_id', auth.schoolId)
      .eq('feature_key', 'voice_observations')
      .single();

    if (!featureCheck?.enabled) {
      return NextResponse.json(
        { success: false, error: 'Voice observations not enabled for this school' },
        { status: 403 }
      );
    }

    // Rate limit: 60 uploads per minute
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = await checkRateLimit(supabase, clientIp, `voice-upload-${auth.userId}`, 60, 1);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Upload rate limit exceeded' },
        { status: 429 }
      );
    }

    // Verify session ownership
    const { data: session } = await supabase
      .from('voice_observation_sessions')
      .select('id, teacher_id, school_id, status, total_audio_bytes, audio_chunks_count')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    if (session.teacher_id !== auth.userId || session.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    if (!['recording', 'paused'].includes(session.status)) {
      return NextResponse.json(
        { success: false, error: 'Session is not in recording state' },
        { status: 400 }
      );
    }

    // Get audio file from FormData
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 });
    }

    // Validate MIME type
    if (audioFile.type && !audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type — must be audio' },
        { status: 400 }
      );
    }

    // Validate chunk size
    if (audioFile.size > MAX_CHUNK_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Chunk exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Check total session audio size
    const newTotal = (session.total_audio_bytes || 0) + audioFile.size;
    if (newTotal > MAX_SESSION_AUDIO) {
      return NextResponse.json(
        { success: false, error: 'Session audio exceeds 200MB limit' },
        { status: 413 }
      );
    }

    const chunkNumber = (session.audio_chunks_count || 0) + 1;
    const storagePath = `${sessionId}/chunk-${chunkNumber}.webm`;

    // Upload to Supabase Storage
    const arrayBuffer = await audioFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('voice-obs')
      .upload(storagePath, new Uint8Array(arrayBuffer), { upsert: false });

    if (uploadError) {
      console.error('[VoiceObs] Storage upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload audio' },
        { status: 500 }
      );
    }

    // Create chunk record
    const { error: chunkError } = await supabase
      .from('voice_observation_audio_chunks')
      .insert({
        session_id: sessionId,
        chunk_number: chunkNumber,
        storage_path: storagePath,
        size_bytes: audioFile.size,
        duration_seconds: 60, // approximate — 60s chunks
        transcription_status: 'pending',
      });

    if (chunkError) {
      console.error('[VoiceObs] Chunk record error:', chunkError);
      return NextResponse.json(
        { success: false, error: 'Failed to record chunk' },
        { status: 500 }
      );
    }

    // Update session counters
    await supabase
      .from('voice_observation_sessions')
      .update({
        audio_chunks_count: chunkNumber,
        total_audio_bytes: newTotal,
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      chunkNumber,
      status: 'received',
    });
  } catch (error) {
    console.error('[VoiceObs] Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
