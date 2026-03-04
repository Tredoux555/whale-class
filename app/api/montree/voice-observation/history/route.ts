// app/api/montree/voice-observation/history/route.ts
// Past sessions list — metadata only, NO transcripts (deleted on commit)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabase();

    const { data: sessions, error, count } = await supabase
      .from('voice_observation_sessions')
      .select('id, session_date, duration_seconds, extractions_count, approved_count, rejected_count, status, total_cost_cents, language, created_at', { count: 'exact' })
      .eq('teacher_id', auth.userId)
      .order('session_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[VoiceObs] History error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[VoiceObs] History error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load history' },
      { status: 500 }
    );
  }
}
