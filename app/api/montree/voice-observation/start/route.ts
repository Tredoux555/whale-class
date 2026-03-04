// app/api/montree/voice-observation/start/route.ts
// Create a new voice observation recording session

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { cleanupExpiredSessions } from '@/lib/montree/voice';

const VALID_LANGUAGES = ['auto', 'en', 'zh'];

export async function POST(request: NextRequest) {
  try {
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

    // Cleanup expired sessions (check-on-access pattern — Railway has no cron)
    cleanupExpiredSessions(auth.schoolId).catch(() => {});

    const body = await request.json().catch(() => ({}));
    const language = (body as any)?.language || 'auto';

    if (!VALID_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { success: false, error: `Language must be one of: ${VALID_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const sessionId = crypto.randomUUID();
    const now = new Date();
    const sessionDate = now.toISOString().split('T')[0];

    const { data: session, error: insertError } = await supabase
      .from('voice_observation_sessions')
      .insert({
        id: sessionId,
        classroom_id: auth.classroomId,
        school_id: auth.schoolId,
        teacher_id: auth.userId,
        status: 'recording',
        language,
        session_date: sessionDate,
        started_at: now.toISOString(),
      })
      .select('id, session_date')
      .single();

    if (insertError || !session) {
      console.error('[VoiceObs] Failed to create session:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionDate: session.session_date,
    });
  } catch (error) {
    console.error('[VoiceObs] Start error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start recording' },
      { status: 500 }
    );
  }
}
