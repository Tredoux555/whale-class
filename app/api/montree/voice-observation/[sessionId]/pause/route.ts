// app/api/montree/voice-observation/[sessionId]/pause/route.ts
// Pause or resume a recording session

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    // Verify session ownership
    const { data: session } = await supabase
      .from('voice_observation_sessions')
      .select('id, teacher_id, school_id, status')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    if (session.teacher_id !== auth.userId || session.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Only allow toggling between recording ↔ paused
    if (!['recording', 'paused'].includes(session.status)) {
      return NextResponse.json(
        { success: false, error: 'Session is not in a recordable state' },
        { status: 400 }
      );
    }

    // Toggle between recording ↔ paused
    const newStatus = session.status === 'paused' ? 'recording' : 'paused';
    const update: Record<string, any> = { status: newStatus };
    if (newStatus === 'paused') {
      update.paused_at = new Date().toISOString();
    } else {
      update.paused_at = null;
    }

    const { error } = await supabase
      .from('voice_observation_sessions')
      .update(update)
      .eq('id', sessionId);

    if (error) {
      console.error('[VoiceObs] Pause/resume error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('[VoiceObs] Pause error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to pause session' },
      { status: 500 }
    );
  }
}
