// app/api/montree/voice-observation/[sessionId]/end/route.ts
// End recording and trigger async processing (fire-and-forget)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { processSession } from '@/lib/montree/voice';

// Allow background processing to complete (Railway persistent Node.js)
export const maxDuration = 300;

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

    // Verify session ownership
    const { data: session } = await supabase
      .from('voice_observation_sessions')
      .select('id, teacher_id, school_id, classroom_id, status')
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
        { success: false, error: 'Session is not in a recordable state' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { duration_seconds } = body;

    if (typeof duration_seconds !== 'number' || duration_seconds < 0) {
      return NextResponse.json(
        { success: false, error: 'duration_seconds is required and must be >= 0' },
        { status: 400 }
      );
    }

    // Update session to queued
    const { error: updateError } = await supabase
      .from('voice_observation_sessions')
      .update({
        status: 'queued',
        ended_at: new Date().toISOString(),
        duration_seconds,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[VoiceObs] End session update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to end session' },
        { status: 500 }
      );
    }

    // Fire-and-forget: process in background
    // Railway runs persistent Node.js — background Promises survive after response
    processSession(sessionId, session.classroom_id, session.school_id).catch((err) => {
      const message = err instanceof Error ? err.message.slice(0, 500) : 'Processing failed';
      console.error(`[VoiceObs] Session ${sessionId} processing failed:`, err);
      supabase
        .from('voice_observation_sessions')
        .update({ status: 'failed', error_message: message })
        .eq('id', sessionId)
        .then(() => {});
    });

    return NextResponse.json({
      success: true,
      sessionId,
      status: 'queued',
    });
  } catch (error) {
    console.error('[VoiceObs] End error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
